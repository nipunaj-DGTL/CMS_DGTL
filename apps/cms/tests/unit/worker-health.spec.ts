import { afterEach, describe, expect, it } from 'vitest'

import {
  beginWorkerHealthCycle,
  completeWorkerHealthCycle,
  createWorkerHealthServer,
  getWorkerHealthSnapshot,
  type WorkerHealthState,
} from '../../src/services/worker-health'

const healthyState = (completedAt: number): WorkerHealthState => ({
  active: true,
  cycleInProgress: false,
  lastCycleSucceeded: true,
  lastProgressAt: completedAt,
  lastSuccessfulCycleAt: completedAt,
  stopping: false,
})

const servers: ReturnType<typeof createWorkerHealthServer>[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
})

describe('worker health', () => {
  it('preserves the last completed result while a subsequent cycle is running', () => {
    const previousSuccessAt = Date.now() - 5_000
    const cycleStartedAt = previousSuccessAt + 1_000
    const cycleFailedAt = cycleStartedAt + 1_000
    const state = healthyState(previousSuccessAt)

    beginWorkerHealthCycle(state, cycleStartedAt)

    expect(state).toMatchObject({
      cycleInProgress: true,
      lastCycleSucceeded: true,
      lastProgressAt: cycleStartedAt,
      lastSuccessfulCycleAt: previousSuccessAt,
    })
    expect(getWorkerHealthSnapshot(state, cycleStartedAt, 30_000).status).toBe('healthy')

    completeWorkerHealthCycle(state, false, cycleFailedAt)

    expect(state).toMatchObject({
      cycleInProgress: false,
      lastCycleSucceeded: false,
      lastProgressAt: cycleFailedAt,
      lastSuccessfulCycleAt: previousSuccessAt,
    })
    expect(getWorkerHealthSnapshot(state, cycleFailedAt, 30_000).status).toBe('unhealthy')
  })

  it('keeps the first cycle unhealthy until it completes successfully', () => {
    const cycleStartedAt = Date.now()
    const cycleCompletedAt = cycleStartedAt + 1_000
    const state: WorkerHealthState = {
      active: true,
      cycleInProgress: false,
      lastCycleSucceeded: false,
      lastProgressAt: null,
      lastSuccessfulCycleAt: null,
      stopping: false,
    }

    beginWorkerHealthCycle(state, cycleStartedAt)
    expect(getWorkerHealthSnapshot(state, cycleStartedAt, 30_000).status).toBe('unhealthy')

    completeWorkerHealthCycle(state, true, cycleCompletedAt)
    expect(state.lastSuccessfulCycleAt).toBe(cycleCompletedAt)
    expect(getWorkerHealthSnapshot(state, cycleCompletedAt, 30_000).status).toBe('healthy')
  })

  it('is healthy only after a recent successful cycle by the active worker', () => {
    const now = Date.now()
    expect(getWorkerHealthSnapshot(healthyState(now - 5_000), now, 30_000).status).toBe('healthy')
    expect(
      getWorkerHealthSnapshot({ ...healthyState(now), active: false }, now, 30_000).status,
    ).toBe('unhealthy')
    expect(
      getWorkerHealthSnapshot({ ...healthyState(now), lastCycleSucceeded: false }, now, 30_000)
        .status,
    ).toBe('unhealthy')
    expect(getWorkerHealthSnapshot(healthyState(now - 30_001), now, 30_000).status).toBe(
      'unhealthy',
    )
    expect(
      getWorkerHealthSnapshot(
        {
          ...healthyState(now),
          cycleInProgress: true,
          lastCycleSucceeded: false,
          lastSuccessfulCycleAt: null,
        },
        now,
        30_000,
      ).status,
    ).toBe('unhealthy')
    expect(
      getWorkerHealthSnapshot({ ...healthyState(now), cycleInProgress: true }, now, 30_000).status,
    ).toBe('healthy')
    expect(
      getWorkerHealthSnapshot(
        {
          ...healthyState(now),
          cycleInProgress: true,
          lastCycleSucceeded: false,
        },
        now,
        30_000,
      ).status,
    ).toBe('unhealthy')
  })

  it('serves a no-store health response without exposing configuration', async () => {
    const state = healthyState(Date.now())
    const server = createWorkerHealthServer(state, { port: 0, staleAfterMs: 30_000 })
    servers.push(server)
    await new Promise<void>((resolve) => server.once('listening', resolve))

    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing worker health port.')
    const response = await fetch(`http://127.0.0.1:${address.port}/health`)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      active: true,
      service: 'dgtl-cms-revalidation-worker',
      status: 'healthy',
    })
  })

  it('returns 503 as soon as a cycle fails', async () => {
    const state = healthyState(Date.now())
    state.lastCycleSucceeded = false
    const server = createWorkerHealthServer(state, { port: 0, staleAfterMs: 30_000 })
    servers.push(server)
    await new Promise<void>((resolve) => server.once('listening', resolve))

    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing worker health port.')
    const response = await fetch(`http://127.0.0.1:${address.port}/health`)
    expect(response.status).toBe(503)
  })
})
