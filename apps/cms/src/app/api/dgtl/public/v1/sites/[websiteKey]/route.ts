import config from '@payload-config'
import { getPayload } from 'payload'

import { contentContractVersion } from '@dgtl/content-contracts'
import { authorizeWebsite, errorResponse, successResponse } from '@/services/public-api'

export async function GET(request: Request, { params }: { params: Promise<{ websiteKey: string }> }) {
  try {
    const { websiteKey } = await params
    const website = await authorizeWebsite({ headers: request.headers, payload: await getPayload({ config }), websiteKey })
    return successResponse({
      contractVersion: contentContractVersion,
      displayName: website.displayName,
      domain: website.domain,
      key: website.key,
      status: website.status,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
