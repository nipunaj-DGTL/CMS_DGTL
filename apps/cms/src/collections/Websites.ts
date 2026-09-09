import type { CollectionConfig } from 'payload'

import { companyFieldAccess, denyAccess, superAdminAccess, tenantReadAccess } from '../access/policy'
import { validateWebsiteHomepage } from '../hooks/websites'

const normalizeDomain = (value: unknown): unknown => typeof value === 'string'
  ? value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  : value

const validHostnameWithOptionalPort = (value: null | string | undefined): true | string => {
  if (!value) return true
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!parsed.hostname || (parsed.pathname !== '/' && parsed.pathname !== '')) return 'Enter a hostname without a path.'
    return true
  } catch {
    return 'Enter a valid hostname, such as client.example.com.'
  }
}

export const validRevalidationSecretReference = (
  value: null | string | undefined,
): true | string =>
  !value || /^env:CMS_REVALIDATION_SECRETS:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? true
    : 'Use env:CMS_REVALIDATION_SECRETS:<website-key>; never paste the secret itself.'

export const Websites: CollectionConfig = {
  slug: 'websites',
  access: {
    create: superAdminAccess,
    delete: denyAccess,
    read: tenantReadAccess,
    update: superAdminAccess,
  },
  admin: {
    defaultColumns: ['displayName', 'key', 'domain', 'status'],
    group: 'Website configuration',
    useAsTitle: 'displayName',
  },
  hooks: { beforeChange: [validateWebsiteHomepage] },
  fields: [
    {
      name: 'key',
      type: 'text',
      hooks: { beforeValidate: [({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value] },
      index: true,
      required: true,
      unique: true,
      validate: (value: null | string | undefined) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
        ? true
        : 'Use lowercase letters, numbers, and single hyphens only.',
    },
    { name: 'displayName', type: 'text', required: true },
    { name: 'status', type: 'select', defaultValue: 'draft', options: ['draft', 'active', 'maintenance', 'suspended'], required: true },
    {
      name: 'domain',
      type: 'text',
      index: true,
      required: true,
      unique: true,
      hooks: { beforeValidate: [({ value }) => normalizeDomain(value)] },
      validate: validHostnameWithOptionalPort,
    },
    {
      name: 'previewDomain',
      type: 'text',
      hooks: { beforeValidate: [({ value }) => typeof value === 'string' ? value.trim().replace(/\/$/, '') : value] },
      validate: (value: null | string | undefined) => {
        if (!value) return true
        try {
          const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
          return ['http:', 'https:'].includes(parsed.protocol) && parsed.pathname === '/'
            ? true
            : 'Enter a valid HTTP(S) origin without a path.'
        } catch {
          return 'Enter a valid preview origin.'
        }
      },
    },
    { name: 'frontendKey', type: 'text', defaultValue: 'frontend-family-01', required: true },
    { name: 'contentModelVersion', type: 'number', defaultValue: 1, min: 1, required: true },
    {
      name: 'revalidationUrl',
      type: 'text',
      access: { read: companyFieldAccess },
      validate: (value: null | string | undefined) => {
        if (!value) return true
        try {
          return new URL(value).protocol === 'https:' || (process.env.NODE_ENV !== 'production' && new URL(value).protocol === 'http:')
            ? true
            : 'Use an HTTPS revalidation URL in production.'
        } catch {
          return 'Enter a valid revalidation URL.'
        }
      },
    },
    {
      name: 'revalidationSecretRef',
      type: 'text',
      access: { read: companyFieldAccess },
      admin: { description: 'Reference name from CMS_REVALIDATION_SECRETS; never paste the secret itself here.' },
      validate: validRevalidationSecretReference,
    },
    { name: 'mediaBaseUrl', type: 'text' },
    { name: 'homepage', type: 'relationship', relationTo: 'pages' },
  ],
}
