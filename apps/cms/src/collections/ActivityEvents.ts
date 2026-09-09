import type { CollectionConfig } from 'payload'

import { denyAccess, tenantReadAccess } from '../access/policy'

export const ActivityEvents: CollectionConfig = {
  slug: 'activity-events',
  access: { create: denyAccess, delete: denyAccess, read: tenantReadAccess, update: denyAccess },
  admin: { defaultColumns: ['timestamp', 'actorDisplayName', 'action', 'summary', 'outcome'], group: 'Operations', useAsTitle: 'summary' },
  fields: [
    { name: 'website', type: 'relationship', relationTo: 'websites' },
    { name: 'actorID', type: 'text', required: true },
    { name: 'actorDisplayName', type: 'text', required: true },
    { name: 'actorType', type: 'select', options: ['company', 'client', 'service'], required: true },
    { name: 'action', type: 'text', index: true, required: true },
    { name: 'targetCollection', type: 'text', required: true },
    { name: 'targetID', type: 'text', required: true },
    { name: 'summary', type: 'text', required: true },
    { name: 'requestID', type: 'text' },
    { name: 'outcome', type: 'select', options: ['succeeded', 'failed', 'denied'], required: true },
    { name: 'timestamp', type: 'date', required: true },
    { name: 'changedFields', type: 'text', hasMany: true },
  ],
  timestamps: false,
}
