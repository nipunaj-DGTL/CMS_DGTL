import { NextResponse } from 'next/server'
import { FLOW_COOKIE, SESSION_COOKIE } from './config'

export function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}

export function loginFailure(status: number, secure: boolean) {
  const response = noStore(
    new NextResponse(
      'DGTL sign-in could not complete. Open CMS again from your dashboard. If this continues, ask your administrator to check CMS access and your identity mapping.',
      { status },
    ),
  )
  response.cookies.set(FLOW_COOKIE, '', {
    path: '/sso',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 0,
  })
  response.cookies.set(SESSION_COOKIE, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 0,
  })
  return response
}
