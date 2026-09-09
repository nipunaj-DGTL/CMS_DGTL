import config from '@payload-config'
import { getPayload } from 'payload'

import { authorizeWebsite, errorResponse, mapSiteSettings, PublicAPIError, successResponse } from '@/services/public-api'

export async function GET(request: Request, { params }: { params: Promise<{ websiteKey: string }> }) {
  try {
    const { websiteKey } = await params
    const payload = await getPayload({ config })
    const website = await authorizeWebsite({ headers: request.headers, payload, websiteKey })
    const result = await payload.find({
      collection: 'site-settings',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      where: { website: { equals: website.id } },
    })
    const settings = result.docs[0]
    if (!settings) throw new PublicAPIError('NOT_FOUND', 404, 'Site settings were not found.')
    return successResponse(mapSiteSettings(settings, websiteKey))
  } catch (error) {
    return errorResponse(error)
  }
}
