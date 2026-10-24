/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Every public page needs these on first load: one chunk compresses better than many small ones,
          // and it caches across deploys that only change app code (PRD §12 budget: 170 KB gz).
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|@tanstack|axios|react-helmet-async|react-fast-compare|invariant|shallowequal|zustand)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    env: { VITE_API_BASE_URL: '/api' },
    restoreMocks: true,
  },
})
