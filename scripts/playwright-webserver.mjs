#!/usr/bin/env node
import { spawn } from 'node:child_process'
import http from 'node:http'

const HOST = process.env.PLAYWRIGHT_WEB_HOST || '127.0.0.1'
const PORT = Number(process.env.PLAYWRIGHT_WEB_PORT || 3000)
const READY_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_WEB_READY_TIMEOUT_MS || 120000)
const READY_INTERVAL_MS = Number(process.env.PLAYWRIGHT_WEB_READY_INTERVAL_MS || 500)
const READY_URL = `http://${HOST}:${PORT}/`
const CHECK_ONLY = process.argv.includes('--check')

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => req.destroy(new Error('request timeout')))
  })
}

async function waitForReadiness(url) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await requestOnce(url)
      if (response.statusCode >= 200 && response.statusCode < 500 && response.body.includes('<div id="root"></div>')) {
        return
      }
      lastError = new Error(`Unexpected readiness response: ${response.statusCode}`)
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS))
  }

  const details = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Timed out waiting for ${url}. Last error: ${details}`)
}

function terminate(child) {
  if (child.killed || child.exitCode !== null) {
    return
  }
  child.kill('SIGTERM')
}

async function run() {
  const child = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--', '--host', HOST, '--port', String(PORT), '--strictPort'],
    {
      stdio: 'inherit',
      env: process.env,
    },
  )

  const shutdown = () => terminate(child)
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  child.once('exit', (code, signal) => {
    if (signal) {
      process.exit(0)
    }
    if (typeof code === 'number' && code !== 0) {
      console.error(`[playwright-webserver] Vite exited early with code ${code}.`)
      process.exit(code)
    }
  })

  try {
    await waitForReadiness(READY_URL)
    console.log(`[playwright-webserver] Ready at ${READY_URL}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[playwright-webserver] ${message}`)
    terminate(child)
    process.exit(1)
  }

  if (CHECK_ONLY) {
    terminate(child)
    setTimeout(() => process.exit(0), 250)
    return
  }

  await new Promise((resolve) => child.once('exit', resolve))
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[playwright-webserver] Fatal error: ${message}`)
  process.exit(1)
})
