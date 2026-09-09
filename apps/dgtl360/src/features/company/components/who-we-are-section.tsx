import type { CMSCompanyOverviewBlock } from '../../../lib/cms';
import styles from '../company.module.css';

const fallback: CMSCompanyOverviewBlock = {
  anchor: 'who-we-are',
  blockType: 'companyOverview',
  capabilities: [
    { label: 'Production' },
    { label: 'Brand & strategy' },
    { label: 'Web development' },
    { label: 'App development' },
    { label: 'Digital services' },
    { label: 'Events & experiences' },
    { label: 'Agentic AI' },
  ],
  heading: 'WHO\nWE ARE',
  kicker: 'INTEGRATED BUSINESS SOLUTIONS',
  lead: 'We are a like-minded collective built around shared thinking, open process and a better standard of problem-solving—for Sri Lanka and the wider world.',
  link: { label: 'BUILD A BETTER SOLUTION ↗', url: '/#enquiry' },
  paragraphs: [
    { text: 'Our arsenal is deliberately broad, but our realm is digital. We work across production, brand and strategy, web and app development, digital services, events and experiences, and agentic AI—assembling the right disciplines around every brief.' },
    { text: 'How we deliver is never fixed. We combine agentic models with experienced makers and technical advisors at every stage. The result is technology that strengthens human judgement and solutions built to move organisations and personal pursuits forward.' },
  ],
};

export function WhoWeAreSection({ content }: { content?: CMSCompanyOverviewBlock }) {
  const section = content ?? fallback;
  const headingLines = section.heading.split(/\s*(?:\||\r?\n)\s*/).filter(Boolean);
  return (
    <section className={`${styles.statement} ${styles.integrated}`} id={section.anchor || 'who-we-are'} aria-labelledby="who-title">
      <p className={styles.kicker}>{section.kicker}</p>
      <h2 id="who-title">
        {headingLines.map((line, index) => <span key={line}>{line}{index < headingLines.length - 1 ? <br /> : null}</span>)}
      </h2>
      <div className={styles.aboutCopy}>
        <p className={styles.lead}>{section.lead}</p>
        {section.paragraphs.map((paragraph, index) => <p key={`${paragraph.text}-${index}`}>{paragraph.text}</p>)}
      </div>
      <ul className={styles.capabilities} aria-label="Our capabilities">
        {section.capabilities.map((capability) => <li key={capability.label}>{capability.label}</li>)}
      </ul>
      {section.link ? (
        <a
          className={styles.companyCta}
          href={section.link.url}
          rel={section.link.newTab ? 'noreferrer' : undefined}
          target={section.link.newTab ? '_blank' : undefined}
        >
          {section.link.label}
        </a>
      ) : null}
    </section>
  );
}
