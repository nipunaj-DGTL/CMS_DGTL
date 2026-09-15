/** First user for the isolated Docker Desktop database, never a production seed. */
const main = async () => {
  const database = new URL(process.env.CMS_DATABASE_URL || 'postgresql://invalid')
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.CMS_LOCAL_DOCKER !== 'true' ||
    process.env.PAYLOAD_DB_PUSH !== 'false' ||
    database.hostname !== 'postgres' ||
    database.pathname !== '/dgtl_cms_docker_local'
  ) {
    throw new Error('Bootstrap is restricted to the isolated local Docker database.')
  }

  const email = process.env.LOCAL_ADMIN_EMAIL?.trim()
  const password = process.env.LOCAL_ADMIN_PASSWORD
  if (!email || !password || password.length < 24) {
    throw new Error('A local administrator email and generated password are required.')
  }

  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  try {
    const existing = await payload.count({ collection: 'cms-users', overrideAccess: true })
    if (existing.totalDocs > 0) {
      payload.logger.info('Local database already has users; no accounts or passwords changed.')
      return
    }
    await payload.create({
      collection: 'cms-users',
      overrideAccess: true,
      data: {
        accountType: 'company',
        companyRoles: ['company-super-admin'],
        displayName: 'Local Docker Super Admin',
        email,
        password,
        status: 'active',
        tenants: [],
      },
    })
    payload.logger.info('Local super administrator created. No demo clients were seeded.')
  } finally {
    await payload.destroy()
  }
}

// Payload's adapter retains a monitoring connection after destroy. This CLI has
// awaited all writes and cleanup; explicitly terminate just this one-shot process.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : 'Local bootstrap failed.')
    process.exit(1)
  },
)
