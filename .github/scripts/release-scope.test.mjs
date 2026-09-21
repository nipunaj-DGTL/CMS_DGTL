import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const matrix = scope => spawnSync(process.execPath, ['.github/scripts/release-matrix.mjs'], {
  cwd: root, encoding: 'utf8', env: { ...process.env, DEPLOYMENT_SCOPE: scope },
});

test('CMS-only release builds exactly web, worker and migrator', () => {
  const result = matrix('cms-only');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout.trim().slice('matrix='.length)).include.map(row => row.name), ['cms-web', 'cms-worker', 'cms-migrate']);
});

test('full-stack explicitly includes both existing demos', () => {
  const result = matrix('full-stack');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout.trim().slice('matrix='.length)).include.length, 5);
});

test('unknown scope is rejected rather than producing an incomplete release', () => {
  assert.notEqual(matrix('cms').status, 0);
});

test('base Compose and Caddy contain no demo hosting dependencies', () => {
  assert.doesNotMatch(read('deploy/compose.prod.yml'), /client01|dgtl360|CLIENT01|DGTL360/);
  assert.doesNotMatch(read('deploy/Caddyfile'), /client01|dgtl360|CLIENT01|DGTL360/);
  assert.match(read('deploy/compose.demos.yml'), /client01:/);
  assert.match(read('deploy/compose.demos.yml'), /dgtl360:/);
});

test('default production and staging manifests are CMS-only', () => {
  assert.match(read('deploy/release.env.example'), /^DEPLOYMENT_SCOPE=cms-only$/m);
  assert.match(read('deploy/release.staging.env.example'), /^DEPLOYMENT_SCOPE=cms-only$/m);
  assert.match(read('deploy/release.staging.env.example'), /^IMAGE_BUILD_VARIANT=staging$/m);
});

test('image signatures bind scope and deployment verifies it', () => {
  const build = read('.github/workflows/images.yml');
  const deploy = read('.github/workflows/deploy.yml');
  assert.match(build, /deploymentScope: \$deploymentScope/);
  assert.match(deploy, /\(\.predicate.deploymentScope \/\/ "full-stack"\) == \$deploymentScope/);
  assert.match(deploy, /application_image_keys/);
  assert.match(deploy, /cosign verify-attestation/);
});

test('topology changes are explicitly guarded in deploy and rollback', () => {
  assert.match(read('deploy/scripts/deploy.sh'), /current_scope.*DEPLOYMENT_SCOPE full-stack/);
  assert.match(read('deploy/scripts/rollback.sh'), /require_unchanged_active_setting DEPLOYMENT_SCOPE full-stack/);
});

test('demo rollout and smoke tests are conditional', () => {
  for (const file of ['deploy.sh', 'rollback.sh']) {
    assert.match(read(`deploy/scripts/${file}`), /if demos_enabled; then\n  "\$\{COMPOSE\[@\]\}" up -d --no-deps client01 dgtl360/);
  }
  assert.match(read('deploy/scripts/smoke.sh'), /if demos_enabled; then\ncheck_json "\$\{CLIENT01_ORIGIN/);
});

test('CMS Docker context excludes local tools, credentials and demo source', () => {
  const contents = read('apps/cms/Dockerfile.dockerignore');
  assert.match(contents, /^\*\*$/m);
  assert.match(contents, /^!apps\/cms\/\*\*$/m);
  assert.doesNotMatch(contents, /^!apps\/(dgtl360|website)\/\*\*$/m);
  assert.match(contents, /^\*\*\/\.env\.\*$/m);
  assert.match(contents, /^\*\*\/node_modules$/m);
});
