import Link from 'next/link'
import React from 'react'

import type { NavigationDTO } from '@dgtl/content-contracts'

type NavigationItem = NavigationDTO['items'][number]
type NavigationChild = NavigationItem['children'][number]

const externalProps = (item: Pick<NavigationItem | NavigationChild, 'newTab'>) => item.newTab
  ? { rel: 'noopener noreferrer', target: '_blank' as const }
  : {}

function NavigationList({ items }: { items: NavigationDTO['items'] }) {
  return (
    <ul className="navigation-list">
      {items.map((item, itemIndex) => (
        <li className={item.children.length > 0 ? 'navigation-item navigation-item--has-children' : 'navigation-item'} key={`${item.label}-${item.url}-${itemIndex}`}>
          <Link href={item.url} {...externalProps(item)}>{item.label}</Link>
          {item.children.length > 0 && (
            <ul className="navigation-children">
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
  )
}

export function SiteHeader({ name, navigation }: { name: string; navigation: NavigationDTO }) {
  return (
    <header className="site-header" id="top">
      <Link className="wordmark" href="/" aria-label={`${name} home`}>
        <span aria-hidden="true">{name.slice(0, 1)}</span>
        {name}
      </Link>
      <nav aria-label="Primary navigation" className="desktop-navigation">
        <NavigationList items={navigation.items} />
      </nav>
      <details className="mobile-navigation">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          <NavigationList items={navigation.items} />
        </nav>
      </details>
    </header>
  )
}
