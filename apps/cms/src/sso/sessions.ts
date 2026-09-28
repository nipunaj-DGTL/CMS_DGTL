import type { AuthStrategy, Payload, PayloadRequest } from 'payload'
import { parseCookies } from 'payload/shared'
import { activeTenantIDsForUser, isCompanyUser, relationID } from '../access/policy'
import type { CmsUser } from '../payload-types'
import { sameOriginRequest, SESSION_COOKIE, ssoConfig, SSO_STRATEGY } from './config'
import { randomSecret, seal, tokenHash, unseal } from './crypto'
import { checkCentralAccess, type SSOConfig } from './provider'

export type SSOUser = CmsUser & {
  collection: 'cms-users'
  _strategy: string
  _ssoExpiresAt: number
}

export function sessionToken(headers: Headers): string | null {
  const token = parseCookies(headers).get(SESSION_COOKIE)
  return token && /^cms_sso_[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}

export async function eligibleLocalUser(payload: Payload, user: CmsUser): Promise<boolean> {
  if (user.status !== 'active') return false
  // SSO proves central identity, not ownership of this local account. The explicit
  // administrator mapping is mandatory; local email verification is independent.
  if (isCompanyUser(user)) return true
  return (await activeTenantIDsForUser({ payload, user: null }, user)).length > 0
}

export async function createSSOSession(
  payload: Payload,
  config: SSOConfig,
  identity: { subject: string; accessToken: string; expiresAt: number },
) {
  if (
    identity.expiresAt <= Date.now() ||
    !(await checkCentralAccess(config, identity.accessToken, identity.subject))
  ) {
    throw new Error('CMS service is not available for this account')
  }
  const users = await payload.find({
    collection: 'cms-users',
    overrideAccess: true,
    depth: 0,
    limit: 2,
    where: {
      and: [{ ssoIssuer: { equals: config.issuer } }, { ssoSubject: { equals: identity.subject } }],
    },
  })
  const user = users.docs[0]
  if (users.docs.length !== 1 || !(await eligibleLocalUser(payload, user)))
    throw new Error('No active CMS identity mapping')
  const token = `cms_sso_${randomSecret()}`
  await payload.create({
    collection: 'cms-sso-sessions',
    overrideAccess: true,
    data: {
      keyHash: tokenHash(token),
      user: user.id,
      issuer: config.issuer,
      subject: identity.subject,
      encryptedAccessToken: seal(identity.accessToken, config.encryptionKey, 'access-token'),
      expiresAt: new Date(identity.expiresAt).toISOString(),
    },
  })
  // Bounded cleanup uses only expired session records, never accounts or content.
  await payload.delete({
    collection: 'cms-sso-sessions',
    overrideAccess: true,
    where: { expiresAt: { less_than: new Date().toISOString() } },
  })
  return { token, user, expiresAt: identity.expiresAt }
}

export const ssoStrategy: AuthStrategy = {
  name: SSO_STRATEGY,
  authenticate: async ({ headers, payload }) => {
    try {
      const config = ssoConfig()
      const token = sessionToken(headers)
      const navigation =
        !headers.has('origin') &&
        headers.get('sec-fetch-mode') === 'navigate' &&
        headers.get('sec-fetch-dest') === 'document'
      // SameSite=Lax admits top-level GET returns from the identity provider.
      if (!config || !token || (!sameOriginRequest(headers, config.origin) && !navigation))
        return { user: null }
      const sessions = await payload.find({
        collection: 'cms-sso-sessions',
        overrideAccess: true,
        showHiddenFields: true,
        depth: 0,
        limit: 1,
        where: { keyHash: { equals: tokenHash(token) } },
      })
      const session = sessions.docs[0]
      if (
        !session ||
        session.issuer !== config.issuer ||
        Date.parse(session.expiresAt) <= Date.now()
      )
        return { user: null }
      const id = relationID(session.user)
      if (!id) return { user: null }
      const user = await payload.findByID({
        collection: 'cms-users',
        id,
        depth: 0,
        overrideAccess: true,
      })
      if (
        user.ssoIssuer !== session.issuer ||
        user.ssoSubject !== session.subject ||
        !(await eligibleLocalUser(payload, user))
      )
        return { user: null }
      const accessToken = unseal<string>(
        session.encryptedAccessToken,
        config.encryptionKey,
        'access-token',
      )
      if (!(await checkCentralAccess(config, accessToken, session.subject))) return { user: null }
      return {
        user: {
          ...user,
          collection: 'cms-users',
          _strategy: SSO_STRATEGY,
          _ssoExpiresAt: Math.floor(Date.parse(session.expiresAt) / 1000),
        } as SSOUser,
      }
    } catch {
      return { user: null }
    }
  },
}

export async function deleteSSOSession(req: Pick<PayloadRequest, 'payload' | 'headers'>) {
  const token = sessionToken(req.headers)
  if (token)
    await req.payload.delete({
      collection: 'cms-sso-sessions',
      overrideAccess: true,
      where: { keyHash: { equals: tokenHash(token) } },
    })
}
