import type { CollectionConfig } from 'payload'

import { pageBlocks } from '../blocks'
import { tenantContentCreateAccess, tenantContentWriteAccess, tenantReadAccess, tenantVersionReadAccess } from '../access/policy'
import { normalizeAndValidateContent, recordPublication, validateTenantDocumentRelationships } from '../hooks/content'
import { defaultWebsiteForCurrentTenant } from '../services/default-website'
import { createPagePreviewURL } from '../services/preview'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    create: tenantContentCreateAccess,
    delete: () => false,
    read: tenantReadAccess,
    readVersions: tenantVersionReadAccess,
    update: tenantContentWriteAccess,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'website', '_status', 'updatedAt'],
    group: 'Content',
    preview: (doc, { req }) => createPagePreviewURL({ page: doc, req }),
    useAsTitle: 'title',
  },
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
    {
      name: 'template',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Landing page', value: 'landing' },
        { label: 'Contact page', value: 'contact' },
        { label: 'Service page', value: 'service' },
      ],
      required: true,
    },
    {
      name: 'typography',
      type: 'group',
      label: 'Page typography',
      admin: {
        description: 'Choose an approved font treatment for this page. This changes the Client 01 page without allowing unsafe custom CSS.',
      },
      fields: [
        {
          name: 'fontFamily',
          type: 'select',
          defaultValue: 'brand',
          label: 'Page font',
          options: [
            { label: 'Brand default (Geist + Newsreader)', value: 'brand' },
            { label: 'Modern sans (Geist)', value: 'sans' },
            { label: 'Editorial serif (Newsreader)', value: 'serif' },
          ],
        },
      ],
    },
    { name: 'layout', type: 'blocks', blocks: pageBlocks, required: true },
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
    { name: 'showInNavigation', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
    { name: 'archivedAt', type: 'date' },
  ],
  hooks: {
    afterChange: [recordPublication],
    beforeChange: [validateTenantDocumentRelationships({ media: true }), normalizeAndValidateContent('pages')],
  },
  // Draft validation prevents Payload from auto-creating a tenant-less blank
  // document on the create screen while preserving autosave and version data.
  versions: { drafts: { autosave: true, validate: true }, maxPerDoc: 50 },
}
