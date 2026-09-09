import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { getPayloadMock } = vi.hoisted(() => ({ getPayloadMock: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: getPayloadMock }))
vi.mock('@/services/public-api', async () => import('../../src/services/public-api'))
vi.mock('@/services/slug', async () => import('../../src/services/slug'))

import { GET as getPostList } from '../../src/app/api/dgtl/public/v1/sites/[websiteKey]/posts/route'
import { GET as getPostBySlug } from '../../src/app/api/dgtl/public/v1/sites/[websiteKey]/posts/[...slug]/route'

const previousTokenMap = process.env.CMS_WEBSITE_READ_TOKENS

const website = {
  displayName: 'Client 01',
  id: 7,
  key: 'client-01-main',
  status: 'active',
  tenant: { id: 3, status: 'active' },
}

const post = {
  authorDisplayName: 'DGTL Editorial',
  categories: ['News'],
  excerpt: 'A public update.',
  featuredImage: null,
  id: 21,
  layout: [{ blockType: 'statement', heading: 'Update', kicker: 'News', text: 'Published body.' }],
  publishedAt: '2026-09-08T06:00:00.000Z',
  seo: { metaDescription: null, metaTitle: null, noIndex: false, ogImage: null },
  slug: 'news/public-update',
  title: 'Public update',
  updatedAt: '2026-09-08T06:30:00.000Z',
}

const request = (path: string): Request => new Request(`http://cms.test${path}`, {
  headers: {
    Authorization: 'Bearer read-token',
    'X-DGTL-Website-Key': 'client-01-main',
  },
})

beforeEach(() => {
  getPayloadMock.mockReset()
  process.env.CMS_WEBSITE_READ_TOKENS = JSON.stringify({ 'client-01-main': 'read-token' })
})

afterAll(() => {
  if (previousTokenMap === undefined) delete process.env.CMS_WEBSITE_READ_TOKENS
  else process.env.CMS_WEBSITE_READ_TOKENS = previousTokenMap
})

describe('public post route handlers', () => {
  it('returns a bounded page containing only the website’s public query result', async () => {
    const find = vi.fn()
      .mockResolvedValueOnce({ docs: [website] })
      .mockResolvedValueOnce({
        docs: [post],
        hasNextPage: true,
        hasPrevPage: false,
        limit: 5,
        nextPage: 2,
        page: 1,
        prevPage: null,
        totalDocs: 6,
        totalPages: 2,
      })
    getPayloadMock.mockResolvedValue({ find })

    const response = await getPostList(
      request('/api/dgtl/public/v1/sites/client-01-main/posts?page=1&limit=5'),
      { params: Promise.resolve({ websiteKey: 'client-01-main' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-DGTL-Contract-Version')).toBe('1')
    expect(body).toMatchObject({
      pagination: { limit: 5, page: 1, totalDocs: 6 },
      posts: [{ id: '21', slug: 'news/public-update' }],
      websiteKey: 'client-01-main',
    })
    expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({
      collection: 'posts',
      draft: false,
      limit: 5,
      page: 1,
      sort: '-publishedAt',
      where: {
        and: [
          { website: { equals: 7 } },
          { _status: { equals: 'published' } },
          { archivedAt: { exists: false } },
        ],
      },
    }))
  })

  it('authenticates before exposing pagination validation details', async () => {
    getPayloadMock.mockResolvedValue({ find: vi.fn() })
    const response = await getPostList(
      new Request('http://cms.test/api/dgtl/public/v1/sites/client-01-main/posts?limit=999'),
      { params: Promise.resolve({ websiteKey: 'client-01-main' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns a nested-slug post only through the published/non-archived query', async () => {
    const find = vi.fn()
      .mockResolvedValueOnce({ docs: [website] })
      .mockResolvedValueOnce({ docs: [post] })
    getPayloadMock.mockResolvedValue({ find })

    const response = await getPostBySlug(
      request('/api/dgtl/public/v1/sites/client-01-main/posts/news/public-update'),
      { params: Promise.resolve({ slug: ['news', 'public-update'], websiteKey: 'client-01-main' }) },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ id: '21', slug: 'news/public-update', websiteKey: 'client-01-main' })
    expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({
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
})
