import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Dev-only controls for the mock API (DevToolbar). Never shipped to production builds. */
type DevSettings = {
  latencyMs: number
  failNext: boolean
  persona: 'guest' | 'member'
  setLatency: (ms: number) => void
  setFailNext: (fail: boolean) => void
  setPersona: (persona: 'guest' | 'member') => void
}

export const useDevSettings = create<DevSettings>()(
  persist(
    (set) => ({
      latencyMs: 400,
      failNext: false,
      persona: 'guest',
      setLatency: (latencyMs) => set({ latencyMs }),
      setFailNext: (failNext) => set({ failNext }),
      setPersona: (persona) => set({ persona }),
    }),
    { name: 'nextown-dev-settings', partialize: ({ latencyMs, persona }) => ({ latencyMs, persona }) },
  ),
)
