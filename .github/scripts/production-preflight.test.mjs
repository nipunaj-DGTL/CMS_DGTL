import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateProductionEnvironment } from '../../apps/cms/scripts/production-preflight.mjs';

const good = () => ({
  NODE_ENV: 'production', PAYLOAD_DB_PUSH: 'false',
  CMS_PUBLIC_URL: 'https://cms.customer.com', CMS_ALLOWED_ORIGINS: 'https://customer.com',
  PAYLOAD_SECRET: 'a'.repeat(64), CMS_PREVIEW_SIGNING_SECRET: 'b'.repeat(64),
  CMS_WEBSITE_READ_TOKENS: '{}', CMS_REVALIDATION_SECRETS: '{}',
  CMS_DATABASE_URL: 'postgresql://dgtl_app:credential@postgres:5432/dgtl_cms',
  CMS_MEDIA_STORAGE: 's3', CMS_MEDIA_ENDPOINT: 'https://objects.customer.com',
  CMS_MEDIA_BUCKET: 'customer-media', CMS_MEDIA_ACCESS_KEY_ID: 'storage-key', CMS_MEDIA_SECRET_ACCESS_KEY: 'storage-secret',
  CMS_MEDIA_SCAN_MODE: 'clamav', CLAMAV_HOST: 'clamav', CMS_EMAIL_PROVIDER: 'resend',
  CMS_EMAIL_FROM_ADDRESS: 'cms@customer.com', CMS_EMAIL_FROM_NAME: 'Customer CMS', RESEND_API_KEY: 'email-key',
});

test('empty CMS-only onboarding maps are valid', () => assert.deepEqual(validateProductionEnvironment(good()), []));
test('rejects empty/default environments', () => assert.ok(validateProductionEnvironment({}).length > 10));
for (const [key, value] of Object.entries({
  NODE_ENV: 'development', PAYLOAD_DB_PUSH: 'true', PAYLOAD_DROP_DATABASE: 'true',
  CMS_LOCAL_DOCKER: 'true', NODE_TLS_REJECT_UNAUTHORIZED: '0',
  CMS_PUBLIC_URL: 'http://localhost:3000', CMS_ALLOWED_ORIGINS: '*',
  CMS_MEDIA_STORAGE: 'local', CMS_MEDIA_SCAN_MODE: 'basic', CMS_EMAIL_PROVIDER: 'console',
  RESEND_API_KEY: 'replace-me', CMS_MEDIA_ENDPOINT: 'http://storage:9000',
})) {
  test(`rejects unsafe ${key}`, () => assert.ok(validateProductionEnvironment({ ...good(), [key]: value }).some(error => error.includes(key))));
}
test('binds configured origin to the release origin', () => assert.ok(validateProductionEnvironment(good(), { expectedOrigin: 'https://different.customer.com' }).some(error => error.includes('CMS_ORIGIN'))));
test('rejects JSON arrays and missing token map', () => {
  assert.ok(validateProductionEnvironment({ ...good(), CMS_WEBSITE_READ_TOKENS: '[]' }).length);
  assert.ok(validateProductionEnvironment({ ...good(), CMS_REVALIDATION_SECRETS: undefined }).length);
});
test('requires both connection maps and distinct credentials', () => {
  const env = { ...good(), CMS_WEBSITE_READ_TOKENS: JSON.stringify({ 'client-03': 'c'.repeat(64) }) };
  assert.ok(validateProductionEnvironment(env).some(error => error.includes('same website keys')));
  env.CMS_REVALIDATION_SECRETS = JSON.stringify({ 'client-03': 'c'.repeat(64) });
  assert.ok(validateProductionEnvironment(env).some(error => error.includes('reuse')));
  env.CMS_REVALIDATION_SECRETS = JSON.stringify({ 'client-03': 'd'.repeat(64) });
  assert.deepEqual(validateProductionEnvironment(env), []);
});
test('rejects superuser/migrator runtime credentials', () => {
  const env = { ...good(), CMS_DATABASE_URL: 'postgresql://dgtl_migrator:credential@postgres:5432/dgtl_cms' };
  assert.ok(validateProductionEnvironment(env).length);
  assert.deepEqual(validateProductionEnvironment(env, { role: 'migration' }), []);
});
test('never echoes invalid secrets or malformed URL credentials', () => {
  const sensitive = 'PRIVATE_VALUE_DO_NOT_PRINT';
  const errors = validateProductionEnvironment({ ...good(), CMS_DATABASE_URL: sensitive, CMS_WEBSITE_READ_TOKENS: JSON.stringify({ [sensitive]: sensitive }) });
  assert.ok(errors.length);
  assert.ok(!JSON.stringify(errors).includes(sensitive));
});
test('deployment preflight occurs before the maintenance boundary', () => {
  const deploy = readFileSync(new URL('../../deploy/scripts/deploy.sh', import.meta.url), 'utf8');
  assert.ok(deploy.includes('production-preflight.mjs'));
  assert.ok(deploy.indexOf('production-preflight.mjs') < deploy.indexOf('incumbent_cms_running_ids='));
});
