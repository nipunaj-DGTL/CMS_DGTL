import { createHmac, randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }))

import { POST, validateCacheTargets } from '../src/app/api/cms/revalidate/route'

const secret = 'route-test-revalidation-secret'
const websiteKey = 'client-01-main'

const signedRequest = (deliveryID: string, body: string) => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return new Request('http://localhost:3101/api/cms/revalidate', {
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-DGTL-Delivery-ID': deliveryID,
      'X-DGTL-Signature': signature,
      'X-DGTL-Timestamp': timestamp,
    },
    method: 'POST',
  })
}

beforeEach(() => {
  process.env.CMS_REVALIDATION_SECRET = secret
  process.env.CMS_WEBSITE_KEY = websiteKey
  revalidatePath.mockClear()
  revalidateTag.mockClear()
})

describe('website revalidation route', () => {
  it('strictly validates, bounds, and deduplicates cache targets', () => {
    expect(validateCacheTargets({ paths: ['/', '/'], tags: [`cms:site:${websiteKey}`, `cms:site:${websiteKey}`] }, websiteKey)).toEqual({
      paths: ['/'],
      tags: [`cms:site:${websiteKey}`],
    })
    expect(validateCacheTargets({ paths: ['/', 3], tags: [] }, websiteKey)).toBeNull()
    expect(validateCacheTargets({ paths: ['/safe?bad=true'], tags: [] }, websiteKey)).toBeNull()
    expect(validateCacheTargets({ paths: [], tags: ['cms:site:another-client'] }, websiteKey)).toBeNull()
    expect(validateCacheTargets({ paths: [], tags: [`cms:site:${websiteKey}-lookalike`] }, websiteKey)).toBeNull()
  })

  it('returns idempotent success for a duplicate signed delivery', async () => {
    const deliveryID = randomUUID()
    const body = JSON.stringify({ paths: ['/about'], tags: [`cms:site:${websiteKey}:pages:about`], websiteKey })

    const first = await POST(signedRequest(deliveryID, body))
    const duplicate = await POST(signedRequest(deliveryID, body))

    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ duplicate: false, revalidated: true })
    expect(duplicate.status).toBe(200)
    expect(await duplicate.json()).toMatchObject({ duplicate: true, revalidated: true })
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledTimes(1)
  })
})
