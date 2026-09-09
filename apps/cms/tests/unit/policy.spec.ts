import { describe, expect, it, vi } from 'vitest'

import {
  activeTenantIDsForRequest,
  canAccessCMSAdmin,
  canPublish,
  clientRoles,
  companyRoles,
  tenantContentCreateAccess,
  tenantDirectoryReadAccess,
  tenantIDsForRoles,
  tenantVersionReadAccess,
  usersTenantAccessOverride,
} from '../../src/access/policy'

const client = {
  accountType: 'client' as const,
  id: 42,
  status: 'active' as const,
  tenants: [{ roles: ['client-admin' as const], tenant: 'client-01' }],
}

const requestFor = ({
  activeTenantIDs = ['client-01'],
  liveUser = client,
  sessionUser = client,
}: {
  activeTenantIDs?: string[]
  liveUser?: Record<string, unknown>
  sessionUser?: Record<string, unknown>
} = {}) => ({
  payload: {
    find: vi.fn().mockResolvedValue({ docs: activeTenantIDs.map((id) => ({ id })) }),
    findByID: vi.fn().mockResolvedValue(liveUser),
  },
  user: sessionUser,
})

describe('tenant policy helpers', () => {
  it('defines exactly the two supported human profiles', () => {
    expect(companyRoles).toEqual(['company-super-admin'])
    expect(clientRoles).toEqual(['client-admin'])
  })

  it('returns the tenant assigned to a client company admin', () => {
    expect(tenantIDsForRoles(client, ['client-admin'])).toEqual(['client-01'])
  })

  it('allows a client company admin to publish only in the assigned tenant', () => {
    expect(canPublish(client, 'client-01')).toBe(true)
    expect(canPublish(client, 'client-02')).toBe(false)
  })

  it('scopes the tenant directory by tenant id instead of a non-existent tenant field', async () => {
    await expect(tenantDirectoryReadAccess({ req: requestFor() } as never)).resolves.toEqual({
      id: { in: ['client-01'] },
    })
  })

  it('limits client access to the client user document itself', async () => {
    const req = requestFor()
    expect(
      await usersTenantAccessOverride({ accessKey: 'read', accessResult: true, req } as never),
    ).toEqual({ id: { equals: 42 } })
    expect(
      await usersTenantAccessOverride({ accessKey: 'create', accessResult: true, req } as never),
    ).toBe(false)
    expect(
      await usersTenantAccessOverride({ accessKey: 'unlock', accessResult: true, req } as never),
    ).toBe(false)
  })

  it('uses boolean authorization for creates and version reads', async () => {
    expect(await tenantContentCreateAccess({ req: requestFor() } as never)).toBe(true)
    expect(await tenantVersionReadAccess({ req: requestFor() } as never)).toBe(true)
    expect(await tenantContentCreateAccess({ req: { ...requestFor(), user: null } } as never)).toBe(
      false,
    )
  })

  it('fails closed when a tenant is suspended despite an active session claim', async () => {
    const req = requestFor({ activeTenantIDs: [] })
    expect(await activeTenantIDsForRequest(req as never)).toEqual([])
    expect(await canAccessCMSAdmin(req as never)).toBe(false)
    expect(await tenantContentCreateAccess({ req } as never)).toBe(false)
    expect(await tenantDirectoryReadAccess({ req } as never)).toBe(false)
  })

  it('fails closed when the database user is suspended despite an active session claim', async () => {
    const req = requestFor({ liveUser: { ...client, status: 'suspended' } })
    expect(await canAccessCMSAdmin(req as never)).toBe(false)
    expect(await tenantContentCreateAccess({ req } as never)).toBe(false)
  })

  it('does not grant roles to invited users', () => {
    expect(tenantIDsForRoles({ ...client, status: 'invited' }, ['client-admin'])).toEqual([])
  })
})
