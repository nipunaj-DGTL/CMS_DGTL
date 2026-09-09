import config from '@payload-config'
import { getPayload } from 'payload'

import { contentContractVersion } from '@dgtl/content-contracts'
import { authorizeWebsite, errorResponse, mapPage, PublicAPIError, successResponse } from '@/services/public-api'

export async function GET(request: Request, { params }: { params: Promise<{ websiteKey: string }> }) {
  try {
    const { websiteKey } = await params
    const template = new URL(request.url).searchParams.get('template')
    if (template !== 'service') {
      throw new PublicAPIError('INVALID_QUERY', 400, 'The supported page listing template is “service”.')
    }

    const payload = await getPayload({ config })
    const website = await authorizeWebsite({ headers: request.headers, payload, websiteKey })
    const result = await payload.find({
      collection: 'pages',
      depth: 2,
      draft: false,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          { website: { equals: website.id } },
          { template: { equals: 'service' } },
          { _status: { equals: 'published' } },
          { archivedAt: { exists: false } },
        ],
      },
    })

    return successResponse({
      contractVersion: contentContractVersion,
      pages: result.docs.map((page) => mapPage(page, websiteKey)),
      websiteKey,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
