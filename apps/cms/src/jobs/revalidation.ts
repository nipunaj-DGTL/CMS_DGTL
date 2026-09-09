/* eslint-disable @typescript-eslint/no-explicit-any -- Worker input spans generated delivery and populated website document shapes. */
import type { Payload } from 'payload'

import { readSecretMap, signBody } from '../services/security'

export const revalidationRetrySeconds = [0, 30, 120, 600, 1800] as const
export const staleDeliveryLeaseMilliseconds = 60_000

type DeliveryOutcome = 'failed' | 'retrying' | 'succeeded'

class WebsiteResponseError extends Error {
  constructor(readonly status: number) {
    super(`Website returned HTTP ${status}.`)
  }
}

const safeErrorMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : 'Unknown delivery error.').slice(0, 500)

export const deliverRevalidation = async (
  payload: Payload,
  delivery: Record<string, any>,
): Promise<DeliveryOutcome> => {
  const attempt = Number(delivery.attemptCount ?? 0) + 1
  let responseStatus: number | null = null

  try {
    await payload.update({
      collection: 'revalidation-deliveries',
      data: {
        attemptCount: attempt,
        completedAt: null,
        lastSafeError: null,
        nextAttemptAt: null,
        responseStatus: null,
        state: 'delivering',
      },
      id: delivery.id,
      overrideAccess: true,
    })

    const website =
      typeof delivery.website === 'object'
        ? delivery.website
        : await payload.findByID({
            collection: 'websites',
            depth: 0,
            id: delivery.website,
            overrideAccess: true,
          })
    const websiteKey = typeof website.key === 'string' ? website.key : ''
    const secret = websiteKey ? readSecretMap('CMS_REVALIDATION_SECRETS')[websiteKey] : undefined
    if (!secret || typeof website.revalidationUrl !== 'string' || !website.revalidationUrl) {
      throw new Error('Revalidation binding is not configured.')
    }

    const body = JSON.stringify({
      contentVersion: delivery.sourceVersionID ?? delivery.sourceDocumentID,
      event: delivery.eventType,
      paths: delivery.cachePaths,
      tags: delivery.cacheTags,
      websiteKey,
    })
    const timestamp = String(Math.floor(Date.now() / 1000))
    const response = await fetch(website.revalidationUrl, {
      body,
      headers: {
        'Content-Type': 'application/json',
        'X-DGTL-Delivery-ID': String(delivery.id),
        'X-DGTL-Signature': signBody(secret, timestamp, body),
        'X-DGTL-Timestamp': timestamp,
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })
    responseStatus = response.status
    if (!response.ok) throw new WebsiteResponseError(response.status)
    await payload.update({
      collection: 'revalidation-deliveries',
      data: {
        completedAt: new Date().toISOString(),
        lastSafeError: null,
        responseStatus: response.status,
        state: 'succeeded',
      },
      id: delivery.id,
      overrideAccess: true,
    })
    return 'succeeded'
  } catch (error) {
    const finalFailure = attempt >= revalidationRetrySeconds.length
    const outcome = finalFailure ? 'failed' : 'retrying'
    await payload.update({
      collection: 'revalidation-deliveries',
      data: {
        attemptCount: attempt,
        completedAt: null,
        lastSafeError: safeErrorMessage(error),
        nextAttemptAt: finalFailure
          ? null
          : new Date(Date.now() + revalidationRetrySeconds[attempt] * 1000).toISOString(),
        responseStatus: error instanceof WebsiteResponseError ? error.status : responseStatus,
        state: outcome,
      },
      id: delivery.id,
      overrideAccess: true,
    })
    return outcome
  }
}

export type RevalidationCycleResult = {
  processed: number
  recordingFailures: number
}

export const runRevalidationCycle = async (
  payload: Payload,
  now = new Date(),
  onProgress: () => void = () => undefined,
  shouldStop: () => boolean = () => false,
): Promise<RevalidationCycleResult> => {
  const staleBefore = new Date(now.getTime() - staleDeliveryLeaseMilliseconds).toISOString()
  const result = await payload.find({
    collection: 'revalidation-deliveries',
    depth: 1,
    limit: 10,
    overrideAccess: true,
    sort: 'createdAt',
    where: {
      or: [
        { state: { equals: 'pending' } },
        {
          and: [
            { state: { equals: 'retrying' } },
            {
              or: [
                { nextAttemptAt: { exists: false } },
                { nextAttemptAt: { less_than_equal: now.toISOString() } },
              ],
            },
          ],
        },
        {
          and: [
            { state: { equals: 'delivering' } },
            { updatedAt: { less_than_equal: staleBefore } },
          ],
        },
      ],
    },
  })
  let processed = 0
  let recordingFailures = 0
  for (const delivery of result.docs) {
    if (shouldStop()) break
    try {
      await deliverRevalidation(payload, delivery as Record<string, any>)
    } catch (error) {
      recordingFailures += 1
      payload.logger.error(
        { deliveryID: String(delivery.id), err: safeErrorMessage(error) },
        'Revalidation delivery could not be recorded; continuing the queue cycle.',
      )
    } finally {
      processed += 1
      onProgress()
    }
  }
  return { processed, recordingFailures }
}
