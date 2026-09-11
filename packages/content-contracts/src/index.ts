import { z } from 'zod'

export const contentContractVersion = 1 as const

export const mediaSchema = z.object({
  alt: z.string().default(''),
  height: z.number().positive().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  url: z.string().url(),
  width: z.number().positive().nullable().optional(),
})

const nullableTextSchema = z.string().nullable()

const seoSchema = z.object({
  metaDescription: nullableTextSchema,
  metaTitle: nullableTextSchema,
  noIndex: z.boolean(),
  ogImage: mediaSchema.nullable(),
})

const linkSchema = z.object({
  label: z.string().min(1),
  newTab: z.boolean().optional(),
  url: z.string().min(1),
})

const blockBase = z.object({ id: z.string().optional() })

export const pageBlockSchema = z.discriminatedUnion('blockType', [
  blockBase.extend({
    blockType: z.literal('hero'),
    activeServiceLinkLabel: z.string().optional(),
    cardLinkLabel: z.string().optional(),
    desktopServicesLabel: z.string().optional(),
    eyebrow: z.string().optional(),
    heading: z.string(),
    image: mediaSchema.nullable().optional(),
    links: z.array(linkSchema).max(4).default([]),
    mobileServicesLabel: z.string().optional(),
    scrollPrompt: z.string().optional(),
    text: z.string().optional(),
    video: mediaSchema.nullable().optional(),
  }),
  blockBase.extend({
    blockType: z.literal('serviceIndex'),
    heading: z.string().optional(),
    serviceSlugs: z.array(z.string()).max(20),
  }),
  blockBase.extend({
    anchor: z.string().optional(),
    blockType: z.literal('companyOverview'),
    tagline: z.string().optional(),
    capabilities: z.array(z.object({ label: z.string() })).max(20),
    heading: z.string(),
    lead: z.string(),
    kicker: z.string(),
    link: linkSchema.optional(),
    paragraphs: z.array(z.object({ text: z.string() })).max(6),
  }),
  blockBase.extend({
    anchor: z.string().optional(),
    blockType: z.literal('statement'),
    heading: z.string(),
    kicker: z.string(),
    text: z.string(),
  }),
  blockBase.extend({
    anchor: z.string().optional(),
    blockType: z.literal('teamShowcase'),
    backLabel: z.string().optional(),
    profileLinkLabel: z.string().optional(),
    heading: z.string(),
    instruction: z.string(),
    kicker: z.string(),
    members: z.array(z.object({
      description: z.string().default(''),
      name: z.string().optional(),
      image: mediaSchema.nullable().optional(),
      linkedin: z.string().optional(),
      number: z.string(),
      portraitPosition: z.string().optional(),
      profilePosition: z.string().optional(),
      role: z.string(),
    })).max(20),
    portraitImage: mediaSchema.nullable().optional(),
    profileImage: mediaSchema.nullable().optional(),
  }),
  blockBase.extend({
    alphabets: z.array(z.object({ characters: z.string() })).max(20),
    ariaLabel: z.string(),
    blockType: z.literal('identityField'),
    wordmark: z.string(),
  }),
  blockBase.extend({
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    blockType: z.literal('serviceDetail'),
    cardHeadline: z.string(),
    detailDescription: z.string(),
    image: mediaSchema.nullable().optional(),
    imagePosition: z.string().optional(),
    label: z.string(),
    order: z.number().int().min(1).max(99),
    preview: z.string(),
    sections: z.array(z.object({
      body: z.string().optional(),
      items: z.array(z.object({ description: z.string().optional(), title: z.string() })).max(30).optional(),
      title: z.string(),
    })).max(30),
    summary: z.string(),
    tagline: z.string(),
  }),
  blockBase.extend({
    blockType: z.literal('richText'),
    content: z.unknown(),
  }),
  blockBase.extend({
    alignment: z.enum(['image-left', 'image-right']).default('image-left'),
    blockType: z.literal('imageText'),
    heading: z.string(),
    image: mediaSchema.nullable().optional(),
    text: z.string(),
  }),
  blockBase.extend({
    blockType: z.literal('callToAction'),
    heading: z.string(),
    link: linkSchema,
    text: z.string().optional(),
  }),
  blockBase.extend({
    blockType: z.literal('cardGrid'),
    cards: z.array(z.object({ link: linkSchema.optional(), text: z.string(), title: z.string() })).max(12),
    heading: z.string().optional(),
  }),
  blockBase.extend({
    blockType: z.literal('gallery'),
    images: z.array(mediaSchema).max(20),
  }),
  blockBase.extend({
    blockType: z.literal('faq'),
    items: z.array(z.object({ answer: z.string(), question: z.string() })).max(20),
  }),
  blockBase.extend({
    blockType: z.literal('contactDetails'),
    address: z.string().optional(),
    email: z.string().optional(),
    heading: z.string().optional(),
    phone: z.string().optional(),
  }),
  blockBase.extend({
    blockType: z.literal('logoCloud'),
    heading: z.string().optional(),
    items: z.array(z.object({ image: mediaSchema, label: z.string(), url: z.string().optional() })).max(20),
  }),
  blockBase.extend({
    blockType: z.literal('spacer'),
    size: z.enum(['small', 'medium', 'large']),
  }),
])

export const pageDTOSchema = z.object({
  contractVersion: z.literal(contentContractVersion),
  id: z.string(),
  layout: z.array(pageBlockSchema),
  publishedAt: z.string().nullable(),
  seo: seoSchema,
  slug: z.string(),
  title: z.string(),
  typography: z.object({
    fontFamily: z.enum(['brand', 'sans', 'serif']).default('brand'),
  }).default({ fontFamily: 'brand' }),
  updatedAt: z.string(),
  websiteKey: z.string(),
})

export const pageListDTOSchema = z.object({
  contractVersion: z.literal(contentContractVersion),
  pages: z.array(pageDTOSchema).max(100),
  websiteKey: z.string(),
})

export const postDTOSchema = z.object({
  authorDisplayName: nullableTextSchema,
  categories: z.array(z.string()).max(50),
  contractVersion: z.literal(contentContractVersion),
  excerpt: nullableTextSchema,
  featuredImage: mediaSchema.nullable(),
  id: z.string(),
  layout: z.array(pageBlockSchema),
  publishedAt: z.string().nullable(),
  seo: seoSchema,
  slug: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  websiteKey: z.string(),
})

export const postListDTOSchema = z.object({
  contractVersion: z.literal(contentContractVersion),
  pagination: z.object({
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
    limit: z.number().int().min(1).max(50),
    nextPage: z.number().int().positive().nullable(),
    page: z.number().int().positive(),
    prevPage: z.number().int().positive().nullable(),
    totalDocs: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  posts: z.array(postDTOSchema).max(50),
  websiteKey: z.string(),
})

export const websiteDTOSchema = z.object({
  contractVersion: z.literal(contentContractVersion),
  displayName: z.string(),
  domain: z.string(),
  key: z.string(),
  status: z.enum(['active', 'maintenance']),
})

export const navigationDTOSchema = z.object({
  contractVersion: z.literal(contentContractVersion),
  items: z.array(z.object({
    children: z.array(linkSchema).default([]),
    label: z.string(),
    newTab: z.boolean().optional(),
    url: z.string(),
  })),
  location: z.enum(['header', 'footer']),
  websiteKey: z.string(),
})

export const siteSettingsDTOSchema = z.object({
  analyticsReference: nullableTextSchema.optional(),
  brandContent: z.object({
    backToTopLabel: z.string().nullable(),
    footerDescription: z.string().nullable(),
    footerEyebrow: z.string().nullable(),
    footerHeading: z.string().nullable(),
    legalLocation: z.string().nullable(),
    locationLabel: z.string().nullable(),
  }).optional(),
  contact: z.object({ address: nullableTextSchema, email: nullableTextSchema, phone: nullableTextSchema }),
  contractVersion: z.literal(contentContractVersion),
  defaultSEO: z.object({
    description: nullableTextSchema,
    socialImage: mediaSchema.nullable().optional(),
    title: nullableTextSchema,
  }),
  displayName: z.string(),
  enquiryContent: z.object({
    addressLabel: z.string().nullable(),
    companyLabel: z.string().nullable(),
    emailLabel: z.string().nullable(),
    errorMessage: z.string().nullable(),
    homeKicker: z.string().nullable(),
    messageLabel: z.string().nullable(),
    nameLabel: z.string().nullable(),
    phoneLabel: z.string().nullable(),
    sendingLabel: z.string().nullable(),
    serviceHeading: z.string().nullable(),
    serviceKicker: z.string().nullable(),
    serviceText: z.string().nullable(),
    submitLabel: z.string().nullable(),
    successMessage: z.string().nullable(),
  }).optional(),
  favicon: mediaSchema.nullable().optional(),
  footerText: z.string().nullable(),
  locale: z.string().min(2).max(35).optional(),
  logo: mediaSchema.nullable().optional(),
  maintenanceEnabled: z.boolean().optional(),
  maintenanceMessage: nullableTextSchema.optional(),
  serviceContent: z.object({
    backLabel: z.string().nullable(),
    breadcrumbLabel: z.string().nullable(),
    reelHeading: z.string().nullable(),
    reelInstruction: z.string().nullable(),
    reelKicker: z.string().nullable(),
  }).optional(),
  socialLinks: z.array(z.object({
    label: z.string().min(1).max(100),
    url: z.string().url().refine((value) => new URL(value).protocol === 'https:', 'Social links must use HTTPS.'),
  })).max(10).optional(),
  timezone: z.string().min(1).max(100).optional(),
  websiteKey: z.string(),
})

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
})

export type ApiError = z.infer<typeof apiErrorSchema>
export type MediaDTO = z.infer<typeof mediaSchema>
export type NavigationDTO = z.infer<typeof navigationDTOSchema>
export type PageBlock = z.infer<typeof pageBlockSchema>
export type PageDTO = z.infer<typeof pageDTOSchema>
export type PageListDTO = z.infer<typeof pageListDTOSchema>
export type PostDTO = z.infer<typeof postDTOSchema>
export type PostListDTO = z.infer<typeof postListDTOSchema>
export type SiteSettingsDTO = z.infer<typeof siteSettingsDTOSchema>
export type WebsiteDTO = z.infer<typeof websiteDTOSchema>
