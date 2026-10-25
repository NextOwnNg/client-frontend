import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Dev-only controls for the mock API (DevToolbar). Never shipped to production builds. */
type DevSettings = {
  latencyMs: number
  failNext: boolean
  setLatency: (ms: number) => void
  setFailNext: (fail: boolean) => void
}

export const useDevSettings = create<DevSettings>()(
  persist(
    (set) => ({
      latencyMs: 400,
      failNext: false,
      setLatency: (latencyMs) => set({ latencyMs }),
      setFailNext: (failNext) => set({ failNext }),
    }),
    {
      name: 'nextown-dev-settings',
      // v0 had a guest/member persona switch; the toolbar now signs in through the mock API instead
      version: 1,
      migrate: (persisted) => ({ latencyMs: (persisted as { latencyMs?: number } | null)?.latencyMs ?? 400 }),
      partialize: ({ latencyMs }) => ({ latencyMs }),
    },
  ),
)
