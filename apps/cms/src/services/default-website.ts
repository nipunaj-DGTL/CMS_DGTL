import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'
import type { PayloadRequest } from 'payload'

import { relationID, tenantIDsForRoles } from '../access/policy'

const currentTenantID = (req: PayloadRequest): number | string | undefined => {
  const clientTenantIDs = tenantIDsForRoles(req.user, ['client-admin'])
  if (clientTenantIDs.length === 1) return clientTenantIDs[0]

  const cookieTenantID = getTenantFromCookie(req.headers, 'number')
  return relationID(cookieTenantID)
}

/**
 * Preselect the website when the current tenant owns exactly one website.
 * This keeps the create form simple for both company and client admins while
 * leaving the selector available for tenants that intentionally own many sites.
 */
export const defaultWebsiteForCurrentTenant = async ({ req }: { req: PayloadRequest }) => {
  const tenantID = currentTenantID(req)
  if (tenantID === undefined) return undefined

  const websites = await req.payload.find({
    collection: 'websites',
    depth: 0,
    limit: 2,
    overrideAccess: false,
    req,
    user: req.user,
    where: { tenant: { equals: tenantID } },
  })

  return websites.totalDocs === 1 ? websites.docs[0]?.id : undefined
}
