export const contentRequestStatuses = [
  'submitted',
  'reviewing',
  'needs-information',
  'in-progress',
  'client-review',
  'completed',
  'cancelled',
] as const

export type ContentRequestStatus = (typeof contentRequestStatuses)[number]

const allowedTransitions: Record<ContentRequestStatus, ContentRequestStatus[]> = {
  'client-review': ['in-progress', 'completed'],
  'in-progress': ['client-review', 'completed'],
  'needs-information': ['submitted', 'reviewing', 'cancelled'],
  cancelled: [],
  completed: [],
  reviewing: ['needs-information', 'in-progress', 'cancelled'],
  submitted: ['reviewing', 'cancelled'],
}

export const canTransitionContentRequest = (
  from: ContentRequestStatus | undefined,
  to: ContentRequestStatus,
): boolean => from === undefined || from === to || allowedTransitions[from].includes(to)

const clientTransitions = new Set<string>([
  'client-review:completed',
  'client-review:in-progress',
  'needs-information:cancelled',
  'needs-information:submitted',
  'submitted:cancelled',
])

/** Client administrators can submit/withdraw requests, answer questions, and
 * approve or reject work that DGTL explicitly moved to client review. They
 * cannot mark internal work complete from an in-progress state. */
export const canClientTransitionContentRequest = (
  from: ContentRequestStatus | undefined,
  to: ContentRequestStatus,
): boolean => from === undefined
  ? to === 'submitted'
  : from === to || clientTransitions.has(`${from}:${to}`)
