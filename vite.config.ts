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
            {
              // App code every public page loads and later screens share (cards, status, prices): one chunk,
              // so new routes that reuse a piece don't split it into many small, poorly compressed files
              name: 'shared-ui',
              test: /src[\\/](components[\\/](ui[\\/](StatusBadge|ImageWithFade|Button)|domain[\\/](Deadline|Price|TrustModule))|lib[\\/](copy[\\/](status|labels|copy)|view-transition|time[\\/](time|server-clock)|money[\\/]money|cx|env|api[\\/](client|api-error|error-checks))|stores[\\/]session|hooks[\\/]useMediaQuery|features[\\/]listings[\\/](api|filters))\.tsx?$|lucide-react[\\/]dist[\\/]esm[\\/]icons[\\/](handshake|wifi-off|timer|circle-slash|image-off)\.mjs$/,
              includeDependenciesRecursively: false,
            },
            {
              // The listing page's sections live in separate files; one chunk keeps them compressing together
              name: 'listing-detail',
              test: /src[\\/]features[\\/]listings[\\/]components[\\/](ListingView|Gallery|ListingHeader|SellerCard|ConditionAndDefects|ListingBody|OfferActions|DetailSection|listing-styles)\.tsx?$/,
              includeDependenciesRecursively: false,
            },
            {
              // First-load icons that member screens use too: one chunk instead of a tiny file each
              name: 'shell-icons',
              test: /lucide-react[\\/]dist[\\/]esm[\\/]icons[\\/](map-pin|phone|star|circle-check)\.mjs$/,
              includeDependenciesRecursively: false,
            },
            {
              // The listing page's small icons, shared with member screens: one chunk instead of a file each
              name: 'detail-icons',
              test: /lucide-react[\\/]dist[\\/]esm[\\/]icons[\\/](flag|life-buoy|package-x|bookmark|chevron-left|chevron-right)\.mjs$/,
              includeDependenciesRecursively: false,
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
