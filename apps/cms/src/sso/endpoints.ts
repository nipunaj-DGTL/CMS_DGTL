import {
  APIError,
  headersWithCors,
  logoutOperation,
  refreshOperation,
  type Endpoint,
} from 'payload'
import { generateExpiredPayloadCookie, generatePayloadCookie } from 'payload/shared'
import { requiresSSO, sameOriginRequest, ssoConfig, SSO_STRATEGY } from './config'
import { deleteSSOSession, sessionToken, type SSOUser } from './sessions'

export const ssoAuthEndpoints: Endpoint[] = [
  {
    path: '/refresh-token',
    method: 'post',
    handler: async (req) => {
      const collection = req.payload.collections['cms-users']
      const headers = headersWithCors({
        headers: new Headers({ 'Cache-Control': 'no-store' }),
        req,
      })
      if (sessionToken(req.headers)) {
        const user = req.user as SSOUser | null
        if (user?._strategy !== SSO_STRATEGY || user._ssoExpiresAt <= Date.now() / 1000 + 30) {
          return Response.json(
            { message: 'Open CMS from the DGTL dashboard to continue.' },
            { status: 401, headers },
          )
        }
        // Do not mint a native JWT or extend the central token's lifetime.
        // Read through field access so internal account fields are not exposed.
        const publicUser = await req.payload.findByID({
          collection: 'cms-users',
          id: user.id,
          req,
          overrideAccess: false,
        })
        return Response.json(
          {
            user: { ...publicUser, collection: 'cms-users', _strategy: SSO_STRATEGY },
            exp: user._ssoExpiresAt,
          },
          { headers },
        )
      }
      if (req.user && requiresSSO(req.user)) throw new APIError('Use DGTL single sign-on.', 403)
      const result = await refreshOperation({ collection, req })
      if (result.setCookie)
        headers.set(
          'Set-Cookie',
          generatePayloadCookie({
            collectionAuthConfig: collection.config.auth,
            cookiePrefix: req.payload.config.cookiePrefix,
            token: result.refreshedToken,
          }),
        )
      return Response.json(result, { headers })
    },
  },
  {
    path: '/logout',
    method: 'post',
    handler: async (req) => {
      const collection = req.payload.collections['cms-users']
      const headers = headersWithCors({
        headers: new Headers({ 'Cache-Control': 'no-store' }),
        req,
      })
      if (sessionToken(req.headers)) {
        const config = ssoConfig()
        if (!config || !sameOriginRequest(req.headers, config.origin))
          throw new APIError('Invalid logout origin.', 403)
        // Works even after central access is revoked and req.user is null.
        await deleteSSOSession(req)
        if (
          req.searchParams.get('allSessions') === 'true' &&
          req.user &&
          (req.user as SSOUser)._strategy === SSO_STRATEGY
        ) {
          await req.payload.delete({
            collection: 'cms-sso-sessions',
            overrideAccess: true,
            where: { user: { equals: req.user.id } },
          })
        }
      } else {
        await logoutOperation({
          collection,
          req,
          allSessions: req.searchParams.get('allSessions') === 'true',
        })
      }
      headers.set(
        'Set-Cookie',
        generateExpiredPayloadCookie({
          collectionAuthConfig: collection.config.auth,
          cookiePrefix: req.payload.config.cookiePrefix,
        }),
      )
      return Response.json({ message: 'Logged out.' }, { headers })
    },
  },
]
