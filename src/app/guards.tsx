import { LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import {
  Navigate,
  NavigationType,
  Outlet,
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from 'react-router'
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

/**
 * Sign-in pages: someone already signed in carries straight on to where they were going. Arriving by going
 * Back is different: the sign-in page is behind them, so Back keeps going past it. Sending them forward to
 * `next` again made Back bounce into the page they had just left (such as the offer they started).
 */
export function RedirectIfAuthed() {
  const status = useSessionStore((s) => s.status)
  const onboarded = useSessionStore((s) => s.onboarded)
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const { key } = useLocation()
  // POP is Back or Forward; "default" is the visit's first page, which has nothing behind it
  const backedInto = navigationType === NavigationType.Pop && key !== 'default'
  const member = status === 'member'

  useEffect(() => {
    if (member && backedInto) void navigate(-1)
  }, [member, backedInto, navigate])

  if (!member) return <Outlet />
  if (backedInto) return <SessionPending />
  return <Navigate to={onboarded ? next : onboardingPath(next)} replace />
}
