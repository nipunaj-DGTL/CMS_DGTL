import 'dotenv/config'

import { getPayload } from 'payload'

import config from './payload.config'
import { runRevalidationCycle } from './jobs/revalidation'
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

const requestStop = (signal: NodeJS.Signals) => {
  if (stopping) return
  stopping = true
  workerHealth.stopping = true
  payload.logger.info({ signal }, 'Stopping the revalidation worker after the current delivery.')
  stopController.abort()
}

const onSIGINT = () => requestStop('SIGINT')
const onSIGTERM = () => requestStop('SIGTERM')

process.once('SIGINT', onSIGINT)
process.once('SIGTERM', onSIGTERM)

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
const lockClient = await payload.db.pool.connect()
const workerLock = [0x4447544c, 0x434d5357] as const
let hasWorkerLock = false

try {
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
      fatalWorkerError = true
      hasWorkerLock = false
      workerHealth.active = false
      workerHealth.cycleInProgress = false
      workerHealth.lastProgressAt = Date.now()
      workerHealth.lastCycleSucceeded = false
      payload.logger.error(
        { err: error },
        'The revalidation worker lost its advisory-lock connection.',
      )
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
} finally {
  process.off('SIGINT', onSIGINT)
  process.off('SIGTERM', onSIGTERM)
  if (hasWorkerLock) {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [...workerLock])
    } catch (error) {
      payload.logger.warn(
        { err: error },
        'The revalidation worker lock connection closed before unlock.',
      )
    }
  }
  lockClient.release()
  workerHealth.active = false
  workerHealth.cycleInProgress = false
  workerHealth.stopping = true
  await closeWorkerHealthServer(healthServer)
  await payload.destroy()
}

if (fatalWorkerError) process.exitCode = 1
