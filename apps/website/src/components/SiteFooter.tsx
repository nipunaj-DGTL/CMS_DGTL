import Link from 'next/link'
import React from 'react'

import type { NavigationDTO, SiteSettingsDTO } from '@dgtl/content-contracts'

type NavigationItem = NavigationDTO['items'][number]
type NavigationChild = NavigationItem['children'][number]

const externalProps = (item: Pick<NavigationItem | NavigationChild, 'newTab'>) => item.newTab
  ? { rel: 'noopener noreferrer', target: '_blank' as const }
  : {}

export function SiteFooter({ navigation, settings }: { navigation: NavigationDTO; settings: SiteSettingsDTO }) {
  const brandContent = settings.brandContent

  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        {brandContent?.footerEyebrow && <p className="footer-kicker">{brandContent.footerEyebrow}</p>}
        <h2>{brandContent?.footerHeading ?? settings.displayName}</h2>
        {brandContent?.footerDescription && <p className="site-footer__description">{brandContent.footerDescription}</p>}
      </div>
      <nav aria-label="Footer navigation">
        <ul className="footer-navigation-list">
          {navigation.items.map((item, itemIndex) => (
            <li key={`${item.label}-${item.url}-${itemIndex}`}>
              <Link href={item.url} {...externalProps(item)}>{item.label}</Link>
              {item.children.length > 0 && (
                <ul>
                  {item.children.map((child, childIndex) => (
                    <li key={`${child.label}-${child.url}-${childIndex}`}>
                      <Link href={child.url} {...externalProps(child)}>{child.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="footer-meta">
        {settings.footerText && <span>{settings.footerText}</span>}
        {(brandContent?.locationLabel || brandContent?.legalLocation) && (
          <span>{[brandContent.locationLabel, brandContent.legalLocation].filter(Boolean).join(' · ')}</span>
        )}
        {settings.contact.email && <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>}
        {settings.contact.phone && <a href={`tel:${settings.contact.phone}`}>{settings.contact.phone}</a>}
        {settings.contact.address && <span>{settings.contact.address}</span>}
        {brandContent?.backToTopLabel && <a href="#top">{brandContent.backToTopLabel}</a>}
      </div>
    </footer>
  )
}
