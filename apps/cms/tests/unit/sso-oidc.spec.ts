import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ssoConfig } from '../../src/sso/config'
import { authorizationURL, exchangeCode } from '../../src/sso/provider'

const config = ssoConfig({
  CMS_SSO_ENABLED: 'true',
  CMS_PUBLIC_URL: 'https://cms.example',
  CMS_SSO_ISSUER: 'https://identity.example/auth/v1',
  CMS_SSO_VIEWER_URL: 'https://api.example/v1/me',
  CMS_SSO_CLIENT_ID: 'test-cms',
  CMS_SSO_CLIENT_SECRET: 'test-only',
  CMS_SSO_ENCRYPTION_KEY: 'ab'.repeat(32),
})!
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test', use: 'sig', alg: 'RS256' }
const flow = () => ({
  state: 'random-state-test',
  nonce: 'random-nonce-test',
  verifier: 'a'.repeat(43),
  expiresAt: Date.now() + 299_000,
})
let claims: Record<string, unknown>
let consumed: boolean
let tokenRequest: URLSearchParams | undefined
let invalidSignature: boolean

function jwt() {
  const input = [JSON.stringify({ alg: 'RS256', kid: 'test' }), JSON.stringify(claims)]
    .map((value) => Buffer.from(value).toString('base64url'))
    .join('.')
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`
}

beforeEach(() => {
  consumed = false
  invalidSignature = false
  tokenRequest = undefined
  claims = {
    iss: config.issuer,
    sub: 'central-user',
    aud: config.clientID,
    nonce: flow().nonce,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)
      if (url.includes('.well-known'))
        return Response.json({
          issuer: config.issuer,
          authorization_endpoint: `${config.issuer}/oauth/authorize`,
          token_endpoint: `${config.issuer}/oauth/token`,
          jwks_uri: `${config.issuer}/.well-known/jwks.json`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post'],
          code_challenge_methods_supported: ['S256'],
        })
      if (url.endsWith('/keys')) return Response.json({ keys: [jwk] })
      if (url.endsWith('/oauth/token')) {
        tokenRequest = new URLSearchParams(init?.body as URLSearchParams)
        if (consumed) return Response.json({ error: 'invalid_grant' }, { status: 400 })
        consumed = true
        let token = jwt()
        if (invalidSignature) {
          const parts = token.split('.')
          parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1)
          token = parts.join('.')
        }
        return Response.json({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: token,
        })
      }
      throw new Error('Unexpected mock endpoint')
    }),
  )
  // Distinct JWKS URI avoids treating JWKS as the discovery document.
  const baseFetch = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn(async (...args: Parameters<typeof fetch>) => {
      if (String(args[0]).endsWith('/.well-known/jwks.json')) return Response.json({ keys: [jwk] })
      return baseFetch(...args)
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('actual OIDC client against a controlled provider', () => {
  it('requests code flow, PKCE S256, nonce and state without exposing a secret', async () => {
    const url = await authorizationURL(config, flow())
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe(flow().state)
    expect(url.searchParams.get('nonce')).toBe(flow().nonce)
    expect(url.href).not.toContain(config.clientSecret)
  })
  it('verifies the signed identity and exchanges a code only once', async () => {
    const url = new URL(`${config.callback}?code=once&state=${flow().state}`)
    const identity = await exchangeCode(config, url, flow())
    expect(identity.subject).toBe('central-user')
    expect(tokenRequest?.get('code_verifier')).toBe(flow().verifier)
    expect(tokenRequest?.get('redirect_uri')).toBe(config.callback)
    await expect(exchangeCode(config, url, flow())).rejects.toThrow()
  })
  it.each(['nonce', 'iss', 'aud'])('rejects the wrong %s', async (claim) => {
    claims[claim] = 'wrong'
    await expect(
      exchangeCode(config, new URL(`${config.callback}?code=once&state=${flow().state}`), flow()),
    ).rejects.toThrow()
  })
  it('rejects expired identity tokens', async () => {
    claims.exp = 1
    await expect(
      exchangeCode(config, new URL(`${config.callback}?code=once&state=${flow().state}`), flow()),
    ).rejects.toThrow()
  })
  it('rejects a forged ID-token signature', async () => {
    invalidSignature = true
    await expect(
      exchangeCode(config, new URL(`${config.callback}?code=once&state=${flow().state}`), flow()),
    ).rejects.toThrow()
  })
  it('rejects state mismatch before exchanging tokens', async () => {
    await expect(
      exchangeCode(config, new URL(`${config.callback}?code=once&state=wrong`), flow()),
    ).rejects.toThrow()
    expect(tokenRequest).toBeUndefined()
  })
  it('rejects missing/expired login flow and a foreign callback', async () => {
    await expect(
      exchangeCode(config, new URL(config.callback), { ...flow(), expiresAt: 1 }),
    ).rejects.toThrow()
    await expect(
      exchangeCode(config, new URL('https://evil.test/sso/callback'), flow()),
    ).rejects.toThrow()
  })
})
