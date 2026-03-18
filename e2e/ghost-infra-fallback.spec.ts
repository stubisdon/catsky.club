import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let mockGhostServer: ReturnType<typeof createServer>
let appProcess: ChildProcessWithoutNullStreams
let appBaseUrl = ''
const publicHost = 'catsky.club'

function hasPublicProxyHeaders(req: IncomingMessage) {
  return (
    req.headers.host === publicHost
    && req.headers['x-forwarded-host'] === publicHost
    && req.headers['x-forwarded-proto'] === 'https'
    && req.headers['x-forwarded-port'] === '443'
  )
}

function hasPublicProxyContractInConfig(block: string) {
  return (
    block.includes('proxy_set_header X-Forwarded-Host $host;')
    && block.includes('proxy_set_header X-Forwarded-Port $server_port;')
    && block.includes('proxy_redirect http://127.0.0.1:2368/ https://$host/;')
    && block.includes('proxy_redirect http://localhost:2368/ https://$host/;')
    && block.includes('proxy_redirect http://localhost/ https://$host/;')
  )
}

test.beforeAll(async () => {
  mockGhostServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end('Missing URL')
    }

    if (req.url.startsWith('/content/images/')) {
      if (!hasPublicProxyHeaders(req)) {
        res.statusCode = 301
        res.setHeader('Location', `https://${publicHost}${req.url}`)
        return res.end('canonical redirect required')
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'image/png')
      return res.end(Buffer.from('89504e470d0a1a0a', 'hex'))
    }

    if (req.url.startsWith('/r/test-redirect')) {
      if (!hasPublicProxyHeaders(req)) {
        res.statusCode = 301
        res.setHeader('Location', `https://${publicHost}${req.url}`)
        return res.end('canonical redirect required')
      }

      res.statusCode = 302
      res.setHeader('Location', 'http://127.0.0.1:4557/welcome')
      return res.end('redirect')
    }

    if (req.url.startsWith('/welcome')) {
      res.statusCode = 200
      return res.end('ok')
    }

    res.statusCode = 404
    return res.end('not found')
  })

  await new Promise<void>((resolve) => {
    mockGhostServer.listen(4557, '127.0.0.1', () => resolve())
  })

  const appPort = 3053
  appBaseUrl = `http://127.0.0.1:${appPort}`

  appProcess = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(appPort),
      GHOST_INTERNAL_URL: 'http://127.0.0.1:4557',
      GHOST_URL: `https://${publicHost}`,
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

test('passes through Ghost image assets without canonical redirect loops', async ({ request }) => {
  const response = await request.get(`${appBaseUrl}/content/images/2023/06/catsky-club-favicon-1.png`, {
    maxRedirects: 0,
    headers: {
      'x-forwarded-host': publicHost,
      'x-forwarded-proto': 'https',
    },
  })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
})

test('rewrites Ghost redirect locations for /r routes after satisfying Ghost canonical host checks', async ({ request }) => {
  const response = await request.get(`${appBaseUrl}/r/test-redirect`, {
    maxRedirects: 0,
    headers: {
      'x-forwarded-host': publicHost,
      'x-forwarded-proto': 'https',
    },
  })
  expect(response.status()).toBe(302)
  expect(response.headers()['location']).toBe(`https://${publicHost}/welcome`)
})


const nginxGhostRouteContracts = [
  {
    file: 'catsky.club-ssl.conf',
    routes: ['/ghost/', '/ghost/api/', '/content/images/', '/r/'],
  },
  {
    file: 'nginx.conf.example',
    routes: ['/ghost/', '/ghost/api/', '/content/images/', '/r/'],
  },
  {
    file: 'nginx-ssl-update.txt',
    routes: ['/ghost/', '/ghost/api/', '/content/images/', '/r/'],
  },
]

for (const contract of nginxGhostRouteContracts) {
  test(`documents Ghost proxy contract in ${contract.file}`, async () => {
    const text = readFileSync(contract.file, 'utf8')

    for (const route of contract.routes) {
      const blockStart = text.indexOf(`location ${route}`)
      expect(blockStart, `${contract.file} should define ${route}`).toBeGreaterThanOrEqual(0)

      const blockEnd = text.indexOf('}', blockStart)
      const block = text.slice(blockStart, blockEnd)

      expect(hasPublicProxyContractInConfig(block)).toBe(true)
    }
  })
}
