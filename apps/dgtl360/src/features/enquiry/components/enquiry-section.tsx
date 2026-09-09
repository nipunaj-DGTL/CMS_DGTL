import type { CSSProperties } from 'react';
import type { CMSSiteSettings } from '../../../lib/cms';
import { EnquiryForm } from './enquiry-form.client';
import styles from '../enquiry.module.css';

type EnquiryContent = { address?: string; email?: string; heading?: string; text?: string };

export function EnquirySection({
  compact = false,
  content,
  settings,
}: {
  compact?: boolean;
  content?: EnquiryContent;
  settings?: CMSSiteSettings;
}) {
  const email = content?.email || settings?.contact.email || 'info@dgtl.lk';
  const enquiry = settings?.enquiryContent;
  return (
    <section className={`${styles.section} ${compact ? styles.compact : ''}`} id={compact ? undefined : 'enquiry'} aria-labelledby={compact ? 'service-enquiry-title' : 'enquiry-title'}>
      <p
        className={styles.kicker}
        data-service-reveal={compact ? '' : undefined}
        style={compact ? ({ '--reveal-delay': '0ms' } as CSSProperties) : undefined}
      >
        {compact ? (enquiry?.serviceKicker || 'CONTACT US') : (enquiry?.homeKicker || 'START AN ENQUIRY')}
      </p>
      <h2
        id={compact ? 'service-enquiry-title' : 'enquiry-title'}
        data-service-reveal={compact ? '' : undefined}
        style={compact ? ({ '--reveal-delay': '80ms' } as CSSProperties) : undefined}
      >
        {compact ? (enquiry?.serviceHeading || 'Let’s make your next move clear.') : (content?.heading || <>Tell us the problem. We’ll route the next useful step.</>)}
      </h2>
      <p
        className={styles.copy}
        data-service-reveal={compact ? '' : undefined}
        style={compact ? ({ '--reveal-delay': '150ms' } as CSSProperties) : undefined}
      >
        {compact
          ? (enquiry?.serviceText || 'Tell us what you are building, what feels stuck, or where you need traction. We’ll route the right DGTL 360 crew and the next useful step.')
          : (content?.text || 'Tell us what you are trying to make, fix or move forward. We’ll bring in the right people, ask the useful questions and come back with a practical next step.')}
      </p>
      <EnquiryForm compact={compact} labels={enquiry} />
      <a className={styles.email} href={`mailto:${email}`}>{email} ↗</a>
      <address className={styles.address}>
        <span>{enquiry?.addressLabel || 'OUR ADDRESS'}</span>
        {(content?.address || settings?.contact.address || 'Mode Residence\n3 Beach Rd,\nDehiwala-Mount Lavinia').split('\n').map((line, index, lines) => (
          <span className={styles['address-line']} key={`${line}-${index}`}>{line}{index < lines.length - 1 ? <br /> : null}</span>
        ))}
      </address>
    </section>
  );
}
