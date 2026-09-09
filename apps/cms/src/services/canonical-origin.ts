const DEFAULT_CMS_PUBLIC_URL = 'http://localhost:3000'

export const CANONICAL_ADMIN_RETURN_TO_HEADER = 'x-dgtl-cms-admin-return-to'

const LOCAL_HOSTNAMES = new Set([
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'localhost',
])

const isLocalHostname = (hostname: string): boolean => LOCAL_HOSTNAMES.has(hostname.toLowerCase())

/**
 * Payload auth cookies are scoped to a hostname. During local development,
 * mixing localhost and 127.0.0.1 therefore creates two unrelated sessions.
 */
export const resolveCanonicalLocalAdminURL = (
  requestURL: string | URL,
  publicURL = process.env.CMS_PUBLIC_URL ?? DEFAULT_CMS_PUBLIC_URL,
  requestHost?: string | null,
): URL | null => {
  let canonicalURL: URL
  let incomingURL: URL

  try {
    canonicalURL = new URL(publicURL)
    incomingURL = new URL(requestURL)

    // NextRequest normalizes 127.0.0.1 to localhost in some runtimes. The
    // original Host header remains authoritative for direct local requests.
    if (requestHost) {
      const hostURL = new URL(`http://${requestHost}`)

      if (hostURL.username || hostURL.password || hostURL.pathname !== '/') {
        return null
      }

      incomingURL.host = hostURL.host
    }
  } catch {
    return null
  }

  if (
    !['http:', 'https:'].includes(canonicalURL.protocol) ||
    !isLocalHostname(canonicalURL.hostname) ||
    !isLocalHostname(incomingURL.hostname) ||
    incomingURL.origin === canonicalURL.origin
  ) {
    return null
  }

  const targetURL = new URL(canonicalURL.origin)
  targetURL.pathname = incomingURL.pathname
  targetURL.search = incomingURL.search

  return targetURL
}

export const resolveAdminRelayDestination = (
  returnTo: string | null,
  publicURL = process.env.CMS_PUBLIC_URL ?? DEFAULT_CMS_PUBLIC_URL,
): URL | null => {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return null
  }

  try {
    const canonicalURL = new URL(publicURL)
    const targetURL = new URL(returnTo, canonicalURL.origin)

    if (
      !['http:', 'https:'].includes(canonicalURL.protocol) ||
      targetURL.origin !== canonicalURL.origin ||
      (targetURL.pathname !== '/admin' && !targetURL.pathname.startsWith('/admin/'))
    ) {
      return null
    }

    return targetURL
  } catch {
    return null
  }
}
