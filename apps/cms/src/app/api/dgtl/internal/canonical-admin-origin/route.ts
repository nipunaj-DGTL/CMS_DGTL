import type { NextRequest } from 'next/server'

import {
  CANONICAL_ADMIN_RETURN_TO_HEADER,
  resolveAdminRelayDestination,
} from '@/services/canonical-origin'

const redirectToCanonicalAdminOrigin = (request: NextRequest): Response => {
  const destination = resolveAdminRelayDestination(
    request.headers.get(CANONICAL_ADMIN_RETURN_TO_HEADER),
  )

  if (!destination) {
    return Response.json(
      {
        code: 'INVALID_CANONICAL_ADMIN_DESTINATION',
        message: 'A valid CMS admin destination is required.',
      },
      { headers: { 'Cache-Control': 'no-store' }, status: 400 },
    )
  }

  return new Response(null, {
    headers: {
      'Cache-Control': 'no-store',
      Location: destination.toString(),
    },
    status: 307,
  })
}

export const GET = redirectToCanonicalAdminOrigin
export const HEAD = redirectToCanonicalAdminOrigin
