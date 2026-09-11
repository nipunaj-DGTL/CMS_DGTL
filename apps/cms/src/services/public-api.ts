/* eslint-disable @typescript-eslint/no-explicit-any -- Public DTO mapping narrows heterogeneous Payload documents at runtime. */
import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'

import {
  contentContractVersion,
  pageBlockSchema,
  pageDTOSchema,
  postDTOSchema,
  postListDTOSchema,
  siteSettingsDTOSchema,
  type MediaDTO,
  type NavigationDTO,
  type PageBlock,
  type PageDTO,
  type PostDTO,
  type PostListDTO,
  type SiteSettingsDTO,
} from '@dgtl/content-contracts'

import { relationID } from '../access/policy'
import { readSecretMap, safeEqual, verifyPreviewToken } from './security'

type GenericDocument = Record<string, any>

export class PublicAPIError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}

export const errorResponse = (error: unknown, requestID = randomUUID()): Response => {
  const known = error instanceof PublicAPIError
  const status = known ? error.status : 500
  const code = known ? error.code : 'INTERNAL_ERROR'
  const message = known ? error.message : 'The CMS could not complete the request.'
  return Response.json(
    { error: { code, message, requestId: requestID } },
    { headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestID }, status },
  )
}

export const successResponse = (body: unknown, requestID = randomUUID(), isDraft = false): Response =>
  Response.json(body, {
    headers: {
      'Cache-Control': isDraft ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      'X-DGTL-Contract-Version': String(contentContractVersion),
      'X-Request-ID': requestID,
    },
  })

export const authorizeWebsite = async ({
  headers,
  payload,
  websiteKey,
}: {
  headers: Headers
  payload: Payload
  websiteKey: string
}): Promise<GenericDocument> => {
  const headerKey = headers.get('x-dgtl-website-key')
  const authorization = headers.get('authorization')
  if (!headerKey || headerKey !== websiteKey || !authorization?.startsWith('Bearer ')) {
    throw new PublicAPIError('NOT_FOUND', 404, 'The requested website was not found.')
  }

  let tokenMap: Record<string, string>
  try {
    tokenMap = readSecretMap('CMS_WEBSITE_READ_TOKENS')
  } catch {
    throw new PublicAPIError('SERVICE_UNAVAILABLE', 503, 'The website credential service is unavailable.')
  }
  const expected = tokenMap[websiteKey]
  if (!expected || !safeEqual(expected, authorization.slice('Bearer '.length))) {
    throw new PublicAPIError('NOT_FOUND', 404, 'The requested website was not found.')
  }

  const result = await payload.find({
    collection: 'websites',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: { and: [{ key: { equals: websiteKey } }, { status: { in: ['active', 'maintenance'] } }] },
  })
  const website = result.docs[0] as GenericDocument | undefined
  const tenant = website?.tenant as GenericDocument | undefined
  if (!website || !tenant || tenant.status !== 'active') {
    throw new PublicAPIError('NOT_FOUND', 404, 'The requested website was not found.')
  }
  return website
}

export const mapMedia = (value: unknown, websiteKey?: string): MediaDTO | null => {
  if (!value || typeof value !== 'object') return null
  const media = value as GenericDocument
  if (!media.url || media.scanStatus === 'pending' || media.scanStatus === 'rejected' || media.classification === 'private-admin') return null
  return {
    alt: media.decorative ? '' : (media.alt ?? ''),
    height: typeof media.height === 'number' ? media.height : null,
    mimeType: typeof media.mimeType === 'string' ? media.mimeType : null,
    url: websiteKey && media.id !== undefined
      ? `${(process.env.CMS_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api/dgtl/public/v1/sites/${encodeURIComponent(websiteKey)}/media/${encodeURIComponent(String(media.id))}${typeof media.checksum === 'string' && /^[a-f0-9]{64}$/i.test(media.checksum) ? `?v=${media.checksum.toLowerCase()}` : ''}`
      : String(media.url).startsWith('http')
        ? String(media.url)
        : `${(process.env.CMS_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '')}${media.url}`,
    width: typeof media.width === 'number' ? media.width : null,
  }
}

const omitNullishValues = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(omitNullishValues)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== null && nested !== undefined)
      .map(([key, nested]) => [key, omitNullishValues(nested)]),
  )
}

const invalidContentContract = (): never => {
  throw new PublicAPIError(
    'CONTENT_CONTRACT_INVALID',
    500,
    'Published content is incompatible with the public content contract.',
  )
}

const mapOptionalLink = (value: unknown): GenericDocument | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const link = omitNullishValues(value) as GenericDocument
  return typeof link.label === 'string' && link.label && typeof link.url === 'string' && link.url ? link : undefined
}

export const mapBlock = (block: GenericDocument, websiteKey: string): PageBlock => {
  // Payload stores empty optional fields as null. The public contract omits
  // absent optional fields, so normalize them before validating the DTO.
  const base = omitNullishValues(block) as GenericDocument
  let mapped: unknown
  switch (block.blockType) {
    case 'hero':
      mapped = { ...base, image: mapMedia(block.image, websiteKey), video: mapMedia(block.video, websiteKey) }
      break
    case 'imageText':
      mapped = { ...base, image: mapMedia(block.image, websiteKey) }
      break
    case 'serviceIndex':
      mapped = {
        ...base,
        serviceSlugs: (block.servicePages ?? [])
          .map((page: GenericDocument | number | string) =>
            typeof page === 'object' && typeof page.slug === 'string' ? page.slug : null,
          )
          .filter((slug: string | null): slug is string => Boolean(slug)),
      }
      break
    case 'companyOverview':
      mapped = {
        ...base,
        link: mapOptionalLink(block.link),
      }
      break
    case 'teamShowcase':
      mapped = {
        ...base,
        members: (block.members ?? []).map((member: GenericDocument) => {
          let linkedin: string | undefined
          try {
            const url = new URL(member.linkedin)
            if (url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname) && !url.username && !url.password) linkedin = url.href
          } catch { /* Legacy or empty links are omitted. */ }
          return {
            ...(omitNullishValues(member) as GenericDocument),
            description: member.description ?? '',
            image: mapMedia(member.image, websiteKey),
            linkedin,
          }
        }),
        portraitImage: mapMedia(block.portraitImage, websiteKey),
        profileImage: mapMedia(block.profileImage, websiteKey),
      }
      break
    case 'serviceDetail':
      mapped = { ...base, image: mapMedia(block.image, websiteKey) }
      break
    case 'gallery':
      mapped = { ...base, images: (block.images ?? []).map((image: unknown) => mapMedia(image, websiteKey)).filter(Boolean) }
      break
    case 'logoCloud':
      mapped = {
        ...base,
        items: (block.items ?? [])
          .map((item: GenericDocument) => ({
            ...(omitNullishValues(item) as GenericDocument),
            image: mapMedia(item.image, websiteKey),
          }))
          .filter((item: GenericDocument) => item.image),
      }
      break
    case 'cardGrid':
      mapped = {
        ...base,
        cards: (block.cards ?? []).map((card: GenericDocument) => ({
          ...(omitNullishValues(card) as GenericDocument),
          link: mapOptionalLink(card.link),
        })),
      }
      break
    case 'callToAction':
    case 'contactDetails':
    case 'faq':
    case 'identityField':
    case 'richText':
    case 'spacer':
    case 'statement':
      mapped = base
      break
    default:
      return invalidContentContract()
  }

  const parsed = pageBlockSchema.safeParse(mapped)
  return parsed.success ? parsed.data : invalidContentContract()
}

export const mapPage = (page: GenericDocument, websiteKey: string): PageDTO => {
  const parsed = pageDTOSchema.safeParse({
    contractVersion: contentContractVersion,
    id: String(page.id),
    layout: (page.layout ?? []).map((block: GenericDocument) => mapBlock(block, websiteKey)),
    publishedAt: page.publishedAt ?? null,
    seo: {
      metaDescription: page.seo?.metaDescription ?? null,
      metaTitle: page.seo?.metaTitle ?? null,
      noIndex: Boolean(page.seo?.noIndex),
      ogImage: mapMedia(page.seo?.ogImage, websiteKey),
    },
    slug: page.slug,
    title: page.title,
    typography: {
      fontFamily: page.typography?.fontFamily ?? 'brand',
    },
    updatedAt: page.updatedAt,
    websiteKey,
  })
  return parsed.success ? parsed.data : invalidContentContract()
}

export const mapPost = (post: GenericDocument, websiteKey: string): PostDTO => {
  const parsed = postDTOSchema.safeParse({
    authorDisplayName: typeof post.authorDisplayName === 'string' ? post.authorDisplayName : null,
    categories: Array.isArray(post.categories)
      ? post.categories.filter((category: unknown): category is string => typeof category === 'string').slice(0, 50)
      : [],
    contractVersion: contentContractVersion,
    excerpt: typeof post.excerpt === 'string' ? post.excerpt : null,
    featuredImage: mapMedia(post.featuredImage, websiteKey),
    id: String(post.id),
    layout: (post.layout ?? []).map((block: GenericDocument) => mapBlock(block, websiteKey)),
    publishedAt: post.publishedAt ?? null,
    seo: {
      metaDescription: post.seo?.metaDescription ?? null,
      metaTitle: post.seo?.metaTitle ?? null,
      noIndex: Boolean(post.seo?.noIndex),
      ogImage: mapMedia(post.seo?.ogImage, websiteKey),
    },
    slug: post.slug,
    title: post.title,
    updatedAt: post.updatedAt,
    websiteKey,
  })
  return parsed.success ? parsed.data : invalidContentContract()
}

export const mapPostList = ({
  docs,
  pagination,
  websiteKey,
}: {
  docs: GenericDocument[]
  pagination: GenericDocument
  websiteKey: string
}): PostListDTO => {
  const parsed = postListDTOSchema.safeParse({
    contractVersion: contentContractVersion,
    pagination,
    posts: docs.map((post) => mapPost(post, websiteKey)),
    websiteKey,
  })
  return parsed.success ? parsed.data : invalidContentContract()
}

const safeHTTPSURL = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

const safeAnalyticsReference = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized.length > 200) return null
  if (normalized.includes('://')) return safeHTTPSURL(normalized)
  return /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(normalized) ? normalized : null
}

const safeLocale = (value: unknown): string => {
  if (typeof value !== 'string') return 'en'
  try {
    return new Intl.Locale(value).toString()
  } catch {
    return 'en'
  }
}

const safeTimezone = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return 'UTC'
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return value
  } catch {
    return 'UTC'
  }
}

export const mapSiteSettings = (settings: GenericDocument, websiteKey: string): SiteSettingsDTO => {
  const socialLinks = Array.isArray(settings.socialLinks)
    ? settings.socialLinks
        .map((link: GenericDocument) => ({
          label: typeof link.label === 'string' ? link.label.trim().slice(0, 100) : '',
          url: safeHTTPSURL(link.url),
        }))
        .filter((link: { label: string; url: string | null }): link is { label: string; url: string } => Boolean(link.label && link.url))
        .slice(0, 10)
    : []
  const parsed = siteSettingsDTOSchema.safeParse({
    analyticsReference: safeAnalyticsReference(settings.analyticsReference),
    brandContent: {
      backToTopLabel: settings.brandContent?.backToTopLabel ?? null,
      footerDescription: settings.brandContent?.footerDescription ?? null,
      footerEyebrow: settings.brandContent?.footerEyebrow ?? null,
      footerHeading: settings.brandContent?.footerHeading ?? null,
      legalLocation: settings.brandContent?.legalLocation ?? null,
      locationLabel: settings.brandContent?.locationLabel ?? null,
    },
    contact: {
      address: settings.contact?.address ?? null,
      email: settings.contact?.email ?? null,
      phone: settings.contact?.phone ?? null,
    },
    contractVersion: contentContractVersion,
    defaultSEO: {
      description: settings.defaultSEO?.description ?? null,
      socialImage: mapMedia(settings.defaultSEO?.socialImage, websiteKey),
      title: settings.defaultSEO?.title ?? null,
    },
    displayName: settings.displayName,
    enquiryContent: {
      addressLabel: settings.enquiryContent?.addressLabel ?? null,
      companyLabel: settings.enquiryContent?.companyLabel ?? null,
      emailLabel: settings.enquiryContent?.emailLabel ?? null,
      errorMessage: settings.enquiryContent?.errorMessage ?? null,
      homeKicker: settings.enquiryContent?.homeKicker ?? null,
      messageLabel: settings.enquiryContent?.messageLabel ?? null,
      nameLabel: settings.enquiryContent?.nameLabel ?? null,
      phoneLabel: settings.enquiryContent?.phoneLabel ?? null,
      sendingLabel: settings.enquiryContent?.sendingLabel ?? null,
      serviceHeading: settings.enquiryContent?.serviceHeading ?? null,
      serviceKicker: settings.enquiryContent?.serviceKicker ?? null,
      serviceText: settings.enquiryContent?.serviceText ?? null,
      submitLabel: settings.enquiryContent?.submitLabel ?? null,
      successMessage: settings.enquiryContent?.successMessage ?? null,
    },
    favicon: mapMedia(settings.favicon, websiteKey),
    footerText: settings.footerText ?? null,
    locale: safeLocale(settings.locale),
    logo: mapMedia(settings.logo, websiteKey),
    maintenanceEnabled: Boolean(settings.maintenanceEnabled),
    maintenanceMessage: settings.maintenanceMessage ?? null,
    serviceContent: {
      backLabel: settings.serviceContent?.backLabel ?? null,
      breadcrumbLabel: settings.serviceContent?.breadcrumbLabel ?? null,
      reelHeading: settings.serviceContent?.reelHeading ?? null,
      reelInstruction: settings.serviceContent?.reelInstruction ?? null,
      reelKicker: settings.serviceContent?.reelKicker ?? null,
    },
    socialLinks,
    timezone: safeTimezone(settings.timezone),
    websiteKey,
  })
  return parsed.success ? parsed.data : invalidContentContract()
}

const POST_PAGE_DEFAULT = 1
const POST_PAGE_LIMIT_DEFAULT = 12
const POST_PAGE_LIMIT_MAX = 50
const POST_PAGE_MAX = 10_000

const parseBoundedInteger = (raw: string | null, fallback: number, maximum: number): number => {
  if (raw === null) return fallback
  if (!/^\d+$/.test(raw)) throw new PublicAPIError('INVALID_QUERY', 400, 'Pagination values must be positive integers.')
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new PublicAPIError('INVALID_QUERY', 400, 'Pagination values are outside the supported range.')
  }
  return value
}

export const parsePostPagination = (searchParams: URLSearchParams): { limit: number; page: number } => ({
  limit: parseBoundedInteger(searchParams.get('limit'), POST_PAGE_LIMIT_DEFAULT, POST_PAGE_LIMIT_MAX),
  page: parseBoundedInteger(searchParams.get('page'), POST_PAGE_DEFAULT, POST_PAGE_MAX),
})

export const findPublishedPost = async ({
  payload,
  slug,
  website,
}: {
  payload: Payload
  slug: string
  website: GenericDocument
}): Promise<GenericDocument> => {
  const result = await payload.find({
    collection: 'posts',
    depth: 2,
    draft: false,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { website: { equals: website.id } },
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        { archivedAt: { exists: false } },
      ],
    },
  })
  if (!result.docs[0]) throw new PublicAPIError('NOT_FOUND', 404, 'The requested post was not found.')
  return result.docs[0] as GenericDocument
}

export const findPage = async ({
  headers,
  payload,
  slug,
  website,
}: {
  headers: Headers
  payload: Payload
  slug: string
  website: GenericDocument
}): Promise<{ draft: boolean; page: GenericDocument }> => {
  const previewToken = headers.get('x-dgtl-preview-token')
  if (previewToken) {
    const secret = process.env.CMS_PREVIEW_SIGNING_SECRET
    const claims = secret ? verifyPreviewToken(secret, previewToken) : null
    if (!claims || claims.websiteKey !== website.key) throw new PublicAPIError('PREVIEW_INVALID', 401, 'The preview token is invalid or expired.')

    const page = (await payload.findByID({
      collection: 'pages',
      depth: 2,
      draft: true,
      id: claims.documentID,
      overrideAccess: true,
    })) as GenericDocument
    if (String(relationID(page.website)) !== String(website.id) || page.slug !== slug) {
      throw new PublicAPIError('PREVIEW_INVALID', 401, 'The preview token is not valid for this page.')
    }
    return { draft: true, page }
  }

  const result = await payload.find({
    collection: 'pages',
    depth: 2,
    draft: false,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { website: { equals: website.id } },
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        { archivedAt: { exists: false } },
      ],
    },
  })
  if (!result.docs[0]) throw new PublicAPIError('NOT_FOUND', 404, 'The requested page was not found.')
  return { draft: false, page: result.docs[0] as GenericDocument }
}

export const navigationURL = (item: GenericDocument): string | null => {
  if (item.externalURL) return item.externalURL
  const page = item.page as GenericDocument | undefined
  if (!page?.slug) return null
  return page.slug === 'home' ? '/' : `/${page.slug}`
}

type NavigationChild = NavigationDTO['items'][number]['children'][number]
type NavigationItem = NavigationDTO['items'][number]

const mapNavigationLink = (item: GenericDocument): NavigationChild | null => {
  const url = navigationURL(item)
  if (!url || item.enabled === false || typeof item.label !== 'string' || !item.label.trim()) return null
  return { label: item.label, newTab: Boolean(item.newTab), url }
}

const collectConfiguredNavigationURLs = (items: GenericDocument[]): Set<string> => {
  const urls = new Set<string>()
  for (const item of items) {
    const url = navigationURL(item)
    if (url) urls.add(url)
    for (const child of item.children ?? []) {
      const childURL = navigationURL(child)
      if (childURL) urls.add(childURL)
    }
  }
  return urls
}

/**
 * Keep manually curated navigation first, then add published pages which opt in
 * through the Pages collection. A configured (even disabled) link reserves its
 * URL so an editor can intentionally control or hide it without an auto duplicate.
 */
export const buildNavigationItems = (
  configuredItems: GenericDocument[],
  navigationPages: GenericDocument[] = [],
): NavigationItem[] => {
  const reservedURLs = collectConfiguredNavigationURLs(configuredItems)
  const items = [...configuredItems]
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((item): NavigationItem | null => {
      const mapped = mapNavigationLink(item)
      return mapped
        ? {
            ...mapped,
            children: (item.children ?? [])
              .map((child: GenericDocument) => mapNavigationLink(child))
              .filter((child: NavigationChild | null): child is NavigationChild => child !== null),
          }
        : null
    })
    .filter((item): item is NavigationItem => item !== null)

  for (const page of [...navigationPages].sort((left, right) =>
    String(left.title ?? '').localeCompare(String(right.title ?? '')) || String(left.slug ?? '').localeCompare(String(right.slug ?? '')),
  )) {
    if (
      page.showInNavigation !== true ||
      page._status !== 'published' ||
      page.archivedAt ||
      typeof page.slug !== 'string' ||
      !page.slug ||
      typeof page.title !== 'string' ||
      !page.title.trim()
    ) {
      continue
    }

    const url = page.slug === 'home' ? '/' : `/${page.slug}`
    if (reservedURLs.has(url)) continue
    reservedURLs.add(url)
    items.push({ children: [], label: page.title, newTab: false, url })
  }

  return items
}
