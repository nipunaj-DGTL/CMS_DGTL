import { describe, expect, it, vi } from 'vitest'

import { CmsUsers } from '../../src/collections/CmsUsers'
import { preventLastClientAdminDelete, protectUserAssignments } from '../../src/hooks/users'

const clientAdmin = {
  accountType: 'client' as const,
  companyRoles: [],
  displayName: 'Client Admin',
  email: 'client@example.test',
  id: 10,
  status: 'active' as const,
  tenants: [{ roles: ['client-admin' as const], tenant: 1 }],
}

const superAdmin = {
  accountType: 'company' as const,
  companyRoles: ['company-super-admin' as const],
  id: 99,
  status: 'active' as const,
  tenants: [],
}

const requestWithAdminCount = (
  totalDocs: number,
  user: Record<string, unknown> | null = superAdmin,
) => ({
  context: {},
  payload: {
    find: vi.fn().mockResolvedValue({ totalDocs }),
    findByID: vi.fn().mockResolvedValue(clientAdmin),
  },
  user,
})

describe('CMS user account safeguards', () => {
  it('allows only an active company super admin to unlock accounts', async () => {
    const unlockAccess = CmsUsers.access?.unlock
    expect(unlockAccess).toEqual(expect.any(Function))

    const requestForUser = (user: typeof clientAdmin | typeof superAdmin) => ({
      payload: { findByID: vi.fn().mockResolvedValue(user) },
      user,
    })

    await expect(unlockAccess!({ req: requestForUser(clientAdmin) } as never)).resolves.toBe(false)
    await expect(unlockAccess!({ req: requestForUser(superAdmin) } as never)).resolves.toBe(true)
  })

  it('preserves status and tenant assignments during a client self-update', async () => {
    const result = await protectUserAssignments({
      data: {
        accountType: 'company',
        companyRoles: ['company-super-admin'],
        displayName: 'Updated display name',
        status: 'suspended',
        tenants: [],
      },
      operation: 'update',
      originalDoc: clientAdmin,
      req: requestWithAdminCount(0, clientAdmin),
    } as never)

    expect(result).toMatchObject({
      accountType: 'client',
      companyRoles: [],
      displayName: 'Updated display name',
      status: 'active',
      tenants: clientAdmin.tenants,
    })
  })

  it('rejects non-self user management by a client admin', async () => {
    await expect(
      protectUserAssignments({
        data: { displayName: 'Another user' },
        operation: 'update',
        originalDoc: { ...clientAdmin, id: 11 },
        req: requestWithAdminCount(1, clientAdmin),
      } as never),
    ).rejects.toThrow(/Only a super admin/i)
  })

  it.each([
    ['suspending', { status: 'suspended' }],
    ['removing the assignment of', { tenants: [] }],
    ['changing the account type of', { accountType: 'company' }],
  ])('prevents %s the last active client admin', async (_label, data) => {
    await expect(
      protectUserAssignments({
        data,
        operation: 'update',
        originalDoc: clientAdmin,
        req: requestWithAdminCount(0),
      } as never),
    ).rejects.toThrow(/at least one active client company admin/i)
  })

  it('allows suspension when another active client admin remains', async () => {
    const result = await protectUserAssignments({
      data: { status: 'suspended' },
      operation: 'update',
      originalDoc: clientAdmin,
      req: requestWithAdminCount(1),
    } as never)

    expect(result).toMatchObject({ status: 'suspended' })
  })

  it('records who invited an account and when its password was set', async () => {
    const result = await protectUserAssignments({
      data: {
        accountType: 'client',
        password: 'temporary-password',
        tenants: [{ roles: ['client-admin'], tenant: 1 }],
      },
      operation: 'create',
      req: requestWithAdminCount(0),
    } as never)

    expect(result).toMatchObject({ invitedBy: superAdmin.id })
    expect(result?.passwordChangedAt).toEqual(expect.any(String))
  })

  it('activates an invited account after Payload verifies its email', async () => {
    const result = await protectUserAssignments({
      data: { _verified: true },
      operation: 'update',
      originalDoc: { ...clientAdmin, status: 'invited' },
      req: requestWithAdminCount(0, null),
    } as never)

    expect(result).toMatchObject({ _verified: true, status: 'active' })
  })

  it('prevents deleting the last active client admin', async () => {
    await expect(
      preventLastClientAdminDelete({
        id: clientAdmin.id,
        req: requestWithAdminCount(0),
      } as never),
    ).rejects.toThrow(/last active client company admin/i)
  })
})
