import { createHmac, timingSafeEqual } from 'node:crypto'

export interface PreviewClaims {
  documentID: number | string
  expiresAt: number
  jti: string
  tenantID: number | string
  userID: number | string
  websiteKey: string
}

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export const verifyDelivery = ({
  rawBody,
  secret,
  signature,
  timestamp,
}: {
  rawBody: string
  secret: string
  signature: string
  timestamp: string
}): boolean => {
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > 300) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  return safeEqual(expected, signature)
}

export const verifyPreviewToken = (token: string, secret: string): PreviewClaims | null => {
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url')
  if (!safeEqual(expected, signature)) return null
  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PreviewClaims
    return claims.expiresAt >= Math.floor(Date.now() / 1000) ? claims : null
  } catch {
    return null
  }
}
