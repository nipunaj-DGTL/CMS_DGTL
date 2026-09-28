import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '../../../payload.config'
import { FLOW_COOKIE, SESSION_COOKIE, ssoConfig } from '../../../sso/config'
import { unseal } from '../../../sso/crypto'
import { loginFailure, noStore } from '../../../sso/http'
import { exchangeCode, type LoginFlow } from '../../../sso/provider'
import { createSSOSession } from '../../../sso/sessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let secure = process.env.NODE_ENV === 'production'
  try {
    const config = ssoConfig()
    if (!config) return loginFailure(404, secure)
    secure = config.secure
    const cookie = request.cookies.get(FLOW_COOKIE)?.value
    if (!cookie) return loginFailure(400, secure)
    const flow = unseal<LoginFlow>(cookie, config.encryptionKey, 'login-flow')
    // Use the configured origin behind a reverse proxy; never trust forwarded host.
    const callback = new URL(config.callback)
    callback.search = request.nextUrl.search
    const identity = await exchangeCode(config, callback, flow)
    const payload = await getPayload({ config: payloadConfig })
    const session = await createSSOSession(payload, config, identity)
    const response = noStore(NextResponse.redirect(new URL('/admin', config.origin)))
    response.cookies.set(FLOW_COOKIE, '', {
      path: '/sso',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 0,
    })
    response.cookies.set(SESSION_COOKIE, session.token, {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expires: new Date(session.expiresAt),
    })
    return response
  } catch {
    return loginFailure(403, secure)
  }
}
