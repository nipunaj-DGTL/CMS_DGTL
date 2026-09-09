import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

export const MEDIA_COLLECTION_PREFIX = 'media'

export type MediaStorageConfiguration =
  | {
      kind: 'local'
    }
  | {
      accessKeyID: string
      bucket: string
      endpoint: string
      forcePathStyle: boolean
      kind: 's3'
      region: string
      secretAccessKey: string
    }

export interface MediaByteRange {
  end: number
  start: number
  status: 200 | 206
}

export interface StoredMediaObject {
  body: ReadableStream<Uint8Array>
  contentLength: number
  contentRange?: string
  etag?: string
  lastModified?: Date
  status: 200 | 206
  totalSize: number
}

export interface MediaCachePolicy {
  cacheControl: string
  etag?: string
  notModified: boolean
  versionMismatch: boolean
}

export class InvalidMediaRangeError extends Error {
  readonly totalSize: number

  constructor(totalSize: number) {
    super('The requested byte range is invalid.')
    this.name = 'InvalidMediaRangeError'
    this.totalSize = totalSize
  }
}

const requiredEnvironmentValue = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required when CMS_MEDIA_STORAGE=s3.`)
  return value
}

export const getMediaStorageConfiguration = (): MediaStorageConfiguration => {
  const configuredMode = process.env.CMS_MEDIA_STORAGE?.trim().toLowerCase()
  const mode = configuredMode || (process.env.NODE_ENV === 'production' ? 's3' : 'local')

  if (mode === 'local') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Local media storage is not allowed in production. Set CMS_MEDIA_STORAGE=s3.')
    }
    return { kind: 'local' }
  }

  if (mode !== 's3') throw new Error('CMS_MEDIA_STORAGE must be either "local" or "s3".')

  return {
    accessKeyID: requiredEnvironmentValue('CMS_MEDIA_ACCESS_KEY_ID'),
    bucket: requiredEnvironmentValue('CMS_MEDIA_BUCKET'),
    endpoint: requiredEnvironmentValue('CMS_MEDIA_ENDPOINT'),
    forcePathStyle: process.env.CMS_MEDIA_FORCE_PATH_STYLE === 'true',
    kind: 's3',
    region: process.env.CMS_MEDIA_REGION?.trim() || 'auto',
    secretAccessKey: requiredEnvironmentValue('CMS_MEDIA_SECRET_ACCESS_KEY'),
  }
}

const safePathSegment = (segment: string): string => {
  const trimmed = segment.trim()
  if (!trimmed || trimmed === '.' || trimmed === '..' || !/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new Error('Invalid media storage path.')
  }
  return trimmed
}

export const buildMediaObjectKey = (filename: string, documentPrefix?: null | string): string => {
  const safeFilename = safePathSegment(path.posix.basename(filename.replaceAll('\\', '/')))
  const rawPrefix = documentPrefix?.trim() || MEDIA_COLLECTION_PREFIX
  const prefixSegments = rawPrefix
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .map(safePathSegment)

  return [...prefixSegments, safeFilename].join('/')
}

export const parseMediaByteRange = (rangeHeader: null | string, totalSize: number): MediaByteRange => {
  if (!Number.isSafeInteger(totalSize) || totalSize <= 0) throw new InvalidMediaRangeError(Math.max(totalSize, 0))
  if (!rangeHeader) return { end: totalSize - 1, start: 0, status: 200 }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match || (!match[1] && !match[2])) throw new InvalidMediaRangeError(totalSize)

  let start: number
  let end: number

  if (!match[1]) {
    const suffixLength = Number(match[2])
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) throw new InvalidMediaRangeError(totalSize)
    start = Math.max(0, totalSize - suffixLength)
    end = totalSize - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : totalSize - 1
  }

  end = Math.min(end, totalSize - 1)
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= totalSize
  ) {
    throw new InvalidMediaRangeError(totalSize)
  }

  return { end, start, status: 206 }
}

const normalizedEntityTag = (value: string): string => value.trim().replace(/^W\//, '')

/**
 * A checksum query makes the delivery URL content-addressed and therefore safe
 * to cache immutably. Unversioned legacy URLs must always revalidate. A stale
 * checksum is rejected so new bytes can never be cached under an old immutable
 * URL after an editor replaces a Media document's binary.
 */
export const getMediaCachePolicy = ({
  checksum,
  hasRange,
  ifNoneMatch,
  requestedVersion,
}: {
  checksum?: null | string
  hasRange: boolean
  ifNoneMatch: null | string
  requestedVersion: null | string
}): MediaCachePolicy => {
  const normalizedChecksum =
    typeof checksum === 'string' && /^[a-f0-9]{64}$/i.test(checksum)
      ? checksum.toLowerCase()
      : undefined
  const versionMismatch = Boolean(
    requestedVersion && normalizedChecksum && requestedVersion.toLowerCase() !== normalizedChecksum,
  )
  const isVersioned = Boolean(
    requestedVersion && normalizedChecksum && requestedVersion.toLowerCase() === normalizedChecksum,
  )
  const etag = normalizedChecksum ? `"${normalizedChecksum}"` : undefined
  const candidates = (ifNoneMatch ?? '')
    .split(',')
    .map(normalizedEntityTag)
    .filter(Boolean)
  const notModified = Boolean(
    !hasRange && etag && (candidates.includes('*') || candidates.includes(normalizedEntityTag(etag))),
  )

  return {
    cacheControl: isVersioned
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
    ...(etag ? { etag } : {}),
    notModified,
    versionMismatch,
  }
}

let cachedS3Client: S3Client | null = null
let cachedS3ClientKey = ''

const getS3Client = (configuration: Extract<MediaStorageConfiguration, { kind: 's3' }>): S3Client => {
  const cacheKey = `${configuration.endpoint}|${configuration.region}|${configuration.accessKeyID}|${configuration.forcePathStyle}`
  if (cachedS3Client && cachedS3ClientKey === cacheKey) return cachedS3Client

  cachedS3Client?.destroy()
  cachedS3Client = new S3Client({
    credentials: {
      accessKeyId: configuration.accessKeyID,
      secretAccessKey: configuration.secretAccessKey,
    },
    endpoint: configuration.endpoint,
    forcePathStyle: configuration.forcePathStyle,
    region: configuration.region,
  })
  cachedS3ClientKey = cacheKey
  return cachedS3Client
}

const bodyToWebStream = (body: unknown): ReadableStream<Uint8Array> => {
  if (body instanceof Readable) return Readable.toWeb(body) as ReadableStream<Uint8Array>
  if (body instanceof Uint8Array) return new Response(body).body as ReadableStream<Uint8Array>
  if (body && typeof body === 'object' && 'transformToWebStream' in body) {
    const transform = (body as { transformToWebStream?: () => ReadableStream<Uint8Array> }).transformToWebStream
    if (typeof transform === 'function') return transform.call(body)
  }
  throw new Error('The media storage provider returned an unsupported response body.')
}

const readLocalMedia = async ({
  filename,
  rangeHeader,
}: {
  filename: string
  rangeHeader: null | string
}): Promise<StoredMediaObject> => {
  const mediaRoot = path.resolve(process.cwd(), 'media')
  const safeFilename = safePathSegment(path.basename(filename))
  const filePath = path.resolve(mediaRoot, safeFilename)
  if (!filePath.startsWith(`${mediaRoot}${path.sep}`)) throw new Error('Invalid media path.')

  const fileStats = await stat(filePath)
  const byteRange = parseMediaByteRange(rangeHeader, fileStats.size)
  const body = Readable.toWeb(createReadStream(filePath, { end: byteRange.end, start: byteRange.start })) as ReadableStream<Uint8Array>

  return {
    body,
    contentLength: byteRange.end - byteRange.start + 1,
    ...(byteRange.status === 206
      ? { contentRange: `bytes ${byteRange.start}-${byteRange.end}/${fileStats.size}` }
      : {}),
    lastModified: fileStats.mtime,
    status: byteRange.status,
    totalSize: fileStats.size,
  }
}

const readS3Media = async ({
  configuration,
  filename,
  prefix,
  rangeHeader,
}: {
  configuration: Extract<MediaStorageConfiguration, { kind: 's3' }>
  filename: string
  prefix?: null | string
  rangeHeader: null | string
}): Promise<StoredMediaObject> => {
  const client = getS3Client(configuration)
  const key = buildMediaObjectKey(filename, prefix)
  const head = await client.send(new HeadObjectCommand({ Bucket: configuration.bucket, Key: key }))
  const totalSize = head.ContentLength
  if (typeof totalSize !== 'number') throw new Error('The media storage provider did not return a file size.')

  const byteRange = parseMediaByteRange(rangeHeader, totalSize)
  const range = byteRange.status === 206 ? `bytes=${byteRange.start}-${byteRange.end}` : undefined
  const object = await client.send(new GetObjectCommand({ Bucket: configuration.bucket, Key: key, Range: range }))
  if (!object.Body) throw new Error('The media storage provider returned an empty response.')

  return {
    body: bodyToWebStream(object.Body),
    contentLength: object.ContentLength ?? byteRange.end - byteRange.start + 1,
    ...(byteRange.status === 206
      ? { contentRange: object.ContentRange ?? `bytes ${byteRange.start}-${byteRange.end}/${totalSize}` }
      : {}),
    etag: object.ETag ?? head.ETag,
    lastModified: object.LastModified ?? head.LastModified,
    status: byteRange.status,
    totalSize,
  }
}

export const readStoredMedia = async ({
  filename,
  prefix,
  rangeHeader,
}: {
  filename: string
  prefix?: null | string
  rangeHeader: null | string
}): Promise<StoredMediaObject> => {
  const configuration = getMediaStorageConfiguration()
  if (configuration.kind === 'local') return readLocalMedia({ filename, rangeHeader })
  return readS3Media({ configuration, filename, prefix, rangeHeader })
}
