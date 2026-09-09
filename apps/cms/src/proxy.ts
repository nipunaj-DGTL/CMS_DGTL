import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  CANONICAL_ADMIN_RETURN_TO_HEADER,
  resolveCanonicalLocalAdminURL,
} from './services/canonical-origin'

export function proxy(request: NextRequest): NextResponse {
  const canonicalURL = resolveCanonicalLocalAdminURL(
    request.url,
    process.env.CMS_PUBLIC_URL,
    request.headers.get('host'),
  )

  if (!canonicalURL) {
    return NextResponse.next()
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    const relayURL = new URL('/api/dgtl/internal/canonical-admin-origin', request.url)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(
      CANONICAL_ADMIN_RETURN_TO_HEADER,
      `${canonicalURL.pathname}${canonicalURL.search}`,
    )

    return NextResponse.rewrite(relayURL, { request: { headers: requestHeaders } })
  }

  return NextResponse.json(
    {
      canonicalURL: canonicalURL.toString(),
      code: 'CMS_CANONICAL_ORIGIN_REQUIRED',
      message:
        'This CMS page was opened with a different local hostname. Copy any unsaved values, reopen the canonical URL, sign in, and save again.',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-DGTL-CMS-Canonical-URL': canonicalURL.toString(),
      },
      status: 409,
    },
  )
}

export const config = {
  matcher: '/admin/:path*',
}
