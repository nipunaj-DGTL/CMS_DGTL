import React from 'react'
import type { ReactNode } from 'react'

import type { NavigationDTO, SiteSettingsDTO, WebsiteDTO } from '@dgtl/content-contracts'

import { MaintenanceScreen } from './MaintenanceScreen'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function SiteShell({ children, footerNavigation, headerNavigation, settings, website }: {
  children: ReactNode
  footerNavigation: NavigationDTO
  headerNavigation: NavigationDTO
  settings: SiteSettingsDTO
  website: WebsiteDTO
}) {
  if (website.status === 'maintenance') return <MaintenanceScreen name={settings.displayName} />

  return (
    <>
      <SiteHeader name={settings.displayName} navigation={headerNavigation} />
      {children}
      <SiteFooter navigation={footerNavigation} settings={settings} />
    </>
  )
}
