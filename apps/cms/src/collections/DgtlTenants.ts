import type { CollectionConfig } from 'payload'

import {
  companyFieldAccess,
  denyAccess,
  superAdminAccess,
  superAdminFieldAccess,
  tenantDirectoryReadAccess,
} from '../access/policy'

export const DgtlTenants: CollectionConfig = {
  slug: 'dgtl-tenants',
  access: {
    create: superAdminAccess,
    delete: denyAccess,
    read: tenantDirectoryReadAccess,
    update: superAdminAccess,
  },
  admin: {
    defaultColumns: ['displayName', 'key', 'status', 'updatedAt'],
    group: 'DGTL administration',
    useAsTitle: 'displayName',
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      index: true,
      required: true,
      unique: true,
      validate: (value: unknown) =>
        (typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) ||
        'Use lowercase kebab-case.',
    },
    { name: 'displayName', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      access: { create: superAdminFieldAccess, update: superAdminFieldAccess },
      defaultValue: 'draft',
      options: ['draft', 'active', 'suspended', 'archived'],
      required: true,
    },
    { name: 'primaryContactName', type: 'text' },
    { name: 'primaryContactEmail', type: 'email' },
    {
      name: 'branding',
      type: 'group',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media' },
        {
          name: 'primaryColor',
          type: 'text',
          validate: (value: unknown) =>
            !value ||
            (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) ||
            'Use a six-digit hex color.',
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      access: { create: companyFieldAccess, read: companyFieldAccess, update: companyFieldAccess },
    },
    { name: 'activatedAt', type: 'date', admin: { readOnly: true } },
    { name: 'suspendedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data?.status === 'active' && originalDoc?.status !== 'active')
          data.activatedAt = new Date().toISOString()
        if (data?.status === 'suspended' && originalDoc?.status !== 'suspended')
          data.suspendedAt = new Date().toISOString()
        return data
      },
    ],
  },
}
