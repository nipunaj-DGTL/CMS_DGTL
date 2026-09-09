import type { Metadata } from 'next';
import { cookies, draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { MaintenanceScreen } from '../../../components/cms/maintenance-screen';
import { CMSPageBlocks } from '../../../components/cms/page-blocks';
import { SiteFooter } from '../../../components/layout/site-footer';
import { CreativeNav } from '../../../features/navigation/components/creative-nav';
import { getCMSNavigation, getCMSPage, getCMSSiteSettings, getCMSWebsite } from '../../../lib/cms';

type Props = { params: Promise<{ slug: string[] }> };

const previewToken = async (): Promise<string | undefined> => {
  const draft = await draftMode();
  return draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined;
};

const loadPage = cache(async (parts: string[], token?: string) => {
  const slug = parts.join('/');
  const [page, website, settings, headerNavigation, footerNavigation] = await Promise.all([
    getCMSPage(slug, token),
    getCMSWebsite(),
    getCMSSiteSettings(),
    getCMSNavigation('header'),
    getCMSNavigation('footer'),
  ]);
  return { footerNavigation, headerNavigation, page, settings, website };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page, settings } = await loadPage(slug, await previewToken());
  if (!page) return {};
  const title = page.seo.metaTitle ?? page.title;
  const description = page.seo.metaDescription ?? settings?.defaultSEO.description ?? undefined;
  const image = page.seo.ogImage ?? settings?.defaultSEO.socialImage;
  return {
    description,
    icons: settings?.favicon ? { icon: settings.favicon.url } : undefined,
    openGraph: image ? { description, images: [{ alt: image.alt, height: image.height ?? undefined, url: image.url, width: image.width ?? undefined }], title } : undefined,
    robots: page.seo.noIndex ? { follow: false, index: false } : undefined,
    title,
    twitter: image ? { card: 'summary_large_image', description, images: [image.url], title } : undefined,
  };
}

export default async function DynamicCMSPage({ params }: Props) {
  const { slug } = await params;
  const draft = await draftMode();
  const token = draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined;
  const { footerNavigation, headerNavigation, page, settings, website } = await loadPage(slug, token);
  if (website?.status === 'maintenance' || settings?.maintenanceEnabled) {
    return <MaintenanceScreen message={settings?.maintenanceMessage} name={settings?.displayName ?? website?.displayName ?? 'DGTL 360'} />;
  }
  if (!page || !settings || !headerNavigation || !footerNavigation) notFound();

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <CreativeNav brandName={settings.displayName} items={headerNavigation.items} locationLabel={settings.brandContent?.locationLabel ?? undefined} />
      <main id="main-content" data-cms-font={page.typography.fontFamily}>
        {draft.isEnabled ? <div className="cms-preview-banner"><span>Draft preview — not public</span><form action="/api/cms/preview/exit" method="post"><button type="submit">Exit preview</button></form></div> : null}
        <CMSPageBlocks blocks={page.layout} />
      </main>
      <SiteFooter navigation={footerNavigation.items} settings={settings} />
    </>
  );
}
