import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { MediaDTO, PageBlock } from '@dgtl/content-contracts'

import { BlockRenderer } from '../src/components/BlockRenderer'

const image: MediaDTO = {
  alt: 'A carefully described image',
  height: 900,
  mimeType: 'image/jpeg',
  url: 'https://cms.example.test/media/image.jpg',
  width: 1200,
}

const video: MediaDTO = {
  alt: 'Studio showreel',
  mimeType: 'video/mp4',
  url: 'https://cms.example.test/media/showreel.mp4',
}

const statement: Extract<PageBlock, { blockType: 'statement' }> = {
  anchor: 'about-us',
  blockType: 'statement',
  heading: 'We make useful things.',
  kicker: 'Our purpose',
  text: 'Clear thinking, careful craft.',
}

const everyBlock: PageBlock[] = [
  {
    activeServiceLinkLabel: 'Current service',
    blockType: 'hero',
    cardLinkLabel: 'Read case study',
    desktopServicesLabel: 'Explore our services',
    eyebrow: 'CMS-managed eyebrow',
    heading: 'CMS-managed hero',
    image,
    links: [{ label: 'Open brief', newTab: true, url: 'https://example.test/brief' }],
    mobileServicesLabel: 'Explore services',
    scrollPrompt: 'Continue down',
    text: 'CMS-managed introduction.',
    video,
  },
  { blockType: 'serviceIndex', heading: 'Service directory', serviceSlugs: ['brand-strategy', 'web-design'] },
  {
    anchor: 'company',
    blockType: 'companyOverview',
    capabilities: [{ label: 'Research' }, { label: 'Design' }],
    heading: 'Company heading',
    kicker: 'Company kicker',
    lead: 'Company lead',
    link: { label: 'Company link', url: '/company' },
    paragraphs: [{ text: 'Company paragraph' }],
  },
  statement,
  {
    anchor: 'team',
    blockType: 'teamShowcase',
    heading: 'Team heading',
    instruction: 'Team instruction',
    kicker: 'Team kicker',
    members: [{ description: 'Team description', number: '01', role: 'Creative director' }],
    portraitImage: image,
    profileImage: image,
  },
  { alphabets: [{ characters: 'ABCDEFGHIJKLM' }], ariaLabel: 'Brand identity field', blockType: 'identityField', wordmark: 'GoLab' },
  {
    accent: '#123abc',
    blockType: 'serviceDetail',
    cardHeadline: 'Service headline',
    detailDescription: 'Detailed service description',
    image,
    imagePosition: '50% 25%',
    label: 'Strategy',
    order: 3,
    preview: 'Service preview',
    sections: [{ body: 'Section body', items: [{ description: 'Item description', title: 'Item title' }], title: 'Section title' }],
    summary: 'Service summary',
    tagline: 'Service tagline',
  },
  {
    blockType: 'richText',
    content: { root: { children: [{ children: [{ text: 'Rich text body' }], type: 'paragraph' }], type: 'root' } },
  },
  { alignment: 'image-right', blockType: 'imageText', heading: 'Image and text heading', image, text: 'Image and text body' },
  { blockType: 'callToAction', heading: 'CTA heading', link: { label: 'CTA link', url: '/contact' }, text: 'CTA body' },
  { blockType: 'cardGrid', cards: [{ link: { label: 'Card link', url: '/card' }, text: 'Card body', title: 'Card title' }], heading: 'Cards heading' },
  { blockType: 'gallery', images: [image] },
  { blockType: 'faq', items: [{ answer: 'FAQ answer', question: 'FAQ question' }] },
  { address: '42 CMS Lane', blockType: 'contactDetails', email: 'hello@example.test', heading: 'Contact heading', phone: '+94110000000' },
  { blockType: 'logoCloud', heading: 'Partners heading', items: [{ image, label: 'Partner name', url: 'https://partner.example.test' }] },
  { blockType: 'spacer', size: 'medium' },
]

describe('BlockRenderer', () => {
  it('renders statement content and uses an h1 when it is the first headed block', () => {
    const html = renderToStaticMarkup(<BlockRenderer blocks={[statement]} />)

    expect(html).toContain('id="about-us"')
    expect(html).toContain('<h1>We make useful things.</h1>')
    expect(html).toContain('Our purpose')
    expect(html).toContain('Clear thinking, careful craft.')
  })

  it('renders all sixteen contract block variants and their CMS-managed content', () => {
    const html = renderToStaticMarkup(<BlockRenderer blocks={everyBlock} />)

    const requiredContent = [
      'CMS-managed eyebrow',
      'CMS-managed hero',
      'Service directory',
      'Brand Strategy',
      'Company heading',
      'Company paragraph',
      'We make useful things.',
      'Team heading',
      'Creative director',
      'ABCDEFGHIJKLM',
      'Service headline',
      'Section body',
      'Item description',
      'Rich text body',
      'Image and text heading',
      'CTA heading',
      'Card title',
      'FAQ answer',
      'Contact heading',
      'Partners heading',
      'spacer--medium',
    ]

    for (const content of requiredContent) expect(html).toContain(content)
    expect(html).toContain('href="/services/brand-strategy"')
    expect(html).toContain('src="https://cms.example.test/media/showreel.mp4"')
    expect(html).toContain('target="_blank"')
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('does not inject former template copy when an editor leaves optional labels empty', () => {
    const html = renderToStaticMarkup(<BlockRenderer blocks={[
      { blockType: 'hero', heading: 'Only CMS copy', links: [] },
      { alignment: 'image-left', blockType: 'imageText', heading: 'Editor heading', text: 'Editor body' },
      { blockType: 'callToAction', heading: 'Editor CTA', link: { label: 'Editor link', url: '/' } },
      { blockType: 'faq', items: [{ answer: 'Answer', question: 'Question' }] },
      { blockType: 'contactDetails' },
    ]} />)

    expect(html).not.toContain('Independent thinking. Shared momentum.')
    expect(html).not.toContain('Approach')
    expect(html).not.toContain('Next chapter')
    expect(html).not.toContain('Questions, answered')
    expect(html).not.toContain('Start a conversation')
    expect(html).not.toContain('Talk to us')
  })

  it('renders an explicit fallback for an unsupported runtime block', () => {
    const blocks = [{ blockType: 'futureBlock' }] as unknown as PageBlock[]
    const html = renderToStaticMarkup(<BlockRenderer blocks={blocks} />)

    expect(html).toContain('role="alert"')
    expect(html).toContain('data-block-type="futureBlock"')
    expect(html).toContain('This content is temporarily unavailable.')
  })
})
