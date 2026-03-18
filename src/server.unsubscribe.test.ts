import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let mockGhostServer: ReturnType<typeof createServer>
let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''
let seenPath = ''
let responseMode: 'redirect' | 'ok' | 'fail' = 'redirect'
let seenHostHeader = ''
let seenForwardedHostHeader = ''
let seenForwardedProtoHeader = ''
let seenForwardedPortHeader = ''

beforeAll(async () => {
  mockGhostServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    seenPath = req.url
    seenHostHeader = String(req.headers.host || '')
    seenForwardedHostHeader = String(req.headers['x-forwarded-host'] || '')
    seenForwardedProtoHeader = String(req.headers['x-forwarded-proto'] || '')
    seenForwardedPortHeader = String(req.headers['x-forwarded-port'] || '')

    if (req.url.startsWith('/unsubscribe/')) {
      if (responseMode === 'fail') {
        res.statusCode = 500
        return res.end('ghost upstream failed')
      }

      if (responseMode === 'ok') {
        res.statusCode = 200
        return res.end('unsubscribed')
      }

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
  test('shows confirmation message after tokenized unsubscribe links', async () => {
    responseMode = 'ok'

    const res = await fetch(`${appBaseUrl}/unsubscribe?uuid=abc&key=xyz&newsletter=n1`, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })

    const html = await res.text()

    expect(seenPath).toBe('/unsubscribe/?uuid=abc&key=xyz&newsletter=n1')
    expect(seenHostHeader).toBe('catsky.club')
    expect(seenForwardedHostHeader).toBe('catsky.club')
    expect(seenForwardedProtoHeader).toBe('https')
    expect(seenForwardedPortHeader).toBe('443')
    expect(res.status).toBe(200)
    expect(html).toContain('You are unsubscribed')
    expect(html).toContain('You have been unsubscribed from this newsletter.')
  })


  test('shows confirmation message after tokenized unsubscribe links with trailing slash path', async () => {
    responseMode = 'ok'

    const res = await fetch(`${appBaseUrl}/unsubscribe/?uuid=abc&key=xyz&newsletter=n1`, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })

    const html = await res.text()

    expect(seenPath).toBe('/unsubscribe/?uuid=abc&key=xyz&newsletter=n1')
    expect(seenHostHeader).toBe('catsky.club')
    expect(res.status).toBe(200)
    expect(html).toContain('You are unsubscribed')
  })

  test('shows fallback message when Ghost unsubscribe endpoint fails', async () => {
    responseMode = 'fail'

    const res = await fetch(`${appBaseUrl}/unsubscribe?uuid=abc&key=xyz&newsletter=n1`, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })

    const html = await res.text()

    expect(res.status).toBe(502)
    expect(html).toContain('Unable to confirm unsubscribe')
  })

  test('still proxies /unsubscribe requests that do not include full token params', async () => {
    responseMode = 'redirect'

    const res = await fetch(`${appBaseUrl}/unsubscribe?uuid=abc`, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })

    expect(seenPath).toBe('/unsubscribe/?uuid=abc')
    expect(seenHostHeader).toBe('catsky.club')
    expect(seenForwardedHostHeader).toBe('catsky.club')
    expect(seenForwardedProtoHeader).toBe('https')
    expect(seenForwardedPortHeader).toBe('443')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${appBaseUrl}/unsubscribe/success/`)
  })

  test('rewrites localhost redirects to request host for proxied production origin', async () => {
    responseMode = 'redirect'

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
