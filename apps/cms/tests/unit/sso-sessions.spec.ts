import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { currentUserForRequest, tenantReadAccess } from '../../src/access/policy'
import { ssoConfig, SSO_STRATEGY } from '../../src/sso/config'
import { randomSecret, seal, tokenHash } from '../../src/sso/crypto'
import { protectSSOMapping } from '../../src/sso/mapping'
import { createSSOSession, sessionToken, ssoStrategy } from '../../src/sso/sessions'

const env = {
  CMS_SSO_ENABLED: 'true',
  CMS_PUBLIC_URL: 'https://cms.example',
  CMS_SSO_ISSUER: 'https://identity.example/auth/v1',
  CMS_SSO_VIEWER_URL: 'https://api.example/v1/me',
  CMS_SSO_CLIENT_ID: 'test-cms',
  CMS_SSO_CLIENT_SECRET: 'test-only',
  CMS_SSO_ENCRYPTION_KEY: 'ab'.repeat(32),
}
const config = ssoConfig(env)!
const client = {
  id: 1,
  accountType: 'client',
  status: 'active',
  tenants: [{ tenant: 10, roles: ['client-admin'] }],
  ssoIssuer: config.issuer,
  ssoSubject: 'central-1',
}

beforeEach(() => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ id: 'central-1', status: 'active', services: [{ key: 'cms' }] }),
      ),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function fixtures() {
  const token = `cms_sso_${randomSecret()}`
  const session = {
    user: 1,
    issuer: config.issuer,
    subject: 'central-1',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    encryptedAccessToken: seal('test-central-access', config.encryptionKey, 'access-token'),
  }
  const payload = {
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'cms-sso-sessions') return { docs: [session] }
      if (collection === 'cms-users') return { docs: [client] }
      return { docs: [{ id: 10 }] }
    }),
    findByID: vi.fn().mockResolvedValue(client),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  }
  const headers = new Headers({ cookie: `dgtl-cms-token=${token}`, origin: config.origin })
  return { token, session, payload, headers }
}

describe('SSO sessions and local permissions', () => {
  it('stores only a hashed session key and encrypted provider token', async () => {
    const { payload } = fixtures()
    const result = await createSSOSession(payload as never, config, {
      subject: 'central-1',
      accessToken: 'test-central-access',
      expiresAt: Date.now() + 3600_000,
    })
    const saved = payload.create.mock.calls[0] as unknown as [
      { data: { keyHash: string; encryptedAccessToken: string } },
    ]
    expect(saved[0].data.keyHash).toBe(tokenHash(result.token))
    expect(saved[0].data.encryptedAccessToken).not.toContain('test-central-access')
  })
  it('authenticates the linked user and keeps tenant access scoped', async () => {
    const fixture = fixtures()
    const { user } = await ssoStrategy.authenticate(fixture as never)
    expect(user).toMatchObject({ id: 1, _strategy: SSO_STRATEGY })
    expect(await tenantReadAccess({ req: { payload: fixture.payload, user } } as never)).toEqual({
      tenant: { in: [10] },
    })
  })
  it('allows top-level callback navigation but rejects sibling-domain requests', async () => {
    const fixture = fixtures()
    fixture.headers.delete('origin')
    fixture.headers.set('sec-fetch-site', 'cross-site')
    fixture.headers.set('sec-fetch-mode', 'navigate')
    fixture.headers.set('sec-fetch-dest', 'document')
    expect((await ssoStrategy.authenticate(fixture as never)).user).not.toBeNull()
    fixture.headers.set('origin', 'https://other.example')
    expect((await ssoStrategy.authenticate(fixture as never)).user).toBeNull()
  })
  it.each(['expired', 'unlinked', 'suspended', 'revoked', 'offline', 'tenant-suspended'])(
    'rejects %s sessions',
    async (reason) => {
      const fixture = fixtures()
      if (reason === 'expired') fixture.session.expiresAt = new Date(0).toISOString()
      if (reason === 'unlinked')
        fixture.payload.findByID.mockResolvedValue({ ...client, ssoSubject: 'another' })
      if (reason === 'suspended')
        fixture.payload.findByID.mockResolvedValue({ ...client, status: 'suspended' })
      if (reason === 'revoked')
        vi.mocked(fetch).mockResolvedValue(
          Response.json({ id: 'central-1', status: 'active', services: [] }),
        )
      if (reason === 'offline') vi.mocked(fetch).mockRejectedValue(new Error('offline'))
      if (reason === 'tenant-suspended')
        fixture.payload.findByID.mockResolvedValue({ ...client, tenants: [] })
      expect((await ssoStrategy.authenticate(fixture as never)).user).toBeNull()
    },
  )
  it('does not provision accounts when there is no exact identity mapping', async () => {
    const fixture = fixtures()
    fixture.payload.find.mockResolvedValue({ docs: [] })
    await expect(
      createSSOSession(fixture.payload as never, config, {
        subject: 'central-1',
        accessToken: 'test',
        expiresAt: Date.now() + 1000,
      }),
    ).rejects.toThrow()
    expect(fixture.payload.create).not.toHaveBeenCalled()
  })
  it('rejects stale native sessions after linking an account', async () => {
    const fixture = fixtures()
    const req = { payload: fixture.payload, user: { ...client, _strategy: 'local-jwt' } }
    expect(await currentUserForRequest(req as never)).toBeNull()
  })
  it('accepts only opaque tokens in the CMS cookie, not bearer tokens', () => {
    expect(
      sessionToken(new Headers({ authorization: `Bearer cms_sso_${randomSecret()}` })),
    ).toBeNull()
    expect(sessionToken(new Headers({ cookie: 'dgtl-cms-token=invalid' }))).toBeNull()
  })
})

describe('administrator-controlled mapping', () => {
  it('forbids a client from linking their identity or changing roles via SSO', async () => {
    const fixture = fixtures()
    await expect(
      protectSSOMapping({
        data: { ssoSubject: 'another' },
        originalDoc: client,
        req: { payload: fixture.payload, user: { ...client, _strategy: SSO_STRATEGY } },
      } as never),
    ).rejects.toThrow('Only a CMS super-admin')
  })
  it('rejects partial mappings and derives the unique key on the server', async () => {
    const fixture = fixtures()
    const admin = {
      id: 2,
      accountType: 'company',
      status: 'active',
      companyRoles: ['company-super-admin'],
    }
    fixture.payload.findByID.mockResolvedValue(admin as never)
    const req = { payload: fixture.payload, user: admin }
    await expect(
      protectSSOMapping({ data: { ssoIssuer: config.issuer }, originalDoc: {}, req } as never),
    ).rejects.toThrow('Provide both')
    const data = await protectSSOMapping({
      data: { ssoIssuer: config.issuer, ssoSubject: 'central-1', ssoIdentityKey: 'attacker' },
      originalDoc: {},
      req,
    } as never)
    expect(data.ssoIdentityKey).toBe(tokenHash(JSON.stringify([config.issuer, 'central-1'])))
  })
})
