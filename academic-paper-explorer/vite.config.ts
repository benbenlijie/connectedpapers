import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    // three.js is a large but lazily-loaded chunk (only on 3D toggle).
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('three') || id.includes('react-force-graph-3d')) return 'three'
          if (id.includes('react-force-graph')) return 'force-graph'
          if (id.includes('@tanstack') || id.includes('@floating-ui')) return 'vendor-query'
          if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router'
          if (id.includes('react-hot-toast') || id.includes('lucide-react')) return 'vendor-ui'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor-react'
        },
      },
    },
  },
})

