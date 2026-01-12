import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Replace env vars in HTML (for Ghost Portal script)
    {
      name: 'html-env-replace',
      transformIndexHtml(html) {
        return html
          .replace(/%VITE_GHOST_URL%/g, process.env.VITE_GHOST_URL || 'https://catsky.club')
          .replace(/%VITE_GHOST_CONTENT_API_KEY%/g, process.env.VITE_GHOST_CONTENT_API_KEY || '')
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
    },
  },
})

