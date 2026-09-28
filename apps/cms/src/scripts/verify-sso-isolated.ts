import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '../payload.config'
import { ssoConfig } from '../sso/config'
import { createSSOSession, ssoStrategy, type SSOUser } from '../sso/sessions'
import { ssoAuthEndpoints } from '../sso/endpoints'

// Hard guard: this script creates fixtures and must never operate on real data.
const target = new URL(process.env.CMS_DATABASE_URL ?? '')
assert.equal(target.hostname, '127.0.0.1')
assert.equal(target.port, '55439')
assert.equal(target.pathname, '/dgtl_cms_sso_verification')
assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
const payload = await getPayload({ config })
const suffix = randomUUID().slice(0, 8)
const nativeFetch = globalThis.fetch
let checks = 0
const passed = (label: string) => {
  checks += 1
  console.log(`PASS ${label}`)
}

try {
  const admin = await payload.create({
    collection: 'cms-users',
    overrideAccess: true,
    disableVerificationEmail: true,
    data: {
      displayName: 'SSO test recovery',
      accountType: 'company',
      companyRoles: ['company-super-admin'],
      status: 'active',
      email: `recovery-${suffix}@example.test`,
      password: `Test-only-${suffix}-password`,
      ...{ _verified: true },
    },
  })
  const tenantA = await payload.create({
    collection: 'dgtl-tenants',
    overrideAccess: true,
    data: { displayName: 'SSO A', key: `sso-a-${suffix}`, status: 'active' },
  })
  const tenantB = await payload.create({
    collection: 'dgtl-tenants',
    overrideAccess: true,
    data: { displayName: 'SSO B', key: `sso-b-${suffix}`, status: 'active' },
  })
  const client = await payload.create({
    collection: 'cms-users',
    overrideAccess: true,
    disableVerificationEmail: true,
    data: {
      displayName: 'SSO test client',
      accountType: 'client',
      status: 'active',
      tenants: [{ tenant: tenantA.id, roles: ['client-admin'] }],
      email: `client-${suffix}@example.test`,
      password: `Test-only-${suffix}-password`,
      ...{ _verified: true },
    },
  })
  const oldLogin = await payload.login({
    collection: 'cms-users',
    data: { email: client.email, password: `Test-only-${suffix}-password` },
  })
  assert.ok(oldLogin.token)
  passed('legacy login remains available before account linking')
  const issuer = 'https://identity.example/auth/v1'
  await payload.update({
    collection: 'cms-users',
    id: client.id,
    overrideAccess: false,
    user: admin,
    data: { ssoIssuer: issuer, ssoSubject: `central-${suffix}` },
  })
  passed('super-admin links an existing CMS account')
  await assert.rejects(() =>
    payload.update({
      collection: 'cms-users',
      id: admin.id,
      overrideAccess: false,
      user: admin,
      data: { ssoIssuer: issuer, ssoSubject: `central-${suffix}` },
    }),
  )
  passed('database rejects duplicate central identity bindings')

  Object.assign(process.env, {
    CMS_SSO_ENABLED: 'true',
    CMS_SSO_ISSUER: issuer,
    CMS_PUBLIC_URL: 'https://cms.example',
    CMS_SSO_VIEWER_URL: 'https://api.example/v1/me',
    CMS_SSO_CLIENT_ID: 'isolated-cms',
    CMS_SSO_CLIENT_SECRET: 'test-only',
    CMS_SSO_ENCRYPTION_KEY: 'ab'.repeat(32),
  })
  let centralEnabled = true
  globalThis.fetch = async (input, init) => {
    if (String(input) === 'https://api.example/v1/me')
      return Response.json({
        id: `central-${suffix}`,
        status: 'active',
        role: 'admin',
        services: centralEnabled ? [{ key: 'cms' }] : [],
      })
    return nativeFetch(input, init)
  }
  const session = await createSSOSession(payload, ssoConfig()!, {
    subject: `central-${suffix}`,
    accessToken: 'isolated-test-token',
    expiresAt: Date.now() + 3600_000,
  })
  const headers = new Headers({
    cookie: `dgtl-cms-token=${session.token}`,
    origin: 'https://cms.example',
  })
  const authentication = await payload.auth({ headers })
  assert.equal(authentication.user?.id, client.id)
  assert.equal(authentication.user?.accountType, 'client')
  assert.deepEqual(authentication.user?.companyRoles, [])
  passed('SSO authenticates without promoting a central admin to CMS super-admin')
  const user = authentication.user as SSOUser
  const tenants = await payload.find({
    collection: 'dgtl-tenants',
    overrideAccess: false,
    user,
    depth: 0,
  })
  assert.deepEqual(
    tenants.docs.map((item) => item.id),
    [tenantA.id],
  )
  assert.ok(!tenants.docs.some((item) => item.id === tenantB.id))
  passed('PostgreSQL tenant reads exclude another company')
  await payload.update({
    collection: 'cms-users',
    id: client.id,
    overrideAccess: false,
    user,
    data: { ssoIssuer: issuer, ssoSubject: 'attacker' },
  })
  const stillLinked = await payload.findByID({
    collection: 'cms-users',
    id: client.id,
    overrideAccess: true,
  })
  assert.equal(stillLinked.ssoSubject, `central-${suffix}`)
  passed('client cannot relink the central identity')
  await assert.rejects(() =>
    payload.find({ collection: 'cms-sso-sessions', overrideAccess: false, user }),
  )
  passed('session records are not accessible through CMS collection permissions')
  await assert.rejects(() =>
    payload.login({
      collection: 'cms-users',
      data: { email: client.email, password: `Test-only-${suffix}-password` },
    }),
  )
  passed('linked account cannot bypass SSO with a native password login')
  const oldAuth = await payload.auth({
    headers: new Headers({ authorization: `JWT ${oldLogin.token}`, origin: 'https://cms.example' }),
  })
  await assert.rejects(() =>
    payload.find({ collection: 'dgtl-tenants', user: oldAuth.user, overrideAccess: false }),
  )
  passed('stale native JWT cannot read tenant data')

  centralEnabled = false
  assert.equal((await ssoStrategy.authenticate({ headers, payload })).user, null)
  passed('removed central CMS entitlement invalidates the next request')
  centralEnabled = true
  await payload.update({
    collection: 'dgtl-tenants',
    id: tenantA.id,
    overrideAccess: true,
    data: { status: 'suspended' },
  })
  assert.equal((await ssoStrategy.authenticate({ headers, payload })).user, null)
  passed('local tenant suspension invalidates SSO access')
  await payload.update({
    collection: 'dgtl-tenants',
    id: tenantA.id,
    overrideAccess: true,
    data: { status: 'active' },
  })
  const { createLocalReq } = await import('payload')
  const req = await createLocalReq({ user }, payload)
  req.headers = headers
  const refresh = await ssoAuthEndpoints[0].handler(req)
  assert.equal(refresh.status, 200)
  const refreshed = await refresh.json()
  assert.equal(refreshed.exp, user._ssoExpiresAt)
  assert.equal(refreshed.refreshedToken, undefined)
  passed('refresh preserves central expiry without creating a bypass JWT')
  const logout = await ssoAuthEndpoints[1].handler(req)
  assert.equal(logout.status, 200)
  assert.equal((await ssoStrategy.authenticate({ headers, payload })).user, null)
  passed('CMS logout invalidates the stored session')
  console.log(
    `SSO database verification: ${checks} checks passed. Fixtures are only in the disposable test database.`,
  )
} finally {
  globalThis.fetch = nativeFetch
}
process.exit(0)
