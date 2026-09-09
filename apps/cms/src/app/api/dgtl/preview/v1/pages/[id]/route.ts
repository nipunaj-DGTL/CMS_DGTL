import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { errorResponse, PublicAPIError, successResponse } from '@/services/public-api'
import { createPagePreviewURL } from '@/services/preview'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await getHeaders() })
    if (!user) throw new PublicAPIError('AUTH_REQUIRED', 401, 'Sign in to preview this page.')

    const page = await payload.findByID({ collection: 'pages', depth: 1, draft: true, id, overrideAccess: false, user })
    const url = await createPagePreviewURL({ page, req: { payload, user } })
    if (!url) throw new PublicAPIError('PREVIEW_DENIED', 403, 'Your role cannot preview this page.')
    return successResponse({ expiresIn: 300, url }, undefined, true)
  } catch (error) {
    return errorResponse(error)
  }
}
