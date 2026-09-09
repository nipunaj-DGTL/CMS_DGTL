import { APIError, type CollectionConfig } from 'payload'

import { tenantContentCreateAccess, tenantContentWriteAccess, tenantReadAccess } from '../access/policy'
import { relationID } from '../access/policy'
import { recordConfigurationChange, validateTenantDocumentRelationships } from '../hooks/content'

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  access: { create: tenantContentCreateAccess, delete: () => false, read: tenantReadAccess, update: tenantContentWriteAccess },
  admin: { defaultColumns: ['displayName', 'website', 'updatedAt'], group: 'Website configuration', useAsTitle: 'displayName' },
  fields: [
    { name: 'website', type: 'relationship', relationTo: 'websites', required: true },
    { name: 'displayName', type: 'text', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'favicon', type: 'upload', relationTo: 'media' },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'address', type: 'textarea' },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      maxRows: 10,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'defaultSEO',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', maxLength: 70 },
        { name: 'description', type: 'textarea', maxLength: 180 },
        { name: 'socialImage', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'brandContent',
      type: 'group',
      label: 'Brand and footer content',
      fields: [
        { name: 'locationLabel', type: 'text' },
        { name: 'footerEyebrow', type: 'text' },
        { name: 'footerHeading', type: 'textarea', admin: { description: 'Use a new line or | to control line breaks.' } },
        { name: 'footerDescription', type: 'textarea' },
        { name: 'legalLocation', type: 'text' },
        { name: 'backToTopLabel', type: 'text' },
      ],
    },
    {
      name: 'enquiryContent',
      type: 'group',
      label: 'Enquiry content',
      fields: [
        { name: 'homeKicker', type: 'text' },
        { name: 'serviceKicker', type: 'text' },
        { name: 'serviceHeading', type: 'textarea' },
        { name: 'serviceText', type: 'textarea' },
        { name: 'addressLabel', type: 'text' },
        { name: 'nameLabel', type: 'text' },
        { name: 'emailLabel', type: 'text' },
        { name: 'companyLabel', type: 'text' },
        { name: 'phoneLabel', type: 'text' },
        { name: 'messageLabel', type: 'text' },
        { name: 'submitLabel', type: 'text' },
        { name: 'sendingLabel', type: 'text' },
        { name: 'successMessage', type: 'text' },
        { name: 'errorMessage', type: 'textarea' },
      ],
    },
    {
      name: 'serviceContent',
      type: 'group',
      label: 'Service page interface content',
      fields: [
        { name: 'breadcrumbLabel', type: 'text' },
        { name: 'reelKicker', type: 'text' },
        { name: 'reelHeading', type: 'text' },
        { name: 'reelInstruction', type: 'text' },
        { name: 'backLabel', type: 'text' },
      ],
    },
    { name: 'footerText', type: 'textarea' },
    { name: 'analyticsReference', type: 'text' },
    { name: 'locale', type: 'text', defaultValue: 'en' },
    { name: 'timezone', type: 'text', defaultValue: 'Asia/Colombo' },
    { name: 'maintenanceEnabled', type: 'checkbox', defaultValue: false },
    { name: 'maintenanceMessage', type: 'textarea' },
  ],
  hooks: {
    afterChange: [recordConfigurationChange],
    beforeChange: [
      validateTenantDocumentRelationships({ media: true }),
      async ({ data, originalDoc, req }) => {
        const websiteID = relationID(data?.website ?? originalDoc?.website)
        if (!websiteID) return data
        const duplicate = await req.payload.find({
          collection: 'site-settings',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
          where: {
            and: [
              { website: { equals: websiteID } },
              ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
            ],
          },
        })
        if (duplicate.totalDocs) throw new APIError('Only one site settings document is allowed per website.', 409)
        return data
      },
    ],
  },
}
