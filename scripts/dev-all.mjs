import { spawn } from 'node:child_process'

const isWindows = process.platform === 'win32'
const services = [
  { args: ['--filter', '@dgtl/cms', 'dev'], name: 'CMS' },
  { args: ['--filter', '@dgtl/website', 'dev'], name: 'website' },
  { args: ['--filter', '@dgtl/dgtl360', 'dev'], name: 'DGTL360' },
  { args: ['--filter', '@dgtl/cms', 'worker'], name: 'worker' },
]

let stopping = false

const children = services.map(({ args, name }) => {
  const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
  const commandArgs = isWindows ? ['/d', '/s', '/c', `pnpm ${args.join(' ')}`] : args
  const child = spawn(command, commandArgs, {
    env: process.env,
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    console.error(`[dev:all] ${name} failed to start:`, error)
  })

  child.on('exit', (code, signal) => {
    if (stopping) return
    console.error(`[dev:all] ${name} stopped (${signal ?? `exit ${code ?? 1}`}). Stopping the other services.`)
    stop(code ?? 1)
  })

  return child
})

function stop(exitCode) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(exitCode), 500).unref()
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
