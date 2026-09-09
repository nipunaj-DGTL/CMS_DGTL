import type { CollectionConfig } from 'payload'

import { companyAccess, denyAccess } from '../access/policy'

export const RevalidationDeliveries: CollectionConfig = {
  slug: 'revalidation-deliveries',
  access: { create: denyAccess, delete: denyAccess, read: companyAccess, update: companyAccess },
  admin: { defaultColumns: ['createdAt', 'eventType', 'state', 'attemptCount', 'website'], group: 'Operations', useAsTitle: 'idempotencyKey' },
  fields: [
    { name: 'website', type: 'relationship', relationTo: 'websites', required: true },
    { name: 'sourceCollection', type: 'text', required: true },
    { name: 'sourceDocumentID', type: 'text', required: true },
    { name: 'sourceVersionID', type: 'text' },
    { name: 'eventType', type: 'text', required: true },
    { name: 'cacheTags', type: 'text', hasMany: true, required: true },
    { name: 'cachePaths', type: 'text', hasMany: true, required: true },
    { name: 'idempotencyKey', type: 'text', index: true, required: true, unique: true },
    { name: 'state', type: 'select', defaultValue: 'pending', options: ['pending', 'delivering', 'succeeded', 'retrying', 'failed'], required: true },
    { name: 'attemptCount', type: 'number', defaultValue: 0, min: 0, required: true },
    { name: 'nextAttemptAt', type: 'date' },
    { name: 'lastSafeError', type: 'textarea' },
    { name: 'responseStatus', type: 'number' },
    { name: 'completedAt', type: 'date' },
  ],
}
