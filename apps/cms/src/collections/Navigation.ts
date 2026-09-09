import { APIError, type CollectionConfig } from 'payload'

import { tenantContentCreateAccess, tenantContentWriteAccess, tenantReadAccess } from '../access/policy'
import { recordConfigurationChange, validateTenantDocumentRelationships } from '../hooks/content'
import { isSafeExternalURL } from '../services/slug'

const navigationLinkFields = [
  { name: 'label', type: 'text' as const, required: true },
  { name: 'page', type: 'relationship' as const, relationTo: 'pages' as const },
  {
    name: 'externalURL',
    type: 'text' as const,
    validate: (value: unknown) => !value || (typeof value === 'string' && isSafeExternalURL(value)) || 'Use an HTTPS, mailto, or tel URL.',
  },
  { name: 'newTab', type: 'checkbox' as const, defaultValue: false },
  { name: 'enabled', type: 'checkbox' as const, defaultValue: true },
]

export const Navigation: CollectionConfig = {
  slug: 'navigation',
  access: { create: tenantContentCreateAccess, delete: tenantContentWriteAccess, read: tenantReadAccess, update: tenantContentWriteAccess },
  admin: { defaultColumns: ['website', 'location', 'updatedAt'], group: 'Website configuration', useAsTitle: 'location' },
  fields: [
    { name: 'website', type: 'relationship', relationTo: 'websites', required: true },
    { name: 'location', type: 'select', options: ['header', 'footer'], required: true },
    {
      name: 'items',
      type: 'array',
      maxRows: 20,
      fields: [
        ...navigationLinkFields,
        { name: 'order', type: 'number', defaultValue: 0, min: 0 },
        { name: 'children', type: 'array', maxRows: 10, fields: navigationLinkFields },
      ],
    },
  ],
  hooks: {
    afterChange: [recordConfigurationChange],
    beforeChange: [
      validateTenantDocumentRelationships({ pages: true }),
      async ({ data, originalDoc, req }) => {
        const websiteID = data?.website ?? originalDoc?.website
        const location = data?.location ?? originalDoc?.location
        if (websiteID && location) {
          const duplicate = await req.payload.find({
            collection: 'navigation',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            req,
            where: {
              and: [
                { website: { equals: typeof websiteID === 'object' ? websiteID.id : websiteID } },
                { location: { equals: location } },
                ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
              ],
            },
          })
          if (duplicate.totalDocs) throw new APIError('Only one navigation document is allowed per website and location.', 409)
        }
        return data
      },
    ],
  },
}
