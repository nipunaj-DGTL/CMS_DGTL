import { describe, expect, it } from 'vitest'

import { createPreviewToken, signBody, verifyPreviewToken, verifySignedBody } from '../../src/services/security'

describe('signed integrations', () => {
  it('verifies a delivery signature inside the replay window', () => {
    const now = Date.now()
    const timestamp = String(Math.floor(now / 1000))
    const body = '{"websiteKey":"client-01-main"}'
    const signature = signBody('secret', timestamp, body)
    expect(verifySignedBody({ now, rawBody: body, secret: 'secret', signature, timestamp })).toBe(true)
    expect(verifySignedBody({ now: now + 301_000, rawBody: body, secret: 'secret', signature, timestamp })).toBe(false)
  })

  it('binds preview claims to a signed, expiring token', () => {
    const token = createPreviewToken('preview-secret', {
      documentID: 'page-1',
      tenantID: 'client-01',
      ttlSeconds: 60,
      userID: 'user-1',
      websiteKey: 'client-01-main',
    })
    expect(verifyPreviewToken('preview-secret', token)).toMatchObject({ documentID: 'page-1', websiteKey: 'client-01-main' })
    expect(verifyPreviewToken('wrong-secret', token)).toBeNull()
  })
})
