/**
 * Build-time settings, read once. Set them per environment (.env.development locally, the Vercel project's
 * Environment Variables for deployments). Everything prefixed VITE_ ships in the bundle: never put secrets here.
 */

/** Where the API lives. Defaults to same-origin `/api`, which is also where the mock API answers. */
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Serve the in-browser mock API (fictional sample data) instead of a real backend. On locally by default;
 * turn it on for preview deployments until the backend exists.
 */
export const useMockApi: boolean = import.meta.env.VITE_USE_MOCK_API === 'true'
