import * as oidc from 'openid-client'
import type { ssoConfig } from './config'

export type SSOConfig = NonNullable<ReturnType<typeof ssoConfig>>
export interface LoginFlow {
  state: string
  nonce: string
  verifier: string
  expiresAt: number
}

export async function provider(config: SSOConfig) {
  const client = await oidc.discovery(
    new URL(config.issuer),
    config.clientID,
    config.clientSecret,
    oidc.ClientSecretPost(config.clientSecret),
    { timeout: 10 },
  )
  // Explicit signature checking in addition to code-flow TLS validation.
  oidc.enableNonRepudiationChecks(client)
  return client
}

export async function authorizationURL(config: SSOConfig, flow: LoginFlow) {
  return oidc.buildAuthorizationUrl(await provider(config), {
    redirect_uri: config.callback,
    scope: 'openid email profile',
    code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier),
    code_challenge_method: 'S256',
    state: flow.state,
    nonce: flow.nonce,
  })
}

export async function exchangeCode(config: SSOConfig, currentURL: URL, flow: LoginFlow) {
  if (flow.expiresAt <= Date.now() || flow.expiresAt > Date.now() + 300_000)
    throw new Error('Expired login flow')
  if (currentURL.origin + currentURL.pathname !== config.callback)
    throw new Error('Invalid callback')
  const tokens = await oidc.authorizationCodeGrant(await provider(config), currentURL, {
    pkceCodeVerifier: flow.verifier,
    expectedState: flow.state,
    expectedNonce: flow.nonce,
    idTokenExpected: true,
  })
  const claims = tokens.claims()
  if (!claims?.sub || claims.iss !== config.issuer || !tokens.access_token || !tokens.expires_in) {
    throw new Error('Invalid identity response')
  }
  return {
    subject: claims.sub,
    accessToken: tokens.access_token,
    expiresAt: Math.min(
      Date.now() + tokens.expires_in * 1000,
      claims.exp * 1000,
      Date.now() + 8 * 3600_000,
    ),
  }
}

export function hasCMSAccess(value: unknown, subject: string): boolean {
  if (!value || typeof value !== 'object') return false
  const viewer = value as { id?: unknown; status?: unknown; services?: unknown }
  return (
    viewer.id === subject &&
    viewer.status === 'active' &&
    Array.isArray(viewer.services) &&
    viewer.services.some((service: unknown) =>
      Boolean(service && typeof service === 'object' && 'key' in service && service.key === 'cms'),
    )
  )
}

export async function checkCentralAccess(
  config: SSOConfig,
  token: string,
  subject: string,
): Promise<boolean> {
  try {
    const response = await fetch(config.viewerURL, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok && hasCMSAccess(await response.json(), subject)
  } catch {
    // Never log tokens, upstream response bodies, or token-exchange errors.
    return false
  }
}
