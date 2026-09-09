import type { CMSStatementBlock } from '../../../lib/cms';
import styles from '../company.module.css';

const fallback: CMSStatementBlock = {
  anchor: 'our-attitude',
  blockType: 'statement',
  heading: 'Sharp thinking,\nwarm humans,\nvery little agency\ntheatre.',
  kicker: 'OUR ATTITUDE',
  text: 'We ask the awkward question early, keep humans in charge and make the system earn its complexity. No loku scene.',
};

export function AttitudeSection({ content }: { content?: CMSStatementBlock }) {
  const section = content ?? fallback;
  const headingLines = section.heading.split(/\s*(?:\||\r?\n)\s*/).filter(Boolean);
  return (
    <section className={`${styles.statement} ${styles.attitude}`} id={section.anchor || 'our-attitude'} aria-labelledby="attitude-title">
      <p className={styles.kicker}>{section.kicker}</p>
      <h2 id="attitude-title">
        {headingLines.map((line, index) => <span key={line}>{line}{index < headingLines.length - 1 ? <br /> : null}</span>)}
      </h2>
      <p className={styles.body}>{section.text}</p>
    </section>
  );
}
