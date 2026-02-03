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
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY || ''
const GHOST_ADMIN_API_VERSION = process.env.GHOST_ADMIN_API_VERSION || 'v5.0'
const SIGNUPS_API_TOKEN = process.env.SIGNUPS_API_TOKEN || ''

app.use(cors())
app.use(express.json())

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
            subscribed: true,
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
    console.error('[Ghost member create failed]', {
      status: createRes.status,
      statusText: createRes.statusText,
      ghostUrl: GHOST_URL,
      body: errPayload,
    })

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

