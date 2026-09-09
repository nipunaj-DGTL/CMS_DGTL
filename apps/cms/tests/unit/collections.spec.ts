import { describe, expect, it } from 'vitest'

import { Pages } from '../../src/collections/Pages'
import { Posts } from '../../src/collections/Posts'

describe('draft collection configuration', () => {
  it('validates autosaves instead of auto-creating incomplete tenant documents', () => {
    expect(Pages.versions).toMatchObject({ drafts: { autosave: true, validate: true } })
    expect(Posts.versions).toMatchObject({ drafts: { autosave: true, validate: true } })
  })
})
