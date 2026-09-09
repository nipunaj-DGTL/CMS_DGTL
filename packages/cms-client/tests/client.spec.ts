import { describe, expect, it, vi } from 'vitest'

import { CMSClientError, DGTLClient } from '../src/index'

const postFixture = {
  authorDisplayName: 'DGTL Editorial',
  categories: ['News'],
  contractVersion: 1,
  excerpt: 'An update.',
  featuredImage: null,
  id: 'post-1',
  layout: [{ blockType: 'statement', heading: 'Headline', kicker: 'News', text: 'Body' }],
  publishedAt: '2026-09-08T06:00:00.000Z',
  seo: { metaDescription: null, metaTitle: null, noIndex: false, ogImage: null },
  slug: 'news/an update',
  title: 'An update',
  updatedAt: '2026-09-08T06:30:00.000Z',
  websiteKey: 'client-01-main',
}

describe('DGTLClient', () => {
  it('keeps the website token server-side in an authorization header', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-token')
      return Response.json({
        contractVersion: 1,
        displayName: 'Client 01',
        domain: 'client-01.example.test',
        key: 'client-01-main',
        status: 'active',
      })
    }) as unknown as typeof fetch

    const client = new DGTLClient({
      baseURL: 'http://cms.test',
      fetchImpl,
      readToken: 'secret-token',
      websiteKey: 'client-01-main',
    })

    await expect(client.getWebsite()).resolves.toMatchObject({ key: 'client-01-main' })
  })

  it('fetches and validates a post by an encoded nested slug with cache options', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('http://cms.test/api/dgtl/public/v1/sites/client-01-main/posts/news/an%20update')
      expect(new Headers(init?.headers).get('X-DGTL-Website-Key')).toBe('client-01-main')
      expect(init?.cache).toBe('force-cache')
      expect((init as RequestInit & { next?: unknown }).next).toEqual({
        revalidate: 120,
        tags: ['cms:site:client-01-main:posts:news/an update'],
      })
      return Response.json(postFixture)
    }) as unknown as typeof fetch
    const client = new DGTLClient({
      baseURL: 'http://cms.test/',
      fetchImpl,
      readToken: 'secret-token',
      websiteKey: 'client-01-main',
    })

    await expect(client.getPost('/news/an update/', {
      next: { revalidate: 120, tags: ['cms:site:client-01-main:posts:news/an update'] },
    })).resolves.toMatchObject({ id: 'post-1', title: 'An update' })
  })

  it('fetches a bounded post page and validates the list contract', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('http://cms.test/api/dgtl/public/v1/sites/client-01-main/posts?page=2&limit=5')
      expect((init as RequestInit & { next?: unknown }).next).toEqual({ tags: ['cms:site:client-01-main:posts'] })
      return Response.json({
        contractVersion: 1,
        pagination: {
          hasNextPage: false,
          hasPrevPage: true,
          limit: 5,
          nextPage: null,
          page: 2,
          prevPage: 1,
          totalDocs: 6,
          totalPages: 2,
        },
        posts: [postFixture],
        websiteKey: 'client-01-main',
      })
    }) as unknown as typeof fetch
    const client = new DGTLClient({
      baseURL: 'http://cms.test',
      fetchImpl,
      readToken: 'secret-token',
      websiteKey: 'client-01-main',
    })

    await expect(client.getPosts({ limit: 5, next: { tags: ['cms:site:client-01-main:posts'] }, page: 2 }))
      .resolves.toMatchObject({ pagination: { page: 2 }, posts: [{ id: 'post-1' }] })
  })

  it('rejects invalid pagination before making a network request', () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const client = new DGTLClient({
      baseURL: 'http://cms.test',
      fetchImpl,
      readToken: 'secret-token',
      websiteKey: 'client-01-main',
    })

    expect(() => client.getPosts({ limit: 51 })).toThrow(RangeError)
    expect(() => client.getPosts({ page: 0 })).toThrow(RangeError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails closed when the CMS returns an incompatible post contract', async () => {
    const client = new DGTLClient({
      baseURL: 'http://cms.test',
      fetchImpl: vi.fn(async () => Response.json({ ...postFixture, layout: [{ blockType: 'unknown' }] })) as unknown as typeof fetch,
      readToken: 'secret-token',
      websiteKey: 'client-01-main',
    })

    await expect(client.getPost('news/an-update')).rejects.toMatchObject({
      code: 'CMS_CONTRACT_INVALID',
      name: CMSClientError.name,
      status: 502,
    })
  })
})
