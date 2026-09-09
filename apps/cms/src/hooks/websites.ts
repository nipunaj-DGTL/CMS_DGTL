import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { relationID } from '../access/policy'

const valueFromChange = (
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
  field: string,
): unknown => Object.prototype.hasOwnProperty.call(data, field) ? data[field] : originalDoc?.[field]

/**
 * A website homepage is configured after the website exists and must point to a
 * page owned by that exact website and tenant. This prevents accidental
 * cross-client content disclosure through a misconfigured homepage relation.
 */
export const validateWebsiteHomepage: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const next = { ...(data ?? {}) }
  const sourceDocument = originalDoc as Record<string, unknown> | undefined
  const homepageID = relationID(valueFromChange(next, sourceDocument, 'homepage'))
  if (!homepageID) return next

  if (operation === 'create' || !originalDoc?.id) {
    throw new APIError('Create the website first, then select a homepage that belongs to it.', 400)
  }

  const tenantID = relationID(valueFromChange(next, sourceDocument, 'tenant'))
  if (!tenantID) throw new APIError('The website must belong to a tenant before a homepage can be selected.', 400)

  const page = await req.payload.findByID({
    collection: 'pages',
    depth: 0,
    draft: true,
    id: homepageID,
    overrideAccess: true,
    req,
  })
  if (
    String(relationID(page.tenant)) !== String(tenantID) ||
    String(relationID(page.website)) !== String(originalDoc.id)
  ) {
    throw new APIError('The selected homepage must belong to this website and client.', 400)
  }

  return next
}
