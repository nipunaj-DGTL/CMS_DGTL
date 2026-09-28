export const SSO_STRATEGY = 'dgtl-sso'
export const SESSION_COOKIE = 'dgtl-cms-token'
export const FLOW_COOKIE = 'dgtl-cms-sso-flow'

type Environment = Record<string, string | undefined>

function trustedURL(value: string | undefined, name: string, env: Environment): URL {
  if (!value) throw new Error(`Missing ${name}`)
  const url = new URL(value)
  const local =
    env.NODE_ENV !== 'production' && url.protocol === 'http:' && url.hostname === 'localhost'
  if (
    (!local && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`Invalid ${name}`)
  }
  return url
}

export function ssoConfig(env: Environment = process.env) {
  if (env.CMS_SSO_ENABLED !== 'true') return null
  const issuer = trustedURL(env.CMS_SSO_ISSUER, 'CMS_SSO_ISSUER', env)
  const origin = trustedURL(env.CMS_PUBLIC_URL, 'CMS_PUBLIC_URL', env)
  if (origin.pathname !== '/') throw new Error('CMS_PUBLIC_URL must be an origin')
  const viewer = trustedURL(env.CMS_SSO_VIEWER_URL, 'CMS_SSO_VIEWER_URL', env)
  if (viewer.pathname !== '/v1/me') throw new Error('CMS_SSO_VIEWER_URL must end in /v1/me')
  const clientID = env.CMS_SSO_CLIENT_ID
  const clientSecret = env.CMS_SSO_CLIENT_SECRET
  const encryptionKey = env.CMS_SSO_ENCRYPTION_KEY
  if (!clientID || !clientSecret) throw new Error('Missing CMS SSO client credentials')
  if (!encryptionKey || !/^[a-fA-F0-9]{64}$/.test(encryptionKey)) {
    throw new Error('CMS_SSO_ENCRYPTION_KEY must contain 64 hexadecimal characters')
  }
  return {
    issuer: issuer.href.replace(/\/$/, ''),
    origin: origin.origin,
    callback: `${origin.origin}/sso/callback`,
    viewerURL: viewer.href,
    clientID,
    clientSecret,
    encryptionKey,
    secure: origin.protocol === 'https:',
  }
}

export interface LinkedUser {
  id?: string | number
  ssoIssuer?: string | null
  ssoSubject?: string | null
  accountType?: string | null
  companyRoles?: string[] | null
}

export function requiresSSO(user: LinkedUser, env: Environment = process.env): boolean {
  if (env.CMS_SSO_ENABLED !== 'true') return false
  if (user.ssoIssuer || user.ssoSubject) return true
  if (env.CMS_SSO_REQUIRED !== 'true') return false
  // Recovery is an explicitly selected, UNLINKED local super-admin; never an email match.
  const recovery = env.CMS_SSO_RECOVERY_USER_ID
  return !(
    recovery &&
    String(user.id) === recovery &&
    user.accountType === 'company' &&
    user.companyRoles?.includes('company-super-admin')
  )
}

export function sameOriginRequest(headers: Headers, origin: string): boolean {
  const requestOrigin = headers.get('origin')
  if (requestOrigin) return requestOrigin === origin
  return ['same-origin', 'none'].includes(headers.get('sec-fetch-site') ?? '')
}
