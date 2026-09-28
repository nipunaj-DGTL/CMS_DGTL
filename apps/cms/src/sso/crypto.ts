import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export const randomSecret = () => randomBytes(32).toString('base64url')
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex')

export function seal(value: unknown, key: string, purpose: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv)
  cipher.setAAD(Buffer.from(purpose))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

export function unseal<T>(value: string, key: string, purpose: string): T {
  const bytes = Buffer.from(value, 'base64url')
  if (bytes.length < 29 || bytes.length > 16384) throw new Error('Invalid encrypted value')
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), bytes.subarray(0, 12))
  decipher.setAAD(Buffer.from(purpose))
  decipher.setAuthTag(bytes.subarray(12, 28))
  return JSON.parse(
    Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
  ) as T
}
