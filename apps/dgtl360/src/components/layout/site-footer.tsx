import Link from 'next/link';
import type { CMSNavigationItem, CMSSiteSettings } from '../../lib/cms';
import styles from './site-footer.module.css';
import { SocialIcons } from './social-icons';

export function SiteFooter({ navigation, settings, backToTop = '#top' }: {
  navigation?: CMSNavigationItem[];
  settings?: CMSSiteSettings;
  backToTop?: string;
  useFallback?: boolean;
}) {
  const email = settings?.contact.email;
  const links = navigation ?? [];
  const columns = Array.from({ length: 3 }, (_, index) => links.slice(index * Math.ceil(links.length / 3), (index + 1) * Math.ceil(links.length / 3)));
  const renderLink = (item: CMSNavigationItem | CMSNavigationItem['children'][number]) => (
    <Link key={`${item.label}-${item.url}`} href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>{item.label}</Link>
  );
  return (
    <footer className={styles.footer} id="site-footer">
      <div className={styles.main}>
        <nav className={styles.links} aria-label="Footer navigation">
          {columns.map((column, index) => <div key={index}>{column.map(item => <div className={styles.linkGroup} key={`${item.label}-${item.url}`}>{renderLink(item)}{item.children.map(renderLink)}</div>)}</div>)}
        </nav>
        <div className={styles.contact}>
          <SocialIcons links={settings?.socialLinks} />
          <Link href="/" className={styles.brand}>{settings?.displayName ?? 'DGTL 360'}</Link>
          <p>{settings?.brandContent?.locationLabel}</p>
          {email ? <a href={`mailto:${email}`}>{email} ↗</a> : null}
        </div>
      </div>
      <div className={styles.legal}>
        <div className={styles.legalLinks}><span>{settings?.footerText}</span></div>
        <a href={backToTop}>{settings?.brandContent?.backToTopLabel ?? 'Back to top ⌃'}</a>
      </div>
    </footer>
  );
}
