import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { NavigationDTO, SiteSettingsDTO, WebsiteDTO } from '@dgtl/content-contracts'

import { SiteFooter } from '../src/components/SiteFooter'
import { SiteHeader } from '../src/components/SiteHeader'
import { SiteShell } from '../src/components/SiteShell'

const navigation: NavigationDTO = {
  contractVersion: 1,
  items: [
    {
      children: [
        { label: 'Nested internal', url: '/services/design' },
        { label: 'Nested external', newTab: true, url: 'https://example.test/service' },
      ],
      label: 'Services',
      url: '/services',
    },
  ],
  location: 'header',
  websiteKey: 'client-01-main',
}

const footerNavigation: NavigationDTO = { ...navigation, location: 'footer' }

const settings: SiteSettingsDTO = {
  brandContent: {
    backToTopLabel: null,
    footerDescription: 'CMS footer description',
    footerEyebrow: 'CMS footer eyebrow',
    footerHeading: 'CMS footer heading',
    legalLocation: 'Sri Lanka',
    locationLabel: 'Based in',
  },
  contact: { address: null, email: 'hello@example.test', phone: null },
  contractVersion: 1,
  defaultSEO: { description: null, title: null },
  displayName: 'Client One',
  footerText: 'CMS legal line',
  websiteKey: 'client-01-main',
}

const website = (status: WebsiteDTO['status']): WebsiteDTO => ({
  contractVersion: 1,
  displayName: 'Client One',
  domain: 'client.example.test',
  key: 'client-01-main',
  status,
})

describe('site navigation', () => {
  it('renders nested links in both desktop and accessible mobile header navigation', () => {
    const html = renderToStaticMarkup(<SiteHeader name="Client One" navigation={navigation} />)

    expect(html).toContain('class="desktop-navigation"')
    expect(html).toContain('<details class="mobile-navigation">')
    expect(html).toContain('<summary>Menu</summary>')
    expect(html.match(/Nested internal/g)).toHaveLength(2)
    expect(html.match(/Nested external/g)).toHaveLength(2)
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('renders nested footer links and CMS-managed brand copy', () => {
    const html = renderToStaticMarkup(<SiteFooter navigation={footerNavigation} settings={settings} />)

    expect(html).toContain('Nested internal')
    expect(html).toContain('Nested external')
    expect(html).toContain('CMS footer eyebrow')
    expect(html).toContain('CMS footer heading')
    expect(html).toContain('CMS footer description')
    expect(html).toContain('CMS legal line')
    expect(html).toContain('Based in · Sri Lanka')
    expect(html).not.toContain('Let’s make it matter.')
  })
})

describe('SiteShell maintenance gate', () => {
  it('suppresses all published page and navigation content while the website is in maintenance', () => {
    const html = renderToStaticMarkup(
      <SiteShell
        footerNavigation={footerNavigation}
        headerNavigation={navigation}
        settings={settings}
        website={website('maintenance')}
      >
        <main>SECRET PUBLISHED PAGE CONTENT</main>
      </SiteShell>,
    )

    expect(html).toContain('Website temporarily unavailable')
    expect(html).toContain('Client One')
    expect(html).not.toContain('SECRET PUBLISHED PAGE CONTENT')
    expect(html).not.toContain('Nested internal')
  })

  it('renders the normal shell and page for an active website', () => {
    const html = renderToStaticMarkup(
      <SiteShell
        footerNavigation={footerNavigation}
        headerNavigation={navigation}
        settings={settings}
        website={website('active')}
      >
        <main>Published page content</main>
      </SiteShell>,
    )

    expect(html).toContain('Published page content')
    expect(html).toContain('Primary navigation')
    expect(html).toContain('Footer navigation')
    expect(html).not.toContain('Website temporarily unavailable')
  })
})
