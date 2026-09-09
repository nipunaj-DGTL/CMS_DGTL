import type { CollectionConfig } from 'payload'

import { tenantAdminAccess, tenantContentCreateAccess, tenantContentWriteAccess, tenantReadAccess } from '../access/policy'
import { validateTenantDocumentRelationships } from '../hooks/content'
import { scanUploadedMedia } from '../hooks/media'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: tenantContentCreateAccess,
    delete: tenantAdminAccess,
    read: tenantReadAccess,
    update: tenantContentWriteAccess,
  },
  hooks: { beforeChange: [scanUploadedMedia, validateTenantDocumentRelationships()] },
  admin: { defaultColumns: ['filename', 'alt', 'website', 'classification', 'scanStatus'], group: 'Content', useAsTitle: 'alt' },
  fields: [
    { name: 'website', type: 'relationship', relationTo: 'websites', required: true },
    { name: 'alt', type: 'text' },
    { name: 'decorative', type: 'checkbox', defaultValue: false },
    { name: 'caption', type: 'textarea' },
    { name: 'credit', type: 'text' },
    { name: 'classification', type: 'select', defaultValue: 'public', options: ['public', 'private-admin'], required: true },
    {
      name: 'checksum',
      type: 'text',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'scanStatus',
      type: 'select',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
      defaultValue: 'pending',
      options: ['pending', 'clean', 'rejected'],
      required: true,
    },
  ],
  upload: {
    imageSizes: [
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
    ],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'application/pdf',
    ],
    staticDir: 'media',
  },
}
