// Simple Express server for API endpoints
// Run with: node server.js
// Or use: npm run server

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import https from 'https'

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

const GHOST_URL = (process.env.GHOST_URL || process.env.VITE_GHOST_URL || '').replace(/\/+$/, '')
const GHOST_INTERNAL_URL = (process.env.GHOST_INTERNAL_URL || 'http://127.0.0.1:2368').replace(/\/+$/, '')
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY || ''
const GHOST_ADMIN_API_VERSION = process.env.GHOST_ADMIN_API_VERSION || 'v5.0'
const SIGNUPS_API_TOKEN = process.env.SIGNUPS_API_TOKEN || ''
const GATED_TRACKS = [
  { id: '4', accessTier: 'free_member', availableFrom: '2026-04-10', announcedReleaseDate: '2026-04-10', envKey: 'TRACK_URL_4' },
  { id: '5', accessTier: 'paid_5', announcedReleaseDate: '2026-05-08', envKey: 'TRACK_URL_5' },
  { id: '6', accessTier: 'paid_5', envKey: 'TRACK_URL_6' },
  { id: '7', accessTier: 'paid_5', envKey: 'TRACK_URL_7' },
  { id: '8', accessTier: 'paid_5', envKey: 'TRACK_URL_8' },
]
const VIDEO_EMBED_URL = (process.env.VIDEO_EMBED_URL || '').trim()

app.use(cors())
app.use(express.json())
const memberProfileTextBodyParser = express.text({ type: ['text/plain', 'application/json', 'application/*+json'] })

function getForwardedHeaderValue(value) {
  return (value || '').toString().split(',')[0].trim()
}

function getRequestHost(req) {
  return getForwardedHeaderValue(req.headers['x-forwarded-host'] || req.headers.host)
}

function getRequestProtocol(req) {
  const forwardedProtocol = getForwardedHeaderValue(req.headers['x-forwarded-proto'])
  if (forwardedProtocol) return forwardedProtocol

  const publicUrl = new URL(GHOST_URL)
  return getRequestHost(req) === publicUrl.host ? publicUrl.protocol.replace(':', '') : 'http'
}

function getRequestOrigin(req) {
  const hostHeader = getRequestHost(req)
  if (!hostHeader) return ''
  return `${getRequestProtocol(req)}://${hostHeader}`.replace(/\/+$/, '')
}

function createGhostProxyHeaders(req) {
  const publicUrl = new URL(GHOST_URL)
  const host = publicUrl.host
  const protocol = publicUrl.protocol.replace(':', '')
  const port = publicUrl.port || (protocol === 'https' ? '443' : '80')

  return {
    Accept: req.headers.accept || '*/*',
    'Accept-Language': req.headers['accept-language'] || 'en',
    'User-Agent': req.headers['user-agent'] || 'ghost-proxy-server',
    Host: host,
    'X-Forwarded-Host': host,
    'X-Forwarded-Proto': protocol,
    'X-Forwarded-Port': port,
    'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
  }
}

function requestGhostUpstream(targetUrl, { method, headers, redirect = 'manual', maxRedirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl)
    const transport = url.protocol === 'https:' ? https : http

    const req = transport.request(url, { method, headers }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', async () => {
        const status = res.statusCode || 502
        const responseHeaders = new Headers()

        for (const [name, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) responseHeaders.append(name, item)
          } else if (value !== undefined) {
            responseHeaders.set(name, String(value))
          }
        }

        const location = responseHeaders.get('location')
        const nextUrl = location ? new URL(location, targetUrl) : null
        const shouldFollowRedirect = (
          redirect === 'follow'
          && nextUrl
          && status >= 300
          && status < 400
          && maxRedirects > 0
          && nextUrl.host === url.host
        )

        if (shouldFollowRedirect && nextUrl) {
          try {
            const followed = await requestGhostUpstream(nextUrl.toString(), {
              method,
              headers,
              redirect,
              maxRedirects: maxRedirects - 1,
            })
            return resolve(followed)
          } catch (error) {
            return reject(error)
          }
        }

        return resolve({
          status,
          headers: responseHeaders,
          body: Buffer.concat(chunks),
        })
      })
    })

    req.on('error', reject)
    req.end()
  })
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
    const ghostRes = await requestGhostUpstream(targetUrl, {
      method: req.method,
      headers: createGhostProxyHeaders(req),
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

    return res.send(ghostRes.body)
  } catch (error) {
    return res.status(502).json({
      error: 'Ghost unsubscribe upstream error',
      details: String(error?.message || error),
    })
  }
}

async function proxyGhostInfraToGhost(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const targetUrl = `${GHOST_INTERNAL_URL}${req.path}${qs}`

  try {
    const ghostRes = await requestGhostUpstream(targetUrl, {
      method: req.method,
      headers: createGhostProxyHeaders(req),
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

    return res.send(ghostRes.body)
  } catch (error) {
    return res.status(502).json({
      error: 'Ghost infrastructure upstream error',
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
      <a href="/">${process.env.SITE_NAME ? `Back to ${process.env.SITE_NAME}` : 'Back'}</a>
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
    const ghostRes = await requestGhostUpstream(targetUrl, {
      method: 'POST',
      headers: createGhostProxyHeaders(req),
    })

    return renderUnsubscribeConfirmationPage(res, { success: ghostRes.status >= 200 && ghostRes.status < 300 })
  } catch {
    return renderUnsubscribeConfirmationPage(res, { success: false })
  }
}

app.get(['/unsubscribe', '/unsubscribe/'], unsubscribeAndConfirm)
app.get('/unsubscribe/*', proxyUnsubscribeToGhost)
app.head(['/unsubscribe', '/unsubscribe/'], proxyUnsubscribeToGhost)
app.head('/unsubscribe/*', proxyUnsubscribeToGhost)

// Defensive Ghost infrastructure pass-through for environments where nginx route blocks
// may be stale. nginx remains the primary owner of these prefixes in production.
app.get('/content/images/*', proxyGhostInfraToGhost)
app.head('/content/images/*', proxyGhostInfraToGhost)
app.get('/r/*', proxyGhostInfraToGhost)
app.head('/r/*', proxyGhostInfraToGhost)

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
  const preservedLines = typeof currentNote === 'string'
    ? currentNote
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('first_name:') && !line.startsWith('last_name:'))
    : []

  preservedLines.push(`first_name:${firstName}`)
  if (lastName) preservedLines.push(`last_name:${lastName}`)
  return preservedLines.join('\n')
}

function normalizeMemberIdentity(value) {
  if (!value || typeof value !== 'object') return null

  const member = value
  const id = typeof member.id === 'string' ? member.id.trim() : ''
  const uuid = typeof member.uuid === 'string' ? member.uuid.trim() : ''
  const email = typeof member.email === 'string' ? member.email.trim().toLowerCase() : ''
  const subscriptions = Array.isArray(member.subscriptions) ? member.subscriptions : []

  if ((!id && !uuid) || !email) return null
  return { id, uuid, email, subscriptions }
}

async function fetchGhostMemberFromSession({ cookieHeader, proxyHeaders }) {
  if (!cookieHeader) return null

  const memberUrl = new URL('/members/api/member/', GHOST_INTERNAL_URL)
  memberUrl.searchParams.set('_', String(Date.now()))

  const memberRes = await fetch(memberUrl, {
    method: 'GET',
    headers: {
      ...proxyHeaders,
      Cookie: cookieHeader,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  })

  if (!memberRes.ok) return null

  const raw = await memberRes.text().catch(() => '')
  if (!raw || !raw.trim()) return null

  try {
    const payload = JSON.parse(raw)
    if (payload && typeof payload === 'object' && 'member' in payload) {
      return normalizeMemberIdentity(payload.member)
    }
    return normalizeMemberIdentity(payload)
  } catch {
    return null
  }
}

async function resolveMemberIdentityForProfileUpdate({ memberId, memberUuid, email, cookieHeader, proxyHeaders }) {
  const retryDelaysMs = [0, 400, 1200, 2500, 5000, 8000, 12000]

  for (const delay of retryDelaysMs) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const resolvedMember = await fetchGhostMemberFromSession({ cookieHeader, proxyHeaders })
    if (resolvedMember) {
      if (
        (memberId && resolvedMember.id && memberId !== resolvedMember.id)
        || (memberUuid && resolvedMember.uuid && memberUuid !== resolvedMember.uuid)
        || (email && resolvedMember.email && email !== resolvedMember.email)
      ) {
        console.warn('[Member profile identity mismatch]', {
          suppliedMemberId: memberId || undefined,
          suppliedMemberUuid: memberUuid || undefined,
          suppliedEmail: email || undefined,
          sessionMemberId: resolvedMember.id || undefined,
          sessionMemberUuid: resolvedMember.uuid || undefined,
          sessionEmail: resolvedMember.email || undefined,
        })
      }
      return resolvedMember
    }
  }

  return null
}

function getMemberTierFromSessionMember(member) {
  if (!member) return 'none'

  let highestAmount = 0
  const subscriptions = Array.isArray(member.subscriptions) ? member.subscriptions : []
  for (const subscription of subscriptions) {
    if (subscription?.status !== 'active') continue
    const amount = subscription?.price?.amount
    if (typeof amount === 'number' && amount > highestAmount) highestAmount = amount
  }

  if (highestAmount >= 2000) return 'paid_20'
  if (highestAmount >= 500) return 'paid_5'
  if (highestAmount > 0) return 'paid_5'
  return 'free'
}

function isTrackAvailableByDate(track, now = new Date()) {
  if (!track.availableFrom) return true
  const releaseInstant = Date.parse(`${track.availableFrom}T00:00:00.000Z`)
  if (Number.isNaN(releaseInstant)) return true
  return now.getTime() >= releaseInstant
}

function hasAnnouncedReleaseDate(track) {
  return typeof track.announcedReleaseDate === 'string' && track.announcedReleaseDate.trim().length > 0
}

function hasTrackAccessForTier(track, membershipTier, now = new Date()) {
  if (track.accessTier === 'public') return true

  if (membershipTier === 'free' && hasAnnouncedReleaseDate(track)) {
    if (isTrackAvailableByDate(track, now)) return true
  }

  if (!isTrackAvailableByDate(track, now)) return false
  if (track.accessTier === 'free_member') return membershipTier !== 'none'
  if (track.accessTier === 'paid_5') return membershipTier === 'paid_5' || membershipTier === 'paid_20'
  return membershipTier === 'paid_20'
}

async function resolveMembershipTierFromRequest(req) {
  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : ''
  const member = await fetchGhostMemberFromSession({
    cookieHeader,
    proxyHeaders: createGhostProxyHeaders(req),
  })
  return getMemberTierFromSessionMember(member)
}


function parseMemberProfileBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body
  }

  if (typeof body === 'string' && body.trim()) {
    try {
      const parsed = JSON.parse(body)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      return null
    }
  }

  return null
}

async function retryMemberProfileUpdate({ memberId, email, firstName, lastName }) {
  const retryDelaysMs = [0, 500, 1500, 3000]
  let lastError = null

  for (const delay of retryDelaysMs) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    try {
      await updateMemberProfileInGhost({ memberId, email, firstName, lastName })
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Unable to update member profile.')
}

async function updateMemberProfileInGhost({ memberId, email, firstName, lastName }) {
  const memberRes = await ghostAdminFetch(`members/${memberId}/?include=subscriptions`, { method: 'GET' })
  const payload = await memberRes.json().catch(() => null)
  const fetchedMember = Array.isArray(payload?.members) ? payload.members[0] : null

  if (!memberRes.ok || !fetchedMember) {
    throw new Error('Member not found.')
  }

  const fetchedEmail = typeof fetchedMember.email === 'string' ? fetchedMember.email.trim().toLowerCase() : ''
  if (fetchedEmail !== email) {
    throw new Error('Member identity mismatch.')
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
    throw new Error(`Failed to update member profile: ${JSON.stringify(updatePayload)}`)
  }
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

app.post('/api/member-profile', memberProfileTextBodyParser, async (req, res) => {
  const parsedBody = parseMemberProfileBody(req.body)
  const memberId = typeof parsedBody?.memberId === 'string' ? parsedBody.memberId.trim() : ''
  const memberUuid = typeof parsedBody?.memberUuid === 'string' ? parsedBody.memberUuid.trim() : ''
  const email = typeof parsedBody?.email === 'string' ? parsedBody.email.trim().toLowerCase() : ''
  const firstName = typeof parsedBody?.firstName === 'string' ? parsedBody.firstName.trim() : ''
  const lastName = typeof parsedBody?.lastName === 'string' ? parsedBody.lastName.trim() : ''

  if (!firstName) {
    return res.status(400).json({ error: 'firstName is required.' })
  }

  if (!GHOST_ADMIN_API_KEY) {
    return res.status(500).json({ error: 'Ghost Admin API is not configured (missing GHOST_ADMIN_API_KEY)' })
  }

  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : ''
  const proxyHeaders = createGhostProxyHeaders(req)

  void resolveMemberIdentityForProfileUpdate({ memberId, memberUuid, email, cookieHeader, proxyHeaders })
    .then((resolvedMember) => {
      if (!resolvedMember) {
        throw new Error('Unable to resolve Ghost member from the current session.')
      }

      return retryMemberProfileUpdate({
        memberId: resolvedMember.id,
        email: resolvedMember.email,
        firstName,
        lastName,
      })
    })
    .catch((error) => {
      console.error('[Member profile update failed]', error)
    })

  return res.status(202).json({ queued: true })
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
      return res.status(200).json({
        success: true,
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

app.get('/api/track-url/:trackId', async (req, res) => {
  const track = GATED_TRACKS.find((item) => item.id === req.params.trackId)
  if (!track) return res.status(404).json({ error: 'Track not found' })

  try {
    const membershipTier = await resolveMembershipTierFromRequest(req)
    if (!hasTrackAccessForTier(track, membershipTier)) {
      return res.status(403).json({ error: 'Track access denied' })
    }

    const trackUrl = (process.env[track.envKey] || '').trim()
    if (!trackUrl) {
      return res.status(503).json({
        error: 'Track URL is not configured',
        envKey: track.envKey,
      })
    }

    return res.status(200).set('Cache-Control', 'no-store').json({ trackUrl })
  } catch (error) {
    console.error('[Gated track URL error]', error)
    return res.status(500).json({ error: 'Unable to resolve track access' })
  }
})

app.get('/api/video-embed', async (req, res) => {
  try {
    const membershipTier = await resolveMembershipTierFromRequest(req)
    const isPaid = membershipTier === 'paid_5' || membershipTier === 'paid_20'
    if (!isPaid) return res.status(403).json({ error: 'Video access denied' })

    if (!VIDEO_EMBED_URL) {
      return res.status(503).json({
        error: 'Video embed URL is not configured',
        envKey: 'VIDEO_EMBED_URL',
      })
    }

    return res.status(200).set('Cache-Control', 'no-store').json({ embedUrl: VIDEO_EMBED_URL })
  } catch (error) {
    console.error('[Gated video embed error]', error)
    return res.status(500).json({ error: 'Unable to resolve video access' })
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
