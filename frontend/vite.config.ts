import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages (project sites) and any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
})
