import type { MultiTenantPluginConfig } from '@payloadcms/plugin-multi-tenant/types'
import type { Access, FieldAccess, PayloadRequest } from 'payload'

export const companyRoles = ['company-super-admin'] as const
export const clientRoles = ['client-admin'] as const

export type CompanyRole = (typeof companyRoles)[number]
export type ClientRole = (typeof clientRoles)[number]

export interface TenantAssignment {
  roles?: ClientRole[] | null
  tenant?: { id?: number | string } | number | string | null
}

export interface DgtlUserLike {
  accountType?: 'client' | 'company' | 'service' | null
  companyRoles?: CompanyRole[] | null
  id?: number | string
  status?: 'active' | 'invited' | 'suspended' | null
  tenants?: TenantAssignment[] | null
}

export const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : undefined
  }
  return undefined
}

export const isCompanyUser = (user: unknown): boolean => {
  const candidate = user as DgtlUserLike | null
  return Boolean(
    candidate?.accountType === 'company' &&
    candidate.status === 'active' &&
    candidate.companyRoles?.some((role) => companyRoles.includes(role)),
  )
}

export const hasCompanyRole = (user: unknown, role: CompanyRole): boolean => {
  const candidate = user as DgtlUserLike | null
  return isCompanyUser(candidate) && Boolean(candidate?.companyRoles?.includes(role))
}

export const tenantIDsForRoles = (
  user: unknown,
  roles: readonly ClientRole[] = clientRoles,
): Array<number | string> => {
  const candidate = user as DgtlUserLike | null
  if (!candidate || candidate.accountType !== 'client' || candidate.status !== 'active') return []

  return (candidate.tenants ?? [])
    .filter((assignment) => assignment.roles?.some((role) => roles.includes(role)))
    .map((assignment) => relationID(assignment.tenant))
    .filter((id): id is number | string => id !== undefined)
}

type AuthorizationRequest = Pick<PayloadRequest, 'payload' | 'user'> &
  Partial<Pick<PayloadRequest, 'context'>>

/**
 * Authentication claims can outlive an account or tenant status change. Always
 * reload the user before authorizing a request so suspension takes effect for
 * existing sessions, not only after the user signs in again.
 */
export const currentUserForRequest = async (
  req: AuthorizationRequest,
): Promise<DgtlUserLike | null> => {
  const user = req.user as DgtlUserLike | null
  const userID = relationID(user)
  if (!userID) return null

  try {
    return (await req.payload.findByID({
      collection: 'cms-users',
      depth: 0,
      id: userID,
      overrideAccess: true,
      req: req as PayloadRequest,
    })) as DgtlUserLike
  } catch {
    // A deleted account, unavailable lookup, or malformed session must never
    // fall back to the stale JWT claims.
    return null
  }
}

export const activeTenantIDsForUser = async (
  req: AuthorizationRequest,
  user: unknown,
  roles: readonly ClientRole[] = clientRoles,
): Promise<Array<number | string>> => {
  const assignedTenantIDs = tenantIDsForRoles(user, roles)
  if (assignedTenantIDs.length === 0) return []

  const result = await req.payload.find({
    collection: 'dgtl-tenants',
    depth: 0,
    limit: assignedTenantIDs.length,
    overrideAccess: true,
    req: req as PayloadRequest,
    where: {
      and: [{ id: { in: assignedTenantIDs } }, { status: { equals: 'active' } }],
    },
  })

  return result.docs
    .map((tenant) => relationID(tenant))
    .filter((id): id is number | string => id !== undefined)
}

export const activeTenantIDsForRequest = async (
  req: AuthorizationRequest,
  roles: readonly ClientRole[] = clientRoles,
): Promise<Array<number | string>> => {
  const user = await currentUserForRequest(req)
  return activeTenantIDsForUser(req, user, roles)
}

export const isCurrentCompanyUser = async (req: AuthorizationRequest): Promise<boolean> =>
  isCompanyUser(await currentUserForRequest(req))

export const hasCurrentCompanyRole = async (
  req: AuthorizationRequest,
  role: CompanyRole,
): Promise<boolean> => hasCompanyRole(await currentUserForRequest(req), role)

export const canAccessCMSAdmin = async (req: AuthorizationRequest): Promise<boolean> => {
  const user = await currentUserForRequest(req)
  if (isCompanyUser(user)) return true
  return (await activeTenantIDsForUser(req, user, ['client-admin'])).length > 0
}

const scopedWhere = (tenantIDs: Array<number | string>) =>
  tenantIDs.length > 0 ? { tenant: { in: tenantIDs } } : false

export const tenantReadAccess: Access = async ({ req }) => {
  if (await isCurrentCompanyUser(req)) return true
  return scopedWhere(await activeTenantIDsForRequest(req))
}

// The tenant directory collection is the tenant record itself, so it must be
// scoped by its primary key rather than by the `tenant` field injected into
// tenant-enabled content collections.
export const tenantDirectoryReadAccess: Access = async ({ req }) => {
  if (await isCurrentCompanyUser(req)) return true
  const tenantIDs = await activeTenantIDsForRequest(req)
  return tenantIDs.length > 0 ? { id: { in: tenantIDs } } : false
}

// Payload's PostgreSQL adapter cannot safely apply the plugin's nested
// `tenants.tenant` user filter while the authenticated user document itself is
// being loaded. Client accounts therefore receive the narrower self-only user
// policy; content collections remain tenant-scoped by their direct field.
export const usersTenantAccessOverride: NonNullable<
  MultiTenantPluginConfig['usersAccessResultOverride']
> = async ({ accessKey, accessResult, req }) => {
  if (!req.user) return false
  const user = await currentUserForRequest(req)
  if (isCompanyUser(user)) return accessResult
  if (!user || (await activeTenantIDsForUser(req, user, ['client-admin'])).length === 0)
    return false
  if (['read', 'update'].includes(accessKey)) return { id: { equals: user.id } }
  return false
}

export const tenantContentWriteAccess: Access = async ({ req }) => {
  if (await isCurrentCompanyUser(req)) return true
  return scopedWhere(await activeTenantIDsForRequest(req, ['client-admin']))
}

// Create access cannot be secured with a document query because there is no
// stored document to filter yet. Collection hooks validate and assign the
// submitted tenant and website before the record is written.
export const tenantContentCreateAccess: Access = async ({ req }) =>
  (await isCurrentCompanyUser(req)) ||
  (await activeTenantIDsForRequest(req, ['client-admin'])).length > 0

// The multi-tenant plugin adds its own `version.tenant` predicate for version
// tables. Returning the normal `{ tenant: ... }` filter here produces an
// invalid versions query in Payload's SQL adapter.
export const tenantVersionReadAccess: Access = async ({ req }) =>
  (await isCurrentCompanyUser(req)) || (await activeTenantIDsForRequest(req)).length > 0

export const tenantAdminAccess: Access = async ({ req }) => {
  if (await hasCurrentCompanyRole(req, 'company-super-admin')) return true
  return scopedWhere(await activeTenantIDsForRequest(req, ['client-admin']))
}

export const companyAccess: Access = ({ req }) => isCurrentCompanyUser(req)
export const superAdminAccess: Access = ({ req }) =>
  hasCurrentCompanyRole(req, 'company-super-admin')
export const denyAccess: Access = () => false

export const superAdminFieldAccess: FieldAccess = ({ req }) =>
  hasCurrentCompanyRole(req, 'company-super-admin')

export const companyFieldAccess: FieldAccess = ({ req }) => isCurrentCompanyUser(req)

export const canPublish = (user: unknown, tenantID?: number | string): boolean => {
  if (isCompanyUser(user)) return true
  if (tenantID === undefined) return false
  return tenantIDsForRoles(user, ['client-admin']).some((id) => String(id) === String(tenantID))
}
