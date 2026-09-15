import { describe, expect, it } from 'vitest'

import { assertSafeDatabaseStartup, shouldPushDatabaseSchema } from '../../src/services/database-policy'

describe('database schema push policy', () => {
  it('rejects the destructive adapter startup flag in production before connecting', () => {
    expect(() => assertSafeDatabaseStartup({ NODE_ENV: 'production', PAYLOAD_DROP_DATABASE: 'true' })).toThrow('PAYLOAD_DROP_DATABASE')
  })
  it('accepts ordinary production startup without the drop flag', () => {
    expect(() => assertSafeDatabaseStartup({ NODE_ENV: 'production' })).not.toThrow()
    expect(() => assertSafeDatabaseStartup({ NODE_ENV: 'production', PAYLOAD_DROP_DATABASE: 'false' })).not.toThrow()
  })
  it.each([
    ['development', undefined, true],
    ['development', 'false', false],
    ['development', 'true', true],
    ['development', 'invalid', false],
    ['test', undefined, false],
    ['test', 'false', false],
    ['test', 'true', true],
    ['production', undefined, false],
    ['production', 'false', false],
    ['production', 'true', false],
  ])('NODE_ENV=%s, PAYLOAD_DB_PUSH=%s => %s', (nodeEnv, push, expected) => {
    expect(shouldPushDatabaseSchema({ NODE_ENV: nodeEnv, PAYLOAD_DB_PUSH: push })).toBe(expected)
  })
})
