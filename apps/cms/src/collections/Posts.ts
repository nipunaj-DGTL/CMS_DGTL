import type { CollectionConfig } from 'payload'

import { tenantContentCreateAccess, tenantContentWriteAccess, tenantReadAccess, tenantVersionReadAccess } from '../access/policy'
import { postBlocks } from '../blocks'
import { normalizeAndValidateContent, recordPublication, validateTenantDocumentRelationships } from '../hooks/content'
import { defaultWebsiteForCurrentTenant } from '../services/default-website'

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    create: tenantContentCreateAccess,
    delete: () => false,
    read: tenantReadAccess,
    readVersions: tenantVersionReadAccess,
    update: tenantContentWriteAccess,
  },
  admin: { defaultColumns: ['title', 'slug', 'website', '_status', 'publishedAt'], group: 'Content', useAsTitle: 'title' },
  fields: [
    {
      name: 'website',
      type: 'relationship',
      admin: {
        allowCreate: false,
        allowEdit: false,
        description: 'Uses the website assigned to the currently selected client.',
      },
      defaultValue: defaultWebsiteForCurrentTenant,
      relationTo: 'websites',
      required: true,
    },
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', index: true, required: true },
    { name: 'excerpt', type: 'textarea', maxLength: 320 },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'layout', type: 'blocks', blocks: postBlocks, required: true },
    { name: 'categories', type: 'text', hasMany: true },
    { name: 'authorDisplayName', type: 'text' },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text', maxLength: 70 },
        { name: 'metaDescription', type: 'textarea', maxLength: 180 },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
        { name: 'noIndex', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
    { name: 'archivedAt', type: 'date' },
  ],
  hooks: {
    afterChange: [recordPublication],
    beforeChange: [validateTenantDocumentRelationships({ media: true }), normalizeAndValidateContent('posts')],
  },
  // Validate autosaves so the create screen does not try to persist a blank
  // tenant-less post while preserving autosave and version data.
  versions: { drafts: { autosave: true, validate: true }, maxPerDoc: 50 },
}
