import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook } from 'payload'

import { canPublish, isCompanyUser, relationID, tenantIDsForRoles, type DgtlUserLike } from '../access/policy'
import { normalizeSlug } from '../services/slug'

type TenantRelationshipCollection = 'media' | 'pages' | 'websites'

interface TenantRelationshipGroup {
  collection: TenantRelationshipCollection
  fieldNames: readonly string[]
  mimePrefix?: 'image/' | 'video/'
}

const imageRelationshipFields = [
  'favicon',
  'featuredImage',
  'image',
  'images',
  'logo',
  'ogImage',
  'portraitImage',
  'profileImage',
  'socialImage',
] as const

const videoRelationshipFields = ['video'] as const
const unrestrictedMediaRelationshipFields = ['attachments'] as const

const pageRelationshipFields = ['page', 'resultingPage', 'servicePages', 'targetPage'] as const

const collectRelationshipIDs = (value: unknown, fieldNames: ReadonlySet<string>, result: Map<string, number | string>): void => {
  if (Array.isArray(value)) {
    for (const item of value) collectRelationshipIDs(item, fieldNames, result)
    return
  }
  if (!value || typeof value !== 'object') return

  for (const [key, nested] of Object.entries(value)) {
    if (fieldNames.has(key)) {
      const relationshipValues = Array.isArray(nested) ? nested : [nested]
      for (const relationshipValue of relationshipValues) {
        const id = relationID(relationshipValue)
        if (id !== undefined) result.set(String(id), id)
      }
      continue
    }
    collectRelationshipIDs(nested, fieldNames, result)
  }
}

const validateTenantDocumentData = async ({
  data,
  originalDoc,
  relationshipGroups,
  req,
}: {
  data: Record<string, unknown> | undefined
  originalDoc: Record<string, unknown> | undefined
  relationshipGroups: readonly TenantRelationshipGroup[]
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
}): Promise<Record<string, unknown>> => {
  const next = { ...(data ?? {}) }
  const actor = req.user as DgtlUserLike | null
  const actorTenantIDs = tenantIDsForRoles(actor, ['client-admin'])
  let tenantID = relationID(next.tenant ?? originalDoc?.tenant)

  if (actor?.accountType === 'client') {
    if (!tenantID && actorTenantIDs.length === 1) {
      tenantID = actorTenantIDs[0]
      next.tenant = tenantID
    }
    if (!tenantID || !actorTenantIDs.some((allowed) => String(allowed) === String(tenantID))) {
      throw new APIError('You cannot create or move content for another client.', 403)
    }
  }

  const websiteID = relationID(next.website ?? originalDoc?.website)
  if (!tenantID || !websiteID) throw new APIError('Content must belong to a tenant and website.', 400)

  await validateTenantRelationship({ collection: 'websites', id: websiteID, req, tenantID })

  const completeDocument = { ...(originalDoc ?? {}), ...next }
  for (const group of relationshipGroups) {
    const references = new Map<string, number | string>()
    collectRelationshipIDs(completeDocument, new Set(group.fieldNames), references)
    await Promise.all(
      [...references.values()].map((id) =>
        validateTenantRelationship({
          collection: group.collection,
          id,
          mimePrefix: group.mimePrefix,
          req,
          tenantID,
        }),
      ),
    )
  }

  return next
}

export const validateTenantDocumentRelationships = ({
  media = false,
  pages = false,
}: {
  media?: boolean
  pages?: boolean
} = {}): CollectionBeforeChangeHook => async ({ data, originalDoc, req }) =>
  validateTenantDocumentData({
    data,
    originalDoc,
    relationshipGroups: [
      ...(media
        ? [
            { collection: 'media' as const, fieldNames: imageRelationshipFields, mimePrefix: 'image/' as const },
            { collection: 'media' as const, fieldNames: videoRelationshipFields, mimePrefix: 'video/' as const },
            { collection: 'media' as const, fieldNames: unrestrictedMediaRelationshipFields },
          ]
        : []),
      ...(pages ? [{ collection: 'pages' as const, fieldNames: pageRelationshipFields }] : []),
    ],
    req,
  })

const actorSnapshot = (user: unknown): { id: number | string; name: string; type: 'client' | 'company' | 'service' } => {
  const candidate = user as { accountType?: 'client' | 'company' | 'service'; displayName?: string; email?: string; id?: number | string } | null
  return {
    id: candidate?.id ?? 'system',
    name: candidate?.displayName ?? candidate?.email ?? 'System',
    type: candidate?.accountType ?? 'service',
  }
}

export const normalizeAndValidateContent = (contentCollection: 'pages' | 'posts'): CollectionBeforeChangeHook => async ({ data, originalDoc, req }) => {
  const next = { ...(data ?? {}) }
  if (typeof next.slug === 'string') next.slug = normalizeSlug(next.slug)

  const tenantID = relationID(next.tenant ?? originalDoc?.tenant)
  const websiteID = relationID(next.website ?? originalDoc?.website)
  if (!tenantID || !websiteID) throw new APIError('A page must belong to a tenant and website.', 400)

  const website = await req.payload.findByID({
    collection: 'websites',
    depth: 0,
    id: websiteID,
    overrideAccess: true,
    req,
  })
  if (String(relationID(website.tenant)) !== String(tenantID)) {
    throw new APIError('The selected website does not belong to this tenant.', 400)
  }

  const status = next._status ?? originalDoc?._status
  if (status === 'published' && !req.context.systemOperation && !canPublish(req.user, tenantID)) {
    throw new APIError('Your role can save drafts but cannot publish.', 403)
  }

  if (status === 'published' && !next.publishedAt && !originalDoc?.publishedAt) {
    next.publishedAt = new Date().toISOString()
  }

  const slug = typeof next.slug === 'string' ? next.slug : originalDoc?.slug
  if (slug) {
    const duplicate = await req.payload.find({
      collection: contentCollection,
      depth: 0,
      draft: true,
      limit: 1,
      overrideAccess: true,
      req,
      where: {
        and: [
          { website: { equals: websiteID } },
          { slug: { equals: slug } },
          ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
        ],
      },
    })
    if (duplicate.totalDocs > 0) throw new APIError('This slug already exists for the selected website.', 409)
  }

  return next
}

const isPublicContentDocument = (document: Record<string, unknown> | null | undefined): boolean =>
  document?._status === 'published' && !document.archivedAt

const publicPathForSlug = (slug: unknown): string | null => {
  if (typeof slug !== 'string' || !slug) return null
  return slug === 'home' ? '/' : `/${slug}`
}

type PublicationTransition = 'archived' | 'published' | 'republished' | 'unpublished'

export const contentPublicationTransition = (
  doc: Record<string, unknown>,
  previousDoc?: Record<string, unknown> | null,
): PublicationTransition | null => {
  const isPublic = isPublicContentDocument(doc)
  const wasPublic = isPublicContentDocument(previousDoc)

  if (!isPublic && !wasPublic) return null
  if (isPublic && wasPublic) return 'republished'
  if (isPublic) return 'published'
  return doc.archivedAt ? 'archived' : 'unpublished'
}

export const recordPublication: CollectionAfterChangeHook = async ({ collection, doc, operation, previousDoc, req }) => {
  const transition = contentPublicationTransition(doc, previousDoc)
  if (!transition) return doc

  const tenantID = relationID(doc.tenant ?? previousDoc?.tenant)
  const websiteID = relationID(doc.website ?? previousDoc?.website)
  if (!tenantID || !websiteID) return doc

  const website = await req.payload.findByID({
    collection: 'websites',
    depth: 0,
    id: websiteID,
    overrideAccess: true,
    req,
  })
  const websiteKey = typeof website.key === 'string' ? website.key : String(website.id)
  const slug = typeof doc.slug === 'string'
    ? doc.slug
    : typeof previousDoc?.slug === 'string'
      ? previousDoc.slug
      : String(doc.id)
  const previousSlug = typeof previousDoc?.slug === 'string' ? previousDoc.slug : null
  const actor = actorSnapshot(req.user)
  const action = `${collection.slug}.${transition}`
  const timestamp = new Date().toISOString()
  const cachePaths = [...new Set([
    publicPathForSlug(slug),
    publicPathForSlug(previousSlug),
  ].filter((path): path is string => Boolean(path)))]
  const cacheTags = [...new Set([
    `cms:site:${websiteKey}`,
    `cms:site:${websiteKey}:${collection.slug}:${slug}`,
    ...(previousSlug && previousSlug !== slug
      ? [`cms:site:${websiteKey}:${collection.slug}:${previousSlug}`]
      : []),
  ])]
  const summaryVerb = transition === 'archived'
    ? 'Archived'
    : transition === 'unpublished'
      ? 'Unpublished'
      : transition === 'republished'
        ? 'Republished'
        : 'Published'
  const changedFields = transition === 'archived'
    ? ['archivedAt']
    : transition === 'unpublished'
      ? ['_status']
      : operation === 'create'
        ? ['created', '_status']
        : ['content', '_status']

  await Promise.all([
    req.payload.create({
      collection: 'activity-events',
      data: {
        action,
        actorDisplayName: actor.name,
        actorID: String(actor.id),
        actorType: actor.type,
        changedFields,
        outcome: 'succeeded',
        summary: `${summaryVerb} ${collection.slug} “${doc.title ?? previousDoc?.title ?? slug}”`,
        targetCollection: collection.slug,
        targetID: String(doc.id),
        tenant: tenantID as number,
        timestamp,
        website: websiteID as number,
      },
      overrideAccess: true,
      req,
    }),
    req.payload.create({
      collection: 'revalidation-deliveries',
      data: {
        attemptCount: 0,
        cachePaths,
        cacheTags,
        eventType: action,
        idempotencyKey: `${collection.slug}:${doc.id}:${transition}:${doc.updatedAt}`,
        sourceCollection: collection.slug,
        sourceDocumentID: String(doc.id),
        state: 'pending',
        tenant: tenantID as number,
        website: websiteID as number,
      },
      overrideAccess: true,
      req,
    }),
  ])

  return doc
}

export const recordConfigurationChange: CollectionAfterChangeHook = async ({ collection, doc, operation, req }) => {
  const tenantID = relationID(doc.tenant)
  const websiteID = relationID(doc.website)
  if (!tenantID || !websiteID) return doc

  const website = await req.payload.findByID({
    collection: 'websites',
    depth: 0,
    id: websiteID,
    overrideAccess: true,
    req,
  })
  const websiteKey = typeof website.key === 'string' ? website.key : String(website.id)
  const actor = actorSnapshot(req.user)
  const timestamp = new Date().toISOString()

  await Promise.all([
    req.payload.create({
      collection: 'activity-events',
      data: {
        action: `${collection.slug}.changed`,
        actorDisplayName: actor.name,
        actorID: String(actor.id),
        actorType: actor.type,
        changedFields: [operation],
        outcome: 'succeeded',
        summary: `Updated ${collection.slug} for ${website.displayName ?? websiteKey}`,
        targetCollection: collection.slug,
        targetID: String(doc.id),
        tenant: tenantID as number,
        timestamp,
        website: websiteID as number,
      },
      overrideAccess: true,
      req,
    }),
    req.payload.create({
      collection: 'revalidation-deliveries',
      data: {
        attemptCount: 0,
        cachePaths: ['/'],
        cacheTags: [`cms:site:${websiteKey}`, `cms:site:${websiteKey}:${collection.slug}`],
        eventType: `${collection.slug}.changed`,
        idempotencyKey: `${collection.slug}:${doc.id}:${doc.updatedAt}`,
        sourceCollection: collection.slug,
        sourceDocumentID: String(doc.id),
        state: 'pending',
        tenant: tenantID as number,
        website: websiteID as number,
      },
      overrideAccess: true,
      req,
    }),
  ])

  return doc
}

export const validateTenantRelationship = async ({
  collection,
  id,
  mimePrefix,
  req,
  tenantID,
}: {
  collection: 'media' | 'pages' | 'websites'
  id: unknown
  mimePrefix?: 'image/' | 'video/'
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  tenantID: unknown
}): Promise<void> => {
  const relation = relationID(id)
  const tenant = relationID(tenantID)
  if (!relation || !tenant) return
  const target = await req.payload.findByID({ collection, depth: 0, id: relation, overrideAccess: true, req })
  if (String(relationID(target.tenant)) !== String(tenant)) {
    throw new APIError(`The selected ${collection} record belongs to another tenant.`, 400)
  }
  if (collection === 'media' && mimePrefix) {
    const mediaTarget = target as { mimeType?: unknown }
    const mimeType = typeof mediaTarget.mimeType === 'string' ? mediaTarget.mimeType.toLowerCase() : ''
    if (!mimeType.startsWith(mimePrefix)) {
      const expected = mimePrefix === 'image/' ? 'image' : 'video'
      const article = expected === 'image' ? 'an' : 'a'
      throw new APIError(`This field requires ${article} ${expected} media file.`, 400)
    }
  }
}

export const companyOnlyOnPublished = (user: unknown): boolean => isCompanyUser(user)
