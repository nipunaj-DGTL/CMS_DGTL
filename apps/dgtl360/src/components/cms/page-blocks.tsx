import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { MediaDTO, PageBlock } from '@dgtl/content-contracts';

import { CMSRichText } from './rich-text';
import styles from './page-blocks.module.css';

const linkProps = (newTab?: boolean) => ({
  rel: newTab ? 'noopener noreferrer' : undefined,
  target: newTab ? '_blank' : undefined,
});

function Media({ media, priority = false }: { media: MediaDTO; priority?: boolean }) {
  if (media.mimeType?.startsWith('video/')) {
    return <video aria-label={media.alt} controls playsInline preload="metadata" src={media.url} />;
  }
  if (media.mimeType && !media.mimeType.startsWith('image/')) {
    return <a className={styles.fileLink} href={media.url} rel="noopener noreferrer" target="_blank">Open {media.alt || 'media file'}</a>;
  }
  return <Image alt={media.alt} fill priority={priority} sizes="(max-width: 800px) 100vw, 50vw" src={media.url} />;
}

const serviceURL = (slug: string): string => `/${slug.includes('/') ? slug : `services/${slug}`}`;

export function CMSPageBlocks({ blocks }: { blocks: PageBlock[] }) {
  return blocks.map((block, index) => {
    const key = block.id ?? `${block.blockType}-${index}`;
    switch (block.blockType) {
      case 'hero':
        return (
          <section className={`${styles.block} ${styles.hero}`} key={key}>
            <div className={styles.heroCopy}>
              {block.eyebrow ? <p className={styles.kicker}>{block.eyebrow}</p> : null}
              <h1>{block.heading}</h1>
              {block.text ? <p>{block.text}</p> : null}
              <div className={styles.links}>{block.links.map((link) => <Link className={styles.button} href={link.url} key={`${link.label}-${link.url}`} {...linkProps(link.newTab)}>{link.label}</Link>)}</div>
            </div>
            {block.video || block.image ? <div className={styles.media}>{block.video ? <Media media={block.video} /> : block.image ? <Media media={block.image} priority /> : null}</div> : null}
          </section>
        );
      case 'serviceIndex':
        return <section className={`${styles.block} ${styles.index}`} key={key}>{block.heading ? <h2 className={styles.heading}>{block.heading}</h2> : null}<div className={styles.indexGrid}>{block.serviceSlugs.map((slug) => <Link href={serviceURL(slug)} key={slug}>{slug.split('/').at(-1)?.replaceAll('-', ' ')}</Link>)}</div></section>;
      case 'companyOverview':
        return <section className={`${styles.block} ${styles.overview}`} id={block.anchor || undefined} key={key}><div><p className={styles.kicker}>{block.kicker}</p><h2>{block.heading}</h2><p className={styles.lead}>{block.lead}</p></div><div>{block.paragraphs.map((paragraph, itemIndex) => <p key={`${paragraph.text}-${itemIndex}`}>{paragraph.text}</p>)}<ul className={styles.capabilities}>{block.capabilities.map((item) => <li key={item.label}>{item.label}</li>)}</ul>{block.link ? <Link className={styles.button} href={block.link.url} {...linkProps(block.link.newTab)}>{block.link.label}</Link> : null}</div></section>;
      case 'statement':
        return <section className={`${styles.block} ${styles.statement}`} id={block.anchor || undefined} key={key}><p className={styles.kicker}>{block.kicker}</p><h2 className={styles.heading}>{block.heading}</h2><p>{block.text}</p></section>;
      case 'teamShowcase':
        return <section className={`${styles.block} ${styles.team}`} id={block.anchor || undefined} key={key}><p className={styles.kicker}>{block.kicker}</p><h2>{block.heading}</h2><p>{block.instruction}</p>{block.portraitImage || block.profileImage ? <div className={styles.teamImages}>{block.portraitImage ? <div className={styles.media}><Media media={block.portraitImage} /></div> : null}{block.profileImage ? <div className={styles.media}><Media media={block.profileImage} /></div> : null}</div> : null}<div className={styles.members}>{block.members.map((member) => <article key={`${member.number}-${member.role}`}><span>{member.number}</span><h3>{member.role}</h3><p>{member.description}</p></article>)}</div></section>;
      case 'identityField':
        return <section aria-label={block.ariaLabel} className={`${styles.block} ${styles.identity}`} key={key}><p className={styles.wordmark}>{block.wordmark}</p>{block.alphabets.map((alphabet, itemIndex) => <p className={styles.alphabet} key={`${alphabet.characters}-${itemIndex}`}>{alphabet.characters}</p>)}</section>;
      case 'serviceDetail':
        return <section className={`${styles.block} ${styles.service}`} key={key} style={{ '--cms-accent': block.accent } as CSSProperties}><div className={styles.serviceHeader}><div><p className={styles.kicker}>{String(block.order).padStart(2, '0')} · {block.preview}</p><h2>{block.label}</h2><p className={styles.lead}>{block.tagline}</p><p>{block.summary}</p></div>{block.image ? <div className={styles.media}><Media media={block.image} /></div> : null}</div><h3>{block.cardHeadline}</h3><p>{block.detailDescription}</p><div className={styles.serviceSections}>{block.sections.map((section) => <article key={section.title}><h3>{section.title}</h3>{section.body ? <p>{section.body}</p> : null}{section.items?.map((item) => <div key={item.title}><h4>{item.title}</h4>{item.description ? <p>{item.description}</p> : null}</div>)}</article>)}</div></section>;
      case 'richText':
        return <section className={`${styles.block} ${styles.narrow}`} key={key}><CMSRichText content={block.content} /></section>;
      case 'imageText':
        return <section className={`${styles.block} ${styles.imageText} ${block.alignment === 'image-right' ? styles.imageRight : ''}`} key={key}>{block.image ? <div className={styles.media}><Media media={block.image} /></div> : null}<div><h2 className={styles.heading}>{block.heading}</h2><p>{block.text}</p></div></section>;
      case 'callToAction':
        return <section className={`${styles.block} ${styles.cta}`} key={key}><h2>{block.heading}</h2>{block.text ? <p>{block.text}</p> : null}<Link className={styles.button} href={block.link.url} {...linkProps(block.link.newTab)}>{block.link.label}</Link></section>;
      case 'cardGrid':
        return <section className={styles.block} key={key}>{block.heading ? <h2 className={styles.heading}>{block.heading}</h2> : null}<div className={styles.cards}>{block.cards.map((card) => <article key={card.title}><h3>{card.title}</h3><p>{card.text}</p>{card.link ? <Link href={card.link.url} {...linkProps(card.link.newTab)}>{card.link.label}</Link> : null}</article>)}</div></section>;
      case 'gallery':
        return <section className={`${styles.block} ${styles.gallery}`} key={key}>{block.images.map((image, imageIndex) => <div className={styles.media} key={`${image.url}-${imageIndex}`}><Media media={image} /></div>)}</section>;
      case 'faq':
        return <section className={`${styles.block} ${styles.narrow} ${styles.faq}`} key={key}>{block.items.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>;
      case 'contactDetails':
        return <section className={`${styles.block} ${styles.contact}`} key={key}><div>{block.heading ? <h2>{block.heading}</h2> : null}</div><address>{block.email ? <a href={`mailto:${block.email}`}>{block.email}</a> : null}{block.phone ? <a href={`tel:${block.phone}`}>{block.phone}</a> : null}{block.address ? <p>{block.address}</p> : null}</address></section>;
      case 'logoCloud':
        return <section className={styles.block} key={key}>{block.heading ? <h2 className={styles.heading}>{block.heading}</h2> : null}<div className={styles.logos}>{block.items.map((item) => { const logo = <span className={styles.logo}><Media media={item.image} /></span>; return item.url ? <Link aria-label={item.label} href={item.url} key={`${item.label}-${item.url}`}>{logo}</Link> : <span aria-label={item.label} key={item.label}>{logo}</span>; })}</div></section>;
      case 'spacer':
        return <div aria-hidden="true" className={styles[block.size]} key={key} />;
      default: {
        const unsupported = block as { blockType: string };
        return <section className={`${styles.block} ${styles.unsupported}`} data-block-type={unsupported.blockType} key={key} role="alert">This content is temporarily unavailable.</section>;
      }
    }
  });
}
