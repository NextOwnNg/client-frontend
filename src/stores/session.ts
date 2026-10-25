import { create } from 'zustand'
import type { Me } from '@/types/api'

/**
 * Session view state only (PRD §4.5): who is signed in and their role, mirrored from `GET /me`.
 * Never tokens (the session is an HttpOnly cookie) and never API data, which lives in TanStack Query.
 * `unknown` until the first session check answers, so guards wait instead of redirecting.
 */
export type SessionStatus = 'unknown' | 'guest' | 'member'

type SessionState = {
  status: SessionStatus
  userId: string | null
  onboarded: boolean
  restricted: boolean
  /** The session ended mid-visit: the page stays put behind a sign-in prompt instead of redirecting (PRD §6.3). */
  expired: boolean
  setSession: (session: { userId: string; onboarded: boolean; restricted: boolean }) => void
  clearSession: () => void
  markExpired: () => void
  dismissExpired: () => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'unknown',
  userId: null,
  onboarded: false,
  restricted: false,
  expired: false,
  setSession: (session) => set({ ...session, status: 'member', expired: false }),
  // Leaves `expired` alone: the sync that follows an expiry must not close its prompt
  clearSession: () => set({ status: 'guest', userId: null, onboarded: false, restricted: false }),
  markExpired: () => set({ status: 'guest', userId: null, onboarded: false, restricted: false, expired: true }),
  dismissExpired: () => set({ expired: false }),
}))

/** Mirrors the member into the session store. Call it wherever `me` changes, so guards never see a stale role. */
export function applyMe(me: Me | null) {
  const { setSession, clearSession } = useSessionStore.getState()
  if (me) setSession({ userId: me.id, onboarded: me.onboarded, restricted: me.restricted })
  else clearSession()
}
