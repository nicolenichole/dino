import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Keep it local (no external host exposure).
    host: 'localhost'
  }
})

