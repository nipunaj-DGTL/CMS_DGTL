import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildMediaObjectKey,
  getMediaCachePolicy,
  getMediaStorageConfiguration,
  InvalidMediaRangeError,
  parseMediaByteRange,
} from '../../src/services/media-storage'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('media storage policy', () => {
  it('builds a tenant-safe storage key', () => {
    expect(buildMediaObjectKey('hero-image.webp')).toBe('media/hero-image.webp')
    expect(buildMediaObjectKey('hero-image.webp', 'client-01/pages')).toBe('client-01/pages/hero-image.webp')
    expect(() => buildMediaObjectKey('hero-image.webp', '../private')).toThrow('Invalid media storage path')
  })

  it('parses complete, bounded, open, and suffix byte ranges', () => {
    expect(parseMediaByteRange(null, 100)).toEqual({ end: 99, start: 0, status: 200 })
    expect(parseMediaByteRange('bytes=10-19', 100)).toEqual({ end: 19, start: 10, status: 206 })
    expect(parseMediaByteRange('bytes=90-', 100)).toEqual({ end: 99, start: 90, status: 206 })
    expect(parseMediaByteRange('bytes=-10', 100)).toEqual({ end: 99, start: 90, status: 206 })
  })

  it('rejects malformed or unsatisfiable byte ranges', () => {
    for (const range of ['items=0-1', 'bytes=', 'bytes=100-101', 'bytes=10-9', 'bytes=0-1,4-5', 'bytes=-0']) {
      expect(() => parseMediaByteRange(range, 100)).toThrow(InvalidMediaRangeError)
    }
  })

  it('forbids local media storage in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CMS_MEDIA_STORAGE', 'local')
    expect(() => getMediaStorageConfiguration()).toThrow('Local media storage is not allowed in production')
  })

  it('requires all private object-storage credentials', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CMS_MEDIA_STORAGE', 's3')
    vi.stubEnv('CMS_MEDIA_ACCESS_KEY_ID', '')
    vi.stubEnv('CMS_MEDIA_BUCKET', '')
    expect(() => getMediaStorageConfiguration()).toThrow('CMS_MEDIA_ACCESS_KEY_ID is required')
  })

  it('caches only checksum-versioned media immutably and rejects stale versions', () => {
    const checksum = 'a'.repeat(64)
    expect(getMediaCachePolicy({
      checksum,
      hasRange: false,
      ifNoneMatch: null,
      requestedVersion: checksum,
    })).toMatchObject({
      cacheControl: 'public, max-age=31536000, immutable',
      etag: `"${checksum}"`,
      versionMismatch: false,
    })
    expect(getMediaCachePolicy({
      checksum,
      hasRange: false,
      ifNoneMatch: null,
      requestedVersion: 'b'.repeat(64),
    }).versionMismatch).toBe(true)
    expect(getMediaCachePolicy({
      checksum,
      hasRange: false,
      ifNoneMatch: null,
      requestedVersion: null,
    }).cacheControl).toBe('public, max-age=0, must-revalidate')
  })

  it('returns a conditional cache hit only for full-file requests', () => {
    const checksum = 'c'.repeat(64)
    expect(getMediaCachePolicy({
      checksum,
      hasRange: false,
      ifNoneMatch: `W/"${checksum}"`,
      requestedVersion: checksum,
    }).notModified).toBe(true)
    expect(getMediaCachePolicy({
      checksum,
      hasRange: true,
      ifNoneMatch: `"${checksum}"`,
      requestedVersion: checksum,
    }).notModified).toBe(false)
  })
})
