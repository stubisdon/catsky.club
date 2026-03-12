import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let mockGhostServer: ReturnType<typeof createServer>
let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''
let seenPath = ''

beforeAll(async () => {
  mockGhostServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    seenPath = req.url

    if (req.url.startsWith('/unsubscribe/')) {
      res.statusCode = 302
      res.setHeader('Location', 'http://127.0.0.1:4555/unsubscribe/success/')
      return res.end('redirect')
    }

    res.statusCode = 404
    res.end('not found')
  })

  await new Promise<void>((resolve) => {
    mockGhostServer.listen(4555, '127.0.0.1', () => resolve())
  })

  const appPort = 3051
  appBaseUrl = `http://127.0.0.1:${appPort}`

  appProcess = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(appPort),
      GHOST_INTERNAL_URL: 'http://127.0.0.1:4555',
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

afterAll(async () => {
  if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
  await new Promise<void>((resolve) => mockGhostServer.close(() => resolve()))
})

describe('unsubscribe proxy in server.js', () => {
  test('forwards /unsubscribe query to Ghost and rewrites Location header', async () => {
    const res = await fetch(`${appBaseUrl}/unsubscribe?uuid=abc&key=xyz&newsletter=n1`, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })

    expect(seenPath).toBe('/unsubscribe/?uuid=abc&key=xyz&newsletter=n1')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${appBaseUrl}/unsubscribe/success/`)
  })

  test('rewrites localhost redirects to request host for proxied production origin', async () => {
    const res = await fetch(`${appBaseUrl}/unsubscribe?uuid=abc`, {
      redirect: 'manual',
      headers: {
        Accept: 'text/html',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'catsky.club',
      },
    })

    expect(seenPath).toBe('/unsubscribe/?uuid=abc')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://catsky.club/unsubscribe/success/')
  })
})
