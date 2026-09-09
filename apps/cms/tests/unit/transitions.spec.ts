import { describe, expect, it } from 'vitest'

import { canClientTransitionContentRequest, canTransitionContentRequest } from '../../src/access/transitions'

describe('content request workflow', () => {
  it('allows documented transitions and blocks skips', () => {
    expect(canTransitionContentRequest('submitted', 'reviewing')).toBe(true)
    expect(canTransitionContentRequest('submitted', 'completed')).toBe(false)
    expect(canTransitionContentRequest('completed', 'reviewing')).toBe(false)
  })

  it('does not let a client complete internal in-progress work', () => {
    expect(canClientTransitionContentRequest('in-progress', 'completed')).toBe(false)
    expect(canClientTransitionContentRequest('client-review', 'completed')).toBe(true)
    expect(canClientTransitionContentRequest('client-review', 'in-progress')).toBe(true)
    expect(canClientTransitionContentRequest('submitted', 'cancelled')).toBe(true)
    expect(canClientTransitionContentRequest('submitted', 'reviewing')).toBe(false)
  })
})
