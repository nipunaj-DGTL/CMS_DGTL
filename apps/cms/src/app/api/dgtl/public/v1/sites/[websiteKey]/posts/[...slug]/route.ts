import config from '@payload-config'
import { getPayload } from 'payload'

import { authorizeWebsite, errorResponse, findPublishedPost, mapPost, successResponse } from '@/services/public-api'
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
    const post = await findPublishedPost({ payload, slug, website })
    return successResponse(mapPost(post, websiteKey))
  } catch (error) {
    return errorResponse(error)
  }
}
