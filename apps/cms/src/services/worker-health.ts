import { createServer, type Server } from 'node:http'

export type WorkerHealthState = {
  active: boolean
  cycleInProgress: boolean
  lastCycleSucceeded: boolean
  lastProgressAt: number | null
  lastSuccessfulCycleAt: number | null
  stopping: boolean
}

export type WorkerHealthSnapshot = {
  active: boolean
  lastSuccessfulCycleAt: string | null
  service: 'dgtl-cms-revalidation-worker'
  status: 'healthy' | 'unhealthy'
}

/**
 * Mark a cycle as running without changing the result of the last completed
 * cycle. The health endpoint can therefore remain healthy while a subsequent
 * long-running cycle is making progress.
 */
export const beginWorkerHealthCycle = (
  state: WorkerHealthState,
  now = Date.now(),
): void => {
  state.cycleInProgress = true
  state.lastProgressAt = now
}

/** Record the result only once the current cycle has completed or failed. */
export const completeWorkerHealthCycle = (
  state: WorkerHealthState,
  succeeded: boolean,
  now = Date.now(),
): void => {
  state.cycleInProgress = false
  state.lastProgressAt = now
  state.lastCycleSucceeded = succeeded
  if (succeeded) state.lastSuccessfulCycleAt = now
}

const boundedInteger = (
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Worker health value must be an integer between ${minimum} and ${maximum}.`)
  }
  return value
}

export const workerHealthStaleAfterMs = (): number =>
  boundedInteger(process.env.WORKER_HEALTH_STALE_MS, 120_000, 30_000, 600_000)

export const getWorkerHealthSnapshot = (
  state: WorkerHealthState,
  now = Date.now(),
  staleAfterMs = workerHealthStaleAfterMs(),
): WorkerHealthSnapshot => {
  const recent =
    state.lastProgressAt !== null &&
    now - state.lastProgressAt >= 0 &&
    now - state.lastProgressAt <= staleAfterMs
  const healthy = state.active && !state.stopping && recent && state.lastCycleSucceeded

  return {
    active: state.active,
    lastSuccessfulCycleAt:
      state.lastSuccessfulCycleAt !== null
        ? new Date(state.lastSuccessfulCycleAt).toISOString()
        : null,
    service: 'dgtl-cms-revalidation-worker',
    status: healthy ? 'healthy' : 'unhealthy',
  }
}

export const createWorkerHealthServer = (
  state: WorkerHealthState,
  options: { host?: string; port?: number; staleAfterMs?: number } = {},
): Server => {
  const staleAfterMs = options.staleAfterMs ?? workerHealthStaleAfterMs()
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/health') {
      response.writeHead(404, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      })
      response.end(JSON.stringify({ status: 'not-found' }))
      return
    }

    const snapshot = getWorkerHealthSnapshot(state, Date.now(), staleAfterMs)
    response.writeHead(snapshot.status === 'healthy' ? 200 : 503, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    })
    response.end(JSON.stringify(snapshot))
  })

  server.listen(options.port ?? 3001, options.host ?? '127.0.0.1')
  return server
}

export const closeWorkerHealthServer = async (server: Server | null): Promise<void> => {
  if (!server) return
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
