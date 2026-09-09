import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { usersTenantAccessOverride } from './access/policy'
import {
  ActivityEvents,
  CmsUsers,
  ContentRequests,
  DgtlTenants,
  Media,
  Navigation,
  Pages,
  Posts,
  RevalidationDeliveries,
  SiteSettings,
  Websites,
} from './collections'
import { getMediaScanMode } from './services/malware-scan'
import { getMediaStorageConfiguration, MEDIA_COLLECTION_PREFIX } from './services/media-storage'
import { getEmailAdapter } from './services/email'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const publicURL = process.env.CMS_PUBLIC_URL ?? 'http://localhost:3000'
const allowedOrigins = (process.env.CMS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const mediaStorage = getMediaStorageConfiguration()

// Fail fast during production boot if the mandatory scanning policy is missing.
getMediaScanMode()

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: ['./admin-components/DgtlDashboard'],
      beforeNavLinks: ['./admin-components/TenantContextBanner'],
    },
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '— DGTL CMS' },
    user: CmsUsers.slug,
  },
  collections: [
    DgtlTenants,
    CmsUsers,
    Websites,
    Pages,
    Posts,
    Media,
    Navigation,
    SiteSettings,
    ContentRequests,
    ActivityEvents,
    RevalidationDeliveries,
  ],
  cookiePrefix: 'dgtl-cms',
  cors: [publicURL, ...allowedOrigins],
  csrf: [publicURL, ...allowedOrigins],
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: { connectionString: process.env.CMS_DATABASE_URL ?? process.env.DATABASE_URL ?? '' },
    push: process.env.NODE_ENV === 'development' || process.env.PAYLOAD_DB_PUSH === 'true',
  }),
  editor: lexicalEditor(),
  email: getEmailAdapter(),
  graphQL: { disable: true },
  plugins: [
    s3Storage({
      acl: 'private',
      alwaysInsertFields: true,
      bucket: mediaStorage.kind === 's3' ? mediaStorage.bucket : 'local-development',
      collections: { media: { prefix: MEDIA_COLLECTION_PREFIX } },
      config: mediaStorage.kind === 's3'
        ? {
            credentials: {
              accessKeyId: mediaStorage.accessKeyID,
              secretAccessKey: mediaStorage.secretAccessKey,
            },
            endpoint: mediaStorage.endpoint,
            forcePathStyle: mediaStorage.forcePathStyle,
            region: mediaStorage.region,
          }
        : {},
      disableLocalStorage: mediaStorage.kind === 's3',
      enabled: mediaStorage.kind === 's3',
    }),
    multiTenantPlugin({
      cleanupAfterTenantDelete: false,
      collections: {
        'activity-events': {},
        'content-requests': {},
        'revalidation-deliveries': {},
        'site-settings': {},
        media: {},
        navigation: {},
        pages: {},
        posts: {},
        websites: {},
      },
      tenantsArrayField: {
        includeDefaultField: true,
        rowFields: [
          {
            name: 'roles',
            type: 'select',
            defaultValue: ['client-admin'],
            hasMany: true,
            options: [{ label: 'Client Company Admin', value: 'client-admin' }],
            required: true,
          },
        ],
      },
      tenantsSlug: DgtlTenants.slug,
      usersAccessResultOverride: usersTenantAccessOverride,
      useUsersTenantFilter: false,
      userHasAccessToAllTenants: (user) =>
        Boolean(
          user?.accountType === 'company' &&
            user?.companyRoles?.includes('company-super-admin'),
        ),
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? '',
  serverURL: publicURL,
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  upload: { limits: { fileSize: 25_000_000 } },
})
