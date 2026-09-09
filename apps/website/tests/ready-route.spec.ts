import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from '../src/app/api/ready/route'

const requiredEnvironment = {
  CMS_PREVIEW_SECRET: 'preview-secret',
  CMS_READ_TOKEN: 'read-token',
  CMS_REVALIDATION_SECRET: 'revalidation-secret',
  CMS_URL: 'https://cms.example.test/',
  CMS_WEBSITE_KEY: 'client-01-main',
  NEXT_PUBLIC_SITE_URL: 'https://client.example.test',
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Client 01 readiness', () => {
  it('fails closed when any required runtime integration value is absent', async () => {
    for (const [name, value] of Object.entries(requiredEnvironment))
      vi.stubEnv(name, value)
    vi.stubEnv('CMS_PREVIEW_SECRET', '')

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      cms: 'not-configured',
      missing: ['CMS_PREVIEW_SECRET'],
      status: 'unready',
    })
  })

  it('verifies the exact CMS contract and website binding', async () => {
    for (const [name, value] of Object.entries(requiredEnvironment))
      vi.stubEnv(name, value)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ contractVersion: 1, key: 'client-01-main' }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      cms: 'connected',
      status: 'ready',
      websiteKey: 'client-01-main',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cms.example.test/api/dgtl/public/v1/sites/client-01-main',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer read-token',
          'X-DGTL-Website-Key': 'client-01-main',
        }),
      }),
    )
  })

  it('does not expose a credential when the CMS binding is unavailable', async () => {
    for (const [name, value] of Object.entries(requiredEnvironment))
      vi.stubEnv(name, value)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const response = await GET()
    const body = JSON.stringify(await response.json())

    expect(response.status).toBe(503)
    expect(body).not.toContain('read-token')
    expect(body).not.toContain('preview-secret')
    expect(body).not.toContain('revalidation-secret')
  })
})
