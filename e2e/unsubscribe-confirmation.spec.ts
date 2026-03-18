import { test, expect } from '@playwright/test'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let mockGhostServer: ReturnType<typeof createServer>
let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''

test.beforeAll(async () => {
  mockGhostServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    if (req.url.startsWith('/unsubscribe/')) {
      if (req.headers.host !== 'catsky.club' || req.headers['x-forwarded-host'] !== 'catsky.club' || req.headers['x-forwarded-proto'] !== 'https') {
        res.statusCode = 500
        return res.end('missing public host headers')
      }

      res.statusCode = 200
      return res.end('unsubscribed')
    }

    res.statusCode = 404
    res.end('not found')
  })

  await new Promise<void>((resolve) => {
    mockGhostServer.listen(4556, '127.0.0.1', () => resolve())
  })

  const appPort = 3052
  appBaseUrl = `http://127.0.0.1:${appPort}`

  appProcess = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(appPort),
      GHOST_INTERNAL_URL: 'http://127.0.0.1:4556',
      GHOST_URL: 'https://catsky.club',
    },
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
})

test.afterAll(async () => {
  if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
  await new Promise<void>((resolve) => mockGhostServer.close(() => resolve()))
})

test('shows a confirmation page for tokenized unsubscribe links', async ({ page }) => {
  await page.goto(`${appBaseUrl}/unsubscribe?uuid=abc&key=xyz&newsletter=n1`)

  await expect(page.getByRole('heading', { name: 'You are unsubscribed' })).toBeVisible()
  await expect(page.getByText('You have been unsubscribed from this newsletter.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to catsky.club' })).toBeVisible()
})
