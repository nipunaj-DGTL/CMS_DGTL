import { relationID } from '../access/policy'

type Comment = Record<string, unknown>

const unchangedComment = (left: Comment, right: Comment): boolean =>
  String(relationID(left.author) ?? '') === String(relationID(right.author) ?? '') &&
  left.createdAt === right.createdAt &&
  left.message === right.message

/** Content-request discussion is an append-only audit conversation. Authors and
 * timestamps are assigned by the server, never trusted from submitted JSON. */
export const prepareContentRequestComments = ({
  data,
  now = new Date(),
  originalDoc,
  userID,
}: {
  data: Record<string, unknown>
  now?: Date
  originalDoc?: Record<string, unknown>
  userID: number | string
}): Record<string, unknown> => {
  if (!Object.prototype.hasOwnProperty.call(data, 'comments')) return data

  const incoming = Array.isArray(data.comments) ? data.comments as Comment[] : []
  const existing = Array.isArray(originalDoc?.comments) ? originalDoc.comments as Comment[] : []
  const existingByID = new Map(existing
    .filter((comment) => relationID(comment.id) !== undefined)
    .map((comment) => [String(relationID(comment.id)), comment]))
  const retainedIDs = new Set<string>()
  const comments = incoming.map((comment, index) => {
    const rowID = relationID(comment.id)
    const previous = rowID !== undefined ? existingByID.get(String(rowID)) : existing[index]
    if (previous) {
      if (!unchangedComment(comment, previous)) throw new Error('Existing comments cannot be edited or impersonated.')
      if (rowID !== undefined) retainedIDs.add(String(rowID))
      return comment
    }

    const message = typeof comment.message === 'string' ? comment.message.trim() : ''
    if (!message) throw new Error('A comment message is required.')
    return { ...comment, author: userID, createdAt: now.toISOString(), message }
  })

  if (existingByID.size && retainedIDs.size !== existingByID.size) {
    throw new Error('Existing comments cannot be deleted.')
  }
  if (!existingByID.size && existing.length > incoming.length) throw new Error('Existing comments cannot be deleted.')

  return { ...data, comments }
}
