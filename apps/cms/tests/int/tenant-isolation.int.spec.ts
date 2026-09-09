/* eslint-disable @typescript-eslint/no-explicit-any -- The matrix intentionally stores heterogeneous generated Payload documents. */
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseURL = process.env.TEST_DATABASE_URL
const run = databaseURL ? describe : describe.skip

run('four-tenant isolation with PostgreSQL', () => {
  let payload: Payload
  const tenants: Array<Record<string, any>> = []
  const pages: Array<Record<string, any>> = []
  const users: Array<Record<string, any>> = []
  let superAdmin: Record<string, any>
  let crossTenantMedia: Record<string, any> | undefined

  beforeAll(async () => {
    process.env.CMS_DATABASE_URL = databaseURL
    process.env.CMS_PUBLIC_URL = 'http://cms.test'
    process.env.PAYLOAD_SECRET = 'integration-test-secret-at-least-32-characters'
    process.env.PAYLOAD_DB_PUSH = 'true'

    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('../../src/payload.config'),
    ])
    payload = await getPayload({ config })

    for (let index = 1; index <= 4; index += 1) {
      const label = String(index).padStart(2, '0')
      const tenant = await payload.create({
        collection: 'dgtl-tenants',
        data: {
          displayName: `Client ${label}`,
          key: `isolation-client-${label}`,
          status: 'active',
        },
        overrideAccess: true,
      })
      tenants.push(tenant)
      const website = await payload.create({
        collection: 'websites',
        data: {
          contentModelVersion: 1,
          displayName: `Website ${label}`,
          domain: `isolation-${label}.example.test`,
          frontendKey: 'test',
          key: `isolation-client-${label}-main`,
          status: 'active',
          tenant: tenant.id,
        },
        overrideAccess: true,
      })
      pages.push(
        await payload.create({
          collection: 'pages',
          context: { systemOperation: true },
          data: {
            _status: 'draft',
            layout: [{ blockType: 'spacer', size: 'small' }],
            slug: 'private-page',
            template: 'standard',
            tenant: tenant.id,
            title: `Private page ${label}`,
            website: website.id,
          },
          draft: true,
          overrideAccess: true,
        }),
      )
      users.push(
        await payload.create({
          collection: 'cms-users',
          data: {
            accountType: 'client',
            displayName: `Client admin ${label}`,
            email: `client-admin-${label}@example.test`,
            password: 'integration-password-123',
            status: 'active',
            tenants: [{ roles: ['client-admin'], tenant: tenant.id }],
          },
          overrideAccess: true,
        }),
      )
    }

    superAdmin = await payload.create({
      collection: 'cms-users',
      data: {
        accountType: 'company',
        companyRoles: ['company-super-admin'],
        displayName: 'Integration super admin',
        email: 'integration-super-admin@example.test',
        password: 'integration-password-123',
        status: 'active',
      },
      overrideAccess: true,
    })

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    crossTenantMedia = await payload.create({
      collection: 'media',
      data: {
        alt: 'Cross-tenant isolation fixture',
        classification: 'public',
        scanStatus: 'clean',
        tenant: tenants[1].id,
        website: pages[1].website,
      },
      draft: false,
      file: {
        data: png,
        mimetype: 'image/png',
        name: 'cross-tenant-isolation.png',
        size: png.length,
      },
      overrideAccess: true,
    })
  }, 120_000)

  afterAll(async () => {
    if (crossTenantMedia) {
      await payload.delete({ collection: 'media', id: crossTenantMedia.id, overrideAccess: true })
    }
    await payload?.destroy()
  })

  it.each([0, 1, 2, 3])('client %i lists only its own page', async (clientIndex) => {
    const result = await payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      overrideAccess: false,
      user: users[clientIndex] as never,
    })
    expect(result.docs.map((page) => page.id)).toEqual([pages[clientIndex].id])
  })

  it('blocks a direct ID read from another tenant', async () => {
    await expect(
      payload.findByID({
        collection: 'pages',
        depth: 0,
        draft: true,
        id: pages[1].id,
        overrideAccess: false,
        user: users[0] as never,
      }),
    ).rejects.toThrow()
  })

  it('allows an active client company admin to log in', async () => {
    const result = await payload.login({
      collection: 'cms-users',
      data: { email: users[0].email, password: 'integration-password-123' },
    })
    expect(result.user?.id).toBe(users[0].id)
  })

  it('allows an active super admin to log in', async () => {
    const result = await payload.login({
      collection: 'cms-users',
      data: { email: superAdmin.email, password: 'integration-password-123' },
    })
    expect(result.user?.id).toBe(superAdmin.id)
  })

  it('keeps client user access self-only', async () => {
    const ownUsers = await payload.find({
      collection: 'cms-users',
      depth: 0,
      overrideAccess: false,
      user: users[0] as never,
    })
    expect(ownUsers.docs.map((user) => user.id)).toEqual([users[0].id])

    await expect(
      payload.create({
        collection: 'cms-users',
        data: {
          accountType: 'client',
          displayName: 'Unauthorized second admin',
          email: 'unauthorized-second-admin@example.test',
          password: 'integration-password-123',
          status: 'active',
          tenants: [{ roles: ['client-admin'], tenant: tenants[0].id }],
        },
        overrideAccess: false,
        user: users[0] as never,
      }),
    ).rejects.toThrow()
  })

  it('hides company-private tenant notes from client admins', async () => {
    await payload.update({
      collection: 'dgtl-tenants',
      data: { notes: 'Company-private integration note' },
      id: tenants[0].id,
      overrideAccess: false,
      user: superAdmin as never,
    })

    try {
      const clientView = await payload.findByID({
        collection: 'dgtl-tenants',
        depth: 0,
        id: tenants[0].id,
        overrideAccess: false,
        user: users[0] as never,
      })
      expect(clientView.notes).toBeUndefined()
    } finally {
      await payload.update({
        collection: 'dgtl-tenants',
        data: { notes: null },
        id: tenants[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      })
    }
  })

  it('preserves protected status and assignments during client self-updates', async () => {
    const updated = await payload.update({
      collection: 'cms-users',
      data: {
        displayName: 'Client admin 01 updated',
        status: 'suspended',
        tenants: [],
      },
      id: users[0].id,
      overrideAccess: false,
      user: users[0] as never,
    })

    expect(updated.displayName).toBe('Client admin 01 updated')
    expect(updated.status).toBe('active')
    expect(updated.tenants).toHaveLength(1)

    users[0] = (await payload.update({
      collection: 'cms-users',
      data: { displayName: 'Client admin 01' },
      id: users[0].id,
      overrideAccess: false,
      user: updated as never,
    })) as Record<string, any>
  })

  it('enforces the final active client admin invariant across update and delete paths', async () => {
    await expect(
      payload.update({
        collection: 'cms-users',
        data: { status: 'suspended' },
        id: users[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      }),
    ).rejects.toThrow(/at least one active client company admin/i)

    await expect(
      payload.update({
        collection: 'cms-users',
        data: { tenants: [] },
        id: users[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      }),
    ).rejects.toThrow(/at least one active client company admin/i)

    await expect(
      payload.delete({
        collection: 'cms-users',
        id: users[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      }),
    ).rejects.toThrow(/last active client company admin/i)

    const replacement = await payload.create({
      collection: 'cms-users',
      data: {
        accountType: 'client',
        displayName: 'Replacement client admin 01',
        email: 'replacement-client-admin-01@example.test',
        password: 'integration-password-123',
        status: 'active',
        tenants: [{ roles: ['client-admin'], tenant: tenants[0].id }],
      },
      overrideAccess: false,
      user: superAdmin as never,
    })

    try {
      const suspended = await payload.update({
        collection: 'cms-users',
        data: { status: 'suspended' },
        id: users[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      })
      expect(suspended.status).toBe('suspended')

      users[0] = (await payload.update({
        collection: 'cms-users',
        data: { status: 'active' },
        id: users[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      })) as Record<string, any>
    } finally {
      await payload.delete({
        collection: 'cms-users',
        id: replacement.id,
        overrideAccess: false,
        user: superAdmin as never,
      })
    }
  })

  it('lets a super admin create a page and its client admin change text, font, and publish it', async () => {
    const aboutPage = await payload.create({
      collection: 'pages',
      data: {
        _status: 'draft',
        layout: [{ blockType: 'hero', heading: 'About us draft', links: [] }],
        slug: 'about-us-role-flow',
        template: 'standard',
        tenant: tenants[0].id,
        title: 'About Us role-flow test',
        typography: { fontFamily: 'brand' },
        website: pages[0].website,
      },
      draft: true,
      overrideAccess: false,
      user: superAdmin as never,
    })

    const published = await payload.update({
      collection: 'pages',
      data: {
        _status: 'published',
        layout: [{ blockType: 'hero', heading: 'About Client 01', links: [] }],
        typography: { fontFamily: 'serif' },
      },
      draft: false,
      id: aboutPage.id,
      overrideAccess: false,
      user: users[0] as never,
    })

    expect(published._status).toBe('published')
    expect(published.layout[0]).toMatchObject({ blockType: 'hero', heading: 'About Client 01' })
    expect(published.typography).toEqual({ fontFamily: 'serif' })
  })

  it('rejects a suspended account even with the correct password', async () => {
    const suspended = await payload.create({
      collection: 'cms-users',
      data: {
        accountType: 'client',
        displayName: 'Suspended integration user',
        email: 'integration-suspended@example.test',
        password: 'integration-password-123',
        status: 'suspended',
        tenants: [{ roles: ['client-admin'], tenant: tenants[0].id }],
      },
      overrideAccess: true,
    })

    await expect(
      payload.login({
        collection: 'cms-users',
        data: { email: suspended.email, password: 'integration-password-123' },
      }),
    ).rejects.toThrow(/not active/i)
  })

  it('allows a client to read versions only for its own tenant', async () => {
    const ownVersions = await payload.findVersions({
      collection: 'pages',
      overrideAccess: false,
      user: users[0] as never,
      where: { parent: { equals: pages[0].id } },
    })
    const otherVersions = await payload.findVersions({
      collection: 'pages',
      overrideAccess: false,
      user: users[0] as never,
      where: { parent: { equals: pages[1].id } },
    })

    expect(ownVersions.totalDocs).toBeGreaterThan(0)
    expect(otherVersions.totalDocs).toBe(0)
  })

  it('allows a client company admin to publish only inside its assigned tenant', async () => {
    const published = await payload.update({
      collection: 'pages',
      data: { _status: 'published' },
      draft: false,
      id: pages[0].id,
      overrideAccess: false,
      user: users[0] as never,
    })
    expect(published._status).toBe('published')

    await expect(
      payload.update({
        collection: 'pages',
        data: { _status: 'published' },
        draft: false,
        id: pages[1].id,
        overrideAccess: false,
        user: users[0] as never,
      }),
    ).rejects.toThrow()
  })

  it('blocks a forged tenant on create', async () => {
    await expect(
      payload.create({
        collection: 'pages',
        data: {
          _status: 'draft',
          layout: [{ blockType: 'spacer', size: 'small' }],
          slug: 'forged',
          template: 'standard',
          tenant: tenants[1].id,
          title: 'Forged page',
          website: pages[1].website,
        },
        draft: true,
        overrideAccess: false,
        user: users[0] as never,
      }),
    ).rejects.toThrow()
  })

  it('blocks media relationships that belong to another tenant', async () => {
    await expect(
      payload.update({
        collection: 'pages',
        data: { seo: { ogImage: crossTenantMedia?.id } },
        draft: true,
        id: pages[0].id,
        overrideAccess: false,
        user: users[0] as never,
      }),
    ).rejects.toThrow(/another tenant/i)
  })

  it('revokes authoring and login when the assigned tenant is suspended', async () => {
    const staleActiveSessionUser = { ...users[0] }
    await payload.update({
      collection: 'dgtl-tenants',
      data: { status: 'suspended' },
      id: tenants[0].id,
      overrideAccess: false,
      user: superAdmin as never,
    })

    try {
      await expect(
        payload.find({
          collection: 'pages',
          depth: 0,
          draft: true,
          overrideAccess: false,
          user: staleActiveSessionUser as never,
        }),
      ).rejects.toThrow()

      await expect(
        payload.find({
          collection: 'cms-users',
          depth: 0,
          overrideAccess: false,
          user: staleActiveSessionUser as never,
        }),
      ).rejects.toThrow()

      await expect(
        payload.update({
          collection: 'pages',
          data: { title: 'Suspended tenant write' },
          draft: true,
          id: pages[0].id,
          overrideAccess: false,
          user: staleActiveSessionUser as never,
        }),
      ).rejects.toThrow()

      await expect(
        payload.login({
          collection: 'cms-users',
          data: { email: users[0].email, password: 'integration-password-123' },
        }),
      ).rejects.toThrow(/not active/i)
    } finally {
      tenants[0] = (await payload.update({
        collection: 'dgtl-tenants',
        data: { status: 'active' },
        id: tenants[0].id,
        overrideAccess: false,
        user: superAdmin as never,
      })) as Record<string, any>
    }
  })
})
