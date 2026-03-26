#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'

const HOST = process.env.PLAYWRIGHT_WEB_HOST || '127.0.0.1'
const PORT = Number(process.env.PLAYWRIGHT_WEB_PORT || 3000)
const BASE_URL = `http://${HOST}:${PORT}`
const OUTPUT_DIR = process.env.UI_SCREENSHOT_OUTPUT_DIR || 'artifacts/ui-journey'
const SERVER_READY_TIMEOUT_MS = Number(process.env.UI_SCREENSHOT_READY_TIMEOUT_MS || 120000)
const PLAYWRIGHT_INSTALL_CMD = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const JOURNEY_STEPS = [
  {
    file: '01-home-entry.png',
    path: '/',
    label: 'Home page entry state',
  },
  {
    file: '02-listen-state.png',
    path: '/listen',
    label: 'Listen page state',
  },
  {
    file: '03-connect-state.png',
    path: '/connect',
    label: 'Connect page state',
  },
]

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
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS
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

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  const details = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Timed out waiting for ${url}. Last error: ${details}`)
}

function terminate(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return
  }
  child.kill('SIGTERM')
}

async function shutdownServer(child) {
  if (!child || child.exitCode !== null) {
    return
  }

  terminate(child)

  await new Promise((resolve) => {
    const forceKillTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL')
      }
    }, 5000)

    child.once('exit', () => {
      clearTimeout(forceKillTimer)
      resolve()
    })
  })
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
  })
}

function isMissingBrowserExecutableError(error) {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes("Executable doesn't exist")
}

async function launchChromiumWithAutoInstall() {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!isMissingBrowserExecutableError(error)) {
      throw error
    }

    console.warn('[ui-screenshots] Chromium browser binary missing; running Playwright install for chromium and retrying.')
    await runCommand(PLAYWRIGHT_INSTALL_CMD, ['playwright', 'install', '--with-deps', 'chromium'])
    return chromium.launch({ headless: true })
  }
}

async function run() {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', HOST, '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  })

  const shutdown = () => terminate(server)
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  try {
    await waitForReadiness(`${BASE_URL}/`)

    await mkdir(OUTPUT_DIR, { recursive: true })

    const browser = await launchChromiumWithAutoInstall()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()

    await page.emulateMedia({ reducedMotion: 'reduce' })

    for (const step of JOURNEY_STEPS) {
      await page.goto(`${BASE_URL}${step.path}`, { waitUntil: 'networkidle' })
      const targetFile = path.join(OUTPUT_DIR, step.file)
      await page.screenshot({
        path: targetFile,
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
      console.log(`[ui-screenshots] Captured ${step.label}: ${targetFile}`)
    }

    await browser.close()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[ui-screenshots] Failed to capture UI journey screenshots: ${message}`)
    process.exitCode = 1
  } finally {
    await shutdownServer(server)
  }
}

run()
