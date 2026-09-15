import 'dotenv/config'

import { getPayload } from 'payload'

import config from './payload.config'
import { runRevalidationCycle } from './jobs/revalidation'
import { createWorkerShutdown } from './services/worker-shutdown'
import {
  beginWorkerHealthCycle,
  closeWorkerHealthServer,
  completeWorkerHealthCycle,
  createWorkerHealthServer,
  type WorkerHealthState,
} from './services/worker-health'

const payload = await getPayload({ config })
const once = process.argv.includes('--once')
const stopController = new AbortController()
let stopping = false
let fatalWorkerError = false
const workerHealth: WorkerHealthState = {
  active: false,
  cycleInProgress: false,
  lastCycleSucceeded: false,
  lastProgressAt: null,
  lastSuccessfulCycleAt: null,
  stopping: false,
}
const healthServer = once ? null : createWorkerHealthServer(workerHealth)

const shutdown = createWorkerShutdown({
  onStop: (reason) => {
    stopping = true
    workerHealth.stopping = true
    payload.logger.info({ reason }, 'Stopping the revalidation worker after the current delivery.')
    stopController.abort()
  },
  onTimeout: () => {
    payload.logger.error('Worker drain exceeded 25 seconds; exiting unsuccessfully. Unfinished deliveries retain their retry lease.')
    process.exit(1)
  },
})

const onSIGINT = () => shutdown.request('SIGINT')
const onSIGTERM = () => shutdown.request('SIGTERM')

// Repeated signals must not bypass cleanup and terminate an in-flight delivery.
process.on('SIGINT', onSIGINT)
process.on('SIGTERM', onSIGTERM)

const waitForNextCycle = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    if (stopController.signal.aborted) {
      resolve()
      return
    }
    const done = () => {
      clearTimeout(timeout)
      stopController.signal.removeEventListener('abort', done)
      resolve()
    }
    const timeout = setTimeout(done, milliseconds)
    stopController.signal.addEventListener('abort', done, { once: true })
  })

// A session-level PostgreSQL advisory lock guarantees one active queue worker.
// Keeping the dedicated connection open also makes an accidental second worker
// a passive standby instead of allowing duplicate concurrent deliveries.
const connectLock = () => payload.db.pool.connect()
let lockClient: Awaited<ReturnType<typeof connectLock>> | undefined
const workerLock = [0x4447544c, 0x434d5357] as const
let hasWorkerLock = false
const onLockError = (error: Error) => {
  fatalWorkerError = true
  hasWorkerLock = false
  workerHealth.active = false
  payload.logger.error({ err: error }, 'The revalidation worker lost its advisory-lock connection.')
  shutdown.request('advisory-lock-lost')
}

try {
  lockClient = await connectLock()
  lockClient.on('error', onLockError)
  let loggedStandby = false
  while (!stopping && !hasWorkerLock) {
    const result = await lockClient.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS acquired',
      [...workerLock],
    )
    hasWorkerLock = result.rows[0]?.acquired === true
    workerHealth.active = hasWorkerLock
    if (!hasWorkerLock) {
      if (!loggedStandby) {
        payload.logger.warn(
          'Another revalidation worker is active; this process is waiting as a standby.',
        )
        loggedStandby = true
      }
      if (once) break
      await waitForNextCycle(10_000)
    }
  }

  while (!stopping && hasWorkerLock) {
    try {
      // Detect loss of the dedicated advisory-lock connection before touching
      // queue rows. PostgreSQL releases the lock if this session disappears.
      await lockClient.query('SELECT 1')
    } catch (error) {
      onLockError(error instanceof Error ? error : new Error('Lock connection failed.'))
      workerHealth.cycleInProgress = false
      workerHealth.lastProgressAt = Date.now()
      workerHealth.lastCycleSucceeded = false
      break
    }

    try {
      beginWorkerHealthCycle(workerHealth)
      const { processed, recordingFailures } = await runRevalidationCycle(
        payload,
        new Date(),
        () => {
          workerHealth.lastProgressAt = Date.now()
        },
        () => stopController.signal.aborted,
      )
      completeWorkerHealthCycle(workerHealth, recordingFailures === 0)
      if (recordingFailures > 0) {
        payload.logger.error(
          { recordingFailures },
          'Revalidation worker could not persist one or more delivery outcomes.',
        )
      }
      if (processed > 0) payload.logger.info({ processed }, 'Processed revalidation deliveries.')
    } catch (error) {
      completeWorkerHealthCycle(workerHealth, false)
      payload.logger.error({ err: error }, 'Revalidation worker cycle failed.')
    }
    if (once) break
    await waitForNextCycle(5000)
  }
} catch (error) {
  fatalWorkerError = true
  payload.logger.error({ err: error }, 'Worker startup or lock acquisition failed.')
} finally {
  // Also bound cleanup for --once and startup failures, not only SIGTERM.
  shutdown.request('cleanup')
  if (hasWorkerLock && lockClient) {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [...workerLock])
    } catch (error) {
      payload.logger.warn(
        { err: error },
        'The revalidation worker lock connection closed before unlock.',
      )
    }
  }
  // Destroy this dedicated session rather than returning an advisory-lock
  // connection to the pool, even when explicit unlock failed.
  lockClient?.release(true)
  workerHealth.active = false
  workerHealth.cycleInProgress = false
  workerHealth.stopping = true
  try {
    await closeWorkerHealthServer(healthServer)
  } catch (error) {
    fatalWorkerError = true
    payload.logger.error({ err: error }, 'Worker health server cleanup failed.')
  }
  try {
    await payload.destroy()
  } catch (error) {
    fatalWorkerError = true
    payload.logger.error({ err: error }, 'Worker Payload cleanup failed.')
  }
  shutdown.complete()
  process.off('SIGINT', onSIGINT)
  process.off('SIGTERM', onSIGTERM)
}

// Payload 3.88's destroy clears schema state but leaves its pool/monitoring
// connection alive. As in Payload's one-shot CLI, exit only AFTER all owned
// delivery work and cleanup have settled. Do not fake success on a timeout.
payload.logger.info({ exitCode: fatalWorkerError ? 1 : 0 }, 'Worker drain completed.')
process.exit(fatalWorkerError ? 1 : 0)
