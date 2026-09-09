import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { config, proxy } from '../../src/proxy'
import {
  CANONICAL_ADMIN_RETURN_TO_HEADER,
  resolveAdminRelayDestination,
  resolveCanonicalLocalAdminURL,
} from '../../src/services/canonical-origin'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('CMS canonical local origin', () => {
  it('preserves the admin path and query while replacing a loopback alias', () => {
    const result = resolveCanonicalLocalAdminURL(
      'http://127.0.0.1:3000/admin/collections/pages/create?depth=1',
      'http://localhost:3000',
    )

    expect(result?.toString()).toBe(
      'http://localhost:3000/admin/collections/pages/create?depth=1',
    )
  })

  it('does nothing for the configured origin or non-local production hosts', () => {
    expect(
      resolveCanonicalLocalAdminURL('http://localhost:3000/admin', 'http://localhost:3000'),
    ).toBeNull()
    expect(
      resolveCanonicalLocalAdminURL(
        'https://internal.example.test/admin',
        'https://cms.example.test',
      ),
    ).toBeNull()
  })

  it('relays safe wrong-host page loads without redirecting inside Proxy', () => {
    vi.stubEnv('CMS_PUBLIC_URL', 'http://localhost:3000')

    const response = proxy(
      new NextRequest('http://127.0.0.1:3000/admin/collections/pages/create?depth=1', {
        headers: { host: '127.0.0.1:3000' },
      }),
    )

    const rewriteURL = new URL(response.headers.get('x-middleware-rewrite') ?? '')
    expect(rewriteURL.pathname).toBe('/api/dgtl/internal/canonical-admin-origin')
    expect(response.headers.get(`x-middleware-request-${CANONICAL_ADMIN_RETURN_TO_HEADER}`)).toBe(
      '/admin/collections/pages/create?depth=1',
    )
  })

  it('stops a request from an already-open wrong-host editor', async () => {
    vi.stubEnv('CMS_PUBLIC_URL', 'http://localhost:3000')

    const response = proxy(
      new NextRequest('http://127.0.0.1:3000/admin/collections/pages/create', {
        headers: { host: '127.0.0.1:3000' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      canonicalURL: 'http://localhost:3000/admin/collections/pages/create',
      code: 'CMS_CANONICAL_ORIGIN_REQUIRED',
    })
  })

  it('matches every Payload Admin route', () => {
    expect(config).toEqual({ matcher: '/admin/:path*' })
  })

  it('allows only local admin paths through the redirect relay', () => {
    expect(
      resolveAdminRelayDestination(
        '/admin/collections/pages/create?depth=1',
        'http://localhost:3000',
      )?.toString(),
    ).toBe('http://localhost:3000/admin/collections/pages/create?depth=1')
    expect(resolveAdminRelayDestination('//evil.test/admin', 'http://localhost:3000')).toBeNull()
    expect(resolveAdminRelayDestination('/api/cms-users', 'http://localhost:3000')).toBeNull()
  })
})
