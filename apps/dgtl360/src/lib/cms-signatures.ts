import { createHmac, timingSafeEqual } from 'node:crypto';

type PreviewClaims = {
  documentID: number | string;
  expiresAt: number;
  tenantID: number | string;
  userID: number | string;
  websiteKey: string;
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const isIdentifier = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isSafeInteger(value)) ||
  (typeof value === 'string' && value.length > 0 && value.length <= 200);

export const verifyDelivery = (rawBody: string, timestamp: string, signature: string, secret: string) => {
  if (!/^[a-f\d]{64}$/i.test(signature) || !/^\d{10,13}$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return safeEqual(expected, signature);
};

export const previewPathFromSlug = (rawSlug: string | null): string | null => {
  const slug = rawSlug?.replace(/^\/+|\/+$/g, '') || 'home';
  const parts = slug.split('/');
  if (
    slug.length > 500 ||
    parts.some((part) => !part || part === '.' || part === '..' || /[\\\u0000-\u001f]/.test(part))
  ) return null;
  return slug === 'home' ? '/' : `/${parts.map(encodeURIComponent).join('/')}`;
};

export const verifyPreviewToken = (token: string, secret: string): PreviewClaims | null => {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!safeEqual(expected, signature)) return null;
  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<PreviewClaims>;
    const expiresAt = claims.expiresAt;
    if (
      !isIdentifier(claims.documentID) ||
      !isIdentifier(claims.tenantID) ||
      !isIdentifier(claims.userID) ||
      typeof claims.websiteKey !== 'string' ||
      !claims.websiteKey ||
      typeof expiresAt !== 'number' ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt < Math.floor(Date.now() / 1000)
    ) return null;
    return claims as PreviewClaims;
  } catch {
    return null;
  }
};
