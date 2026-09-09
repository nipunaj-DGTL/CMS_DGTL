import Link from 'next/link';
import styles from './site-footer.module.css';
import type { CMSNavigationItem, CMSSiteSettings } from '../../lib/cms';

const fallbackNavigation: CMSNavigationItem[] = [
  { children: [], label: 'Services', url: '/services/production' },
  { children: [], label: 'Integrated solutions', url: '/#who-we-are' },
  { children: [], label: 'Our attitude', url: '/#our-attitude' },
  { children: [], label: 'Team', url: '/#team' },
];

export function SiteFooter({ navigation, settings, useFallback = false }: { navigation?: CMSNavigationItem[]; settings?: CMSSiteSettings; useFallback?: boolean }) {
  const brandName = settings?.displayName || 'DGTL 360';
  const brandParts = brandName.split(/\s+/);
  const brandAccent = brandParts.pop();
  const brandBase = brandParts.join(' ');
  const email = settings?.contact.email || 'info@dgtl.lk';
  const links = navigation ?? (useFallback ? fallbackNavigation : []);
  const brand = settings?.brandContent;
  const headingLines = (brand?.footerHeading || 'Let’s make the|next thing work.')
    .split(/\s*(?:\||\r?\n)\s*/)
    .filter(Boolean);
  return (
    <footer className={styles.footer} id="site-footer">
      <div className={styles.topline}>
        <strong>{brandBase} <span>{brandAccent}</span></strong>
        <p>{brand?.locationLabel || 'COLOMBO + ANYWHERE'}</p>
      </div>
      <div className={styles.cta}>
        <p>{brand?.footerEyebrow || 'HAVE A PROBLEM WORTH SOLVING?'}</p>
        <div>
          <h2>{headingLines.map((line, index) => <span key={line}>{line}{index < headingLines.length - 1 ? <br /> : null}</span>)}</h2>
          <a href={`mailto:${email}`}>{email} ↗</a>
        </div>
      </div>
      <div className={styles.links}>
        <nav aria-label="Footer navigation">
          <ul>
            {links.map((item) => (
              <li key={`${item.label}-${item.url}`}>
                <Link href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>
                  {item.label}
                </Link>
                {item.children.length ? (
                  <ul>
                    {item.children.map((child) => (
                      <li key={`${child.label}-${child.url}`}>
                        <Link href={child.url} target={child.newTab ? '_blank' : undefined} rel={child.newTab ? 'noopener noreferrer' : undefined}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
        <p>{brand?.footerDescription || 'Brand, content, product, growth and the systems underneath—one accountable Colombo crew.'}</p>
      </div>
      <div className={styles.legal}>
        <span>{settings?.footerText || '© DGTL 360'}</span>
        <span>{brand?.legalLocation || 'COLOMBO, SRI LANKA'}</span>
        <a href="#top">{brand?.backToTopLabel || 'BACK TO TOP ↑'}</a>
      </div>
    </footer>
  );
}
