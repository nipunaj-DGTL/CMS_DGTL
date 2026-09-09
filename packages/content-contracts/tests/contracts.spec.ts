import { describe, expect, it } from 'vitest'

import {
  contentContractVersion,
  pageBlockSchema,
  pageDTOSchema,
  postDTOSchema,
  postListDTOSchema,
  siteSettingsDTOSchema,
} from '../src/index'

describe('pageDTO contract', () => {
  it('rejects unknown contract versions', () => {
    const result = pageDTOSchema.safeParse({ contractVersion: contentContractVersion + 1 })
    expect(result.success).toBe(false)
  })

  it('accepts a CMS-backed service detail block', () => {
    expect(pageBlockSchema.safeParse({
      accent: '#ff5c35',
      blockType: 'serviceDetail',
      cardHeadline: 'Hear it first. See it through.',
      detailDescription: 'Full production detail.',
      label: 'Production',
      order: 1,
      preview: 'Sound + Vision',
      sections: [{ body: 'Everything sound.', title: 'Audio Production' }],
      summary: 'One connected production.',
      tagline: 'Sound + Vision',
    }).success).toBe(true)
  })

  it('accepts only approved page fonts and preserves the brand default', () => {
    expect(pageDTOSchema.shape.typography.parse(undefined)).toEqual({ fontFamily: 'brand' })
    expect(pageDTOSchema.shape.typography.safeParse({ fontFamily: 'serif' }).success).toBe(true)
    expect(pageDTOSchema.shape.typography.safeParse({ fontFamily: 'Comic Sans MS' }).success).toBe(false)
  })

  it('accepts additive DGTL360 site copy groups', () => {
    expect(siteSettingsDTOSchema.safeParse({
      analyticsReference: 'G-ABC123',
      brandContent: {
        backToTopLabel: 'BACK TO TOP ↑',
        footerDescription: null,
        footerEyebrow: null,
        footerHeading: null,
        legalLocation: null,
        locationLabel: 'COLOMBO + ANYWHERE',
      },
      contact: { address: null, email: null, phone: null },
      contractVersion: contentContractVersion,
      defaultSEO: { description: null, title: null },
      displayName: 'DGTL 360',
      enquiryContent: {
        addressLabel: null,
        companyLabel: null,
        emailLabel: null,
        errorMessage: null,
        homeKicker: null,
        messageLabel: null,
        nameLabel: null,
        phoneLabel: null,
        sendingLabel: null,
        serviceHeading: null,
        serviceKicker: null,
        serviceText: null,
        submitLabel: null,
        successMessage: null,
      },
      footerText: null,
      locale: 'en-LK',
      maintenanceEnabled: false,
      maintenanceMessage: null,
      serviceContent: {
        backLabel: null,
        breadcrumbLabel: null,
        reelHeading: null,
        reelInstruction: null,
        reelKicker: null,
      },
      socialLinks: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/dgtl' }],
      timezone: 'Asia/Colombo',
      websiteKey: 'client-02-main',
    }).success).toBe(true)
    expect(siteSettingsDTOSchema.safeParse({
      contact: { address: null, email: null, phone: null },
      contractVersion: contentContractVersion,
      defaultSEO: { description: null, title: null },
      displayName: 'Unsafe link',
      footerText: null,
      socialLinks: [{ label: 'Unsafe', url: 'http://example.test' }],
      websiteKey: 'client-02-main',
    }).success).toBe(false)
  })
})

describe('post delivery contracts', () => {
  const post = {
    authorDisplayName: 'DGTL Editorial',
    categories: ['News'],
    contractVersion: contentContractVersion,
    excerpt: 'An update.',
    featuredImage: null,
    id: 'post-1',
    layout: [{ blockType: 'statement', heading: 'Headline', kicker: 'News', text: 'Body' }],
    publishedAt: '2026-09-08T06:00:00.000Z',
    seo: { metaDescription: null, metaTitle: null, noIndex: false, ogImage: null },
    slug: 'news/an-update',
    title: 'An update',
    updatedAt: '2026-09-08T06:30:00.000Z',
    websiteKey: 'client-01-main',
  }

  it('accepts a versioned post and bounded post list', () => {
    expect(postDTOSchema.safeParse(post).success).toBe(true)
    expect(postListDTOSchema.safeParse({
      contractVersion: contentContractVersion,
      pagination: {
        hasNextPage: false,
        hasPrevPage: false,
        limit: 12,
        nextPage: null,
        page: 1,
        prevPage: null,
        totalDocs: 1,
        totalPages: 1,
      },
      posts: [post],
      websiteKey: 'client-01-main',
    }).success).toBe(true)
  })

  it('rejects incompatible versions, unknown blocks, and an oversized page', () => {
    expect(postDTOSchema.safeParse({ ...post, contractVersion: 2 }).success).toBe(false)
    expect(postDTOSchema.safeParse({ ...post, layout: [{ blockType: 'unknown' }] }).success).toBe(false)
    expect(postListDTOSchema.safeParse({
      contractVersion: contentContractVersion,
      pagination: {
        hasNextPage: false,
        hasPrevPage: false,
        limit: 51,
        nextPage: null,
        page: 1,
        prevPage: null,
        totalDocs: 0,
        totalPages: 0,
      },
      posts: [],
      websiteKey: 'client-01-main',
    }).success).toBe(false)
  })
})
