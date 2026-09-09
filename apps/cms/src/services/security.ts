import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export interface PreviewClaims {
  documentID: number | string
  expiresAt: number
  jti: string
  tenantID: number | string
  userID: number | string
  versionID?: number | string
  websiteKey: string
}

export const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export const signBody = (secret: string, timestamp: string, rawBody: string): string =>
  createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')

export const verifySignedBody = ({
  maxAgeSeconds = 300,
  now = Date.now(),
  rawBody,
  secret,
  signature,
  timestamp,
}: {
  maxAgeSeconds?: number
  now?: number
  rawBody: string
  secret: string
  signature: string
  timestamp: string
}): boolean => {
  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) return false
  if (Math.abs(Math.floor(now / 1000) - timestampNumber) > maxAgeSeconds) return false
  return safeEqual(signBody(secret, timestamp, rawBody), signature)
}

export const createPreviewToken = (
  secret: string,
  claims: Omit<PreviewClaims, 'expiresAt' | 'jti'> & { ttlSeconds?: number },
): string => {
  const payload: PreviewClaims = {
    ...claims,
    expiresAt: Math.floor(Date.now() / 1000) + (claims.ttlSeconds ?? 300),
    jti: randomUUID(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export const verifyPreviewToken = (secret: string, token: string, now = Date.now()): PreviewClaims | null => {
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url')
  if (!safeEqual(expected, signature)) return null

  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PreviewClaims
    if (!claims.jti || !claims.websiteKey || claims.expiresAt < Math.floor(now / 1000)) return null
    return claims
  } catch {
    return null
  }
}

export const requiredEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const readSecretMap = (name: string): Record<string, string> => {
  const raw = requiredEnv(name)
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object.`)
  }
  return parsed as Record<string, string>
}
