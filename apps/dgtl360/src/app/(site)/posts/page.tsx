import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { MaintenanceScreen } from '../../../components/cms/maintenance-screen';
import { SiteFooter } from '../../../components/layout/site-footer';
import { CreativeNav } from '../../../features/navigation/components/creative-nav';
import {
  getCMSNavigation,
  getCMSPosts,
  getCMSSiteSettings,
  getCMSWebsite,
  isLocalCMSFallbackEnabled,
} from '../../../lib/cms';
import styles from './posts.module.css';

type Props = { searchParams: Promise<{ page?: string | string[] }> };

const pageNumber = (value?: string | string[]): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 1;
  return /^\d+$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 10_000 ? Number(raw) : 1;
};

const formatDate = (value: string | null, locale?: string, timezone?: string): string | null => {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(locale || 'en', { dateStyle: 'long', timeZone: timezone || 'UTC' }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value));
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCMSSiteSettings();
  const title = `Insights — ${settings?.displayName ?? 'DGTL 360'}`;
  return { description: settings?.defaultSEO.description ?? undefined, title };
}

export default async function PostsPage({ searchParams }: Props) {
  const requestedPage = pageNumber((await searchParams).page);
  const [result, website, settings, headerNavigation, footerNavigation] = await Promise.all([
    getCMSPosts(requestedPage),
    getCMSWebsite(),
    getCMSSiteSettings(),
    getCMSNavigation('header'),
    getCMSNavigation('footer'),
  ]);
  if (website?.status === 'maintenance' || settings?.maintenanceEnabled) {
    return <MaintenanceScreen message={settings?.maintenanceMessage} name={settings?.displayName ?? website?.displayName ?? 'DGTL 360'} />;
  }
  const allowFallback = isLocalCMSFallbackEnabled();
  if (!allowFallback && (!website || !settings || !headerNavigation || !footerNavigation)) {
    throw new Error('DGTL360 posts require an active CMS website, site settings, and navigation.');
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <CreativeNav brandName={settings?.displayName} items={headerNavigation?.items} locationLabel={settings?.brandContent?.locationLabel ?? undefined} useFallback={allowFallback} />
      <main className={styles.page} id="main-content">
        <header className={styles.header}>
          <p className={styles.kicker}>DGTL 360 / INSIGHTS</p>
          <h1>Ideas in motion.</h1>
          <p>Published notes, perspectives and practical thinking from the DGTL 360 team.</p>
        </header>
        {result.posts.length ? (
          <div className={styles.grid}>
            {result.posts.map((post) => {
              const published = formatDate(post.publishedAt, settings?.locale, settings?.timezone);
              return (
                <article className={styles.card} key={post.id}>
                  {post.featuredImage ? (
                    <Link aria-label={`Read ${post.title}`} className={styles.image} href={`/posts/${post.slug}`}>
                      <Image alt={post.featuredImage.alt} fill sizes="(max-width: 850px) 100vw, 33vw" src={post.featuredImage.url} />
                    </Link>
                  ) : null}
                  <div className={styles.copy}>
                    {published ? <time className={styles.meta} dateTime={post.publishedAt ?? undefined}>{published}</time> : null}
                    <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
                    {post.excerpt ? <p>{post.excerpt}</p> : null}
                    <Link className={styles.read} href={`/posts/${post.slug}`}>READ ARTICLE ↗</Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className={styles.empty}>No articles have been published yet.</p>}
        {result.pagination.totalPages > 1 ? (
          <nav aria-label="Article pagination" className={styles.pagination}>
            {result.pagination.prevPage ? <Link href={`/posts?page=${result.pagination.prevPage}`}>← NEWER</Link> : <span />}
            <span>PAGE {result.pagination.page} / {result.pagination.totalPages}</span>
            {result.pagination.nextPage ? <Link href={`/posts?page=${result.pagination.nextPage}`}>OLDER →</Link> : <span />}
          </nav>
        ) : null}
      </main>
      <SiteFooter navigation={footerNavigation?.items} settings={settings ?? undefined} useFallback={allowFallback} />
    </>
  );
}

