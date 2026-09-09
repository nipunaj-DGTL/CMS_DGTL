'use client';

import { useState } from 'react';
import type { CMSTeamShowcaseBlock } from '../../../lib/cms';
import styles from '../team.module.css';

const fallback: CMSTeamShowcaseBlock = {
  anchor: 'team',
  blockType: 'teamShowcase',
  heading: 'The people\nmaking it\nhappen',
  instruction: 'Select any portrait to open their story.',
  kicker: 'DGTL 360 / THE CREW',
  members: [
    { number: '01', role: 'Strategy & Planning', description: 'Creates the positioning, priorities and decision path that align the crew before execution begins.', portraitPosition: '8% 30%', profilePosition: '8% 30%' },
    { number: '02', role: 'Creative Direction', description: 'Turns the useful problem into a distinctive idea and keeps every expression connected to it.', portraitPosition: '28% 28%', profilePosition: '28% 28%' },
    { number: '03', role: 'Production', description: 'Brings sound, image, motion and the operational details together from first take to delivery.', portraitPosition: '51% 27%', profilePosition: '51% 27%' },
    { number: '04', role: 'Brand Systems', description: 'Builds identities that remain coherent across people, platforms, campaigns and everyday use.', portraitPosition: '75% 27%', profilePosition: '75% 27%' },
    { number: '05', role: 'Product Design', description: 'Makes complex digital journeys feel clear, useful and resilient for the people using them.', portraitPosition: '12% 65%', profilePosition: '12% 65%' },
    { number: '06', role: 'Engineering', description: 'Builds maintainable platforms and integrations that survive real traffic and real operations.', portraitPosition: '35% 63%', profilePosition: '35% 63%' },
    { number: '07', role: 'Growth', description: 'Connects creative work to measurable audience behaviour and keeps improving the learning loop.', portraitPosition: '58% 62%', profilePosition: '58% 62%' },
    { number: '08', role: 'Experience', description: 'Shapes the room, run sheet and production details around what people should feel and remember.', portraitPosition: '82% 60%', profilePosition: '82% 60%' },
    { number: '09', role: 'Operations', description: 'Keeps ownership, timing and delivery visible across a brief with several moving parts.', portraitPosition: '25% 90%', profilePosition: '25% 90%' },
    { number: '10', role: 'Agentic Systems', description: 'Introduces practical automation with visible controls, auditability and humans still accountable.', portraitPosition: '55% 88%', profilePosition: '55% 88%' },
  ],
};

export function TeamSection({ content }: { content?: CMSTeamShowcaseBlock }) {
  const section = content ?? fallback;
  const [selected, setSelected] = useState<number | null>(null);
  const member = selected === null ? null : section.members[selected];
  const headingLines = section.heading.split(/\s*(?:\||\r?\n)\s*/).filter(Boolean);

  return (
    <section className={`${styles.section} ${member ? styles.hasSelection : ''}`} id={section.anchor || 'team'} aria-labelledby="team-title">
      <div className={styles.roster} aria-label="DGTL 360 team disciplines">
        {section.members.map((candidate, index) => (
          <button
            className={`${styles.portrait} ${selected === index ? styles.selected : ''}`}
            key={`${candidate.number}-${candidate.role}`}
            onClick={() => setSelected(index)}
            aria-pressed={selected === index}
            aria-label={`Open profile ${candidate.number}: ${candidate.role}`}
          >
            {/* Native image avoids a Vinext client-bundle React duplication issue. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.portraitImage?.url || '/assets/reference/team-collective.png'}
              alt={section.portraitImage?.alt || ''}
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: candidate.portraitPosition || '50% 50%' }}
            />
            <span>{candidate.number}</span>
          </button>
        ))}
      </div>

      <div className={styles.profile} aria-live="polite">
        {member ? (
          <>
            <button className={styles.back} onClick={() => setSelected(null)}>← ALL PEOPLE</button>
            <div className={styles.profileImage} key={`image-${member.number}`}>
              {/* Native image avoids a Vinext client-bundle React duplication issue. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={section.profileImage?.url || '/assets/reference/team-profile.png'}
                alt={section.profileImage?.alt || 'DGTL 360 team member editorial profile study'}
                decoding="async"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: member.profilePosition || member.portraitPosition || '50% 50%' }}
              />
            </div>
            <div className={styles.profileCopy} key={`copy-${member.number}`}>
              <p>PROFILE {member.number}</p>
              <h3>{member.role}</h3>
              <span>{member.description}</span>
            </div>
          </>
        ) : (
          <div className={styles.intro}>
            <p>{section.kicker}</p>
            <h2 id="team-title">
              {headingLines.map((line, index) => <span key={line}>{line}{index < headingLines.length - 1 ? <br /> : null}</span>)}
            </h2>
            <span>{section.instruction}</span>
          </div>
        )}
      </div>
    </section>
  );
}
