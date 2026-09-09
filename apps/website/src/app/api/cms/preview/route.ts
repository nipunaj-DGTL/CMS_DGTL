import { cookies, draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

import { websiteEnv } from '@/lib/env'
import { verifyPreviewToken } from '@/lib/signatures'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const slug = url.searchParams.get('slug')?.replace(/^\/+|\/+$/g, '') || 'home'
  const claims = verifyPreviewToken(token, websiteEnv.previewSecret())
  if (!claims || claims.websiteKey !== websiteEnv.websiteKey()) {
    return Response.json({ error: 'Preview link is invalid or expired.' }, { status: 401 })
  }

  const draft = await draftMode()
  draft.enable()
  const cookieStore = await cookies()
  cookieStore.set('dgtl-preview-token', token, { httpOnly: true, maxAge: 300, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
  return NextResponse.redirect(new URL(slug === 'home' ? '/' : `/${slug}`, url.origin))
}
