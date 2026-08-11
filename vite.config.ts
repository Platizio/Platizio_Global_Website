import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  define: {
    // Baked in at build time so the prerendered HTML and the hydrating client
    // agree on the copyright year. Reading `new Date()` during render would
    // mismatch across a New Year boundary and log a hydration error.
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
})
