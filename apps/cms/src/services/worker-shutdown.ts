/**
 * A deadline covers the entire drain, including database and HTTP cleanup.
 * Exceeding it is a failure, never a successful graceful shutdown. Keep this
 * below Compose's 30-second grace period so Docker need not send SIGKILL.
 */
export const createWorkerShutdown = ({
  onStop,
  onTimeout,
  timeoutMs = 25_000,
}: {
  onStop: (reason: string) => void
  onTimeout: () => void
  timeoutMs?: number
}) => {
  let stopping = false
  let deadline: ReturnType<typeof setTimeout> | undefined
  return {
    get stopping() { return stopping },
    request(reason: string) {
      if (stopping) return
      stopping = true
      deadline = setTimeout(onTimeout, timeoutMs)
      onStop(reason)
    },
    complete() {
      if (deadline) clearTimeout(deadline)
    },
  }
}
