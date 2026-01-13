import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // SPA fallback - alle ruter serverer index.html
  appType: 'spa',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
