// Isolated verification only. Never point this helper at a real CMS database.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PAYLOAD_DB_PUSH: 'false',
  CMS_SSO_ENABLED: 'false',
  CMS_DATABASE_URL:
    'postgresql://postgres:sso-local-disposable-test-only@127.0.0.1:55439/dgtl_cms_sso_verification',
  CMS_PUBLIC_URL: 'http://localhost:3347',
  PAYLOAD_SECRET: 'isolated-sso-verification-not-a-production-secret',
  CMS_MEDIA_STORAGE: 's3',
  CMS_MEDIA_BUCKET: 'sso-verification-only',
  CMS_MEDIA_ENDPOINT: 'https://storage.invalid',
  CMS_MEDIA_ACCESS_KEY_ID: 'verification-only',
  CMS_MEDIA_SECRET_ACCESS_KEY: 'verification-only',
  CMS_MEDIA_SCAN_MODE: 'clamav',
  CMS_EMAIL_PROVIDER: 'resend',
  CMS_EMAIL_FROM_ADDRESS: 'test@example.test',
  CMS_EMAIL_FROM_NAME: 'Verification',
  RESEND_API_KEY: 'verification-only',
}
const commands = {
  migrate: ['node_modules/payload/bin.js', 'migrate'],
  schema: ['--import=tsx', 'src/scripts/verify-migrated-schema.ts'],
  test: ['--import=tsx', 'src/scripts/verify-sso-isolated.ts'],
  build: ['node_modules/next/dist/bin/next', 'build'],
}
const command = commands[process.argv[2]]
if (!command) throw new Error('Choose migrate, schema, test or build')
const result = spawnSync(process.execPath, command, { cwd, env, stdio: 'inherit' })
process.exit(result.status ?? 1)
