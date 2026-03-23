import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let mockGhostServer: ReturnType<typeof createServer>
let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''
let updateRequestBody = ''
let updateRequestHeaders: IncomingMessage['headers'] = {}

beforeAll(async () => {
  mockGhostServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    if (req.url.startsWith('/ghost/api/admin/members/?')) {
      const requestUrl = new URL(req.url, 'http://127.0.0.1:4556')
      const filter = requestUrl.searchParams.get('filter') || ''

      if (filter === "uuid:'member-uuid-123'") {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({
          members: [{
            id: 'member-123',
            uuid: 'member-uuid-123',
            email: 'ada@example.com',
            note: 'existing-note',
          }],
        }))
      }
    }

    if (req.url.startsWith('/ghost/api/admin/members/member-123/')) {
      if (req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({
          members: [{
            id: 'member-123',
            uuid: 'member-uuid-123',
            email: 'ada@example.com',
            note: 'existing-note',
          }],
        }))
      }

      if (req.method === 'PUT') {
        updateRequestHeaders = req.headers
        let raw = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', () => {
          updateRequestBody = raw
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ members: [{ id: 'member-123' }] }))
        })
        return
      }
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
      GHOST_URL: 'http://127.0.0.1:4556',
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

describe('member profile background updates', () => {
  test('accepts text payloads with a member uuid and forwards the captured names to Ghost', async () => {
    updateRequestBody = ''
    updateRequestHeaders = {}

    const res = await fetch(`${appBaseUrl}/api/member-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify({
        memberUuid: 'member-uuid-123',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    })

    expect(res.status).toBe(202)

    await expect.poll(() => updateRequestBody, { timeout: 15_000 }).not.toBe('')

    expect(updateRequestHeaders.cookie).toBeUndefined()

    const payload = JSON.parse(updateRequestBody)
    expect(payload.members[0]).toMatchObject({
      id: 'member-123',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      note: 'existing-note\nfirst_name:Ada\nlast_name:Lovelace',
    })
  }, 20_000)
})
