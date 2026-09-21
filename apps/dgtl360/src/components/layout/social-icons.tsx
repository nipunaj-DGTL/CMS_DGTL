import Image from 'next/image';
import type { CMSSiteSettings } from '../../lib/cms';
import styles from './site-footer.module.css';

const icons: Record<string, { color: string; asset: string }> = {
  instagram: { color: '#ed008c', asset: 'instagram' },
  linkedin: { color: '#0088bc', asset: 'linkedin' },
  whatsapp: { color: '#20ce67', asset: 'whatsapp' },
  youtube: { color: '#fff', asset: 'youtube' },
  tiktok: { color: '#fff', asset: 'tiktok' },
  slack: { color: '#fff', asset: 'slack' },
  threads: { color: '#090909', asset: 'threads' },
  telegram: { color: '#22a6dc', asset: 'telegram' },
  x: { color: '#fff', asset: 'x' },
  twitter: { color: '#fff', asset: 'x' },
};

export function SocialIcons({ links = [] }: { links?: CMSSiteSettings['socialLinks'] }) {
  // No guessed URLs: render only the company's configured HTTPS profiles.
  const validLinks = links.filter(link => {
    try { const url = new URL(link.url); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
  });
  if (!validLinks.length) return null;
  return <ul className={styles.socials} aria-label="Social media">
    {validLinks.map(link => {
      const icon = icons[link.label.toLowerCase().replace(/[^a-z]/g, '')];
      return <li key={`${link.label}-${link.url}`}><a className={styles.socialIcon} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label} style={{ backgroundColor: icon?.color ?? '#173e9c' }}>
        {icon ? <Image src={`/assets/social/${icon.asset}.svg`} width={25} height={25} alt="" aria-hidden="true" unoptimized /> : <span aria-hidden="true">{link.label.slice(0, 2).toUpperCase()}</span>}
      </a></li>;
    })}
  </ul>;
}
