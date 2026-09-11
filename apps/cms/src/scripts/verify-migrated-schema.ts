import 'dotenv/config'

import { getPayload, type CollectionSlug } from 'payload'

import config from '../payload.config'

if (process.env.NODE_ENV !== 'production' || process.env.PAYLOAD_DB_PUSH !== 'false') {
  throw new Error('Schema verification requires NODE_ENV=production and PAYLOAD_DB_PUSH=false.')
}

const payload = await getPayload({ config })

try {
  let collections = 0
  let versionedCollections = 0
  for (const collection of payload.config.collections) {
    // Read-only, depth-zero queries still cause PostgreSQL to validate every
    // selected field/join, including production-only authentication columns.
    const slug = collection.slug as CollectionSlug
    await payload.find({ collection: slug, depth: 0, limit: 1, overrideAccess: true })
    collections += 1
    if (collection.versions) {
      await payload.findVersions({ collection: slug, depth: 0, limit: 1, overrideAccess: true })
      versionedCollections += 1
    }
  }
  console.log(`Migration schema probe passed: ${collections} collections, ${versionedCollections} versioned collections.`)
} catch (error) {
  console.error('Migration schema probe failed:', error)
  process.exit(1)
}

// Like Payload's own migration CLI, exit only after all operations have been
// awaited. Payload 3.88 reserves a PostgreSQL monitoring connection; waiting
// for pool shutdown here can hang an otherwise finished one-shot process.
// This read-only command has no background writes to drain.
process.exit(0)
