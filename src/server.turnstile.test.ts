import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

// Adversarial tests for the shared `enforceTurnstile` gate in server.js.
// Two independent app instances are spawned because fail-open vs fail-closed behavior is
// decided by TURNSTILE_SECRET_KEY at process startup (module-level const), so it cannot be
// toggled between tests without restarting the process.
//
// Ports used here (must not collide with other *.test.ts files, which use 3052/4555/4556):
//   Config A (fail open): app 3053, mock Ghost 4557
//   Config B (fail closed): app 3054, mock Ghost 4558, mock siteverify 4559

const GHOST_ADMIN_API_KEY = '1234567890abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

interface MagicLinkCall {
  headers: IncomingMessage['headers']
  bodyRaw: string
}

interface PutCall {
  bodyRaw: string
}

interface MockGhost {
  server: ReturnType<typeof createServer>
  magicLinkCalls: MagicLinkCall[]
  putCalls: PutCall[]
}

function createMockGhostServer(): MockGhost {
  const magicLinkCalls: MagicLinkCall[] = []
  const putCalls: PutCall[] = []

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      const url = req.url as string

      if (req.method === 'POST' && url.startsWith('/members/api/send-magic-link/')) {
        magicLinkCalls.push({ headers: req.headers, bodyRaw: raw })
        res.statusCode = 201
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: true }))
      }

      if (url.startsWith('/ghost/api/admin/members/?')) {
        const requestUrl = new URL(url, 'http://127.0.0.1')
        const filter = requestUrl.searchParams.get('filter') || ''

        if (filter.includes('member-uuid-999') || filter.includes('member999@example.com')) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({
            members: [{ id: 'member-999', uuid: 'member-uuid-999', email: 'member999@example.com', note: '' }],
          }))
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ members: [] }))
      }

      if (url.startsWith('/ghost/api/admin/members/member-999/')) {
        if (req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({
            members: [{ id: 'member-999', uuid: 'member-uuid-999', email: 'member999@example.com', note: '' }],
          }))
        }

        if (req.method === 'PUT') {
          putCalls.push({ bodyRaw: raw })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ members: [{ id: 'member-999' }] }))
        }
      }

      res.statusCode = 404
      res.end('not found')
    })
  })

  return { server, magicLinkCalls, putCalls }
}

interface SiteverifyCall {
  response: string
}

interface MockSiteverify {
  server: ReturnType<typeof createServer>
  calls: SiteverifyCall[]
}

// Success is decided purely by the `response` form field, mirroring Cloudflare's siteverify
// contract: 'good-token' passes; anything else fails; two special tokens simulate transport-
// level failure modes so we can assert what enforceTurnstile does when siteverify itself
// misbehaves rather than just rejecting the token.
function createMockSiteverifyServer(): MockSiteverify {
  const calls: SiteverifyCall[] = []

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      const params = new URLSearchParams(raw)
      const response = params.get('response') || ''
      calls.push({ response })

      if (response === 'boom-token') {
        // Simulate a hard network failure (connection reset) so fetch() throws inside
        // verifyTurnstileToken, exercising the try/catch -> 502 path in enforceTurnstile.
        req.socket.destroy()
        return
      }

      if (response === 'broken-json-token') {
        // Simulate Cloudflare returning a 500 with a body that isn't valid JSON.
        // fetch() does NOT throw on a non-2xx status; only res.json() would throw, and
        // verifyTurnstileToken swallows that via `.catch(() => null)`.
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        return res.end('{not valid json')
      }

      if (response === 'good-token') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ success: true }))
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }))
    })
  })

  return { server, calls }
}

async function spawnApp(env: Record<string, string>, port: number): Promise<ChildProcessWithoutNullStreams> {
  const appProcess = spawn('node', ['server.js'], {
    env: { ...process.env, ...env, PORT: String(port) },
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

  return appProcess
}

// ---------------------------------------------------------------------------------------------
// Config A: TURNSTILE_SECRET_KEY unset -> fail OPEN
// ---------------------------------------------------------------------------------------------
describe('Turnstile gate: TURNSTILE_SECRET_KEY unset (fail open)', () => {
  const appPort = 3053
  const ghostPort = 4557
  const appBaseUrl = `http://127.0.0.1:${appPort}`

  let mockGhost: MockGhost
  let appProcess: ChildProcessWithoutNullStreams

  beforeAll(async () => {
    mockGhost = createMockGhostServer()
    await new Promise<void>((resolve) => mockGhost.server.listen(ghostPort, '127.0.0.1', () => resolve()))

    appProcess = await spawnApp({
      GHOST_INTERNAL_URL: `http://127.0.0.1:${ghostPort}`,
      GHOST_URL: `http://127.0.0.1:${ghostPort}`,
      GHOST_ADMIN_API_KEY,
      // Explicitly blank so a developer's shell env or .env.server cannot leak a real secret
      // into this "unset" configuration and silently flip it to fail-closed.
      TURNSTILE_SECRET_KEY: '',
    }, appPort)
  }, 20_000)

  afterAll(async () => {
    if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
    await new Promise<void>((resolve) => mockGhost.server.close(() => resolve()))
  })

  test('magic-link with no turnstileToken is still forwarded to Ghost and returns Ghost\'s status', async () => {
    const before = mockGhost.magicLinkCalls.length

    const res = await fetch(`${appBaseUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'open-gate@example.com' }),
    })

    expect(res.status).toBe(201)
    expect(mockGhost.magicLinkCalls.length).toBe(before + 1)
    const forwarded = JSON.parse(mockGhost.magicLinkCalls[mockGhost.magicLinkCalls.length - 1].bodyRaw)
    expect(forwarded.email).toBe('open-gate@example.com')
  }, 15_000)

  test('member-profile with a valid firstName and no token still returns 202', async () => {
    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'OpenGate' }),
    })

    expect(res.status).toBe(202)
  }, 15_000)
})

// ---------------------------------------------------------------------------------------------
// Config B: TURNSTILE_SECRET_KEY set, TURNSTILE_VERIFY_URL pointed at a local mock siteverify
// ---------------------------------------------------------------------------------------------
describe('Turnstile gate: TURNSTILE_SECRET_KEY set (fail closed)', () => {
  const appPort = 3054
  const ghostPort = 4558
  const siteverifyPort = 4559
  const appBaseUrl = `http://127.0.0.1:${appPort}`

  let mockGhost: MockGhost
  let mockSiteverify: MockSiteverify
  let appProcess: ChildProcessWithoutNullStreams

  beforeAll(async () => {
    mockGhost = createMockGhostServer()
    mockSiteverify = createMockSiteverifyServer()

    await Promise.all([
      new Promise<void>((resolve) => mockGhost.server.listen(ghostPort, '127.0.0.1', () => resolve())),
      new Promise<void>((resolve) => mockSiteverify.server.listen(siteverifyPort, '127.0.0.1', () => resolve())),
    ])

    appProcess = await spawnApp({
      GHOST_INTERNAL_URL: `http://127.0.0.1:${ghostPort}`,
      GHOST_URL: `http://127.0.0.1:${ghostPort}`,
      GHOST_ADMIN_API_KEY,
      TURNSTILE_SECRET_KEY: 'test-secret-key',
      TURNSTILE_VERIFY_URL: `http://127.0.0.1:${siteverifyPort}/siteverify`,
    }, appPort)
  }, 20_000)

  afterAll(async () => {
    if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
    await Promise.all([
      new Promise<void>((resolve) => mockGhost.server.close(() => resolve())),
      new Promise<void>((resolve) => mockSiteverify.server.close(() => resolve())),
    ])
  })

  test('magic-link with a valid token is forwarded, and turnstileToken is stripped before it reaches Ghost', async () => {
    const before = mockGhost.magicLinkCalls.length

    const res = await fetch(`${appBaseUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@example.com', turnstileToken: 'good-token' }),
    })

    expect(res.status).toBe(201)
    expect(mockGhost.magicLinkCalls.length).toBe(before + 1)

    const forwardedRaw = mockGhost.magicLinkCalls[mockGhost.magicLinkCalls.length - 1].bodyRaw
    const forwarded = JSON.parse(forwardedRaw) as Record<string, unknown>
    expect(forwarded.email).toBe('valid@example.com')
    // The leak test: turnstileToken must not survive into the payload Ghost receives.
    expect('turnstileToken' in forwarded).toBe(false)
  }, 15_000)

  test('magic-link with an invalid token is rejected with 403 and never reaches Ghost', async () => {
    const before = mockGhost.magicLinkCalls.length

    const res = await fetch(`${appBaseUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid@example.com', turnstileToken: 'bad-token' }),
    })

    expect(res.status).toBe(403)
    const payload = await res.json() as { errors?: Array<{ message?: string }> }
    expect(payload.errors?.[0]?.message).toBe('Verification failed. Please try again.')
    expect(mockGhost.magicLinkCalls.length).toBe(before)
  }, 15_000)

  test('magic-link with a completely missing turnstileToken is rejected with 403 without calling siteverify', async () => {
    const ghostBefore = mockGhost.magicLinkCalls.length
    const siteverifyBefore = mockSiteverify.calls.length

    const res = await fetch(`${appBaseUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // No turnstileToken field at all.
      body: JSON.stringify({ email: 'no-token@example.com' }),
    })

    expect(res.status).toBe(403)
    expect(mockGhost.magicLinkCalls.length).toBe(ghostBefore)
    // verifyTurnstileToken() short-circuits on `if (!token) return { ok: false, reason:
    // 'missing-token' }` before it ever calls fetch(TURNSTILE_VERIFY_URL, ...), so the mock
    // siteverify server should NOT see a request for an empty/missing token.
    expect(mockSiteverify.calls.length).toBe(siteverifyBefore)
  }, 15_000)

  test('member-profile with a valid token returns 202', async () => {
    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Grace', turnstileToken: 'good-token' }),
    })

    expect(res.status).toBe(202)
  }, 15_000)

  test('member-profile with an invalid token returns 403 and never writes the profile to Ghost', async () => {
    const putBefore = mockGhost.putCalls.length

    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Eve',
        memberUuid: 'member-uuid-999',
        email: 'member999@example.com',
        turnstileToken: 'bad-token',
      }),
    })

    expect(res.status).toBe(403)

    // The real profile write is fire-and-forget/async, so a naive immediate assertion would
    // pass even if the gate leaked and the write happened moments later. Give it a couple of
    // seconds and confirm the PUT genuinely never arrives.
    await new Promise((resolve) => setTimeout(resolve, 2_500))
    expect(mockGhost.putCalls.length).toBe(putBefore)
  }, 15_000)

  test('member-profile with no firstName and no token returns 400 without calling siteverify', async () => {
    const siteverifyBefore = mockSiteverify.calls.length

    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    // firstName validation runs before the Turnstile gate, so no Cloudflare request should be
    // wasted on garbage input.
    expect(mockSiteverify.calls.length).toBe(siteverifyBefore)
  }, 15_000)

  test('member-profile sent as text/plain (sendBeacon shape) with a valid token returns 202', async () => {
    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ firstName: 'Carol', turnstileToken: 'good-token' }),
    })

    expect(res.status).toBe(202)
  }, 15_000)

  test('siteverify returning a non-throwing 500 with unparseable JSON resolves to 403, not 502', async () => {
    // verifyTurnstileToken() does `const data = await res.json().catch(() => null)`. fetch()
    // does not throw on a 500 status; only the JSON parse fails, and that failure is
    // swallowed, yielding `data = null` and therefore `verdict.ok = false`. That takes the
    // `!verdict.ok` branch in enforceTurnstile (403), NOT the try/catch throw branch (502).
    const res = await fetch(`${appBaseUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'broken-json@example.com', turnstileToken: 'broken-json-token' }),
    })

    expect(res.status).toBe(403)
  }, 15_000)

  test('siteverify connection failure (fetch throws) resolves to 502', async () => {
    // Bonus coverage for the third claimed branch: when verifyTurnstileToken's fetch() call
    // itself throws (here: the mock destroys the socket instead of responding), enforceTurnstile
    // catches it and returns 502, distinct from the 403 used for a verified-but-rejected token.
    const res = await fetch(`${appBaseUrl}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boom@example.com', turnstileToken: 'boom-token' }),
    })

    expect(res.status).toBe(502)
  }, 15_000)
})
