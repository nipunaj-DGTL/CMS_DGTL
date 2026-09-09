import { describe, expect, it, vi } from 'vitest'

import { validateWebsiteHomepage } from '../../src/hooks/websites'
import { validRevalidationSecretReference } from '../../src/collections/Websites'

const request = (page: { tenant: number; website: number }) => ({
  payload: { findByID: vi.fn(async () => ({ id: 10, ...page })) },
})

describe('website homepage validation', () => {
  it('accepts a page owned by the same tenant and website', async () => {
    await expect(validateWebsiteHomepage({
      data: { homepage: 10 },
      operation: 'update',
      originalDoc: { homepage: null, id: 2, tenant: 1 },
      req: request({ tenant: 1, website: 2 }),
    } as never)).resolves.toMatchObject({ homepage: 10 })
  })

  it('rejects a homepage from another website', async () => {
    await expect(validateWebsiteHomepage({
      data: { homepage: 10 },
      operation: 'update',
      originalDoc: { homepage: null, id: 2, tenant: 1 },
      req: request({ tenant: 1, website: 3 }),
    } as never)).rejects.toThrow(/must belong to this website and client/i)
  })

  it('requires the website to exist before assigning its homepage', async () => {
    await expect(validateWebsiteHomepage({
      data: { homepage: 10, tenant: 1 },
      operation: 'create',
      req: request({ tenant: 1, website: 2 }),
    } as never)).rejects.toThrow(/create the website first/i)
  })

  it('allows an existing homepage to be cleared', async () => {
    await expect(validateWebsiteHomepage({
      data: { homepage: null },
      operation: 'update',
      originalDoc: { homepage: 10, id: 2, tenant: 1 },
      req: request({ tenant: 1, website: 2 }),
    } as never)).resolves.toMatchObject({ homepage: null })
  })
})

describe('website secret references', () => {
  it('accepts only an environment-map reference for a normalized website key', () => {
    expect(
      validRevalidationSecretReference(
        'env:CMS_REVALIDATION_SECRETS:client-01-main',
      ),
    ).toBe(true)
    expect(validRevalidationSecretReference('the-actual-secret')).toMatch(/never paste/i)
    expect(
      validRevalidationSecretReference(
        'env:CMS_REVALIDATION_SECRETS:Client 01',
      ),
    ).toMatch(/website-key/i)
  })
})
