import {
  apiErrorSchema,
  navigationDTOSchema,
  pageDTOSchema,
  pageListDTOSchema,
  postDTOSchema,
  postListDTOSchema,
  siteSettingsDTOSchema,
  websiteDTOSchema,
  type NavigationDTO,
  type PageDTO,
  type PageListDTO,
  type PostDTO,
  type PostListDTO,
  type SiteSettingsDTO,
  type WebsiteDTO,
} from '@dgtl/content-contracts'
import type { ZodType } from 'zod'

export class CMSClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message)
    this.name = 'CMSClientError'
  }
}

export interface CMSClientOptions {
  baseURL: string
  fetchImpl?: typeof fetch
  readToken: string
  websiteKey: string
}

export interface CMSRequestOptions {
  draftToken?: string
  next?: { revalidate?: number; tags?: string[] }
}

export interface CMSPostListRequestOptions extends CMSRequestOptions {
  limit?: number
  page?: number
}

export class DGTLClient {
  private readonly baseURL: string
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: CMSClientOptions) {
    this.baseURL = options.baseURL.replace(/\/$/, '')
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  get websiteKey(): string {
    return this.options.websiteKey
  }

  private async request<T>(path: string, schema: ZodType<T>, options: CMSRequestOptions = {}): Promise<T> {
    const headers = new Headers({
      Accept: 'application/json',
      Authorization: `Bearer ${this.options.readToken}`,
      'X-DGTL-Website-Key': this.options.websiteKey,
    })

    if (options.draftToken) headers.set('X-DGTL-Preview-Token', options.draftToken)

    const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
      cache: options.draftToken ? 'no-store' : 'force-cache',
      headers,
      next: options.draftToken ? undefined : options.next,
    }
    const response = await this.fetchImpl(`${this.baseURL}${path}`, init)

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const parsedError = apiErrorSchema.safeParse(body)
      if (parsedError.success) {
        throw new CMSClientError(
          parsedError.data.error.message,
          response.status,
          parsedError.data.error.code,
          parsedError.data.error.requestId,
        )
      }
      throw new CMSClientError('The CMS request failed.', response.status, 'CMS_REQUEST_FAILED')
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new CMSClientError('The CMS returned an incompatible content contract.', 502, 'CMS_CONTRACT_INVALID')
    }
    return parsed.data
  }

  getNavigation(location: 'header' | 'footer', options?: CMSRequestOptions): Promise<NavigationDTO> {
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}/navigation/${location}`,
      navigationDTOSchema,
      options,
    )
  }

  getPage(slug: string, options?: CMSRequestOptions): Promise<PageDTO> {
    const normalized = slug.replace(/^\/+|\/+$/g, '') || 'home'
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}/pages/${normalized}`,
      pageDTOSchema,
      options,
    )
  }

  getPages(template: 'service', options?: CMSRequestOptions): Promise<PageListDTO> {
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}/pages?template=${encodeURIComponent(template)}`,
      pageListDTOSchema,
      options,
    )
  }

  getPost(slug: string, options?: CMSRequestOptions): Promise<PostDTO> {
    const normalized = slug.replace(/^\/+|\/+$/g, '') || 'home'
    const encodedSlug = normalized.split('/').map(encodeURIComponent).join('/')
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}/posts/${encodedSlug}`,
      postDTOSchema,
      options,
    )
  }

  getPosts(options: CMSPostListRequestOptions = {}): Promise<PostListDTO> {
    const { limit = 12, page = 1, ...requestOptions } = options
    if (!Number.isInteger(page) || page < 1) throw new RangeError('Post page must be a positive integer.')
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new RangeError('Post limit must be an integer between 1 and 50.')
    }
    const search = new URLSearchParams({ page: String(page), limit: String(limit) })
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}/posts?${search}`,
      postListDTOSchema,
      requestOptions,
    )
  }

  getSettings(options?: CMSRequestOptions): Promise<SiteSettingsDTO> {
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}/settings`,
      siteSettingsDTOSchema,
      options,
    )
  }

  getWebsite(options?: CMSRequestOptions): Promise<WebsiteDTO> {
    return this.request(
      `/api/dgtl/public/v1/sites/${encodeURIComponent(this.websiteKey)}`,
      websiteDTOSchema,
      options,
    )
  }
}
