import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''

beforeAll(async () => {
  const appPort = 3053
  appBaseUrl = `http://127.0.0.1:${appPort}`
  appProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(appPort) },
    stdio: 'pipe',
  })

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for server startup')), 15_000)
    appProcess.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Server running on')) {
        clearTimeout(timeout)
        resolve()
      }
    })
    appProcess.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`server.js exited during startup with code ${code}`))
    })
  })
}, 20_000)

afterAll(() => {
  if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
})

describe('SPA cache headers', () => {
  test('revalidates the root HTML document', async () => {
    const response = await fetch(`${appBaseUrl}/`)
    const cacheControl = response.headers.get('cache-control') || ''

    expect(cacheControl).toContain('no-cache')
    expect(cacheControl).not.toContain('max-age=31536000')
  })

  test('keeps content-hashed bundles long cached', async () => {
    const assetName = readdirSync(join(process.cwd(), 'dist', 'assets')).find((file) => file.endsWith('.js'))
    expect(assetName).toBeTruthy()

    const response = await fetch(`${appBaseUrl}/assets/${assetName}`)
    expect(response.headers.get('cache-control')).toContain('max-age=31536000')
  })

  test('revalidates HTML served through the SPA fallback', async () => {
    const response = await fetch(`${appBaseUrl}/welcome`)
    const cacheControl = response.headers.get('cache-control') || ''

    expect(cacheControl).toContain('no-cache')
    expect(cacheControl).not.toContain('max-age=31536000')
  })
})
