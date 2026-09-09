import { describe, expect, it } from 'vitest'

import { prepareContentRequestComments } from '../../src/services/content-requests'

const now = new Date('2026-09-08T12:00:00.000Z')
const existing = { author: 7, createdAt: '2026-09-08T10:00:00.000Z', id: 'row-1', message: 'Original' }

describe('content request comments', () => {
  it('assigns the authenticated author and timestamp to new comments', () => {
    expect(prepareContentRequestComments({
      data: { comments: [{ author: 999, createdAt: '2000-01-01', message: '  Update  ' }] },
      now,
      userID: 7,
    })).toMatchObject({ comments: [{ author: 7, createdAt: now.toISOString(), message: 'Update' }] })
  })

  it('keeps existing comments immutable and append-only', () => {
    expect(() => prepareContentRequestComments({
      data: { comments: [{ ...existing, message: 'Changed' }] },
      now,
      originalDoc: { comments: [existing] },
      userID: 7,
    })).toThrow(/cannot be edited/i)

    expect(() => prepareContentRequestComments({
      data: { comments: [] },
      now,
      originalDoc: { comments: [existing] },
      userID: 7,
    })).toThrow(/cannot be deleted/i)
  })
})
