import type { Block, Field } from 'payload'

import { isSafeExternalURL } from '../services/slug'

const anchorPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const colourPattern = /^#[0-9a-fA-F]{6}$/

const validateAnchor = (value: unknown) =>
  value === undefined || value === null || value === '' ||
  (typeof value === 'string' && anchorPattern.test(value)) ||
  'Use a lowercase HTML anchor such as “who-we-are”.'

const validateColour = (value: unknown) =>
  typeof value === 'string' && colourPattern.test(value) || 'Use a six-digit hex colour such as #ff5c35.'

const linkFields: Field[] = [
  { name: 'label', type: 'text', required: true },
  {
    name: 'url',
    type: 'text',
    required: true,
    validate: (value: unknown) => {
      if (typeof value !== 'string') return 'A URL is required.'
      return isSafeExternalURL(value) || 'Use an internal path, HTTPS URL, mailto, or tel link.'
    },
  },
  { name: 'newTab', type: 'checkbox', defaultValue: false },
]

export const Hero: Block = {
  slug: 'hero',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text', required: true },
    { name: 'text', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'links', type: 'array', maxRows: 4, fields: linkFields },
    { name: 'activeServiceLinkLabel', type: 'text' },
    { name: 'cardLinkLabel', type: 'text' },
    { name: 'scrollPrompt', type: 'text' },
    { name: 'desktopServicesLabel', type: 'text' },
    { name: 'mobileServicesLabel', type: 'text' },
  ],
}

export const ServiceIndex: Block = {
  slug: 'serviceIndex',
  labels: { plural: 'Service indexes', singular: 'Service index' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'servicePages',
      type: 'relationship',
      relationTo: 'pages',
      hasMany: true,
      maxRows: 20,
      required: true,
      admin: { description: 'Select and order the Service pages shown in the DGTL360 service wheel and reel.' },
    },
  ],
}

export const CompanyOverview: Block = {
  slug: 'companyOverview',
  labels: { plural: 'Company overviews', singular: 'Company overview' },
  fields: [
    { name: 'anchor', type: 'text', defaultValue: 'who-we-are', validate: validateAnchor },
    { name: 'kicker', type: 'text', required: true },
    { name: 'heading', type: 'textarea', required: true },
    { name: 'lead', type: 'textarea', required: true },
    { name: 'tagline', type: 'text' },
    {
      name: 'paragraphs',
      type: 'array',
      maxRows: 6,
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
    {
      name: 'capabilities',
      type: 'array',
      maxRows: 20,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    { name: 'link', type: 'group', fields: linkFields },
  ],
}

export const Statement: Block = {
  slug: 'statement',
  fields: [
    { name: 'anchor', type: 'text', defaultValue: 'our-attitude', validate: validateAnchor },
    { name: 'kicker', type: 'text', required: true },
    { name: 'heading', type: 'textarea', required: true },
    { name: 'text', type: 'textarea', required: true },
  ],
}

export const TeamShowcase: Block = {
  slug: 'teamShowcase',
  labels: { plural: 'Team showcases', singular: 'Team showcase' },
  fields: [
    { name: 'anchor', type: 'text', defaultValue: 'team', validate: validateAnchor },
    { name: 'kicker', type: 'text', required: true },
    { name: 'heading', type: 'textarea', required: true },
    { name: 'instruction', type: 'text', required: true },
    { name: 'backLabel', type: 'text', defaultValue: '← ALL PEOPLE' },
    { name: 'profileLinkLabel', type: 'text', defaultValue: 'VIEW LINKEDIN PROFILE ↗' },
    { name: 'portraitImage', type: 'upload', relationTo: 'media' },
    { name: 'profileImage', type: 'upload', relationTo: 'media' },
    {
      name: 'members',
      type: 'array',
      maxRows: 20,
      minRows: 1,
      fields: [
        { name: 'number', type: 'text', required: true },
        { name: 'name', type: 'text' },
        { name: 'role', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
        {
          name: 'linkedin', type: 'text', label: 'LinkedIn profile URL',
          validate: (value: unknown) => {
            if (value === undefined || value === null || value === '') return true
            try {
              const url = new URL(String(value))
              return (url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname) && !url.username && !url.password) || 'Use an HTTPS LinkedIn profile URL.'
            } catch { return 'Use an HTTPS LinkedIn profile URL.' }
          },
        },
        { name: 'portraitPosition', type: 'text', defaultValue: '50% 50%' },
        { name: 'profilePosition', type: 'text', defaultValue: '50% 50%' },
      ],
    },
  ],
}

export const IdentityField: Block = {
  slug: 'identityField',
  labels: { plural: 'Identity fields', singular: 'Identity field' },
  fields: [
    { name: 'wordmark', type: 'text', required: true },
    { name: 'ariaLabel', type: 'text', required: true },
    {
      name: 'alphabets',
      type: 'array',
      maxRows: 20,
      minRows: 1,
      fields: [{ name: 'characters', type: 'text', required: true }],
    },
  ],
}

export const ServiceDetail: Block = {
  slug: 'serviceDetail',
  labels: { plural: 'Service details', singular: 'Service detail' },
  fields: [
    { name: 'order', type: 'number', min: 1, max: 99, required: true },
    { name: 'label', type: 'text', required: true },
    { name: 'cardHeadline', type: 'text', required: true },
    { name: 'preview', type: 'text', required: true },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'detailDescription', type: 'textarea', required: true },
    { name: 'tagline', type: 'text', required: true },
    { name: 'accent', type: 'text', required: true, validate: validateColour },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'imagePosition', type: 'text', defaultValue: '50% 50%' },
    {
      name: 'sections',
      type: 'array',
      maxRows: 30,
      minRows: 1,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea' },
        {
          name: 'items',
          type: 'array',
          maxRows: 30,
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea' },
          ],
        },
      ],
    },
  ],
}

export const RichText: Block = {
  slug: 'richText',
  fields: [{ name: 'content', type: 'richText', required: true }],
}

export const ImageText: Block = {
  slug: 'imageText',
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'text', type: 'textarea', required: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'alignment',
      type: 'select',
      defaultValue: 'image-left',
      options: ['image-left', 'image-right'],
      required: true,
    },
  ],
}

export const CallToAction: Block = {
  slug: 'callToAction',
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'text', type: 'textarea' },
    { name: 'link', type: 'group', fields: linkFields },
  ],
}

export const CardGrid: Block = {
  slug: 'cardGrid',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'cards',
      type: 'array',
      maxRows: 12,
      minRows: 1,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea', required: true },
        { name: 'link', type: 'group', fields: linkFields },
      ],
    },
  ],
}

export const Gallery: Block = {
  slug: 'gallery',
  fields: [{ name: 'images', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 20, required: true }],
}

export const FAQ: Block = {
  slug: 'faq',
  fields: [
    {
      name: 'items',
      type: 'array',
      maxRows: 20,
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
  ],
}

export const ContactDetails: Block = {
  slug: 'contactDetails',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'address', type: 'textarea' },
  ],
}

export const LogoCloud: Block = {
  slug: 'logoCloud',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      maxRows: 20,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'url', type: 'text' },
      ],
    },
  ],
}

export const Spacer: Block = {
  slug: 'spacer',
  fields: [{ name: 'size', type: 'select', defaultValue: 'medium', options: ['small', 'medium', 'large'] }],
}

const generalContentBlocks = [RichText, ImageText, CallToAction, CardGrid, Gallery, FAQ, ContactDetails, LogoCloud, Spacer]

export const pageBlocks = [
  Hero,
  ServiceIndex,
  CompanyOverview,
  Statement,
  TeamShowcase,
  IdentityField,
  ServiceDetail,
  ...generalContentBlocks,
]

export const postBlocks = [Hero, ...generalContentBlocks]
