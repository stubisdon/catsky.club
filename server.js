// Simple Express server for API endpoints
// Run with: node server.js
// Or use: npm run server

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

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
app.post('/api/submit', (req, res) => {
  const { name, contact, digDeeper } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  // TODO: Implement your submission logic here
  // Examples:
  // - Send email via SendGrid, Mailgun, etc.
  // - Save to database
  // - Send to Slack/Discord webhook
  // - Integrate with Ghost Members API

  console.log('Form submission:', { 
    name, 
    contact, 
    digDeeper,
    timestamp: new Date().toISOString() 
  })

  return res.status(200).json({ 
    success: true,
    message: 'Thank you! We will be in touch soon.' 
  })
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

