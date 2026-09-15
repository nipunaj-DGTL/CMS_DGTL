// Isolated Linux-container regression test. Never connects to an existing CMS DB.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const candidate = path.join(process.env.LOCALAPPDATA || '', 'Programs/DockerDesktop/resources/bin/docker.exe');
const docker = process.platform === 'win32' && existsSync(candidate) ? candidate : 'docker';
const image = process.argv[2];
const webImage = process.argv[3];
if (!image || process.argv.length > 4) throw new Error('Usage: node scripts/test-worker-lifecycle.mjs WORKER_IMAGE [WEB_IMAGE]');
const stamp = `${Date.now()}-${randomBytes(3).toString('hex')}`;
const network = `dgtl-worker-qa-${stamp}`;
const label = `io.dgtl.worker-qa=${stamp}`;
const postgres = `${network}-postgres`;
const worker = `${network}-worker`;
const standby = `${network}-standby`;
const oneShot = `${network}-once`;
const migrate = `${network}-migrate`;
const probe = `${network}-probe`;
const web = `${network}-web`;
const containers = [];
const checks = [];
const qaRoot = path.join(root, '.qa');
mkdirSync(qaRoot, { recursive: true });
const evidence = mkdtempSync(path.join(qaRoot, 'worker-lifecycle-'));
const envFile = path.join(evidence, 'runtime.env');
const password = randomBytes(32).toString('hex');
const env = {
  NODE_ENV: 'production', PAYLOAD_DB_PUSH: 'false',
  CMS_DATABASE_URL: `postgresql://qa:${password}@${postgres}:5432/dgtl_worker_lifecycle_qa`,
  CMS_PUBLIC_URL: 'http://localhost:3000', PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  CMS_PREVIEW_SIGNING_SECRET: randomBytes(32).toString('hex'),
  CMS_WEBSITE_READ_TOKENS: '{}', CMS_REVALIDATION_SECRETS: '{}',
  CMS_MEDIA_STORAGE: 's3', CMS_MEDIA_BUCKET: 'qa-placeholder', CMS_MEDIA_ENDPOINT: 'http://127.0.0.1:9000',
  CMS_MEDIA_ACCESS_KEY_ID: 'qa-placeholder', CMS_MEDIA_SECRET_ACCESS_KEY: 'qa-placeholder',
  CMS_MEDIA_SCAN_MODE: 'clamav', CLAMAV_HOST: '127.0.0.1',
  CMS_EMAIL_PROVIDER: 'resend', CMS_EMAIL_FROM_ADDRESS: 'cms@example.test', CMS_EMAIL_FROM_NAME: 'QA', RESEND_API_KEY: 'qa-placeholder',
  POSTGRES_USER: 'qa', POSTGRES_PASSWORD: password, POSTGRES_DB: 'dgtl_worker_lifecycle_qa',
};
// Config import placeholders deliberately do not test external providers.
writeFileSync(envFile, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n'), { mode: 0o600, flag: 'wx' });
const redact = text => [password, env.PAYLOAD_SECRET, env.CMS_PREVIEW_SIGNING_SECRET].reduce((value, secret) => value.replaceAll(secret, '[REDACTED]'), text);
const run = (args, { allowFailure = false, timeout = 120_000 } = {}) => {
  const result = spawnSync(docker, args, { encoding: 'utf8', timeout, windowsHide: true });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(redact(result.stderr || result.error?.message || `Docker command failed with ${result.status}`));
  }
  return result;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const mark = message => { checks.push(message); console.log(`PASS: ${message}`); };
const launch = (name, command = [], extra = [], containerImage = image) => {
  containers.push(name);
  return run(['run', '-d', '--name', name, '--label', label, '--network', network, '--env-file', envFile,
    '--security-opt', 'no-new-privileges:true', '--cap-drop', 'ALL', ...extra, containerImage, ...command]);
};
const health = async (name, expected = 200, url = 'http://127.0.0.1:3001/health') => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = run(['exec', name, 'node', '-e', `fetch(${JSON.stringify(url)}).then(r=>process.exit(r.status===${expected}?0:1)).catch(()=>process.exit(1))`], { allowFailure: true, timeout: 8_000 });
    if (result.status === 0) return;
    await pause(1000);
  }
  throw new Error(`Worker ${name} did not reach expected HTTP ${expected}`);
};
const completed = name => {
  const result = run(['wait', name], { timeout: 120_000 });
  assert.equal(result.stdout.trim(), '0', `${name} exit code`);
};
const cleanStop = (name, { nextServer = false } = {}) => {
  const cleanupCount = () => {
    const logs = run(['logs', name]);
    return `${logs.stdout}${logs.stderr}`.split('start-server process cleanup finished').length - 1;
  };
  const previousCleanups = nextServer ? cleanupCount() : 0;
  run(['stop', '--time', '30', name], { timeout: 40_000 });
  const state = JSON.parse(run(['inspect', '--format', '{{json .State}}', name]).stdout);
  // Next 16.3.4 deliberately exits 143 AFTER draining on SIGTERM. Do not
  // accept the code alone: require its cleanup-finished diagnostic as well.
  assert.equal(state.ExitCode, nextServer ? 143 : 0, `${name} must exit cleanly, not 137 or a drain timeout`);
  assert.equal(state.OOMKilled, false);
  if (nextServer) {
    assert.equal(cleanupCount(), previousCleanups + 1, 'Next must report a newly completed cleanup, not a previous restart log');
  }
};
let failed = false;
try {
  run(['network', 'create', '--label', label, network]);
  containers.push(postgres);
  run(['run', '-d', '--name', postgres, '--label', label, '--network', network, '--env-file', envFile,
    '--mount', 'type=tmpfs,destination=/var/lib/postgresql/data',
    'postgres:16-alpine@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685']);
  for (let attempt = 0; attempt < 60; attempt++) {
    if (run(['exec', postgres, 'pg_isready', '-h', '127.0.0.1', '-U', 'qa', '-d', 'dgtl_worker_lifecycle_qa'], { allowFailure: true }).status === 0) break;
    if (attempt === 59) throw new Error('QA PostgreSQL did not start');
    await pause(1000);
  }
  launch(migrate, ['./node_modules/.bin/payload', 'migrate']);
  completed(migrate);
  mark('committed migrations on isolated, disposable PostgreSQL');
  launch(probe, ['node', '--import', 'tsx', 'src/scripts/verify-migrated-schema.ts']);
  completed(probe);
  mark('production schema probe');
  launch(worker);
  await health(worker);
  mark('active production worker health');
  launch(standby);
  await health(standby, 503);
  // A 503 alone could be cold startup; require evidence of the advisory lock.
  let sawStandby = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (run(['logs', standby]).stdout.includes('waiting as a standby')) { sawStandby = true; break; }
    await pause(1000);
  }
  assert.ok(sawStandby, 'second worker must explicitly become a standby');
  cleanStop(standby);
  mark('standby worker SIGTERM exits 0');
  cleanStop(worker);
  mark('active worker SIGTERM exits 0');
  launch(oneShot, ['node', '--import', 'tsx', 'src/worker.ts', '--once']);
  completed(oneShot);
  mark('one-shot worker releases process and exits 0');
  run(['start', worker]);
  await health(worker);
  cleanStop(worker);
  mark('worker restart reacquires lock, becomes healthy, and stops cleanly');
  if (webImage) {
    launch(web, [], ['--env', 'DEBUG=next:start-server'], webImage);
    await health(web, 200, 'http://127.0.0.1:3000/api/health');
    await health(web, 200, 'http://127.0.0.1:3000/admin/login');
    mark('standalone production web health and admin-entry HTTP 200 (redirects followed)');
    cleanStop(web, { nextServer: true });
    mark('production web SIGTERM exits 143 with Next cleanup-completed diagnostic');
    run(['start', web]);
    await health(web, 200, 'http://127.0.0.1:3000/api/health');
    await health(web, 200, 'http://127.0.0.1:3000/admin/login');
    cleanStop(web, { nextServer: true });
    mark('production web restart and second clean shutdown');
  }
} catch (error) {
  failed = true;
  console.error(redact(error.message));
} finally {
  for (const name of [...containers].reverse()) {
    const inspect = run(['inspect', '--format', '{{index .Config.Labels "io.dgtl.worker-qa"}}', name], { allowFailure: true });
    if (inspect.status !== 0) continue;
    if (inspect.stdout.trim() !== stamp) { failed = true; console.error(`Refusing cleanup: ownership mismatch for ${name}`); continue; }
    const logs = run(['logs', name], { allowFailure: true });
    writeFileSync(path.join(evidence, `${name.slice(network.length + 1)}.log`), redact(`${logs.stdout || ''}\n${logs.stderr || ''}`));
    if (run(['rm', '--force', '--volumes', name], { allowFailure: true }).status !== 0) failed = true;
  }
  const ownership = run(['network', 'inspect', '--format', '{{index .Labels "io.dgtl.worker-qa"}}', network], { allowFailure: true });
  if (ownership.status === 0 && ownership.stdout.trim() === stamp) {
    if (run(['network', 'rm', network], { allowFailure: true }).status !== 0) failed = true;
  }
  rmSync(envFile); // Only this run's ephemeral credentials, not any existing .env.
  writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ image, webImage, passed: !failed, checks, limits: ['No media/email/antivirus connectivity', 'No in-flight customer publish or web UI tested'] }, null, 2));
  console.log(`Evidence: ${evidence}`);
}
process.exitCode = failed ? 1 : 0;
