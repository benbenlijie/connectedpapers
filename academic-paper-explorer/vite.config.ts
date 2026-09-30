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
  },
})

