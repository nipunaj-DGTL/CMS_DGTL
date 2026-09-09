import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeDeleteHook } from 'payload'

import {
  hasCompanyRole,
  relationID,
  type DgtlUserLike,
  type TenantAssignment,
} from '../access/policy'

const clientAdminCountAfterChange = async ({
  ignoredUserID,
  req,
  tenantID,
}: {
  ignoredUserID?: number | string
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  tenantID: number | string
}): Promise<number> => {
  const result = await req.payload.find({
    collection: 'cms-users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
    where: {
      and: [
        { accountType: { equals: 'client' } },
        { status: { equals: 'active' } },
        { 'tenants.tenant': { equals: tenantID } },
        { 'tenants.roles': { contains: 'client-admin' } },
        ...(ignoredUserID ? [{ id: { not_equals: ignoredUserID } }] : []),
      ],
    },
  })
  return result.totalDocs
}

const assignmentTenantIDs = (
  assignments: TenantAssignment[] | null | undefined,
): Array<number | string> =>
  (assignments ?? [])
    .map((assignment) => relationID(assignment.tenant))
    .filter((id): id is number | string => id !== undefined)

const activeClientAdminTenantIDs = (
  user: DgtlUserLike | null | undefined,
): Array<number | string> => {
  if (user?.accountType !== 'client' || user.status !== 'active') return []
  return assignmentTenantIDs(
    (user.tenants ?? []).filter((assignment) => assignment.roles?.includes('client-admin')),
  )
}

const protectLastActiveClientAdmin = async ({
  next,
  originalDoc,
  req,
}: {
  next: Record<string, unknown>
  originalDoc: Record<string, unknown>
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
}): Promise<void> => {
  const beforeTenantIDs = activeClientAdminTenantIDs(originalDoc as DgtlUserLike)
  if (beforeTenantIDs.length === 0) return

  const afterTenantIDs = new Set(
    activeClientAdminTenantIDs({ ...originalDoc, ...next } as DgtlUserLike).map(String),
  )

  for (const tenantID of beforeTenantIDs) {
    if (afterTenantIDs.has(String(tenantID))) continue
    const remaining = await clientAdminCountAfterChange({
      ignoredUserID: originalDoc.id as number | string,
      req,
      tenantID,
    })
    if (remaining === 0) {
      throw new APIError('Every client must retain at least one active client company admin.', 409)
    }
  }
}

export const protectUserAssignments: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const actor = req.user as DgtlUserLike | null
  const next = { ...(data ?? {}) }
  if (typeof next.email === 'string') next.email = next.email.trim().toLowerCase()

  if (operation === 'create') {
    next.invitedBy = actor?.id ?? null
  }

  if (typeof next.password === 'string' && next.password.length > 0) {
    next.passwordChangedAt = new Date().toISOString()
  }

  // Payload's signed verification endpoint is the acceptance step for an
  // invitation. Once the address is verified, make the invited account usable
  // without requiring a second manual status edit by a super administrator.
  if (operation === 'update' && originalDoc?.status === 'invited' && next._verified === true) {
    next.status = 'active'
  }

  // The trusted login audit writes only lastLoginAt. Avoid reprocessing user
  // assignments or the last-admin invariant for this internal update.
  if (req.context.authenticationAuditOperation) return next

  const accountType = next.accountType ?? originalDoc?.accountType
  if (accountType === 'company') {
    next.companyRoles = ['company-super-admin']
    next.tenants = []
  } else if (accountType === 'client') {
    next.companyRoles = []
    const assignments = (next.tenants ?? originalDoc?.tenants ?? []) as TenantAssignment[]
    if (
      assignments.some((assignment) => assignment.roles?.some((role) => role !== 'client-admin'))
    ) {
      throw new APIError('Client accounts can only use the client company admin role.', 400)
    }
  }

  if (actor && !hasCompanyRole(actor, 'company-super-admin')) {
    const isSelfUpdate =
      operation === 'update' &&
      originalDoc?.id !== undefined &&
      actor.id !== undefined &&
      String(originalDoc.id) === String(actor.id)

    if (!isSelfUpdate) {
      throw new APIError('Only a super admin can create or manage CMS user accounts.', 403)
    }

    // Client Admin access is deliberately self-only. They may change ordinary
    // profile/authentication values, but never their account state, role, or
    // tenant assignments—even when those fields are submitted directly.
    next.accountType = originalDoc.accountType
    next.companyRoles = originalDoc.companyRoles
    next.status = originalDoc.status
    next.tenants = originalDoc.tenants
    return next
  }

  if (operation === 'update' && originalDoc?.id !== undefined) {
    await protectLastActiveClientAdmin({ next, originalDoc, req })
  }

  return next
}

export const preventLastClientAdminDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const target = await req.payload.findByID({
    collection: 'cms-users',
    depth: 0,
    id,
    overrideAccess: true,
    req,
  })
  for (const tenantID of activeClientAdminTenantIDs(target as DgtlUserLike)) {
    const remaining = await clientAdminCountAfterChange({ ignoredUserID: id, req, tenantID })
    if (remaining === 0)
      throw new APIError('The last active client company admin cannot be deleted.', 409)
  }
}
