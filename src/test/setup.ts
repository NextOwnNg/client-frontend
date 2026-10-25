import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { mockAuth } from '@/mocks/db/auth'
import { mockListings } from '@/mocks/db/listings'
import { mediaDb } from '@/mocks/db/media'
import { useDraftStore } from '@/stores/drafts'
import { useSessionStore } from '@/stores/session'
import { server } from '@/test/msw/server'

// jsdom has no layout engine; React Router's ScrollRestoration calls this
window.scrollTo = () => {}

// jsdom has no matchMedia; behave like a phone (no breakpoint or preference queries match)
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

// jsdom has no ResizeObserver; HeroUI's toast region measures toasts with it
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no object URLs; photo previews only need a placeholder
URL.createObjectURL ??= () => 'blob:preview'
URL.revokeObjectURL ??= () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  mockAuth.reset()
  mockListings.reset()
  mediaDb.reset()
  // Client stores outlive a render; every test starts signed out with no drafts
  useSessionStore.setState({ status: 'unknown', userId: null, onboarded: false, restricted: false, expired: false })
  useDraftStore.setState({ drafts: {} })
  sessionStorage.clear()
  cleanup()
})
afterAll(() => server.close())
