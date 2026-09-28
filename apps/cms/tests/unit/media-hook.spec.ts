import type { CollectionBeforeChangeHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { scanUploadedMedia } from '../../src/hooks/media'
import { inspectUploadedMedia } from '../../src/services/malware-scan'

vi.mock('../../src/services/malware-scan', () => ({ inspectUploadedMedia: vi.fn() }))

const inspect = vi.mocked(inspectUploadedMedia)
const run = (overrides: Record<string, unknown> = {}) => scanUploadedMedia({
  data: {}, operation: 'update', originalDoc: {},
  req: { payload: { logger: { error: vi.fn() } } },
  ...overrides,
} as unknown as Parameters<CollectionBeforeChangeHook>[0])

beforeEach(() => vi.resetAllMocks())

describe('media scan hook', () => {
  it('retains trusted scan fields during the cloud-storage metadata update', async () => {
    const originalDoc = Object.freeze({ checksum: 'trusted-checksum', scanStatus: 'clean' })
    const data = Object.freeze({ _etag: 'storage-etag' })
    await expect(run({ data, originalDoc })).resolves.toEqual({
      _etag: 'storage-etag', checksum: 'trusted-checksum', scanStatus: 'clean',
    })
    expect(inspect).not.toHaveBeenCalled()
  })

  it.each(['pending', 'rejected', 'clean'])('does not let metadata edits forge a %s scan result', async scanStatus => {
    await expect(run({
      data: { alt: 'Updated description', checksum: 'forged', scanStatus: 'clean' },
      originalDoc: { checksum: 'trusted', scanStatus },
    })).resolves.toEqual({ alt: 'Updated description', checksum: 'trusted', scanStatus })
    expect(inspect).not.toHaveBeenCalled()
  })

  it('does not invent trusted fields when the existing document has none', async () => {
    await expect(run({ data: { checksum: 'forged', scanStatus: 'clean' } })).resolves.toEqual({})
  })

  it('preserves invalid existing state for validation rather than marking it clean', async () => {
    await expect(run({ originalDoc: { checksum: null, scanStatus: null } })).resolves.toEqual({
      checksum: null, scanStatus: null,
    })
  })

  it('rejects creation without a binary', async () => {
    await expect(run({ operation: 'create' })).rejects.toMatchObject({ status: 400 })
  })

  it.each(['create', 'update'])('scans fresh bytes on %s and overrides supplied scan fields', async operation => {
    const data = Buffer.from('fresh-file')
    inspect.mockResolvedValue({ checksum: 'fresh-checksum', scanStatus: 'clean' })
    await expect(run({
      operation, data: { checksum: 'forged', scanStatus: 'rejected' },
      originalDoc: { checksum: 'old', scanStatus: 'clean' },
      req: { file: { data, mimetype: 'image/png' } },
    })).resolves.toEqual({ checksum: 'fresh-checksum', scanStatus: 'clean' })
    expect(inspect).toHaveBeenCalledWith(data, 'image/png')
  })

  it('rejects upload when scanning fails', async () => {
    const error = vi.fn()
    inspect.mockRejectedValue(new Error('Malware detected'))
    await expect(run({ req: {
      file: { data: Buffer.from('unsafe'), mimetype: 'image/png' },
      payload: { logger: { error } },
    } })).rejects.toMatchObject({ status: 422, message: 'Malware detected' })
    expect(error).toHaveBeenCalledOnce()
  })
})
