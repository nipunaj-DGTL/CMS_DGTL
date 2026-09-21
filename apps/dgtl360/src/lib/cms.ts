import 'server-only';
import { cache } from 'react';

import { CMSClientError, DGTLClient } from '@dgtl/cms-client';
import type {
  MediaDTO,
  NavigationDTO,
  PageBlock,
  PageDTO,
  PageListDTO,
  PostDTO,
  PostListDTO,
  SiteSettingsDTO,
  WebsiteDTO,
} from '@dgtl/content-contracts';
import { websiteDTOSchema } from '@dgtl/content-contracts';

import { getService } from '../content/local/services';
import type { Service } from '../features/services/types/service.types';

export type CMSLink = { label: string; newTab?: boolean; url: string };
export type CMSNavigationItem = NavigationDTO['items'][number];
export type CMSMedia = MediaDTO;
export type CMSHeroBlock = Extract<PageBlock, { blockType: 'hero' }>;
export type CMSServiceIndexBlock = Extract<PageBlock, { blockType: 'serviceIndex' }>;
export type CMSCompanyOverviewBlock = Extract<PageBlock, { blockType: 'companyOverview' }>;
export type CMSStatementBlock = Extract<PageBlock, { blockType: 'statement' }>;
export type CMSTeamShowcaseBlock = Extract<PageBlock, { blockType: 'teamShowcase' }>;
export type CMSIdentityFieldBlock = Extract<PageBlock, { blockType: 'identityField' }>;
export type CMSServiceDetailBlock = Extract<PageBlock, { blockType: 'serviceDetail' }>;
export type CMSCardGridBlock = Extract<PageBlock, { blockType: 'cardGrid' }>;
export type CMSCallToActionBlock = Extract<PageBlock, { blockType: 'callToAction' }>;
export type CMSContactDetailsBlock = Extract<PageBlock, { blockType: 'contactDetails' }>;
export type CMSPage = PageDTO;
export type CMSPageList = PageListDTO;
export type CMSPost = PostDTO;
export type CMSPostList = PostListDTO;
export type CMSSiteSettings = SiteSettingsDTO;
export type CMSNavigation = NavigationDTO;
export type CMSEnquiryContent = NonNullable<SiteSettingsDTO['enquiryContent']>;

export type CMSHomeContent = {
  footerNavigation: CMSNavigation | null;
  headerNavigation: CMSNavigation | null;
  page: CMSPage | null;
  servicePages: CMSPage[];
  settings: CMSSiteSettings | null;
  website: WebsiteDTO | null;
};

type CMSConnection = { baseURL: string; readToken: string; websiteKey: string };

const requestTimeoutMilliseconds = (): number => {
  const configured = Number(process.env.CMS_REQUEST_TIMEOUT_MS ?? 5_000);
  return Number.isFinite(configured) && configured >= 500 && configured <= 30_000
    ? configured
    : 5_000;
};

const cmsFetch: typeof fetch = (input, init = {}) => {
  const timeout = AbortSignal.timeout(requestTimeoutMilliseconds());
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

const connection = (): CMSConnection | null => {
  const baseURL = process.env.CMS_URL?.trim().replace(/\/$/, '');
  const readToken = process.env.CMS_READ_TOKEN?.trim();
  const websiteKey = process.env.CMS_WEBSITE_KEY?.trim();
  return baseURL && readToken && websiteKey ? { baseURL, readToken, websiteKey } : null;
};

/** Local fallback is an explicit developer convenience, never a production
 * availability strategy. Production failures must remain observable. */
export const isLocalCMSFallbackEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' && process.env.CMS_ALLOW_LOCAL_FALLBACK === 'true';

const requireConnection = (): CMSConnection => {
  const configured = connection();
  if (configured) return configured;
  throw new Error('DGTL CMS connection is not configured. Set CMS_URL, CMS_WEBSITE_KEY, and CMS_READ_TOKEN.');
};

const getCMSClient = cache(() => {
  const configured = requireConnection();
  return new DGTLClient({
    baseURL: configured.baseURL,
    fetchImpl: cmsFetch,
    readToken: configured.readToken,
    websiteKey: configured.websiteKey,
  });
});

const siteTags = (suffix?: string): string[] => {
  const websiteKey = requireConnection().websiteKey;
  const siteTag = `cms:site:${websiteKey}`;
  return suffix ? [siteTag, `${siteTag}:${suffix}`] : [siteTag];
};

const useDevelopmentFallback = <T,>(label: string, error: unknown, fallback: T): T => {
  if (!isLocalCMSFallbackEnabled()) throw error;
  console.warn(`[dgtl-cms] ${label} is using explicit development-only fallback content.`, error);
  return fallback;
};

export const getCMSWebsite = cache(async (): Promise<WebsiteDTO | null> => {
  if (!connection()) return useDevelopmentFallback('Website configuration', new Error('CMS connection is missing.'), null);
  try {
    return await getCMSClient().getWebsite({ next: { revalidate: 300, tags: siteTags() } });
  } catch (error) {
    return useDevelopmentFallback('Website configuration', error, null);
  }
});

export const getCMSPage = cache(async (slug: string, previewToken?: string): Promise<CMSPage | null> => {
  if (!connection()) return useDevelopmentFallback(`Page “${slug}”`, new Error('CMS connection is missing.'), null);
  const normalized = slug.replace(/^\/+|\/+$/g, '') || 'home';
  try {
    return await getCMSClient().getPage(normalized, {
      draftToken: previewToken,
      next: { revalidate: 300, tags: siteTags(`pages:${normalized}`) },
    });
  } catch (error) {
    if (error instanceof CMSClientError && error.status === 404) return null;
    return useDevelopmentFallback(`Page “${normalized}”`, error, null);
  }
});

export const getCMSPost = cache(async (slug: string, previewToken?: string): Promise<CMSPost | null> => {
  if (!connection()) return useDevelopmentFallback(`Post “${slug}”`, new Error('CMS connection is missing.'), null);
  const normalized = slug.replace(/^\/+|\/+$/g, '');
  if (!normalized) return null;
  try {
    return await getCMSClient().getPost(normalized, {
      draftToken: previewToken,
      next: { revalidate: 300, tags: siteTags(`posts:${normalized}`) },
    });
  } catch (error) {
    if (error instanceof CMSClientError && error.status === 404) return null;
    return useDevelopmentFallback(`Post “${normalized}”`, error, null);
  }
});

const emptyPostList = (page: number, limit: number): CMSPostList => ({
  contractVersion: 1,
  pagination: {
    hasNextPage: false,
    hasPrevPage: false,
    limit,
    nextPage: null,
    page,
    prevPage: null,
    totalDocs: 0,
    totalPages: 0,
  },
  posts: [],
  websiteKey: process.env.CMS_WEBSITE_KEY?.trim() || 'development-unconfigured',
});

export const getCMSPosts = cache(async (page = 1, limit = 12): Promise<CMSPostList> => {
  if (!connection()) {
    return useDevelopmentFallback('Post list', new Error('CMS connection is missing.'), emptyPostList(page, limit));
  }
  try {
    return await getCMSClient().getPosts({
      limit,
      page,
      next: { revalidate: 300, tags: siteTags('posts') },
    });
  } catch (error) {
    return useDevelopmentFallback('Post list', error, emptyPostList(page, limit));
  }
});

export const getCMSServicePages = cache(async (): Promise<CMSPage[]> => {
  if (!connection()) return useDevelopmentFallback('Service page list', new Error('CMS connection is missing.'), []);
  try {
    const result = await getCMSClient().getPages('service', {
      next: { revalidate: 300, tags: siteTags('pages') },
    });
    return result.pages;
  } catch (error) {
    return useDevelopmentFallback('Service page list', error, []);
  }
});

export const getCMSSiteSettings = cache(async (): Promise<CMSSiteSettings | null> => {
  if (!connection()) return useDevelopmentFallback('Site settings', new Error('CMS connection is missing.'), null);
  try {
    return await getCMSClient().getSettings({ next: { revalidate: 300, tags: siteTags('site-settings') } });
  } catch (error) {
    return useDevelopmentFallback('Site settings', error, null);
  }
});

export const getCMSNavigation = cache(async (location: 'header' | 'footer'): Promise<CMSNavigation | null> => {
  if (!connection()) return useDevelopmentFallback(`${location} navigation`, new Error('CMS connection is missing.'), null);
  try {
    return await getCMSClient().getNavigation(location, {
      next: { revalidate: 300, tags: siteTags('navigation') },
    });
  } catch (error) {
    return useDevelopmentFallback(`${location} navigation`, error, null);
  }
});

export const getCMSHomeContent = cache(async (previewToken?: string): Promise<CMSHomeContent | null> => {
  if (!connection()) return useDevelopmentFallback('Homepage', new Error('CMS connection is missing.'), null);
  const [website, page, settings, headerNavigation, footerNavigation, servicePages] = await Promise.all([
    getCMSWebsite(),
    getCMSPage('home', previewToken),
    getCMSSiteSettings(),
    getCMSNavigation('header'),
    getCMSNavigation('footer'),
    getCMSServicePages(),
  ]);
  if (!isLocalCMSFallbackEnabled() && (!website || !page || !settings || !headerNavigation || !footerNavigation)) {
    throw new Error('DGTL360 requires an active website, homepage, site settings, and both navigation records.');
  }
  return { footerNavigation, headerNavigation, page, servicePages, settings, website };
});

/** Readiness deliberately bypasses the render cache. It proves the configured
 * website binding can reach the CMS now instead of reporting cached content. */
export const checkCMSReadiness = async (): Promise<WebsiteDTO> => {
  const configured = requireConnection();
  const response = await cmsFetch(
    `${configured.baseURL}/api/dgtl/public/v1/sites/${encodeURIComponent(configured.websiteKey)}`,
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${configured.readToken}`,
        'X-DGTL-Website-Key': configured.websiteKey,
      },
    },
  );
  if (!response.ok) throw new Error(`CMS readiness check failed with HTTP ${response.status}.`);
  return websiteDTOSchema.parse(await response.json());
};

export const findCMSBlock = <T extends PageBlock['blockType']>(
  page: CMSPage | null | undefined,
  blockType: T,
): Extract<PageBlock, { blockType: T }> | undefined =>
  page?.layout.find(
    (block): block is Extract<PageBlock, { blockType: T }> => block.blockType === blockType,
  );

export const serviceFromCMSPage = (page: CMSPage): Service | null => {
  const detail = findCMSBlock(page, 'serviceDetail');
  if (!detail) return null;
  const slug = page.slug.replace(/^services\//, '');
  return {
    accent: detail.accent,
    cardHeadline: detail.cardHeadline,
    detailDescription: detail.detailDescription,
    image: detail.image?.url ?? '/og.png',
    imageAlt: detail.image?.alt || `${detail.label} service visual`,
    imagePosition: detail.imagePosition,
    label: detail.label,
    order: detail.order,
    preview: detail.preview,
    sections: detail.sections,
    slug,
    summary: detail.summary,
    tagline: detail.tagline,
  };
};

export const servicesFromCMSPages = (pages: CMSPage[]): Service[] =>
  pages
    .map(serviceFromCMSPage)
    .filter((service): service is Service => service !== null)
    .sort((left, right) => left.order - right.order);

export const getDevelopmentFallbackService = (slug: string): Service | null =>
  isLocalCMSFallbackEnabled() ? getService(slug) : null;
