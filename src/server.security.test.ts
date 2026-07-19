// Regression suite for the 2026-05-23 security review (plans/2026-05-23-security-review-remediation.md, finding #1).
// These tests encode the two `server.js` bugs found: member enumeration via /api/submit,
// and profile tampering via client-supplied identity on /api/member-profile. They are
// expected to FAIL until that remediation lands, then must stay green afterward.
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

const MOCK_GHOST_PORT = 4557
const APP_PORT = 3053

let mockGhostServer: ReturnType<typeof createServer>
let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''
let victimUpdateRequestBody = ''

beforeAll(async () => {
  mockGhostServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    // Member lookups by filter (used by findMemberByEmail / findMemberByUuid)
    if (req.url.startsWith('/ghost/api/admin/members/?')) {
      const requestUrl = new URL(req.url, `http://127.0.0.1:${MOCK_GHOST_PORT}`)
      const filter = requestUrl.searchParams.get('filter') || ''

      if (filter === "email:'victim@example.com'") {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({
          members: [{ id: 'victim-1', uuid: 'victim-uuid-1', email: 'victim@example.com', note: 'victim-note' }],
        }))
      }

      if (filter === "email:'existing@example.com'") {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({
          members: [{ id: 'existing-999', email: 'existing@example.com', name: 'Existing User', created_at: '2026-01-01T00:00:00.000Z' }],
        }))
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ members: [] }))
    }

    // Member creation (POST /api/submit)
    if (req.url === '/ghost/api/admin/members/' && req.method === 'POST') {
      let raw = ''
      req.setEncoding('utf8')
      req.on('data', (chunk) => { raw += chunk })
      req.on('end', () => {
        let body: { members?: Array<{ email?: string; name?: string }> } = {}
        try { body = JSON.parse(raw) } catch { /* ignore */ }
        const email = body?.members?.[0]?.email

        if (email === 'existing@example.com') {
          res.statusCode = 422
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ errors: [{ message: 'Member already exists' }] }))
        }

        res.statusCode = 201
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({
          members: [{ id: 'new-1', email, name: body?.members?.[0]?.name, created_at: '2026-01-01T00:00:00.000Z' }],
        }))
      })
      return
    }

    // Profile update target (the "victim" member being tampered with) — updateMemberProfileInGhost
    // does a GET to confirm the fetched email before PUTting, so both must be mocked.
    if (req.url.startsWith('/ghost/api/admin/members/victim-1/')) {
      if (req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({
          members: [{ id: 'victim-1', uuid: 'victim-uuid-1', email: 'victim@example.com', note: 'victim-note' }],
        }))
      }

      if (req.method === 'PUT') {
        let raw = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', () => {
          victimUpdateRequestBody = raw
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ members: [{ id: 'victim-1' }] }))
        })
        return
      }
    }

    res.statusCode = 404
    res.end('not found')
  })

  await new Promise<void>((resolve) => {
    mockGhostServer.listen(MOCK_GHOST_PORT, '127.0.0.1', () => resolve())
  })

  appBaseUrl = `http://127.0.0.1:${APP_PORT}`

  appProcess = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      GHOST_INTERNAL_URL: `http://127.0.0.1:${MOCK_GHOST_PORT}`,
      GHOST_URL: `http://127.0.0.1:${MOCK_GHOST_PORT}`,
      GHOST_ADMIN_API_KEY: '1234567890abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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
}, 20_000)

afterAll(async () => {
  if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM')
  await new Promise<void>((resolve) => mockGhostServer.close(() => resolve()))
})

describe('POST /api/submit — member enumeration (finding #1a)', () => {
  test('does not leak an existing member id/email/name when probing an email that already exists', async () => {
    const res = await fetch(`${appBaseUrl}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Prober', contact: 'existing@example.com' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.alreadyExisted).toBe(true)
    // The "already exists" branch must not hand PII back to whoever is probing the email.
    expect(body.member).toBeUndefined()
  })
})

describe('POST /api/member-profile — profile tampering via client-supplied identity (finding #1b)', () => {
  test('does not update another member when the caller supplies their memberId + email without a valid session', async () => {
    victimUpdateRequestBody = ''

    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        memberId: 'victim-1',
        email: 'victim@example.com',
        firstName: 'Mallory',
        lastName: 'Attacker',
      }),
    })

    expect(res.status).toBe(202)

    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(victimUpdateRequestBody).toBe('')
  }, 10_000)

  test('does not update another member when the caller supplies only their email without a valid session', async () => {
    victimUpdateRequestBody = ''

    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        email: 'victim@example.com',
        firstName: 'Mallory',
        lastName: 'Attacker',
      }),
    })

    expect(res.status).toBe(202)

    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(victimUpdateRequestBody).toBe('')
  }, 10_000)
})
