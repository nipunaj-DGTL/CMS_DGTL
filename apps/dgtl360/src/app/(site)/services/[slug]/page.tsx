import type { Metadata } from 'next';
import { cookies, draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { MaintenanceScreen } from '../../../../components/cms/maintenance-screen';
import { services as fallbackServices } from '../../../../content/local/services';
import { ServiceDetailPage } from '../../../../features/services/components/detail/service-detail-page';
import {
  getCMSPage,
  getCMSNavigation,
  getCMSServicePages,
  getCMSSiteSettings,
  getCMSWebsite,
  getDevelopmentFallbackService,
  isLocalCMSFallbackEnabled,
  serviceFromCMSPage,
  servicesFromCMSPages,
} from '../../../../lib/cms';

type Props = { params: Promise<{ slug: string }> };

const readPreviewToken = async () => {
  const draft = await draftMode();
  return draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined;
};

const loadService = cache(async (slug: string, previewToken?: string) => {
  const page = await getCMSPage(`services/${slug}`, previewToken);
  return { page, service: page ? serviceFromCMSPage(page) : getDevelopmentFallbackService(slug) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page, service } = await loadService(slug, await readPreviewToken());
  if (!service) return {};

  const title = page?.seo.metaTitle ?? service.label;
  const description = page?.seo.metaDescription ?? service.summary;
  const settings = await getCMSSiteSettings();
  const image = page?.seo.ogImage ?? settings?.defaultSEO.socialImage;
  const imageURL = image?.url ?? service.image;
  const imageAlt = image?.alt || service.imageAlt || `${service.label} by DGTL 360`;

  return {
    title,
    description,
    icons: settings?.favicon ? { icon: settings.favicon.url } : undefined,
    robots: page?.seo.noIndex ? { follow: false, index: false } : undefined,
    openGraph: {
      title,
      description,
      images: [{
        alt: imageAlt,
        height: image?.height ?? undefined,
        url: imageURL,
        width: image?.width ?? undefined,
      }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [imageURL] },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const draft = await draftMode();
  const previewToken = draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined;
  const [{ page, service }, cmsPages, settings, website, footerNavigation] = await Promise.all([
    loadService(slug, previewToken),
    getCMSServicePages(),
    getCMSSiteSettings(),
    getCMSWebsite(),
    getCMSNavigation('footer'),
  ]);
  if (website?.status === 'maintenance' || settings?.maintenanceEnabled) {
    return <MaintenanceScreen message={settings?.maintenanceMessage} name={settings?.displayName ?? website?.displayName ?? 'DGTL 360'} />;
  }
  if (!service) notFound();

  const cmsServices = servicesFromCMSPages(cmsPages);
  const reelServices = cmsServices.length
    ? [...cmsServices]
    : isLocalCMSFallbackEnabled()
      ? [...fallbackServices]
      : [];
  const currentIndex = reelServices.findIndex((candidate) => candidate.slug === service.slug);
  if (currentIndex >= 0) reelServices[currentIndex] = service;
  else reelServices.push(service);
  reelServices.sort((left, right) => left.order - right.order);

  return (
    <ServiceDetailPage
      fontFamily={page?.typography.fontFamily}
      isPreview={draft.isEnabled && Boolean(page)}
      service={service}
      services={reelServices}
      settings={settings ?? undefined}
      footerNavigation={footerNavigation?.items}
    />
  );
}
