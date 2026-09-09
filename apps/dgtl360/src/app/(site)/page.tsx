import type { Metadata } from 'next';
import { cookies, draftMode } from 'next/headers';
import { SiteFooter } from '../../components/layout/site-footer';
import { MaintenanceScreen } from '../../components/cms/maintenance-screen';
import { CMSPageBlocks } from '../../components/cms/page-blocks';
import { services as fallbackServices } from '../../content/local/services';
import { AttitudeSection } from '../../features/company/components/attitude-section';
import { WhoWeAreSection } from '../../features/company/components/who-we-are-section';
import { EnquirySection } from '../../features/enquiry/components/enquiry-section';
import { HeroSection } from '../../features/hero/components/hero-section';
import { DgtlFieldSection } from '../../features/identity/components/dgtl-field-section';
import { CreativeNav } from '../../features/navigation/components/creative-nav';
import type { Service } from '../../features/services/types/service.types';
import { TeamSection } from '../../features/team/components/team-section.client';
import {
  findCMSBlock,
  getCMSHomeContent,
  isLocalCMSFallbackEnabled,
  servicesFromCMSPages,
  type CMSPage,
  type CMSSiteSettings,
} from '../../lib/cms';

const blockKey = (block: CMSPage['layout'][number], index: number) =>
  block.id ?? `${block.blockType}-${index}`;

const readPreviewToken = async () => {
  const draft = await draftMode();
  return draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined;
};

const orderServices = (services: Service[], serviceSlugs?: string[]): Service[] => {
  if (!serviceSlugs?.length) return services;
  const bySlug = new Map(services.map((service) => [`services/${service.slug}`, service]));
  const selected = serviceSlugs
    .map((slug) => bySlug.get(slug))
    .filter((service): service is Service => Boolean(service));
  return selected.length ? selected : services;
};

const pageMetadata = (page: CMSPage | null, settings: CMSSiteSettings | null): Metadata => {
  const title = page?.seo.metaTitle ?? settings?.defaultSEO.title ?? undefined;
  const description = page?.seo.metaDescription ?? settings?.defaultSEO.description ?? undefined;
  const image = page?.seo.ogImage ?? settings?.defaultSEO.socialImage;
  return {
    title,
    description,
    icons: settings?.favicon ? { icon: settings.favicon.url } : undefined,
    robots: page?.seo.noIndex ? { follow: false, index: false } : undefined,
    openGraph: image ? {
      title,
      description,
      images: [{
        alt: image.alt,
        height: image.height ?? undefined,
        url: image.url,
        width: image.width ?? undefined,
      }],
    } : undefined,
    twitter: image ? { card: 'summary_large_image', description, images: [image.url], title } : undefined,
  };
};

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCMSHomeContent(await readPreviewToken());
  return pageMetadata(cms?.page ?? null, cms?.settings ?? null);
}

export default async function HomePage() {
  const draft = await draftMode();
  const previewToken = draft.isEnabled ? (await cookies()).get('dgtl-preview-token')?.value : undefined;
  const cms = await getCMSHomeContent(previewToken);
  const allowFallback = isLocalCMSFallbackEnabled();
  if (cms?.website?.status === 'maintenance' || cms?.settings?.maintenanceEnabled) {
    return (
      <MaintenanceScreen
        message={cms.settings?.maintenanceMessage}
        name={cms.settings?.displayName ?? cms.website?.displayName ?? 'DGTL 360'}
      />
    );
  }
  const hero = findCMSBlock(cms?.page, 'hero');
  const serviceIndex = findCMSBlock(cms?.page, 'serviceIndex');
  const company = findCMSBlock(cms?.page, 'companyOverview');
  const statement = findCMSBlock(cms?.page, 'statement');
  const team = findCMSBlock(cms?.page, 'teamShowcase');
  const contact = findCMSBlock(cms?.page, 'contactDetails');
  const identity = findCMSBlock(cms?.page, 'identityField');
  const cmsServices = servicesFromCMSPages(cms?.servicePages ?? []);
  const homeServices = orderServices(
    cmsServices.length ? cmsServices : allowFallback ? fallbackServices : [],
    serviceIndex?.serviceSlugs,
  );
  const homeLayout = cms?.page?.layout ?? [];
  const hasHero = homeLayout.some((block) => block.blockType === 'hero');
  const hasCallToAction = homeLayout.some((block) => block.blockType === 'callToAction');

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <CreativeNav
        brandName={cms?.settings?.displayName}
        homepage
        items={cms?.headerNavigation?.items}
        locationLabel={cms?.settings?.brandContent?.locationLabel ?? undefined}
        useFallback={allowFallback}
      />
      <main id="main-content" className="home-scroll-snap" data-cms-font={cms?.page?.typography.fontFamily}>
        {draft.isEnabled && cms?.page ? (
          <div className="cms-preview-banner">
            <span>Draft preview — not public</span>
            <form action="/api/cms/preview/exit" method="post"><button type="submit">Exit preview</button></form>
          </div>
        ) : null}
        {homeLayout.length ? (
          <div className="home-section-slides">
            {homeLayout.map((block, index) => {
              const key = blockKey(block, index);
              switch (block.blockType) {
                case 'hero':
                  return <HeroSection content={block} key={key} services={homeServices} servicesLabel={serviceIndex?.heading} />;
                case 'serviceIndex':
                  return hasHero ? null : <CMSPageBlocks blocks={[block]} key={key} />;
                case 'companyOverview':
                  return <WhoWeAreSection content={block} key={key} />;
                case 'statement':
                  return <AttitudeSection content={block} key={key} />;
                case 'teamShowcase':
                  return <TeamSection content={block} key={key} />;
                case 'callToAction':
                  return (
                    <EnquirySection
                      content={{
                        address: contact?.address ?? cms?.settings?.contact.address ?? undefined,
                        email: contact?.email ?? cms?.settings?.contact.email ?? undefined,
                        heading: block.heading,
                        text: block.text,
                      }}
                      key={key}
                      settings={cms?.settings ?? undefined}
                    />
                  );
                case 'contactDetails':
                  return hasCallToAction ? null : (
                    <EnquirySection
                      content={{ address: block.address, email: block.email, heading: block.heading }}
                      key={key}
                      settings={cms?.settings ?? undefined}
                    />
                  );
                case 'identityField':
                  return <DgtlFieldSection content={block} key={key} />;
                default:
                  return <CMSPageBlocks blocks={[block]} key={key} />;
              }
            })}
          </div>
        ) : allowFallback ? (
          <>
            <HeroSection content={hero} services={homeServices} servicesLabel={serviceIndex?.heading} />
            <div className="home-section-slides">
              <WhoWeAreSection content={company} />
              <AttitudeSection content={statement} />
              <TeamSection content={team} />
              <EnquirySection settings={cms?.settings ?? undefined} />
              <DgtlFieldSection content={identity} />
            </div>
          </>
        ) : null}
      </main>
      <SiteFooter navigation={cms?.footerNavigation?.items} settings={cms?.settings ?? undefined} useFallback={allowFallback} />
    </>
  );
}
