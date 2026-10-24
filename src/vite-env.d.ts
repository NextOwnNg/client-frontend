/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_MOCK_API?: string
  /** Absolute origin for canonical and og:url tags, e.g. https://www.nextown.ng */
  readonly VITE_SITE_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
