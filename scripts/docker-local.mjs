import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const state = path.join(root, '.local', 'docker')
const envFile = path.join(state, '.env')
const action = process.argv[2] || 'up'
const allowed = ['up', 'start', 'stop', 'status', 'logs', 'credentials', 'check']
if (!allowed.includes(action)) {
  console.error(`Usage: node scripts/docker-local.mjs ${allowed.join('|')}`)
  process.exit(1)
}

if (!existsSync(envFile)) {
  if (!['up', 'check'].includes(action)) {
    console.error('Run node scripts/docker-local.mjs up first.')
    process.exit(1)
  }
  mkdirSync(state, { recursive: true })
  const secret = () => randomBytes(24).toString('hex')
  writeFileSync(envFile, [
    '# Local Docker development only. Do not commit or use in production.',
    `LOCAL_DB_PASSWORD=${secret()}`,
    `LOCAL_PAYLOAD_SECRET=${secret()}`,
    `LOCAL_PREVIEW_SECRET=${secret()}`,
    'LOCAL_ADMIN_EMAIL=admin@docker.dgtl.test',
    `LOCAL_ADMIN_PASSWORD=${secret()}`,
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 })
  console.log(`Generated local-only credentials in ${envFile}`)
}

if (action === 'credentials') {
  const values = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
    .filter(line => /^LOCAL_ADMIN_/.test(line)).map(line => line.split('=')))
  console.log(`Login: http://localhost:3000/admin/login\nEmail: ${values.LOCAL_ADMIN_EMAIL}\nPassword: ${values.LOCAL_ADMIN_PASSWORD}`)
  console.log('This is the initial password. If changed in the CMS, use your new password.')
  process.exit(0)
}

const dockerCandidate = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe')
  : ''
const docker = existsSync(dockerCandidate) ? dockerCandidate : 'docker'
const base = ['compose', '--env-file', envFile, '-f', path.join(root, 'deploy', 'compose.local.yml')]
const run = args => {
  const result = spawnSync(docker, args, { cwd: root, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Docker command failed (exit ${result.status}).`)
    process.exit(result.status || 1)
  }
}
run(['info', '--format', 'Docker engine: {{.ServerVersion}} ({{.OSType}})'])
run([...base, 'config', '--quiet'])
if (action === 'up') {
  run([...base, 'build', 'cms'])
  run([...base, 'up', '-d', '--wait', '--wait-timeout', '900'])
} else if (action === 'start') {
  run([...base, 'up', '-d', '--wait', '--wait-timeout', '900'])
} else if (action === 'stop') {
  run([...base, 'stop', '--timeout', '30'])
} else if (action === 'status') {
  run([...base, 'ps', '--all'])
} else if (action === 'logs') {
  run([...base, 'logs', '--tail', '100', 'cms', 'worker', 'migrate', 'bootstrap'])
}
if (['up', 'start'].includes(action)) {
  console.log('CMS: http://localhost:3000/admin/login')
  console.log('Show your local login: node scripts/docker-local.mjs credentials')
  console.log('Fresh, separate database; no existing content imported. Local test mode, not production.')
}
