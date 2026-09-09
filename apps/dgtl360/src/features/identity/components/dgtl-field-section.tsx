'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CMSIdentityFieldBlock } from '../../../lib/cms';
import styles from '../identity.module.css';

const fallbackAlphabets = [
  'අකගතනමයරල',
  'தமிழ்மொழி',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'अआइकगचतभम',
  'ابتثجحخدذر',
  'ΑΒΓΔΘΛΣΩ',
  '0123456789{}[]<>',
];

const makeColumns = (alphabets: string[]) => Array.from({ length: 64 }, (_, columnIndex) => {
  const characters = Array.from({ length: 24 }, (_, characterIndex) => {
    const pool = alphabets[(columnIndex + characterIndex) % alphabets.length];
    const character = Array.from(pool)[(columnIndex * 7 + characterIndex * 3) % Array.from(pool).length];
    return characterIndex % 4 === 3 ? `${character}${'01{}+'[(columnIndex + characterIndex) % 5]}` : character;
  }).join('\n');

  return {
    id: columnIndex,
    text: characters,
    delay: `${((columnIndex * 13) % 29) * -0.61}s`,
    duration: `${13 + ((columnIndex * 7) % 12)}s`,
    staticY: `${((columnIndex * 17) % 84) - 34}vh`,
  };
});

export function DgtlFieldSection({ content }: { content?: CMSIdentityFieldBlock }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const alphabetKey = content?.alphabets
    .map((alphabet) => alphabet.characters)
    .filter(Boolean)
    .join('\u001f') ?? '';
  const columns = useMemo(
    () => makeColumns(alphabetKey ? alphabetKey.split('\u001f') : fallbackAlphabets),
    [alphabetKey],
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.08 },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="dgtl-field"
      aria-label={content?.ariaLabel || 'DGTL logo with multilingual alphabet rain'}
      data-active={active}
    >
      <div className={styles.rain} aria-hidden="true">
        {columns.map((column) => (
          <span
            key={column.id}
            style={{
              '--column-left': `${((column.id + 0.5) / columns.length) * 100}%`,
              '--column-delay': column.delay,
              '--column-duration': column.duration,
              '--column-static-y': column.staticY,
            } as CSSProperties}
          >
            {column.text}
          </span>
        ))}
      </div>
      <p className={styles.wordmark}>{content?.wordmark || 'DGTL'}</p>
    </section>
  );
}
