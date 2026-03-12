// Simple Express server for API endpoints
// Run with: node server.js
// Or use: npm run server

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile(relativePath) {
  try {
    const fullPath = path.join(__dirname, relativePath)
    if (!fs.existsSync(fullPath)) return
    const raw = fs.readFileSync(fullPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx <= 0) continue

      const key = trimmed.slice(0, eqIdx).trim()
      let value = trimmed.slice(eqIdx + 1).trim()
      if (!key) continue
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)

      // Do not overwrite env vars already set by the process manager
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  } catch {
    // ignore
  }
}

// Load local env for the API server (optional).
// Preferred: .env.server (ignored by git). Fallback: .env
loadEnvFile('.env.server')
loadEnvFile('.env')

const app = express()
const PORT = process.env.PORT || 3001

const GHOST_URL = (process.env.GHOST_URL || process.env.VITE_GHOST_URL || 'https://catsky.club').replace(/\/+$/, '')
const GHOST_INTERNAL_URL = (process.env.GHOST_INTERNAL_URL || 'http://127.0.0.1:2368').replace(/\/+$/, '')
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY || ''
const GHOST_ADMIN_API_VERSION = process.env.GHOST_ADMIN_API_VERSION || 'v5.0'
const SIGNUPS_API_TOKEN = process.env.SIGNUPS_API_TOKEN || ''

app.use(cors())
app.use(express.json())

function getRequestOrigin(req) {
  const protoHeader = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim()
  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim()
  if (!hostHeader) return ''
  const protocol = protoHeader || 'http'
  return `${protocol}://${hostHeader}`.replace(/\/+$/, '')
}

function mapGhostLocationHeader(value, req) {
  if (!value || typeof value !== 'string') return value
  const normalized = value.trim()
  if (!normalized) return value

  const requestOrigin = getRequestOrigin(req)
  const ghostInternal = GHOST_INTERNAL_URL
  const ghostPublic = GHOST_URL

  const rewriteBase = requestOrigin || ghostPublic

  try {
    const parsed = new URL(normalized)
    const localhostHosts = new Set(['127.0.0.1', 'localhost'])
    const internalHost = new URL(ghostInternal).host
    const isInternalHost = parsed.host === internalHost || localhostHosts.has(parsed.hostname)

    if (isInternalHost) {
      return `${rewriteBase}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Preserve any relative or non-standard location as-is
  }

  if (normalized.startsWith(ghostInternal)) {
    return `${rewriteBase}${normalized.slice(ghostInternal.length)}`
  }

  return value
}

async function proxyUnsubscribeToGhost(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const targetPath = req.path === '/unsubscribe' ? '/unsubscribe/' : req.path
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const targetUrl = `${GHOST_INTERNAL_URL}${targetPath}${qs}`

  try {
    const ghostRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: req.headers.accept || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en',
        'User-Agent': req.headers['user-agent'] || 'catsky-server',
      },
      redirect: 'manual',
    })

    res.status(ghostRes.status)

    for (const [name, value] of ghostRes.headers.entries()) {
      if (name.toLowerCase() === 'location') {
        res.setHeader(name, mapGhostLocationHeader(value, req))
      } else {
        res.setHeader(name, value)
      }
    }

    if (req.method === 'HEAD') return res.end()

    const body = Buffer.from(await ghostRes.arrayBuffer())
    return res.send(body)
  } catch (error) {
    return res.status(502).json({
      error: 'Ghost unsubscribe upstream error',
      details: String(error?.message || error),
    })
  }
}

function renderUnsubscribeConfirmationPage(res, { success }) {
  const title = success ? 'You are unsubscribed' : 'Unable to confirm unsubscribe'
  const message = success
    ? 'You have been unsubscribed from this newsletter. You can resubscribe any time from your account settings.'
    : 'We could not confirm your unsubscribe request right now. Please try the link again in a moment, or contact support if the problem continues.'

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #070709;
        color: #f5f5f5;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      main {
        width: min(560px, calc(100vw - 3rem));
        border: 1px solid #2b2b33;
        border-radius: 14px;
        background: #111117;
        padding: 1.5rem;
      }
      h1 { margin: 0 0 0.8rem; font-size: 1.4rem; }
      p { margin: 0; line-height: 1.55; color: #d8d8df; }
      a {
        display: inline-block;
        margin-top: 1.15rem;
        color: #111117;
        background: #e6e6f2;
        text-decoration: none;
        border-radius: 8px;
        padding: 0.55rem 0.9rem;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="/">Back to catsky.club</a>
    </main>
  </body>
</html>`

  return res
    .status(success ? 200 : 502)
    .setHeader('Cache-Control', 'no-store')
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(html)
}

async function unsubscribeAndConfirm(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const uuid = typeof req.query.uuid === 'string' ? req.query.uuid.trim() : ''
  const key = typeof req.query.key === 'string' ? req.query.key.trim() : ''
  const newsletter = typeof req.query.newsletter === 'string' ? req.query.newsletter.trim() : ''

  // Non-token requests (e.g. /unsubscribe/success) should continue to proxy.
  if (!uuid || !key || !newsletter) {
    return proxyUnsubscribeToGhost(req, res)
  }

  const targetUrl = `${GHOST_INTERNAL_URL}/unsubscribe/?${new URLSearchParams({ uuid, key, newsletter }).toString()}`

  try {
    const ghostRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: req.headers.accept || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en',
        'User-Agent': req.headers['user-agent'] || 'catsky-server',
      },
      redirect: 'follow',
    })

    return renderUnsubscribeConfirmationPage(res, { success: ghostRes.status < 500 })
  } catch {
    return renderUnsubscribeConfirmationPage(res, { success: false })
  }
}

app.get('/unsubscribe', unsubscribeAndConfirm)
app.get('/unsubscribe/*', proxyUnsubscribeToGhost)
app.head('/unsubscribe', proxyUnsubscribeToGhost)
app.head('/unsubscribe/*', proxyUnsubscribeToGhost)

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8')
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function createGhostAdminToken() {
  if (!GHOST_ADMIN_API_KEY || !GHOST_ADMIN_API_KEY.includes(':')) {
    throw new Error('Missing GHOST_ADMIN_API_KEY')
  }

  const [id, secretHex] = GHOST_ADMIN_API_KEY.split(':', 2)
  const secret = Buffer.from(secretHex, 'hex')

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 5 * 60 // 5 minutes

  const header = { alg: 'HS256', typ: 'JWT', kid: id }
  const payload = { iat, exp, aud: '/admin/' }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest()
  return `${unsigned}.${base64url(signature)}`
}

async function ghostAdminFetch(pathnameWithQuery, init = {}) {
  const token = createGhostAdminToken()
  const url = new URL(`/ghost/api/admin/${pathnameWithQuery.replace(/^\/+/, '')}`, GHOST_URL).toString()

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Version': GHOST_ADMIN_API_VERSION,
    Authorization: `Ghost ${token}`,
    ...(init.headers || {}),
  }

  // Node fetch requires plain object headers
  return await fetch(url, { ...init, headers })
}

async function findMemberByEmail(email) {
  const filter = `email:'${email.replace(/'/g, "\\'")}'`
  const qs = new URLSearchParams({ filter, limit: '1' })
  const res = await ghostAdminFetch(`members/?${qs.toString()}`, { method: 'GET' })
  if (!res.ok) return null
  const data = await res.json()
  const members = data && data.members
  if (Array.isArray(members) && members.length > 0) return members[0]
  return null
}

function composeMemberName(firstName, lastName) {
  return lastName ? `${firstName} ${lastName}` : firstName
}

function mergeNameNote(currentNote, firstName, lastName) {
  const lines = []
  if (typeof currentNote === 'string' && currentNote.trim()) {
    lines.push(currentNote.trim())
  }
  lines.push(`first_name:${firstName}`)
  if (lastName) lines.push(`last_name:${lastName}`)
  return lines.join('\n')
}

// Serve static files from dist (production build) and public (additional assets)
// Order matters: dist first (built assets), then public (audio, docs, etc.)
app.use(express.static(path.join(__dirname, 'dist'), { 
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types are set
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml')
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript')
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css')
    }
  }
}))
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types are set
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml')
    }
  }
}))

app.post('/api/member-profile', async (req, res) => {
  const memberId = typeof req.body?.memberId === 'string' ? req.body.memberId.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : ''
  const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : ''

  if (!memberId || !email || !firstName) {
    return res.status(400).json({ error: 'memberId, email, and firstName are required.' })
  }

  if (!GHOST_ADMIN_API_KEY) {
    return res.status(500).json({ error: 'Ghost Admin API is not configured (missing GHOST_ADMIN_API_KEY)' })
  }

  try {
    const memberRes = await ghostAdminFetch(`members/${memberId}/?include=subscriptions`, { method: 'GET' })
    const payload = await memberRes.json().catch(() => null)
    const fetchedMember = Array.isArray(payload?.members) ? payload.members[0] : null

    if (!memberRes.ok || !fetchedMember) {
      return res.status(404).json({ error: 'Member not found.' })
    }

    const fetchedEmail = typeof fetchedMember.email === 'string' ? fetchedMember.email.trim().toLowerCase() : ''
    if (fetchedEmail !== email) {
      return res.status(403).json({ error: 'Member identity mismatch.' })
    }

    const updateRes = await ghostAdminFetch(`members/${memberId}/`, {
      method: 'PUT',
      body: JSON.stringify({
        members: [
          {
            id: memberId,
            email: fetchedMember.email,
            name: composeMemberName(firstName, lastName),
            note: mergeNameNote(fetchedMember.note, firstName, lastName),
          },
        ],
      }),
    })

    const updatePayload = await updateRes.json().catch(() => null)
    if (!updateRes.ok) {
      return res.status(updateRes.status).json({ error: 'Failed to update member profile.', details: updatePayload })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[Member profile update failed]', error)
    return res.status(500).json({ error: 'Failed to update member profile.' })
  }
})


// API endpoint for form submissions
app.post('/api/submit', async (req, res) => {
  const { name, contact } = req.body
  const email = typeof contact === 'string' ? contact.trim() : ''
  const safeName = typeof name === 'string' ? name.trim() : ''

  if (!safeName) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  if (!GHOST_ADMIN_API_KEY) {
    return res.status(500).json({
      error: 'Ghost Admin API is not configured (missing GHOST_ADMIN_API_KEY)',
      hint:
        "For local dev, set env var GHOST_ADMIN_API_KEY before `npm run server`, or create a `.env.server` file next to server.js with `GHOST_ADMIN_API_KEY=...` (it is gitignored).",
    })
  }

  try {
    // Create (or reuse) a Ghost Member
    const createRes = await ghostAdminFetch('members/', {
      method: 'POST',
      body: JSON.stringify({
        members: [
          {
            name: safeName,
            email,
          },
        ],
      }),
    })

    if (createRes.ok) {
      const payload = await createRes.json()
      const created = payload && Array.isArray(payload.members) ? payload.members[0] : null
      return res.status(200).json({
        success: true,
        member: created ? { id: created.id, email: created.email, name: created.name, created_at: created.created_at } : null,
      })
    }

    // Handle "already exists" gracefully
    const errPayload = await createRes.json().catch(() => null)
    const errMessage = errPayload?.errors?.[0]?.message || createRes.statusText
    if (typeof errMessage === 'string' && errMessage.toLowerCase().includes('already exists')) {
      const existing = await findMemberByEmail(email)
      return res.status(200).json({
        success: true,
        member: existing ? { id: existing.id, email: existing.email, name: existing.name, created_at: existing.created_at } : null,
        alreadyExisted: true,
      })
    }

    // Log Ghost response in production so you can debug via pm2 logs / server logs
    console.error('[Ghost member create failed]', createRes.status, createRes.statusText, JSON.stringify(errPayload))

    return res.status(createRes.status).json({
      error: 'Failed to create member in Ghost',
      details: errPayload || { status: createRes.status, statusText: createRes.statusText },
    })
  } catch (e) {
    console.error('[Ghost signup error]', e?.message || e, { ghostUrl: GHOST_URL })
    return res.status(500).json({ error: 'Ghost signup error', details: String(e?.message || e) })
  }
})

// Protected endpoint: fetch recent signups (Ghost members)
// Provide SIGNUPS_API_TOKEN on the server and call with header: x-signups-token: <token>
app.get('/api/signups', async (req, res) => {
  if (!SIGNUPS_API_TOKEN) return res.status(404).json({ error: 'Not enabled' })
  const token = req.header('x-signups-token')
  if (!token || token !== SIGNUPS_API_TOKEN) return res.status(401).json({ error: 'Unauthorized' })
  if (!GHOST_ADMIN_API_KEY) return res.status(500).json({ error: 'Ghost Admin API is not configured' })

  const limit = Math.min(Number(req.query.limit || 50) || 50, 200)
  const qs = new URLSearchParams({ limit: String(limit), order: 'created_at desc' })

  try {
    const listRes = await ghostAdminFetch(`members/?${qs.toString()}`, { method: 'GET' })
    const payload = await listRes.json().catch(() => null)
    if (!listRes.ok) {
      return res.status(listRes.status).json({ error: 'Failed to fetch signups', details: payload })
    }
    const members = Array.isArray(payload?.members) ? payload.members : []
    return res.status(200).json({
      success: true,
      members: members.map((m) => ({ id: m.id, email: m.email, name: m.name, created_at: m.created_at })),
    })
  } catch (e) {
    return res.status(500).json({ error: 'Ghost signups fetch error', details: String(e?.message || e) })
  }
})

// Serve index.html for SPA routes (fallback for client-side routing)
// This should only catch routes that don't correspond to actual files
app.get('*', (req, res) => {
  // Check if the request is for a file with an extension
  // If it is and wasn't found by static middleware, return 404
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(req.path.split('?')[0])
  if (hasFileExtension) {
    return res.status(404).type('text/plain').send('File not found')
  }
  // Otherwise, serve index.html for SPA routing
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
