import { afterEach, describe, expect, it, vi } from 'vitest'

import { deliverRevalidation, runRevalidationCycle } from '../../src/jobs/revalidation'

type UpdateArgs = {
  data: Record<string, unknown>
  id: number | string
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('revalidation delivery worker', () => {
  it('records a missing website binding as a retry instead of throwing', async () => {
    process.env.CMS_REVALIDATION_SECRETS = JSON.stringify({})
    const update = vi.fn(async ({ data }: UpdateArgs) => data)
    const payload = { update } as never

    const outcome = await deliverRevalidation(payload, {
      attemptCount: 0,
      id: 1,
      website: { key: 'missing-binding' },
    })

    expect(outcome).toBe('retrying')
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptCount: 1,
          lastSafeError: 'Revalidation binding is not configured.',
          state: 'retrying',
        }),
        id: 1,
      }),
    )
  })

  it('continues to the next delivery when one website is misconfigured', async () => {
    process.env.CMS_REVALIDATION_SECRETS = JSON.stringify({ healthy: 'delivery-secret' })
    const update = vi.fn(async ({ data }: UpdateArgs) => data)
    const payload = {
      find: vi.fn(async () => ({
        docs: [
          {
            attemptCount: 0,
            cachePaths: ['/bad'],
            cacheTags: ['cms:site:bad'],
            eventType: 'pages.published',
            id: 1,
            sourceDocumentID: '10',
            website: { key: 'bad' },
          },
          {
            attemptCount: 0,
            cachePaths: ['/good'],
            cacheTags: ['cms:site:healthy'],
            eventType: 'pages.published',
            id: 2,
            sourceDocumentID: '20',
            website: {
              key: 'healthy',
              revalidationUrl: 'https://healthy.example/api/cms/revalidate',
            },
          },
        ],
      })),
      logger: { error: vi.fn() },
      update,
    }
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await runRevalidationCycle(payload as never, new Date('2026-09-08T12:00:00.000Z')),
    ).toEqual({
      processed: 2,
      recordingFailures: 0,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(
      update.mock.calls.some(([args]) => args.id === 1 && args.data.state === 'retrying'),
    ).toBe(true)
    expect(
      update.mock.calls.some(([args]) => args.id === 2 && args.data.state === 'succeeded'),
    ).toBe(true)
  })

  it('reports recording failures and still signals cycle progress', async () => {
    const onProgress = vi.fn()
    const logger = { error: vi.fn() }
    const payload = {
      find: vi.fn(async () => ({
        docs: [{ attemptCount: 0, id: 9, website: { key: 'unavailable' } }],
      })),
      logger,
      update: vi.fn(async () => {
        throw new Error('database write failed')
      }),
    }

    await expect(
      runRevalidationCycle(payload as never, new Date('2026-09-08T12:00:00.000Z'), onProgress),
    ).resolves.toEqual({ processed: 1, recordingFailures: 1 })
    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryID: '9' }),
      expect.stringContaining('could not be recorded'),
    )
  })

  it('stops between deliveries after shutdown is requested', async () => {
    process.env.CMS_REVALIDATION_SECRETS = JSON.stringify({ healthy: 'delivery-secret' })
    let stopping = false
    const payload = {
      find: vi.fn(async () => ({
        docs: [
          {
            attemptCount: 0,
            cachePaths: ['/first'],
            cacheTags: ['cms:site:healthy'],
            eventType: 'pages.published',
            id: 1,
            sourceDocumentID: '10',
            website: {
              key: 'healthy',
              revalidationUrl: 'https://healthy.example/api/cms/revalidate',
            },
          },
          {
            attemptCount: 0,
            cachePaths: ['/second'],
            cacheTags: ['cms:site:healthy'],
            eventType: 'pages.published',
            id: 2,
            sourceDocumentID: '20',
            website: {
              key: 'healthy',
              revalidationUrl: 'https://healthy.example/api/cms/revalidate',
            },
          },
        ],
      })),
      logger: { error: vi.fn() },
      update: vi.fn(async ({ data }: UpdateArgs) => data),
    }
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      runRevalidationCycle(
        payload as never,
        new Date('2026-09-08T12:00:00.000Z'),
        () => {
          stopping = true
        },
        () => stopping,
      ),
    ).resolves.toEqual({ processed: 1, recordingFailures: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(payload.update).not.toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })

  it('records the response status and stops retrying after the fifth attempt', async () => {
    process.env.CMS_REVALIDATION_SECRETS = JSON.stringify({ healthy: 'delivery-secret' })
    const update = vi.fn(async ({ data }: UpdateArgs) => data)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    )

    const outcome = await deliverRevalidation({ update } as never, {
      attemptCount: 4,
      cachePaths: ['/'],
      cacheTags: ['cms:site:healthy'],
      eventType: 'pages.published',
      id: 3,
      sourceDocumentID: '30',
      website: { key: 'healthy', revalidationUrl: 'https://healthy.example/api/cms/revalidate' },
    })

    expect(outcome).toBe('failed')
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptCount: 5,
          nextAttemptAt: null,
          responseStatus: 503,
          state: 'failed',
        }),
        id: 3,
      }),
    )
  })
})
