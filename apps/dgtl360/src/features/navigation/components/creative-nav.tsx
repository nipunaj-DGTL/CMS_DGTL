import Link from 'next/link';
import styles from '../navigation.module.css';
import type { CMSLink, CMSNavigationItem } from '../../../lib/cms';

const fallbackItems: CMSNavigationItem[] = [
  { children: [], label: 'SERVICES', url: '/services/production' },
  { children: [], label: 'SAY HELLO', url: '/#enquiry' },
];

export function CreativeNav({
  brandName = 'DGTL 360',
  homepage = false,
  items,
  locationLabel,
  useFallback = false,
}: {
  brandName?: string;
  homepage?: boolean;
  items?: CMSNavigationItem[];
  locationLabel?: string;
  useFallback?: boolean;
}) {
  const navigation = items ?? (useFallback ? fallbackItems : []);
  const renderLink = (item: CMSLink) => (
    <Link
      href={item.url}
      key={`${item.label}-${item.url}`}
      target={item.newTab ? '_blank' : undefined}
      rel={item.newTab ? 'noopener noreferrer' : undefined}
    >
      {item.label}
    </Link>
  );
  return (
    <header className={`${styles.header} ${homepage ? styles.homepage : ''}`}>
      <Link className={styles.brand} href={homepage ? '#top' : '/'} aria-label={`${brandName} home`}>
        <span>{brandName}</span>
        <i aria-hidden="true"><b /><b /><b /></i>
      </Link>
      <p className={styles.location}>{locationLabel || 'COLOMBO + ANYWHERE'}</p>
      <nav className={styles.desktopNavigation} aria-label="Primary navigation">
        <ul className={styles.links}>
        {navigation.map((item) => (
          <li className={styles.navigationItem} key={`${item.label}-${item.url}`}>
            {renderLink(item)}
            {item.children.length ? (
              <ul className={styles.childLinks}>
                {item.children.map((child) => <li key={`${child.label}-${child.url}`}>{renderLink(child)}</li>)}
              </ul>
            ) : null}
          </li>
        ))}
        </ul>
      </nav>
      {navigation.length ? (
        <details className={styles.mobileNavigation}>
          <summary>MENU</summary>
          <nav aria-label="Mobile primary navigation">
            <ul>
              {navigation.map((item) => (
                <li key={`${item.label}-${item.url}`}>
                  {renderLink(item)}
                  {item.children.length ? (
                    <ul>{item.children.map((child) => <li key={`${child.label}-${child.url}`}>{renderLink(child)}</li>)}</ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
        </details>
      ) : null}
    </header>
  );
}
