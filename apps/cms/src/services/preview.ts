import type { PayloadRequest } from 'payload'

import { canPublish, relationID } from '../access/policy'
import { createPreviewToken, requiredEnv } from './security'

type PreviewDocument = {
  id?: unknown
  slug?: unknown
  tenant?: unknown
  website?: unknown
}

const previewOrigin = (previewDomain: unknown, productionDomain: unknown): string => {
  const rawDomain = typeof previewDomain === 'string' && previewDomain.trim()
    ? previewDomain.trim()
    : typeof productionDomain === 'string'
      ? productionDomain.trim()
      : ''
  if (!rawDomain) throw new Error('The website has no preview or production domain.')

  const url = new URL(/^https?:\/\//i.test(rawDomain) ? rawDomain : `https://${rawDomain}`)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The website preview domain must use HTTP or HTTPS.')
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('The website preview domain must use HTTPS in production.')
  }
  return url.origin
}

export const createPagePreviewURL = async ({
  page,
  req,
}: {
  page: PreviewDocument
  req: Pick<PayloadRequest, 'payload' | 'user'>
}): Promise<null | string> => {
  const user = req.user
  const documentID = relationID(page.id)
  const tenantID = relationID(page.tenant)
  const websiteID = relationID(page.website)
  const slug = typeof page.slug === 'string' ? page.slug.replace(/^\/+|\/+$/g, '') : ''

  if (!user || !documentID || !tenantID || !websiteID || !slug) return null
  if (!canPublish(user, tenantID)) return null

  const website = await req.payload.findByID({
    collection: 'websites',
    depth: 0,
    id: websiteID,
    overrideAccess: true,
  })
  if (String(relationID(website.tenant)) !== String(tenantID)) return null

  const token = createPreviewToken(requiredEnv('CMS_PREVIEW_SIGNING_SECRET'), {
    documentID,
    tenantID,
    userID: user.id,
    websiteKey: website.key,
  })
  const url = new URL('/api/cms/preview', previewOrigin(website.previewDomain, website.domain))
  url.searchParams.set('slug', slug)
  url.searchParams.set('token', token)
  return url.toString()
}
