import { setupWorker } from 'msw/browser'
import { handlers } from '@/mocks/handlers'
import { useDevSettings } from '@/mocks/dev-settings'
import { MEMBER_PERSONA_ID } from '@/mocks/fixtures/listings'
import { useSessionStore } from '@/stores/session'

export const worker = setupWorker(...handlers)

// The dev toolbar's persona signs the mock session in or out. "Member" is a sample seller, so own-listing
// states (Manage instead of Make an offer) can be reviewed on their listings.
function applyPersona(persona: 'guest' | 'member') {
  if (persona === 'member') useSessionStore.getState().setSession({ userId: MEMBER_PERSONA_ID, onboarded: true, restricted: false })
  else useSessionStore.getState().clearSession()
}
applyPersona(useDevSettings.getState().persona)
useDevSettings.subscribe((s, prev) => s.persona !== prev.persona && applyPersona(s.persona))
