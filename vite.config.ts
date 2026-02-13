import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ghostUrl = env.VITE_GHOST_URL || 'https://catsky.club'
  const contentApiKey = env.VITE_GHOST_CONTENT_API_KEY || ''
  const ghostProxyTarget = env.VITE_GHOST_API_PROXY || 'https://catsky.club'

  // So cookies work on http://localhost (Ghost sets Secure; browser won't set that on HTTP)
  function stripCookieForDev(cookie: string) {
    return cookie
      .replace(/;\s*domain=[^;]+/gi, '')
      .replace(/;\s*secure/gi, '')
  }

  return {
    plugins: [
      react(),
      // Replace env vars in HTML (for Ghost Portal script)
      {
        name: 'html-env-replace',
        transformIndexHtml(html) {
          const safeGhostUrl = String(ghostUrl).trim()
          const safeApiKey = String(contentApiKey).trim()
          let result = html.replace(/%VITE_GHOST_URL%/g, safeGhostUrl)
          result = result.replace(/%VITE_GHOST_CONTENT_API_KEY%/g, safeApiKey)
          return result
        },
      },
    ],
    server: {
      port: 3000,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/ghost': {
          target: ghostProxyTarget,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              const setCookie = proxyRes.headers['set-cookie']
              if (Array.isArray(setCookie)) {
                proxyRes.headers['set-cookie'] = setCookie.map(stripCookieForDev)
              } else if (setCookie) {
                proxyRes.headers['set-cookie'] = stripCookieForDev(setCookie)
              }
              const loc = proxyRes.headers['location']
              if (loc && req.headers.host) {
                const ghostOrigin = new URL(ghostProxyTarget).origin
                if (typeof loc === 'string' && loc.startsWith(ghostOrigin)) {
                  proxyRes.headers['location'] = loc.replace(ghostOrigin, `http://${req.headers.host}`)
                }
              }
            })
          },
        },
        '/members': {
          target: ghostProxyTarget,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              const setCookie = proxyRes.headers['set-cookie']
              if (Array.isArray(setCookie)) {
                proxyRes.headers['set-cookie'] = setCookie.map(stripCookieForDev)
              } else if (setCookie) {
                proxyRes.headers['set-cookie'] = stripCookieForDev(setCookie)
              }
              const loc = proxyRes.headers['location']
              if (loc && req.headers.host) {
                const ghostOrigin = new URL(ghostProxyTarget).origin
                if (typeof loc === 'string' && loc.startsWith(ghostOrigin)) {
                  proxyRes.headers['location'] = loc.replace(ghostOrigin, `http://${req.headers.host}`)
                }
              }
            })
          },
        },
      },
    },
  }
})

