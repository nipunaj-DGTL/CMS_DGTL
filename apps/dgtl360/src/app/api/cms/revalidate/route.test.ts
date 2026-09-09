import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => cacheMocks);

import { POST } from './route';

const secret = 'revalidation-unit-test-secret';

const requestFor = (body: object, deliveryID: string): Request => {
  const raw = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  return new Request('https://dgtl.lk/api/cms/revalidate', {
    body: raw,
    headers: {
      'content-type': 'application/json',
      'x-dgtl-delivery-id': deliveryID,
      'x-dgtl-signature': signature,
      'x-dgtl-timestamp': timestamp,
    },
    method: 'POST',
  });
};

describe('CMS revalidation route', () => {
  beforeEach(() => {
    vi.stubEnv('CMS_REVALIDATION_SECRET', secret);
    vi.stubEnv('CMS_WEBSITE_KEY', 'client-02-main');
    cacheMocks.revalidatePath.mockReset();
    cacheMocks.revalidateTag.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('revalidates only signed targets bound to this website', async () => {
    const result = await POST(requestFor({
      paths: ['/about'],
      tags: ['cms:site:client-02-main', 'cms:site:client-02-main:pages:about'],
      websiteKey: 'client-02-main',
    }, 'delivery-valid-1'));

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({ duplicate: false, revalidated: true });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/about');
    expect(cacheMocks.revalidateTag).toHaveBeenCalledTimes(2);
  });

  it('acknowledges an already processed delivery without replaying work', async () => {
    const body = { paths: ['/about'], tags: [], websiteKey: 'client-02-main' };
    expect((await POST(requestFor(body, 'delivery-duplicate-1'))).status).toBe(200);
    const duplicate = await POST(requestFor(body, 'delivery-duplicate-1'));

    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toEqual({ duplicate: true, revalidated: false });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('rejects cross-site cache tags even when the body is authentically signed', async () => {
    const result = await POST(requestFor({
      paths: ['/'],
      tags: ['cms:site:client-02-main-evil'],
      websiteKey: 'client-02-main',
    }, 'delivery-unsafe-1'));

    expect(result.status).toBe(400);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests before cache invalidation', async () => {
    const result = await POST(new Request('https://dgtl.lk/api/cms/revalidate', {
      body: '{}',
      headers: {
        'content-type': 'application/json',
        'x-dgtl-delivery-id': 'delivery-forged-1',
        'x-dgtl-signature': '0'.repeat(64),
        'x-dgtl-timestamp': String(Math.floor(Date.now() / 1000)),
      },
      method: 'POST',
    }));

    expect(result.status).toBe(401);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(cacheMocks.revalidateTag).not.toHaveBeenCalled();
  });
});

