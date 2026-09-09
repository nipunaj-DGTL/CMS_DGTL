/* eslint-disable @typescript-eslint/no-explicit-any -- Navigation items combine populated page relationships and nested rows. */
import config from '@payload-config'
import { getPayload } from 'payload'

import { contentContractVersion } from '@dgtl/content-contracts'
import { authorizeWebsite, buildNavigationItems, errorResponse, PublicAPIError, successResponse } from '@/services/public-api'

type GenericDocument = Record<string, any>

export async function GET(
  request: Request,
  { params }: { params: Promise<{ location: string; websiteKey: string }> },
) {
  try {
    const { location, websiteKey } = await params
    if (location !== 'header' && location !== 'footer') throw new PublicAPIError('NOT_FOUND', 404, 'Navigation was not found.')
    const payload = await getPayload({ config })
    const website = await authorizeWebsite({ headers: request.headers, payload, websiteKey })
    const result = await payload.find({
      collection: 'navigation',
      depth: 2,
      limit: 1,
      overrideAccess: true,
      where: { and: [{ website: { equals: website.id } }, { location: { equals: location } }] },
    })
    const navigation = result.docs[0] as GenericDocument | undefined
    const navigationPages = location === 'header'
      ? (await payload.find({
          collection: 'pages',
          depth: 0,
          draft: false,
          limit: 100,
          overrideAccess: true,
          pagination: false,
          where: {
            and: [
              { website: { equals: website.id } },
              { showInNavigation: { equals: true } },
              { _status: { equals: 'published' } },
              { archivedAt: { exists: false } },
            ],
          },
        })).docs as GenericDocument[]
      : []
    const items = buildNavigationItems(navigation?.items ?? [], navigationPages)

    return successResponse({ contractVersion: contentContractVersion, items, location, websiteKey })
  } catch (error) {
    return errorResponse(error)
  }
}
