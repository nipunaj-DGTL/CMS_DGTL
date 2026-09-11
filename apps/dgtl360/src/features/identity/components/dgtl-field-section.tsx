'use client';

import type { CSSProperties } from 'react';
import { glyphs as fallbackGlyphs, colors } from '../letters';
import type { CMSIdentityFieldBlock } from '../../../lib/cms';
import { useLetterCollisions } from '../use-letter-collisions';
import styles from '../identity.module.css';

export function DgtlFieldSection({ content }: { content?: CMSIdentityFieldBlock }) {
  const glyphs = content ? [...new Set(content.alphabets.flatMap(item => Array.from(item.characters)))].slice(0, 48) : fallbackGlyphs;
  const { root, push } = useLetterCollisions(glyphs.join(''));
  const columns = 6;
  const rows = Math.ceil(glyphs.length / columns);

  return (
    <section id="dgtl-field" className={styles.section} aria-label={content?.ariaLabel ?? 'DGTL logo with interactive multilingual letters'}>
      <div ref={root} className={styles.stage}>
        <div className={styles.ambient} aria-hidden="true" />
        <div className={styles.letters}>
          {glyphs.map((glyph, index) => (
            <button
              key={glyph}
              type="button"
              data-collision-letter
              className={styles.letter}
              style={{
                '--color': colors[index % colors.length],
                '--x': `${(index % columns + 0.5) / columns * 100}%`,
                '--y': `${(Math.floor(index / columns) + 0.5) / rows * 100}%`,
              } as CSSProperties}
              aria-label={`Push letter ${glyph}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch' && event.buttons === 0) push(index, true);
              }}
              onClick={() => push(index)}
            >
              <span className={styles.sculpture} aria-hidden="true">{glyph}</span>
            </button>
          ))}
        </div>
        <div className={styles.grid} aria-hidden="true" />
        <h2 className={styles.logo}>{content?.wordmark ?? 'DGTL'}</h2>
      </div>
    </section>
  );
}
