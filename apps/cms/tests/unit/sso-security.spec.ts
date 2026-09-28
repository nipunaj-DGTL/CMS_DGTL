import { afterEach, describe, expect, it, vi } from 'vitest'
import { requiresSSO, sameOriginRequest, ssoConfig } from '../../src/sso/config'
import { randomSecret, seal, tokenHash, unseal } from '../../src/sso/crypto'
import { checkCentralAccess, hasCMSAccess } from '../../src/sso/provider'

const env = {
  CMS_SSO_ENABLED: 'true',
  NODE_ENV: 'production',
  CMS_PUBLIC_URL: 'https://cms.dgtl.lk',
  CMS_SSO_ISSUER: 'https://identity.example/auth/v1',
  CMS_SSO_VIEWER_URL: 'https://api.example/v1/me',
  CMS_SSO_CLIENT_ID: 'cms-test',
  CMS_SSO_CLIENT_SECRET: 'test-only-client-secret',
  CMS_SSO_ENCRYPTION_KEY: 'ab'.repeat(32),
}

afterEach(() => vi.unstubAllGlobals())
describe('SSO configuration and rollout', () => {
  it('is disabled by default', () => expect(ssoConfig({})).toBeNull())
  it('derives a fixed callback from the trusted CMS origin', () => {
    expect(ssoConfig(env)?.callback).toBe('https://cms.dgtl.lk/sso/callback')
  })
  it.each([
    'http://cms.dgtl.lk',
    'https://user:password@cms.dgtl.lk',
    'https://cms.dgtl.lk/path',
    'https://cms.dgtl.lk?next=evil',
  ])('rejects unsafe production origins: %s', (value) => {
    expect(() => ssoConfig({ ...env, CMS_PUBLIC_URL: value })).toThrow()
  })
  it('requires a distinct valid encryption key and a viewer endpoint', () => {
    expect(() => ssoConfig({ ...env, CMS_SSO_ENCRYPTION_KEY: 'short' })).toThrow()
    expect(() => ssoConfig({ ...env, CMS_SSO_VIEWER_URL: 'https://api.example/other' })).toThrow()
  })
  it('blocks legacy login for linked accounts only in enabled mode', () => {
    const user = { id: 1, ssoSubject: 'central-1' }
    expect(requiresSSO(user, {})).toBe(false)
    expect(requiresSSO(user, env)).toBe(true)
    expect(requiresSSO({ id: 2 }, env)).toBe(false)
  })
  it('strict mode only exempts an explicitly selected unlinked company super-admin', () => {
    const strict = { ...env, CMS_SSO_REQUIRED: 'true', CMS_SSO_RECOVERY_USER_ID: '1' }
    const admin = { id: 1, accountType: 'company', companyRoles: ['company-super-admin'] }
    expect(requiresSSO(admin, strict)).toBe(false)
    expect(requiresSSO({ ...admin, ssoSubject: 'linked' }, strict)).toBe(true)
    expect(requiresSSO({ id: 1, accountType: 'client' }, strict)).toBe(true)
    expect(requiresSSO({ ...admin, id: 2 }, strict)).toBe(true)
  })
})
describe('encrypted secrets', () => {
  it('uses authenticated, randomized, purpose-bound encryption', () => {
    const key = env.CMS_SSO_ENCRYPTION_KEY
    const sealed = seal('test-access-token', key, 'access-token')
    expect(sealed).not.toContain('test-access-token')
    expect(seal('test-access-token', key, 'access-token')).not.toBe(sealed)
    expect(unseal(sealed, key, 'access-token')).toBe('test-access-token')
    expect(() => unseal(sealed, key, 'login-flow')).toThrow()
    expect(() => unseal(sealed, 'cd'.repeat(32), 'access-token')).toThrow()
    const changed = Buffer.from(sealed, 'base64url')
    changed[15] ^= 1
    expect(() => unseal(changed.toString('base64url'), key, 'access-token')).toThrow()
    expect(randomSecret()).toHaveLength(43)
    expect(tokenHash(randomSecret())).toHaveLength(64)
  })
})
describe('central authorization', () => {
  it('requires matching identity, active status and explicit CMS assignment even for admins', () => {
    const viewer = { id: 'one', status: 'active', role: 'admin', services: [{ key: 'cms' }] }
    expect(hasCMSAccess(viewer, 'one')).toBe(true)
    expect(hasCMSAccess(viewer, 'two')).toBe(false)
    expect(hasCMSAccess({ ...viewer, status: 'suspended' }, 'one')).toBe(false)
    expect(hasCMSAccess({ ...viewer, services: [{ key: 'seo' }] }, 'one')).toBe(false)
    expect(hasCMSAccess({ ...viewer, services: [] }, 'one')).toBe(false)
  })
  it('rechecks the backend without caching and does not follow token-bearing redirects', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ id: 'one', status: 'active', services: [{ key: 'cms' }] }))
    vi.stubGlobal('fetch', fetch)
    expect(await checkCentralAccess(ssoConfig(env)!, 'test-token', 'one')).toBe(true)
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store', redirect: 'error' })
    fetch.mockRejectedValue(new Error('offline'))
    expect(await checkCentralAccess(ssoConfig(env)!, 'test-token', 'one')).toBe(false)
  })
  it('rejects sibling-domain and unknown-origin mutations', () => {
    expect(
      sameOriginRequest(new Headers({ origin: 'https://cms.dgtl.lk' }), 'https://cms.dgtl.lk'),
    ).toBe(true)
    expect(
      sameOriginRequest(
        new Headers({ origin: 'https://dashboard.dgtl.lk' }),
        'https://cms.dgtl.lk',
      ),
    ).toBe(false)
    expect(
      sameOriginRequest(new Headers({ 'sec-fetch-site': 'same-site' }), 'https://cms.dgtl.lk'),
    ).toBe(false)
    expect(sameOriginRequest(new Headers(), 'https://cms.dgtl.lk')).toBe(false)
  })
})
