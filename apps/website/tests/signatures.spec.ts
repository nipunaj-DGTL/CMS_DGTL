import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { verifyDelivery } from '../src/lib/signatures'

describe('website delivery verification', () => {
  it('rejects a body changed after signing', () => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = createHmac('sha256', 'secret').update(`${timestamp}.original`).digest('hex')
    expect(verifyDelivery({ rawBody: 'changed', secret: 'secret', signature, timestamp })).toBe(false)
  })
})
