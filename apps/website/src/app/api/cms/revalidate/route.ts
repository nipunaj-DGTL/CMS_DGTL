import { revalidatePath, revalidateTag } from 'next/cache'

import { websiteEnv } from '../../../../lib/env'
import { verifyDelivery } from '../../../../lib/signatures'

type RevalidationState = typeof globalThis & {
  __dgtlProcessedRevalidationDeliveries?: Map<string, number>
}

const replayWindowMilliseconds = 86_400_000
const maximumReplayReceipts = 10_000
const sharedState = globalThis as RevalidationState
const processedDeliveries = sharedState.__dgtlProcessedRevalidationDeliveries ?? new Map<string, number>()
sharedState.__dgtlProcessedRevalidationDeliveries = processedDeliveries

const json = (body: unknown, status = 200) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status })

const pruneProcessedDeliveries = (now = Date.now()) => {
  for (const [id, processedAt] of processedDeliveries) {
    if (now - processedAt > replayWindowMilliseconds) processedDeliveries.delete(id)
  }
  while (processedDeliveries.size > maximumReplayReceipts) {
    const oldest = processedDeliveries.keys().next().value as string | undefined
    if (!oldest) break
    processedDeliveries.delete(oldest)
  }
}

export const validateCacheTargets = (
  value: { paths?: unknown; tags?: unknown },
  websiteKey: string,
): { paths: string[]; tags: string[] } | null => {
  if (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === 'string')) return null
  if (!Array.isArray(value.paths) || !value.paths.every((path) => typeof path === 'string')) return null

  const tags = value.tags as string[]
  const paths = value.paths as string[]
  const siteTag = `cms:site:${websiteKey}`
  if (
    tags.length > 20 ||
    paths.length > 20 ||
    tags.some((tag) => tag !== siteTag && !tag.startsWith(`${siteTag}:`)) ||
    paths.some((path) => !path.startsWith('/') || path.includes('..') || path.includes('?'))
  ) return null

  return { paths: [...new Set(paths)], tags: [...new Set(tags)] }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const timestamp = request.headers.get('x-dgtl-timestamp') ?? ''
  const deliveryID = request.headers.get('x-dgtl-delivery-id') ?? ''
  const signature = request.headers.get('x-dgtl-signature') ?? ''
  const requestID = crypto.randomUUID()

  if (!deliveryID || !verifyDelivery({ rawBody, secret: websiteEnv.revalidationSecret(), signature, timestamp })) {
    return json({ error: 'Invalid signature.', requestId: requestID }, 401)
  }

  let body: { paths?: unknown; tags?: unknown; websiteKey?: unknown }
  try {
    body = JSON.parse(rawBody) as typeof body
  } catch {
    return json({ error: 'Invalid JSON body.', requestId: requestID }, 400)
  }

  const websiteKey = websiteEnv.websiteKey()
  if (body.websiteKey !== websiteKey) return json({ error: 'Wrong website binding.', requestId: requestID }, 403)
  const targets = validateCacheTargets(body, websiteKey)
  if (!targets) return json({ error: 'Unsafe cache target.', requestId: requestID }, 400)

  pruneProcessedDeliveries()
  if (processedDeliveries.has(deliveryID)) {
    // Cache invalidation is idempotent. A success response lets the durable CMS
    // queue finish when its first response was lost after this site processed it.
    return json({ duplicate: true, revalidated: true, requestId: requestID })
  }

  try {
    // Revalidation arrives from the CMS webhook, so expire the matching fetches
    // immediately. The `max` profile would intentionally serve one stale response.
    for (const tag of targets.tags) revalidateTag(tag, { expire: 0 })
    for (const path of targets.paths) revalidatePath(path)
    processedDeliveries.set(deliveryID, Date.now())
    pruneProcessedDeliveries()
    return json({ duplicate: false, revalidated: true, requestId: requestID })
  } catch {
    return json({ error: 'Cache invalidation failed.', requestId: requestID }, 500)
  }
}
