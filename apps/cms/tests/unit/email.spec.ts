import { afterEach, describe, expect, it, vi } from 'vitest'

import { getEmailAdapter } from '../../src/services/email'

const names = [
  'CMS_EMAIL_FROM_ADDRESS',
  'CMS_EMAIL_FROM_NAME',
  'CMS_EMAIL_PROVIDER',
  'RESEND_API_KEY',
] as const

const original = Object.fromEntries(names.map((name) => [name, process.env[name]]))
afterEach(() => {
  for (const name of names) {
    const value = original[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  vi.unstubAllEnvs()
})

describe('CMS email configuration', () => {
  it('uses Payload console delivery only outside production when no provider is configured', () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.CMS_EMAIL_PROVIDER
    expect(getEmailAdapter()).toBeUndefined()
  })

  it('fails closed when production email delivery is missing', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.CMS_EMAIL_PROVIDER
    expect(() => getEmailAdapter()).toThrow(/CMS_EMAIL_PROVIDER/)
  })

  it('constructs the official Resend adapter from complete configuration', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CMS_EMAIL_PROVIDER = 'resend'
    process.env.CMS_EMAIL_FROM_ADDRESS = 'cms@dgtl.lk'
    process.env.CMS_EMAIL_FROM_NAME = 'DGTL CMS'
    process.env.RESEND_API_KEY = 'test-key'

    const adapter = getEmailAdapter()
    const initialized = adapter?.({ payload: { logger: {} } as never })

    expect(initialized?.name).toBe('resend-rest')
    expect(initialized?.defaultFromAddress).toBe('cms@dgtl.lk')
    expect(initialized?.defaultFromName).toBe('DGTL CMS')
  })

  it('rejects an invalid sender address', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CMS_EMAIL_PROVIDER = 'resend'
    process.env.CMS_EMAIL_FROM_ADDRESS = 'not-an-email'
    process.env.CMS_EMAIL_FROM_NAME = 'DGTL CMS'
    process.env.RESEND_API_KEY = 'test-key'
    expect(() => getEmailAdapter()).toThrow(/valid email address/)
  })
})
