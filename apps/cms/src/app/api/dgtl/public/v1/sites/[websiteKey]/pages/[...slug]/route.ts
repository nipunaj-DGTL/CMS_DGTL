import config from '@payload-config'
import { getPayload } from 'payload'

import { authorizeWebsite, errorResponse, findPage, mapPage, successResponse } from '@/services/public-api'
import { normalizeSlug } from '@/services/slug'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[]; websiteKey: string }> },
) {
  try {
    const { slug: slugParts, websiteKey } = await params
    const slug = normalizeSlug(slugParts.join('/'))
    const payload = await getPayload({ config })
    const website = await authorizeWebsite({ headers: request.headers, payload, websiteKey })
    const result = await findPage({ headers: request.headers, payload, slug, website })
    return successResponse(mapPage(result.page, websiteKey), undefined, result.draft)
  } catch (error) {
    return errorResponse(error)
  }
}
