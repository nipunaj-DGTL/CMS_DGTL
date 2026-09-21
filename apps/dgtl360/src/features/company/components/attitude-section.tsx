import styles from '../about.module.css';
import type { CMSStatementBlock } from '../../../lib/cms';

export function AttitudeSection({ content }: { content?: CMSStatementBlock }) {
  const lines = (content?.heading ?? 'Sharp thinking,|warm humans,|very little agency|theatre.').split(/\s*(?:\||\r?\n)\s*/).filter(Boolean);
  return (
    <section className={styles.aboutSection} id={content?.anchor ?? 'our-attitude'} aria-labelledby="attitude-title">
      <header className={styles.aboutHeader}>
      <p className={styles.kicker}>{content?.kicker ?? 'OUR ATTITUDE'}</p>
      <h2 id="attitude-title">{lines.map((line, index) => <span key={`${index}-${line}`}>{index ? <br /> : null}{line}</span>)}</h2>
      </header>
      <div className={styles.aboutCopy}>
      <p>
        {content?.text ?? 'We ask the awkward question early, keep humans in charge and make the system earn its complexity. No loku scene.'}
      </p>
      </div>
    </section>
  );
}
