import { describe, expect, it } from 'vitest'

import { isSafeExternalURL, normalizeSlug } from '../../src/services/slug'

describe('content input normalization', () => {
  it('normalizes nested slugs without allowing a host name', () => {
    expect(normalizeSlug('https://example.com/About/Our Team/')).toBe('about/our-team')
  })

  it('allows approved URL schemes only', () => {
    expect(isSafeExternalURL('https://example.com')).toBe(true)
    expect(isSafeExternalURL('/services/production')).toBe(true)
    expect(isSafeExternalURL('/#enquiry')).toBe(true)
    expect(isSafeExternalURL('//example.com/redirect')).toBe(false)
    expect(isSafeExternalURL('javascript:alert(1)')).toBe(false)
  })
})
