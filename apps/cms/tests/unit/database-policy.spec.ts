import { describe, expect, it } from 'vitest'

import { shouldPushDatabaseSchema } from '../../src/services/database-policy'

describe('database schema push policy', () => {
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
