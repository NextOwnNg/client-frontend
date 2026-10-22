import { create } from 'zustand'

/**
 * Session view state only (PRD §4.5): who is signed in and their role.
 * Never tokens (the session is an HttpOnly cookie) and never API data, which lives in TanStack Query.
 */
type SessionState = {
  userId: string | null
  onboarded: boolean
  restricted: boolean
  setSession: (session: { userId: string; onboarded: boolean; restricted: boolean }) => void
  clearSession: () => void
}

const initialState = { userId: null, onboarded: false, restricted: false }

export const useSessionStore = create<SessionState>()((set) => ({
  ...initialState,
  setSession: (session) => set(session),
  clearSession: () => set(initialState),
}))
