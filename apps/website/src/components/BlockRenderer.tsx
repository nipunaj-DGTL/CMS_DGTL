import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { CSSProperties, ElementType, ReactNode } from 'react'

import type { MediaDTO, PageBlock } from '@dgtl/content-contracts'

import { RichText } from './RichText'

type CMSLink = {
  label: string
  newTab?: boolean
  url: string
}

const linkProps = (link: Pick<CMSLink, 'newTab'>) => link.newTab
  ? { rel: 'noopener noreferrer', target: '_blank' as const }
  : {}

const ContentLink = ({ children, className, link }: { children?: ReactNode; className?: string; link: CMSLink }) => (
  <Link className={className} href={link.url} {...linkProps(link)}>
    {children ?? link.label}
  </Link>
)

const MediaImage = ({ className, media, priority = false, sizes = '100vw', style }: {
  className?: string
  media: MediaDTO
  priority?: boolean
  sizes?: string
  style?: CSSProperties
}) => (
  <Image
    alt={media.alt}
    className={className}
    fill
    priority={priority}
    sizes={sizes}
    src={media.url}
    style={style}
  />
)

const Heading = ({ as: Tag, children, className }: { as: ElementType; children: ReactNode; className?: string }) => (
  <Tag className={className}>{children}</Tag>
)

const humanizeSlug = (slug: string) => slug
  .split('-')
  .filter(Boolean)
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(' ')

const UnsupportedBlock = ({ block }: { block: unknown }) => {
  const blockType = typeof block === 'object' && block !== null && 'blockType' in block
    ? String(block.blockType)
    : 'unknown'

  return (
    <section className="block unsupported-block" data-block-type={blockType} role="alert">
      <p>This content is temporarily unavailable.</p>
    </section>
  )
}

export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  const primaryHeadingIndex = blocks.findIndex((block) => (
    block.blockType === 'hero' ||
    block.blockType === 'companyOverview' ||
    block.blockType === 'statement' ||
    block.blockType === 'teamShowcase' ||
    block.blockType === 'serviceDetail' ||
    block.blockType === 'imageText' ||
    block.blockType === 'callToAction' ||
    block.blockType === 'cardGrid' && Boolean(block.heading) ||
    block.blockType === 'contactDetails' && Boolean(block.heading) ||
    block.blockType === 'logoCloud' && Boolean(block.heading) ||
    block.blockType === 'serviceIndex' && Boolean(block.heading)
  ))

  return blocks.map((block, index) => {
    const key = block.id ?? `${block.blockType}-${index}`
    const SectionHeading = (index === primaryHeadingIndex ? 'h1' : 'h2') as ElementType

    switch (block.blockType) {
      case 'hero': {
        const serviceLabel = block.desktopServicesLabel ?? block.mobileServicesLabel
        const supportingLabels = [block.activeServiceLinkLabel, block.cardLinkLabel]
          .filter((label): label is string => Boolean(label))

        return (
          <section className={`block hero ${block.video || block.image ? '' : 'hero--copy-only'}`} key={key}>
            <div className="hero-copy">
              {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
              <Heading as={SectionHeading}>{block.heading}</Heading>
              {block.text && <p className="hero-lede">{block.text}</p>}
              {serviceLabel && (
                <p className="hero-services-label">
                  <span className="hero-services-label--desktop">{block.desktopServicesLabel ?? block.mobileServicesLabel}</span>
                  <span className="hero-services-label--mobile">{block.mobileServicesLabel ?? block.desktopServicesLabel}</span>
                </p>
              )}
              {supportingLabels.length > 0 && (
                <ul className="hero-supporting-labels">
                  {supportingLabels.map((label) => <li key={label}>{label}</li>)}
                </ul>
              )}
              <div className="button-row">
                {block.links.map((link) => (
                  <ContentLink className="button" key={`${link.label}-${link.url}`} link={link}>
                    {link.label} <span aria-hidden="true">↗</span>
                  </ContentLink>
                ))}
              </div>
              {block.scrollPrompt && <p className="hero-scroll-prompt">{block.scrollPrompt}</p>}
            </div>
            {(block.video || block.image) && (
              <div className="hero-art">
                <span className="hero-orbit hero-orbit--one" aria-hidden="true" />
                <span className="hero-orbit hero-orbit--two" aria-hidden="true" />
                {block.video
                  ? (
                    <video
                      aria-label={block.video.alt || undefined}
                      className="hero-video"
                      controls
                      poster={block.image?.url}
                      preload="metadata"
                    >
                      <source src={block.video.url} type={block.video.mimeType ?? undefined} />
                    </video>
                  )
                  : block.image && <MediaImage media={block.image} priority sizes="(max-width: 900px) 100vw, 46vw" />}
              </div>
            )}
          </section>
        )
      }
      case 'serviceIndex':
        return (
          <section className="block service-index" key={key}>
            {block.heading && <Heading as={SectionHeading}>{block.heading}</Heading>}
            <ol>
              {block.serviceSlugs.map((slug, serviceIndex) => (
                <li key={`${slug}-${serviceIndex}`}>
                  <span aria-hidden="true">{String(serviceIndex + 1).padStart(2, '0')}</span>
                  <Link href={`/services/${slug}`}>{humanizeSlug(slug)}</Link>
                </li>
              ))}
            </ol>
          </section>
        )
      case 'companyOverview':
        return (
          <section className="block company-overview" id={block.anchor || undefined} key={key}>
            <p className="section-number">{block.kicker}</p>
            <div className="company-overview__content">
              <Heading as={SectionHeading}>{block.heading}</Heading>
              <p className="company-overview__lead">{block.lead}</p>
              <div className="company-overview__body">
                {block.paragraphs.map((paragraph, paragraphIndex) => <p key={`${paragraph.text}-${paragraphIndex}`}>{paragraph.text}</p>)}
              </div>
              {block.capabilities.length > 0 && (
                <ul className="capability-list">
                  {block.capabilities.map((capability, capabilityIndex) => <li key={`${capability.label}-${capabilityIndex}`}>{capability.label}</li>)}
                </ul>
              )}
              {block.link && <ContentLink className="text-link" link={block.link}>{block.link.label} <span aria-hidden="true">↗</span></ContentLink>}
            </div>
          </section>
        )
      case 'statement':
        return (
          <section className="block statement" id={block.anchor || undefined} key={key}>
            <p className="section-number">{block.kicker}</p>
            <div className="statement-copy">
              <Heading as={SectionHeading}>{block.heading}</Heading>
              <p>{block.text}</p>
            </div>
          </section>
        )
      case 'teamShowcase':
        return (
          <section className="block team-showcase" id={block.anchor || undefined} key={key}>
            <div className="team-showcase__heading">
              <p className="section-number">{block.kicker}</p>
              <Heading as={SectionHeading}>{block.heading}</Heading>
              <p>{block.instruction}</p>
            </div>
            <div className="team-grid">
              {block.members.map((member, memberIndex) => (
                <article key={`${member.number}-${member.role}-${memberIndex}`}>
                  {(block.portraitImage || block.profileImage) && (
                    <div className="team-member-media">
                      {block.portraitImage && (
                        <div className="team-image">
                          <MediaImage media={block.portraitImage} sizes="(max-width: 850px) 100vw, 33vw" style={{ objectPosition: member.portraitPosition }} />
                        </div>
                      )}
                      {block.profileImage && (
                        <div className="team-image team-image--secondary">
                          <MediaImage media={block.profileImage} sizes="(max-width: 850px) 100vw, 20vw" style={{ objectPosition: member.profilePosition }} />
                        </div>
                      )}
                    </div>
                  )}
                  <span>{member.number}</span>
                  <h3>{member.role}</h3>
                  <p>{member.description}</p>
                </article>
              ))}
            </div>
          </section>
        )
      case 'identityField':
        return (
          <section aria-label={block.ariaLabel} className="block identity-field" key={key}>
            <p className="identity-field__wordmark">{block.wordmark}</p>
            <div className="identity-field__alphabets">
              {block.alphabets.map((alphabet, alphabetIndex) => <p key={`${alphabet.characters}-${alphabetIndex}`}>{alphabet.characters}</p>)}
            </div>
          </section>
        )
      case 'serviceDetail':
        return (
          <section
            className="block service-detail"
            key={key}
            style={{ '--service-accent': block.accent } as CSSProperties}
          >
            <div className="service-detail__intro">
              <p className="section-number">{String(block.order).padStart(2, '0')} — {block.label}</p>
              <Heading as={SectionHeading}>{block.cardHeadline}</Heading>
              <p className="service-detail__preview">{block.preview}</p>
              <p>{block.summary}</p>
            </div>
            {block.image && (
              <div className="service-detail__image">
                <MediaImage media={block.image} sizes="(max-width: 850px) 100vw, 48vw" style={{ objectPosition: block.imagePosition }} />
              </div>
            )}
            <div className="service-detail__body">
              <p className="service-detail__description">{block.detailDescription}</p>
              <p className="service-detail__tagline">{block.tagline}</p>
              {block.sections.map((section, sectionIndex) => (
                <section className="service-detail__section" key={`${section.title}-${sectionIndex}`}>
                  <h3>{section.title}</h3>
                  {section.body && <p>{section.body}</p>}
                  {section.items && section.items.length > 0 && (
                    <ul>
                      {section.items.map((item, itemIndex) => (
                        <li key={`${item.title}-${itemIndex}`}>
                          <h4>{item.title}</h4>
                          {item.description && <p>{item.description}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </section>
        )
      case 'richText':
        return <section className="block narrow" key={key}><RichText content={block.content} /></section>
      case 'imageText':
        return (
          <section className={`block split ${block.alignment === 'image-right' ? 'split--reverse' : ''}`} key={key}>
            {block.image && <div className="media-frame"><MediaImage media={block.image} sizes="(max-width: 800px) 100vw, 50vw" /></div>}
            <div className="split-copy"><Heading as={SectionHeading}>{block.heading}</Heading><p>{block.text}</p></div>
          </section>
        )
      case 'callToAction':
        return (
          <section className="block cta" key={key}>
            <Heading as={SectionHeading}>{block.heading}</Heading>
            {block.text && <p className="cta__text">{block.text}</p>}
            <ContentLink className="button button--light" link={block.link}>{block.link.label} <b aria-hidden="true">↗</b></ContentLink>
          </section>
        )
      case 'cardGrid':
        return (
          <section className="block services" key={key}>
            {block.heading && <div className="section-heading"><Heading as={SectionHeading}>{block.heading}</Heading></div>}
            <div className="card-grid">
              {block.cards.map((card, cardIndex) => (
                <article key={`${card.title}-${cardIndex}`}>
                  <span>{String(cardIndex + 1).padStart(2, '0')}</span><h3>{card.title}</h3><p>{card.text}</p>
                  {card.link && <ContentLink link={card.link}><span className="visually-hidden">{card.link.label}: {card.title}</span><span aria-hidden="true">↗</span></ContentLink>}
                </article>
              ))}
            </div>
          </section>
        )
      case 'gallery':
        return (
          <section className="block gallery" key={key}>
            {block.images.map((image, imageIndex) => <div className="gallery-image" key={`${image.url}-${imageIndex}`}><MediaImage media={image} sizes="(max-width: 700px) 100vw, 50vw" /></div>)}
          </section>
        )
      case 'faq':
        return (
          <section className="block narrow faq" key={key}>
            {block.items.map((item, itemIndex) => <details key={`${item.question}-${itemIndex}`}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}
          </section>
        )
      case 'contactDetails':
        return (
          <section className="block contact" key={key}>
            {block.heading && <Heading as={SectionHeading}>{block.heading}</Heading>}
            <address>
              {block.email && <a href={`mailto:${block.email}`}>{block.email}</a>}
              {block.phone && <a href={`tel:${block.phone}`}>{block.phone}</a>}
              {block.address && <p>{block.address}</p>}
            </address>
          </section>
        )
      case 'logoCloud':
        return (
          <section className="block logo-cloud" key={key}>
            {block.heading && <Heading as={SectionHeading}>{block.heading}</Heading>}
            <div>
              {block.items.map((item, itemIndex) => item.url
                ? <Link aria-label={item.label} href={item.url} key={`${item.label}-${itemIndex}`}><span className="logo-image"><MediaImage media={item.image} sizes="160px" /></span></Link>
                : <figure key={`${item.label}-${itemIndex}`}><span className="logo-image"><MediaImage media={item.image} sizes="160px" /></span><figcaption>{item.label}</figcaption></figure>)}
            </div>
          </section>
        )
      case 'spacer':
        return <div className={`spacer spacer--${block.size}`} key={key} aria-hidden="true" />
      default:
        return <UnsupportedBlock block={block} key={key} />
    }
  })
}
