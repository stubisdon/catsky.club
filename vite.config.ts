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
        const ghostUrl = process.env.VITE_GHOST_URL || 'https://catsky.club'
        const contentApiKey = process.env.VITE_GHOST_CONTENT_API_KEY || ''
        
        // Ensure we always have valid string values
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
    },
  },
})

