import Link from 'next/link';
import type { CSSProperties } from 'react';
import { EnquirySection } from '../../../enquiry/components/enquiry-section';
import type { CMSNavigationItem, CMSSiteSettings } from '../../../../lib/cms';
import type { Service } from '../../types/service.types';
import { ServiceCapabilityList } from './service-capability-list.client';
import { ServiceCinemaReel } from './service-cinema-reel';
import { SiteFooter } from '../../../../components/layout/site-footer';
import { ServiceHeroImage } from './service-hero-image';
import { ServiceRevealController } from './service-reveal-controller.client';
import styles from '../../service-detail.module.css';

export function ServiceDetailPage({
  fontFamily,
  isPreview = false,
  service,
  services,
  settings,
  footerNavigation,
}: {
  fontFamily?: 'brand' | 'sans' | 'serif';
  isPreview?: boolean;
  service: Service;
  services: Service[];
  settings?: CMSSiteSettings;
  footerNavigation?: CMSNavigationItem[];
}) {
  const brandName = settings?.displayName || 'DGTL 360';
  return (
    <div className={styles.page} data-cms-font={fontFamily} style={{ '--service-accent': service.accent } as CSSProperties}>
      <ServiceRevealController />
      {isPreview ? (
        <div className="cms-preview-banner">
          <span>Draft preview — not public</span>
          <form action="/api/cms/preview/exit" method="post"><button type="submit">Exit preview</button></form>
        </div>
      ) : null}
      <header className={styles.header}>
        <Link href="/">{brandName}</Link>
        <nav aria-label="Service breadcrumb">
          <Link href="/#top">{settings?.serviceContent?.breadcrumbLabel || '← SERVICES'}</Link>
          <span>{String(service.order).padStart(2, '0')} / {service.label.toUpperCase()}</span>
        </nav>
      </header>

      <main className={styles.layout}>
        <div className={styles.content}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1 data-service-reveal style={{ '--reveal-delay': '0ms' } as CSSProperties}>
                {service.label}
              </h1>
              <p data-service-reveal style={{ '--reveal-delay': '100ms' } as CSSProperties}>
                {service.detailDescription}
              </p>
            </div>
            <div
              className={styles.carouselReveal}
              data-service-reveal
              data-reveal-kind="carousel"
              style={{ '--reveal-delay': '120ms' } as CSSProperties}
            >
              <ServiceHeroImage service={service} />
            </div>
          </section>

          <section className={styles.sections} aria-label={`${service.label} capabilities`}>
            <ServiceCapabilityList sections={service.sections} />
          </section>
        </div>

        <aside className={styles.contact}>
          <EnquirySection compact settings={settings} />
        </aside>
      </main>

      <ServiceCinemaReel services={services} currentSlug={service.slug} labels={settings?.serviceContent} />
      <SiteFooter settings={settings} navigation={footerNavigation} backToTop="#" />
    </div>
  );
}
