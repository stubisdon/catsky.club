import { spawn } from 'node:child_process'

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(label, args) {
  const child = spawn(npmCmd, args, { stdio: 'inherit' })
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`)
    } else {
      console.log(`[${label}] exited with code ${code ?? 0}`)
    }
  })
  return child
}

const server = run('server', ['run', 'server'])
const dev = run('dev', ['run', 'dev'])

function shutdown(code = 0) {
  if (!server.killed) server.kill('SIGTERM')
  if (!dev.killed) dev.kill('SIGTERM')
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

// If either process exits unexpectedly, stop the other.
server.on('exit', () => shutdown(1))
dev.on('exit', () => shutdown(1))

