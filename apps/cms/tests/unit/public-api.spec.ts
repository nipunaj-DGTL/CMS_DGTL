import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  buildNavigationItems,
  findPublishedPost,
  mapBlock,
  mapPost,
  mapSiteSettings,
  parsePostPagination,
  PublicAPIError,
} from '../../src/services/public-api'

describe('public navigation', () => {
  it('keeps configured order and appends eligible CMS pages without duplicating home', () => {
    const items = buildNavigationItems(
      [
        { enabled: true, label: 'Contact us', order: 20, page: { slug: 'contact' } },
        { enabled: true, label: 'Home', order: 0, page: { slug: 'home' } },
      ],
      [
        { _status: 'published', showInNavigation: true, slug: 'home', title: 'Homepage' },
        { _status: 'published', showInNavigation: true, slug: 'about', title: 'About us' },
      ],
    )

    expect(items.map(({ label, url }) => ({ label, url }))).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Contact us', url: '/contact' },
      { label: 'About us', url: '/about' },
    ])
  })

  it('respects disabled configured links and rejects draft, archived, or opted-out pages', () => {
    const items = buildNavigationItems(
      [{ enabled: false, label: 'Hidden manually', page: { slug: 'reserved' } }],
      [
        { _status: 'published', showInNavigation: true, slug: 'reserved', title: 'Reserved' },
        { _status: 'draft', showInNavigation: true, slug: 'draft', title: 'Draft' },
        { _status: 'published', archivedAt: '2026-09-07T00:00:00.000Z', showInNavigation: true, slug: 'archived', title: 'Archived' },
        { _status: 'published', showInNavigation: false, slug: 'private', title: 'Private' },
      ],
    )

    expect(items).toEqual([])
  })

  it('does not duplicate a configured child or repeated automatic slug', () => {
    const items = buildNavigationItems(
      [{
        children: [{ enabled: true, label: 'About child', page: { slug: 'about' } }],
        enabled: true,
        externalURL: 'https://example.test',
        label: 'Resources',
      }],
      [
        { _status: 'published', showInNavigation: true, slug: 'about', title: 'About us' },
        { _status: 'published', showInNavigation: true, slug: 'team', title: 'Team' },
        { _status: 'published', showInNavigation: true, slug: 'team', title: 'Team duplicate' },
      ],
    )

    expect(items).toHaveLength(2)
    expect(items[0]?.children).toEqual([{ label: 'About child', newTab: false, url: '/about' }])
    expect(items[1]).toEqual({ children: [], label: 'Team', newTab: false, url: '/team' })
  })
})

const postFixture = {
  authorDisplayName: 'DGTL Editorial',
  categories: ['News'],
  excerpt: 'A public update.',
  featuredImage: {
    alt: 'Editorial cover',
    checksum: 'd'.repeat(64),
    classification: 'public',
    height: 630,
    id: 41,
    mimeType: 'image/jpeg',
    scanStatus: 'clean',
    url: '/media/editorial-cover.jpg',
    width: 1200,
  },
  id: 21,
  layout: [{ blockType: 'statement', heading: 'Update', kicker: 'News', text: 'Published body.' }],
  publishedAt: '2026-09-08T06:00:00.000Z',
  seo: { metaDescription: 'Post SEO', metaTitle: 'Post title', noIndex: false },
  slug: 'news/public-update',
  title: 'Public update',
  updatedAt: '2026-09-08T06:30:00.000Z',
}

describe('public posts', () => {
  it('maps the complete public post contract and website-scoped media URL', () => {
    const post = mapPost(postFixture, 'client-01-main')

    expect(post).toMatchObject({
      authorDisplayName: 'DGTL Editorial',
      categories: ['News'],
      contractVersion: 1,
      excerpt: 'A public update.',
      slug: 'news/public-update',
      websiteKey: 'client-01-main',
    })
    expect(post.featuredImage?.url).toContain('/api/dgtl/public/v1/sites/client-01-main/media/41')
    expect(post.featuredImage?.url).toContain(`?v=${'d'.repeat(64)}`)
    expect(post.layout[0]).toMatchObject({ blockType: 'statement', heading: 'Update' })
  })

  it('fails closed for unknown or malformed published blocks', () => {
    for (const block of [{ blockType: 'futureBlock' }, { blockType: 'hero', links: [] }]) {
      try {
        mapBlock(block, 'client-01-main')
        throw new Error('Expected mapping to fail')
      } catch (error) {
        expect(error).toBeInstanceOf(PublicAPIError)
        expect((error as PublicAPIError).code).toBe('CONTENT_CONTRACT_INVALID')
      }
    }
  })

  it('uses bounded positive pagination defaults and rejects abusive values', () => {
    expect(parsePostPagination(new URLSearchParams())).toEqual({ limit: 12, page: 1 })
    expect(parsePostPagination(new URLSearchParams('limit=50&page=10000'))).toEqual({ limit: 50, page: 10000 })

    for (const query of ['limit=0', 'limit=51', 'limit=2.5', 'page=0', 'page=10001', 'page=abc']) {
      expect(() => parsePostPagination(new URLSearchParams(query))).toThrow(PublicAPIError)
    }
  })

  it('queries only the requested website’s published, non-archived post', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [postFixture] })
    const post = await findPublishedPost({
      payload: { find } as unknown as Payload,
      slug: 'news/public-update',
      website: { id: 7 },
    })

    expect(post).toBe(postFixture)
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'posts',
      draft: false,
      overrideAccess: true,
      where: {
        and: [
          { website: { equals: 7 } },
          { slug: { equals: 'news/public-update' } },
          { _status: { equals: 'published' } },
          { archivedAt: { exists: false } },
        ],
      },
    }))
  })

  it('returns the same not-found response for absent posts', async () => {
    await expect(findPublishedPost({
      payload: { find: vi.fn().mockResolvedValue({ docs: [] }) } as unknown as Payload,
      slug: 'missing',
      website: { id: 7 },
    })).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })
})

describe('public site settings', () => {
  it('maps branded media and operational settings while dropping unsafe URLs and references', () => {
    const settings = mapSiteSettings({
      analyticsReference: 'javascript:alert',
      defaultSEO: {
        socialImage: {
          alt: 'Social preview',
          classification: 'public',
          id: 43,
          mimeType: 'image/png',
          scanStatus: 'clean',
          url: '/media/social.png',
        },
      },
      displayName: 'Client 01',
      favicon: {
        classification: 'private-admin',
        id: 44,
        scanStatus: 'clean',
        url: '/media/private.ico',
      },
      locale: 'not a locale',
      logo: {
        alt: 'Client logo',
        classification: 'public',
        id: 42,
        mimeType: 'image/svg+xml',
        scanStatus: 'clean',
        url: '/media/logo.svg',
      },
      maintenanceEnabled: true,
      maintenanceMessage: 'We will be back shortly.',
      socialLinks: [
        { label: 'LinkedIn', url: 'https://www.linkedin.com/company/dgtl' },
        { label: 'Insecure', url: 'http://example.test/profile' },
        { label: 'Script', url: 'javascript:alert(1)' },
      ],
      timezone: 'Invalid/Timezone',
    }, 'client-01-main')

    expect(settings.analyticsReference).toBeNull()
    expect(settings.logo?.url).toContain('/sites/client-01-main/media/42')
    expect(settings.favicon).toBeNull()
    expect(settings.defaultSEO.socialImage?.url).toContain('/sites/client-01-main/media/43')
    expect(settings.socialLinks).toEqual([{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/dgtl' }])
    expect(settings).toMatchObject({
      locale: 'en',
      maintenanceEnabled: true,
      maintenanceMessage: 'We will be back shortly.',
      timezone: 'UTC',
    })
  })

  it('allows a safe analytics identifier and valid locale/timezone', () => {
    const settings = mapSiteSettings({
      analyticsReference: 'G-ABC123-TEST',
      displayName: 'Client 01',
      locale: 'en-LK',
      timezone: 'Asia/Colombo',
    }, 'client-01-main')

    expect(settings).toMatchObject({
      analyticsReference: 'G-ABC123-TEST',
      locale: 'en-LK',
      timezone: 'Asia/Colombo',
    })
  })
})
