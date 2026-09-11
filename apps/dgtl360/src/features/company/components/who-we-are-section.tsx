import styles from '../about.module.css';
import type { CMSCompanyOverviewBlock } from '../../../lib/cms';

export function WhoWeAreSection({ content }: { content?: CMSCompanyOverviewBlock }) {
  const capabilities = content?.capabilities.map(item => item.label) ?? [
    'Production',
    'Brand & strategy',
    'Digital marketing',
    'Web development',
    'App development',
    'Digital services',
    'Events & experiences',
    'Agentic AI',
  ];
  const lines = (content?.heading ?? 'One crew.|Every angle.').split(/\s*(?:\||\r?\n)\s*/).filter(Boolean);

  return (
    <section className={`${styles.aboutSection} ${styles.whoViewport}`} id={content?.anchor ?? 'who-we-are'} aria-labelledby="who-title">
      <header className={styles.aboutHeader}>
        <p className={styles.kicker}>{content?.kicker ?? 'Who we are'}</p>
        <h2 id="who-title">{lines.map((line, index) => <span key={`${index}-${line}`}>{index ? <br /> : null}{line}</span>)}</h2>
        <p className={styles.tagline}>{content?.tagline ?? 'Creative. Technology. Business.'}</p>
      </header>
      <div className={styles.aboutContent}>
      <div className={styles.aboutCopy}>
        <p className={styles.lead}>{content?.lead ?? 'We are a 360° creative, technology, and business solutions agency that transforms ideas into impactful brands and scalable businesses.'}</p>
        {(content?.paragraphs ?? [
          { text: 'By combining strategy, design, marketing, technology, AI, media production, and event management, we deliver end-to-end solutions that help organizations launch, grow, and lead in an ever-evolving digital world.' },
          { text: 'Our focus is simple: create measurable value through innovation, creativity, and execution excellence.' },
        ]).map((paragraph, index) => <p key={index}>{paragraph.text}</p>)}
      </div>
      <ul className={styles.capabilities} aria-label="Our capabilities">
        {capabilities.map((capability) => <li key={capability}>{capability}</li>)}
      </ul>
      <a className={styles.companyCta} href={content?.link?.url ?? '#enquiry'} target={content?.link?.newTab ? '_blank' : undefined} rel={content?.link?.newTab ? 'noopener noreferrer' : undefined}>{content?.link?.label ?? 'Let’s build something ↗'}</a>
      </div>
    </section>
  );
}
