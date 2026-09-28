import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { inspectUploadedMedia } from '../services/malware-scan'

export const scanUploadedMedia: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const next = { ...(data ?? {}) }

  // Scan only a newly supplied binary. Metadata-only updates retain the trusted,
  // server-generated checksum and scan state stored on the existing document.
  if (!req.file?.data?.length) {
    if (operation === 'create') throw new APIError('A media file is required.', 400)
    // The storage adapter performs a second update after uploading to S3/R2.
    // Keep the persisted values in that update so required-field validation
    // succeeds, but never trust scan fields supplied by a metadata-only caller.
    for (const field of ['checksum', 'scanStatus'] as const) {
      if (originalDoc?.[field] !== undefined) next[field] = originalDoc[field]
      else delete next[field]
    }
    return next
  }

  try {
    const result = await inspectUploadedMedia(req.file.data, req.file.mimetype)
    next.checksum = result.checksum
    next.scanStatus = result.scanStatus
    return next
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The media file could not be scanned.'
    req.payload.logger.error({ err: error, msg: 'Media upload rejected before persistence.' })
    throw new APIError(message, 422)
  }
}
