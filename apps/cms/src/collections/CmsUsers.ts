import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import {
  activeTenantIDsForUser,
  canAccessCMSAdmin,
  companyFieldAccess,
  currentUserForRequest,
  hasCurrentCompanyRole,
  relationID,
  superAdminAccess,
  superAdminFieldAccess,
  type DgtlUserLike,
} from '../access/policy'
import { preventLastClientAdminDelete, protectUserAssignments } from '../hooks/users'

const selfOrCompanyAccess = async (req: PayloadRequest): Promise<boolean | Where> => {
  const user = await currentUserForRequest(req)
  if (!user) return false
  if (user.accountType === 'company') return hasCurrentCompanyRole(req, 'company-super-admin')
  if (!(await canAccessCMSAdmin(req))) return false
  return { id: { equals: user.id } } as Where
}

export const CmsUsers: CollectionConfig = {
  slug: 'cms-users',
  access: {
    // Anonymous Admin access is needed only for Payload's login/first-user UI;
    // collection reads and writes still enforce their own authorization.
    admin: ({ req }) => !req.user || canAccessCMSAdmin(req),
    create: async ({ req }) => {
      if (await hasCurrentCompanyRole(req, 'company-super-admin')) return true
      if (req.user) return false
      const existing = await req.payload.count({ collection: 'cms-users', overrideAccess: true })
      return existing.totalDocs === 0
    },
    delete: superAdminAccess,
    read: ({ req }) => selfOrCompanyAccess(req),
    // Payload 3.88.0 defaults account unlocks to any authenticated user.
    // Keep this operation company-only so a client administrator cannot clear
    // another account's brute-force lockout (GHSA-jg8r-5jh2-v2xj).
    unlock: superAdminAccess,
    update: ({ req }) => selfOrCompanyAccess(req),
  },
  admin: {
    defaultColumns: ['displayName', 'email', 'accountType', 'status'],
    group: 'DGTL administration',
    useAsTitle: 'displayName',
  },
  auth: {
    lockTime: 15 * 60 * 1000,
    maxLoginAttempts: 5,
    tokenExpiration: 8 * 60 * 60,
    verify: process.env.NODE_ENV === 'production',
  },
  fields: [
    { name: 'displayName', type: 'text', required: true, saveToJWT: true },
    {
      name: 'accountType',
      type: 'select',
      access: {
        create: ({ req }) => !req.user || hasCurrentCompanyRole(req, 'company-super-admin'),
        update: superAdminFieldAccess,
      },
      defaultValue: 'client',
      options: [
        { label: 'Super Admin (DGTL company)', value: 'company' },
        { label: 'Client Company Admin', value: 'client' },
      ],
      required: true,
      saveToJWT: true,
    },
    {
      name: 'companyRoles',
      type: 'select',
      access: {
        create: ({ req }) => !req.user || hasCurrentCompanyRole(req, 'company-super-admin'),
        read: companyFieldAccess,
        update: superAdminFieldAccess,
      },
      hasMany: true,
      options: [{ label: 'Super Admin', value: 'company-super-admin' }],
      saveToJWT: true,
    },
    {
      name: 'status',
      type: 'select',
      access: {
        create: ({ req }) => !req.user || hasCurrentCompanyRole(req, 'company-super-admin'),
        update: superAdminFieldAccess,
      },
      defaultValue: 'invited',
      options: ['invited', 'active', 'suspended'],
      required: true,
      saveToJWT: true,
    },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true } },
    { name: 'invitedBy', type: 'relationship', relationTo: 'cms-users', admin: { readOnly: true } },
    { name: 'passwordChangedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeLogin: [
      async ({ req, user }) => {
        if ((user as DgtlUserLike).status !== 'active') {
          throw new APIError('This account is not active. Contact your administrator.', 403)
        }
        if (
          (user as DgtlUserLike).accountType === 'client' &&
          (await activeTenantIDsForUser(req, user, ['client-admin'])).length === 0
        ) {
          throw new APIError('This account is not active. Contact your administrator.', 403)
        }
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        await req.payload.update({
          collection: 'cms-users',
          context: { ...req.context, authenticationAuditOperation: true },
          data: { lastLoginAt: new Date().toISOString() },
          id: relationID(user) ?? user.id,
          overrideAccess: true,
          req,
        })
        return user
      },
    ],
    beforeChange: [protectUserAssignments],
    beforeDelete: [preventLastClientAdminDelete],
  },
}
