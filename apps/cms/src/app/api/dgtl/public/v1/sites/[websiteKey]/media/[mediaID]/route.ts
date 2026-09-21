import config from '@payload-config'
import { getPayload } from 'payload'

import { relationID } from '@/access/policy'
import {
  getMediaCachePolicy,
  InvalidMediaRangeError,
  readStoredMedia,
} from '@/services/media-storage'

const notFound = () => Response.json(
  { error: { code: 'NOT_FOUND', message: 'The requested media was not found.' } },
  { headers: { 'Cache-Control': 'no-store' }, status: 404 },
)

export async function GET(request: Request, { params }: { params: Promise<{ mediaID: string; websiteKey: string }> }) {
  try {
    const { mediaID, websiteKey } = await params
    const payload = await getPayload({ config })
    const websites = await payload.find({
      collection: 'websites',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      where: { and: [{ key: { equals: websiteKey } }, { status: { in: ['active', 'maintenance'] } }] },
    })
    const website = websites.docs[0]
    const tenant = website?.tenant
    if (!website || !tenant || typeof tenant !== 'object' || tenant.status !== 'active') return notFound()

    const media = await payload.findByID({ collection: 'media', depth: 0, id: mediaID, overrideAccess: true })
    if (
      String(relationID(media.website)) !== String(website.id) ||
      media.classification !== 'public' ||
      media.scanStatus !== 'clean' ||
      !media.filename
    ) return notFound()

    const cachePolicy = getMediaCachePolicy({
      checksum: media.checksum,
      hasRange: Boolean(request.headers.get('range')),
      ifNoneMatch: request.headers.get('if-none-match'),
      requestedVersion: new URL(request.url).searchParams.get('v'),
    })
    if (cachePolicy.versionMismatch) return notFound()
    if (cachePolicy.notModified) {
      return new Response(null, {
        headers: {
          // Only already-authorized public, clean media reaches this branch.
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': cachePolicy.cacheControl,
          ETag: cachePolicy.etag!,
        },
        status: 304,
      })
    }

    const storedMedia = await readStoredMedia({
      filename: media.filename,
      prefix: (media as typeof media & { prefix?: null | string }).prefix,
      rangeHeader: request.headers.get('range'),
    })

    const headers = new Headers({
      // Public media must be usable by independent frontend video/WebGL clients.
      // No cookies or CMS tokens are accepted via this CORS policy.
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': cachePolicy.cacheControl,
      'Content-Length': String(storedMedia.contentLength),
      'Content-Type': media.mimeType || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })
    if (storedMedia.contentRange) headers.set('Content-Range', storedMedia.contentRange)
    if (cachePolicy.etag ?? storedMedia.etag) {
      headers.set('ETag', cachePolicy.etag ?? storedMedia.etag!)
    }
    if (storedMedia.lastModified) headers.set('Last-Modified', storedMedia.lastModified.toUTCString())

    return new Response(storedMedia.body, { headers, status: storedMedia.status })
  } catch (error) {
    if (error instanceof InvalidMediaRangeError) {
      return new Response(null, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Range': `bytes */${error.totalSize}`,
        },
        status: 416,
      })
    }
    return notFound()
  }
}
