'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { teamMembers, type TeamMember } from '../../../content/local/team';
import type { CMSTeamShowcaseBlock } from '../../../lib/cms';
import styles from '../team.module.css';

type Profile = TeamMember & { alt?: string; position?: string };
function Portrait({ member, large = false }: { member: Profile; large?: boolean }) {
  return member.image ? (
    <Image src={member.image} alt={member.alt ?? `Temporary sample portrait for ${member.name}`} fill sizes={large ? '(max-width: 900px) 90vw, 45vw' : '(max-width: 680px) 28vw, 15vw'} style={{ objectFit: 'cover', objectPosition: member.position }} />
  ) : (
    <div className={styles.placeholder} aria-label={`Portrait pending for ${member.name}`} role="img">
      <strong aria-hidden="true">{member.name.split(' ').map(part => part[0]).join('')}</strong>
    </div>
  );
}

export function TeamSection({ content }: { content?: CMSTeamShowcaseBlock }) {
  const people: Profile[] = content ? content.members.map(person => ({
    name: person.name || person.role,
    role: person.role,
    bio: person.description,
    linkedin: person.linkedin ?? '',
    image: person.image?.url ?? content.portraitImage?.url ?? null,
    alt: person.image?.alt ?? content.portraitImage?.alt ?? '',
    position: person.portraitPosition,
  })) : teamMembers;
  const [selected, setSelected] = useState<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const member = selected === null ? null : people[selected];
  const lines = (content?.heading ?? 'The people|making it|happen').split(/\s*(?:\||\r?\n)\s*/).filter(Boolean);

  return (
    <section className={`${styles.section} ${member ? styles.hasSelection : ''}`} id={content?.anchor ?? 'team'} aria-label={content?.heading ?? 'Meet the DGTL 360 team'}>
      <div className={styles.roster} aria-label="Team members">
        {people.map((person, index) => (
          <button className={`${styles.portrait} ${selected === index ? styles.selected : ''}`} key={person.name}
            onClick={() => { setSelected(index); profileRef.current?.focus({ preventScroll: true }); }}
            aria-pressed={selected === index} aria-controls="team-profile" aria-label={`View ${person.name}'s profile`}>
            <Portrait member={person} />
            <span>{person.name}</span>
          </button>
        ))}
      </div>
      <div className={styles.profile} id="team-profile" ref={profileRef} tabIndex={-1} aria-live="polite">
        {member ? (
          <>
            <button className={styles.back} onClick={() => setSelected(null)}>{content?.backLabel ?? '← ALL PEOPLE'}</button>
            <div className={styles.profileImage} key={member.name}><Portrait member={member} large /></div>
            <div className={styles.profileCopy}>
              <p>{member.role}</p>
              <h3>{member.name}</h3>
              {member.bio && <span>{member.bio}</span>}
              {member.linkedin ? <a className={styles.linkedin} href={member.linkedin} target="_blank" rel="noopener noreferrer">{content?.profileLinkLabel ?? 'VIEW LINKEDIN PROFILE ↗'}</a> : null}
            </div>
          </>
        ) : (
          <div className={styles.intro}>
            <p>{content?.kicker ?? 'DGTL 360 / THE CREW'}</p>
            <h2>{lines.map((line, index) => <span key={`${index}-${line}`}>{index ? <br /> : null}{line}</span>)}</h2>
            <span>{content?.instruction ?? 'Select a team member to learn more.'}</span>
          </div>
        )}
      </div>
    </section>
  );
}
