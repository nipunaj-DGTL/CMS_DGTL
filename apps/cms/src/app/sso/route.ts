import { NextResponse } from 'next/server'
import { FLOW_COOKIE, SESSION_COOKIE, ssoConfig } from '../../sso/config'
import { randomSecret, seal } from '../../sso/crypto'
import { loginFailure, noStore } from '../../sso/http'
import { authorizationURL } from '../../sso/provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let secure = process.env.NODE_ENV === 'production'
  try {
    const config = ssoConfig()
    if (!config)
      return new NextResponse('DGTL single sign-on is not enabled.', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
    secure = config.secure
    const flow = {
      state: randomSecret(),
      nonce: randomSecret(),
      verifier: randomSecret(),
      expiresAt: Date.now() + 300_000,
    }
    const response = noStore(NextResponse.redirect(await authorizationURL(config, flow)))
    response.cookies.set(FLOW_COOKIE, seal(flow, config.encryptionKey, 'login-flow'), {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/sso',
      maxAge: 300,
    })
    // A dashboard launch must not silently retain a previous user's CMS identity.
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return response
  } catch {
    return loginFailure(503, secure)
  }
}
