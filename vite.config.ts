import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ghostUrl = env.VITE_GHOST_URL || 'https://catsky.club'
  const contentApiKey = env.VITE_GHOST_CONTENT_API_KEY || ''
  const ghostProxyTarget = env.VITE_GHOST_API_PROXY || 'https://catsky.club'

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
        },
        '/members': {
          target: ghostProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})

