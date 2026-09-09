import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { MaintenanceScreen } from '../../../../components/cms/maintenance-screen';
import { CMSPageBlocks } from '../../../../components/cms/page-blocks';
import { SiteFooter } from '../../../../components/layout/site-footer';
import { CreativeNav } from '../../../../features/navigation/components/creative-nav';
import {
  getCMSNavigation,
  getCMSPost,
  getCMSSiteSettings,
  getCMSWebsite,
  isLocalCMSFallbackEnabled,
} from '../../../../lib/cms';
import styles from '../posts.module.css';

type Props = { params: Promise<{ slug: string }> };

const loadPost = cache(async (slug: string) => {
  const [post, website, settings, headerNavigation, footerNavigation] = await Promise.all([
    getCMSPost(slug),
    getCMSWebsite(),
    getCMSSiteSettings(),
    getCMSNavigation('header'),
    getCMSNavigation('footer'),
  ]);
  return { footerNavigation, headerNavigation, post, settings, website };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { post, settings } = await loadPost(slug);
  if (!post) return {};
  const title = post.seo.metaTitle ?? post.title;
  const description = post.seo.metaDescription ?? post.excerpt ?? settings?.defaultSEO.description ?? undefined;
  const image = post.seo.ogImage ?? post.featuredImage ?? settings?.defaultSEO.socialImage;
  return {
    description,
    openGraph: image ? { description, images: [{ alt: image.alt, height: image.height ?? undefined, url: image.url, width: image.width ?? undefined }], title } : undefined,
    robots: post.seo.noIndex ? { follow: false, index: false } : undefined,
    title,
    twitter: image ? { card: 'summary_large_image', description, images: [image.url], title } : undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const { footerNavigation, headerNavigation, post, settings, website } = await loadPost(slug);
  if (website?.status === 'maintenance' || settings?.maintenanceEnabled) {
    return <MaintenanceScreen message={settings?.maintenanceMessage} name={settings?.displayName ?? website?.displayName ?? 'DGTL 360'} />;
  }
  if (!post) notFound();
  const allowFallback = isLocalCMSFallbackEnabled();
  if (!allowFallback && (!website || !settings || !headerNavigation || !footerNavigation)) {
    throw new Error('DGTL360 posts require an active CMS website, site settings, and navigation.');
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <CreativeNav brandName={settings?.displayName} items={headerNavigation?.items} locationLabel={settings?.brandContent?.locationLabel ?? undefined} useFallback={allowFallback} />
      <article className={styles.article} id="main-content">
        <header className={styles.articleHeader}>
          <div>
            <p className={styles.kicker}>DGTL 360 / INSIGHTS</p>
            <h1>{post.title}</h1>
            {post.excerpt ? <p className={styles.excerpt}>{post.excerpt}</p> : null}
            {post.authorDisplayName ? <p className={styles.byline}>BY {post.authorDisplayName}</p> : null}
            {post.categories.length ? <ul className={styles.categories}>{post.categories.map((category) => <li key={category}>{category}</li>)}</ul> : null}
          </div>
          {post.featuredImage ? <div className={styles.featured}><Image alt={post.featuredImage.alt} fill priority sizes="(max-width: 850px) 100vw, 45vw" src={post.featuredImage.url} /></div> : null}
        </header>
        <CMSPageBlocks blocks={post.layout} />
      </article>
      <SiteFooter navigation={footerNavigation?.items} settings={settings ?? undefined} useFallback={allowFallback} />
    </>
  );
}

