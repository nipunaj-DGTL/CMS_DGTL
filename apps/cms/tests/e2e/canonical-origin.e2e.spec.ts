import { expect, test } from '@playwright/test'

test.describe('CMS canonical local origin', () => {
  test('redirects a wrong-host Admin navigation to the absolute canonical URL', async ({
    request,
  }) => {
    const response = await request.get(
      'http://127.0.0.1:3000/admin/collections/pages/create?depth=1',
      {
        headers: { Accept: 'text/html' },
        maxRedirects: 0,
      },
    )

    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(
      'http://localhost:3000/admin/collections/pages/create?depth=1',
    )
    expect(response.headers()['cache-control']).toBe('no-store')
  })

  test('never replays a wrong-host Server Action', async ({ request }) => {
    const response = await request.post(
      'http://127.0.0.1:3000/admin/collections/pages/create',
      {
        headers: {
          Accept: 'text/html',
          'Next-Action': 'test-action',
        },
        maxRedirects: 0,
      },
    )

    expect(response.status()).toBe(409)
    expect(response.headers().location).toBeUndefined()
    expect(response.headers()['x-dgtl-cms-canonical-url']).toBe(
      'http://localhost:3000/admin/collections/pages/create',
    )
  })

  test('leaves the canonical CMS origin and public API unchanged', async ({ request }) => {
    const [adminResponse, healthResponse] = await Promise.all([
      request.head('http://localhost:3000/admin/login', { maxRedirects: 0 }),
      request.get('http://localhost:3000/api/health'),
    ])

    expect(adminResponse.status()).toBe(200)
    expect(healthResponse.status()).toBe(200)
    await expect(healthResponse.json()).resolves.toMatchObject({ status: 'healthy' })
  })
})
