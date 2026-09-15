import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorkerShutdown } from '../../src/services/worker-shutdown'

afterEach(() => vi.useRealTimers())

describe('worker drain deadline', () => {
  it('stops accepting work once, even with repeated signals', () => {
    vi.useFakeTimers()
    const onStop = vi.fn()
    const onTimeout = vi.fn()
    const shutdown = createWorkerShutdown({ onStop, onTimeout })
    expect(shutdown.stopping).toBe(false)
    shutdown.request('SIGTERM')
    vi.advanceTimersByTime(10_000)
    shutdown.request('SIGINT')
    expect(shutdown.stopping).toBe(true)
    expect(onStop).toHaveBeenCalledExactlyOnceWith('SIGTERM')
    vi.advanceTimersByTime(15_000)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    shutdown.complete()
  })

  it('cancels the deadline after completed cleanup', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const shutdown = createWorkerShutdown({ onStop: vi.fn(), onTimeout })
    shutdown.request('cleanup')
    vi.advanceTimersByTime(24_999)
    expect(onTimeout).not.toHaveBeenCalled()
    shutdown.complete()
    vi.advanceTimersByTime(60_000)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('fails a hung cleanup within the container grace period', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const shutdown = createWorkerShutdown({ onStop: vi.fn(), onTimeout })
    shutdown.request('advisory-lock-lost')
    vi.advanceTimersByTime(25_000)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    shutdown.complete()
  })
})
