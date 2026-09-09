import { cache } from 'react'

import { DGTLClient } from '@dgtl/cms-client'

import { websiteEnv } from './env'

export const getCMSClient = cache(
  () =>
    new DGTLClient({
      baseURL: websiteEnv.cmsURL(),
      readToken: websiteEnv.readToken(),
      websiteKey: websiteEnv.websiteKey(),
    }),
)

export const getPage = cache(async (slug: string, previewToken?: string) => {
  const client = getCMSClient()
  return client.getPage(slug, {
    draftToken: previewToken,
    next: {
      revalidate: 300,
      tags: [`cms:site:${client.websiteKey}`, `cms:site:${client.websiteKey}:pages:${slug}`],
    },
  })
})

export const getShell = cache(async () => {
  const client = getCMSClient()
  const siteTag = `cms:site:${client.websiteKey}`
  const navigationTag = `${siteTag}:navigation`
  return Promise.all([
    client.getWebsite({ next: { revalidate: 300, tags: [siteTag] } }),
    client.getSettings({ next: { revalidate: 300, tags: [siteTag] } }),
    client.getNavigation('header', { next: { revalidate: 300, tags: [siteTag, navigationTag] } }),
    client.getNavigation('footer', { next: { revalidate: 300, tags: [siteTag, navigationTag] } }),
  ])
})
