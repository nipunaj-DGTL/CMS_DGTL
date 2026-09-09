import config from '@payload-config'
import { getPayload } from 'payload'

import {
  authorizeWebsite,
  errorResponse,
  mapPostList,
  parsePostPagination,
  successResponse,
} from '@/services/public-api'

export async function GET(request: Request, { params }: { params: Promise<{ websiteKey: string }> }) {
  try {
    const { websiteKey } = await params
    const payload = await getPayload({ config })
    const website = await authorizeWebsite({ headers: request.headers, payload, websiteKey })
    const { limit, page } = parsePostPagination(new URL(request.url).searchParams)
    const result = await payload.find({
      collection: 'posts',
      depth: 2,
      draft: false,
      limit,
      overrideAccess: true,
      page,
      sort: '-publishedAt',
      where: {
        and: [
          { website: { equals: website.id } },
          { _status: { equals: 'published' } },
          { archivedAt: { exists: false } },
        ],
      },
    })

    return successResponse(mapPostList({
      docs: result.docs,
      pagination: {
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        limit: result.limit,
        nextPage: result.nextPage,
        page: result.page ?? page,
        prevPage: result.prevPage,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
      },
      websiteKey,
    }))
  } catch (error) {
    return errorResponse(error)
  }
}
