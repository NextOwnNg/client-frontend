import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { loginPath, onboardingPath, safeNext } from '@/lib/auth/next'
import { useSessionStore } from '@/stores/session'

function SessionPending() {
  return (
    <div role="status" aria-label="Checking your session" className="flex justify-center py-16 text-muted">
      <LoaderCircle aria-hidden className="size-6 animate-spin" />
    </div>
  )
}

/**
 * Member routes (PRD §6.3). A guest goes to sign in with `next`, a new member finishes onboarding first.
 * Hiding is never security: the API refuses the requests either way.
 */
export function RequireAuth({ allowNew = false }: { allowNew?: boolean }) {
  const status = useSessionStore((s) => s.status)
  const onboarded = useSessionStore((s) => s.onboarded)
  const expired = useSessionStore((s) => s.expired)
  const { pathname, search, hash } = useLocation()
  const here = pathname + search + hash

  if (status === 'unknown') return <SessionPending />
  // An expired session keeps the page behind its sign-in prompt until the person chooses
  if (status === 'guest' && expired) return <Outlet />
  if (status === 'guest') return <Navigate to={loginPath(here)} replace />
  if (!onboarded && !allowNew) return <Navigate to={onboardingPath(here)} replace />
  return <Outlet />
}

/** Sign-in pages: someone already signed in carries straight on to where they were going. */
export function RedirectIfAuthed() {
  const status = useSessionStore((s) => s.status)
  const onboarded = useSessionStore((s) => s.onboarded)
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  if (status !== 'member') return <Outlet />
  return <Navigate to={onboarded ? next : onboardingPath(next)} replace />
}
