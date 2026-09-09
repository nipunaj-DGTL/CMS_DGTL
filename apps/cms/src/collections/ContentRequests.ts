import { APIError, type CollectionConfig } from 'payload'

import { companyFieldAccess, isCompanyUser, relationID, tenantContentCreateAccess, tenantContentWriteAccess, tenantReadAccess } from '../access/policy'
import { canClientTransitionContentRequest, canTransitionContentRequest, type ContentRequestStatus } from '../access/transitions'
import { validateTenantDocumentRelationships } from '../hooks/content'
import { prepareContentRequestComments } from '../services/content-requests'

export const ContentRequests: CollectionConfig = {
  slug: 'content-requests',
  access: { create: tenantContentCreateAccess, delete: () => false, read: tenantReadAccess, update: tenantContentWriteAccess },
  admin: { defaultColumns: ['title', 'priority', 'status', 'website', 'assignedTo'], group: 'Client service', useAsTitle: 'title' },
  fields: [
    { name: 'website', type: 'relationship', relationTo: 'websites', required: true },
    { name: 'requester', type: 'relationship', relationTo: 'cms-users', required: true, access: { update: companyFieldAccess } },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'targetPage', type: 'relationship', relationTo: 'pages' },
    { name: 'priority', type: 'select', defaultValue: 'normal', options: ['low', 'normal', 'high', 'urgent'], required: true },
    { name: 'attachments', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'assignedTo', type: 'relationship', relationTo: 'cms-users', access: { create: companyFieldAccess, update: companyFieldAccess } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'submitted',
      options: ['submitted', 'reviewing', 'needs-information', 'in-progress', 'client-review', 'completed', 'cancelled'],
      required: true,
    },
    {
      name: 'comments',
      type: 'array',
      maxRows: 200,
      fields: [
        { name: 'author', type: 'relationship', relationTo: 'cms-users', required: true },
        { name: 'message', type: 'textarea', required: true },
        { name: 'createdAt', type: 'date', required: true },
      ],
    },
    { name: 'internalNotes', type: 'textarea', access: { create: companyFieldAccess, read: companyFieldAccess, update: companyFieldAccess } },
    { name: 'requestedDueDate', type: 'date' },
    {
      name: 'completedAt',
      type: 'date',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'resultingPage',
      type: 'relationship',
      relationTo: 'pages',
      access: { create: companyFieldAccess, update: companyFieldAccess },
    },
    {
      name: 'resultingVersionID',
      type: 'text',
      access: { create: companyFieldAccess, update: companyFieldAccess },
    },
  ],
  hooks: {
    beforeChange: [
      validateTenantDocumentRelationships({ media: true, pages: true }),
      ({ data, operation, originalDoc, req }) => {
        if (!req.user) throw new APIError('You must sign in to change a content request.', 401)
        let next = { ...(data ?? {}) }
        if (operation === 'create') {
          next.requester = req.user.id
          next.status = 'submitted'
        }

        try {
          next = prepareContentRequestComments({
            data: next,
            originalDoc: originalDoc as Record<string, unknown> | undefined,
            userID: req.user.id,
          })
        } catch (error) {
          throw new APIError(error instanceof Error ? error.message : 'The request comments are invalid.', 400)
        }

        const oldStatus = originalDoc?.status as ContentRequestStatus | undefined
        const newStatus = (next.status ?? oldStatus) as ContentRequestStatus
        if (!canTransitionContentRequest(oldStatus, newStatus)) {
          throw new APIError(`Content request cannot move from ${oldStatus} to ${newStatus}.`, 409)
        }
        if (!isCompanyUser(req.user) && !canClientTransitionContentRequest(oldStatus, newStatus)) {
          throw new APIError('Client administrators can only submit or cancel requests, answer requested information, and approve or reject client-review work.', 403)
        }
        if (newStatus === 'completed' && oldStatus !== 'completed') next.completedAt = new Date().toISOString()
        else if (oldStatus !== 'completed') delete next.completedAt
        return next
      },
      async ({ data, originalDoc, req }) => {
        const next = { ...(data ?? {}) }
        const assignmentChanged = Object.prototype.hasOwnProperty.call(next, 'assignedTo')
        const assignedTo = relationID(assignmentChanged ? next.assignedTo : originalDoc?.assignedTo)
        if (!assignedTo) return next

        const assignee = await req.payload.findByID({
          collection: 'cms-users',
          depth: 0,
          id: assignedTo,
          overrideAccess: true,
          req,
        })
        if (assignee.accountType !== 'company' || assignee.status !== 'active') {
          throw new APIError('Content requests can only be assigned to an active DGTL company user.', 400)
        }
        return next
      },
    ],
  },
}
