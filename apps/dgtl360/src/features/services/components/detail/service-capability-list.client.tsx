'use client';

import { useState } from 'react';
import type { FocusEvent, MouseEvent } from 'react';
import type { ServiceSection } from '../../types/service.types';
import styles from '../../service-detail.module.css';

function ServiceCapabilityRow({
  section,
  index,
}: {
  section: ServiceSection;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const open = hovered || focused || expanded;

  function handleSummaryClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    setExpanded((current) => !current);
  }

  function handleBlur(event: FocusEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocused(false);
    }
  }

  return (
    <details
      open={open}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={handleBlur}
    >
      <summary onClick={handleSummaryClick}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <h2 className={styles.sectionTitle}>{section.title}</h2>
        <i aria-hidden="true">+</i>
      </summary>
      <div className={styles.sectionBody}>
        {section.body?.split('\n\n').map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.items && section.items.length > 0 ? (
          <ul>
            {section.items.map((item) => (
              <li key={item.title}>
                <em>{item.title}</em>
                {item.description ? <> — {item.description}</> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

export function ServiceCapabilityList({ sections }: { sections: ServiceSection[] }) {
  return (
    <>
      {sections.map((section, index) => (
        <ServiceCapabilityRow key={section.title} section={section} index={index} />
      ))}
    </>
  );
}
