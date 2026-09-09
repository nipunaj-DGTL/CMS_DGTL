import Link from 'next/link';
import styles from '../../service-detail.module.css';

export function ServiceDetailFooter({ backLabel, brandName }: { backLabel?: string; brandName?: string }) {
  return (
    <footer className={styles.detailFooter}>
      <Link href="/#top">{backLabel || '← BACK TO ALL SERVICES'}</Link>
      <strong>{brandName || 'DGTL 360'}</strong>
    </footer>
  );
}
