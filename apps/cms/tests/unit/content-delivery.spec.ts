import { describe, expect, it, vi } from 'vitest'

import {
  contentPublicationTransition,
  recordPublication,
  validateTenantDocumentRelationships,
} from '../../src/hooks/content'

type CreateArgs = {
  collection: string
  data: Record<string, unknown>
}

const published = {
  _status: 'published',
  archivedAt: null,
  id: 10,
  slug: 'about',
  tenant: 1,
  title: 'About',
  updatedAt: '2026-09-08T10:00:00.000Z',
  website: 2,
}

describe('content publication delivery', () => {
  it('classifies every transition across the public boundary', () => {
    expect(contentPublicationTransition({ ...published }, undefined)).toBe('published')
    expect(contentPublicationTransition({ ...published }, published)).toBe('republished')
    expect(contentPublicationTransition({ ...published, _status: 'draft' }, published)).toBe('unpublished')
    expect(contentPublicationTransition({ ...published, archivedAt: '2026-09-08T11:00:00.000Z' }, published)).toBe('archived')
    expect(contentPublicationTransition({ ...published, _status: 'draft' }, { ...published, _status: 'draft' })).toBeNull()
  })

  it('enqueues an attributable invalidation when published content becomes a draft', async () => {
    const create = vi.fn(async ({ data }: CreateArgs) => data)
    const req = {
      payload: {
        create,
        findByID: vi.fn(async () => ({ displayName: 'Client 01 Website', id: 2, key: 'client-01-main' })),
      },
      user: { accountType: 'client', displayName: 'Client Admin', id: 7 },
    }
    const draft = { ...published, _status: 'draft', updatedAt: '2026-09-08T11:00:00.000Z' }

    await recordPublication({
      collection: { slug: 'pages' },
      doc: draft,
      operation: 'update',
      previousDoc: published,
      req,
    } as never)

    const activity = create.mock.calls.find(([args]) => args.collection === 'activity-events')?.[0].data
    const delivery = create.mock.calls.find(([args]) => args.collection === 'revalidation-deliveries')?.[0].data
    expect(activity).toMatchObject({ action: 'pages.unpublished', changedFields: ['_status'] })
    expect(delivery).toMatchObject({
      cachePaths: ['/about'],
      cacheTags: ['cms:site:client-01-main', 'cms:site:client-01-main:pages:about'],
      eventType: 'pages.unpublished',
      state: 'pending',
    })
  })

  it('invalidates both routes when a published slug changes', async () => {
    const create = vi.fn(async ({ data }: CreateArgs) => data)
    const req = {
      payload: {
        create,
        findByID: vi.fn(async () => ({ id: 2, key: 'client-01-main' })),
      },
      user: { accountType: 'company', displayName: 'Super Admin', id: 1 },
    }

    await recordPublication({
      collection: { slug: 'pages' },
      doc: { ...published, slug: 'about-us', updatedAt: '2026-09-08T12:00:00.000Z' },
      operation: 'update',
      previousDoc: published,
      req,
    } as never)

    const delivery = create.mock.calls.find(([args]) => args.collection === 'revalidation-deliveries')?.[0].data
    expect(delivery).toMatchObject({
      cachePaths: ['/about-us', '/about'],
      cacheTags: [
        'cms:site:client-01-main',
        'cms:site:client-01-main:pages:about-us',
        'cms:site:client-01-main:pages:about',
      ],
      eventType: 'pages.republished',
    })
  })
})

describe('renderable media relationship validation', () => {
  const requestForMedia = (mimeType: string) => ({
    payload: {
      findByID: vi.fn(async ({ collection }: { collection: string }) =>
        collection === 'websites'
          ? { id: 2, tenant: 1 }
          : { id: 20, mimeType, tenant: 1 }),
    },
    user: {
      accountType: 'client',
      status: 'active',
      tenants: [{ roles: ['client-admin'], tenant: 1 }],
    },
  })

  it('rejects a PDF selected for an image field', async () => {
    const hook = validateTenantDocumentRelationships({ media: true })
    await expect(hook({
      data: { layout: [{ blockType: 'hero', image: 20 }], tenant: 1, website: 2 },
      req: requestForMedia('application/pdf'),
    } as never)).rejects.toThrow(/requires an image media file/i)
  })

  it('rejects an image selected for a video field', async () => {
    const hook = validateTenantDocumentRelationships({ media: true })
    await expect(hook({
      data: { layout: [{ blockType: 'hero', video: 20 }], tenant: 1, website: 2 },
      req: requestForMedia('image/webp'),
    } as never)).rejects.toThrow(/requires a video media file/i)
  })

  it('allows a PDF in an unrestricted attachment field', async () => {
    const hook = validateTenantDocumentRelationships({ media: true })
    await expect(hook({
      data: { attachments: [20], tenant: 1, website: 2 },
      req: requestForMedia('application/pdf'),
    } as never)).resolves.toMatchObject({ attachments: [20] })
  })
})
