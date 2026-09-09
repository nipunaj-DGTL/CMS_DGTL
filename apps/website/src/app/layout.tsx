import type { Metadata } from 'next'
import { Geist, Newsreader } from 'next/font/google'

import { SiteShell } from '@/components/SiteShell'
import { getShell } from '@/lib/cms'

import './styles.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  description: 'A DGTL CMS-powered website.',
  title: { default: 'DGTL Website', template: '%s — DGTL Website' },
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [website, settings, headerNavigation, footerNavigation] = await getShell()

  return (
    <html className={`${sans.variable} ${serif.variable}`} data-scroll-behavior="smooth" lang="en">
      <body>
        <SiteShell
          footerNavigation={footerNavigation}
          headerNavigation={headerNavigation}
          settings={settings}
          website={website}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  )
}
