import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { previewPathFromSlug, verifyDelivery, verifyPreviewToken } from './cms-signatures';

const secret = 'unit-test-signing-secret';

const signPreview = (claims: object): string => {
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};

describe('CMS signatures', () => {
  afterEach(() => vi.useRealTimers());

  it('accepts an authentic, current delivery and rejects tampering', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T06:00:00.000Z'));
    const body = JSON.stringify({ paths: ['/about'], websiteKey: 'client-02-main' });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

    expect(verifyDelivery(body, timestamp, signature, secret)).toBe(true);
    expect(verifyDelivery(`${body} `, timestamp, signature, secret)).toBe(false);
    expect(verifyDelivery(body, String(Number(timestamp) - 301), signature, secret)).toBe(false);
  });

  it('accepts only complete, unexpired preview claims', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T06:00:00.000Z'));
    const validClaims = {
      documentID: 42,
      expiresAt: Math.floor(Date.now() / 1000) + 300,
      tenantID: 2,
      userID: 7,
      websiteKey: 'client-02-main',
    };

    expect(verifyPreviewToken(signPreview(validClaims), secret)).toEqual(validClaims);
    expect(verifyPreviewToken(signPreview({ ...validClaims, expiresAt: 'later' }), secret)).toBeNull();
    expect(verifyPreviewToken(signPreview({ ...validClaims, websiteKey: '' }), secret)).toBeNull();
    expect(verifyPreviewToken(signPreview({ ...validClaims, expiresAt: Math.floor(Date.now() / 1000) - 1 }), secret)).toBeNull();
  });
});

describe('previewPathFromSlug', () => {
  it('keeps preview redirects on a normalized local route', () => {
    expect(previewPathFromSlug(null)).toBe('/');
    expect(previewPathFromSlug('/services/brand strategy/')).toBe('/services/brand%20strategy');
    expect(previewPathFromSlug('https://example.com')).toBeNull();
  });

  it('rejects traversal, empty segments, control characters, and excessive input', () => {
    expect(previewPathFromSlug('../admin')).toBeNull();
    expect(previewPathFromSlug('services//production')).toBeNull();
    expect(previewPathFromSlug('services\\production')).toBeNull();
    expect(previewPathFromSlug(`about\u0000us`)).toBeNull();
    expect(previewPathFromSlug('x'.repeat(501))).toBeNull();
  });
});
