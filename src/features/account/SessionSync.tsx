import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { forgetMember, useMe } from '@/features/account/api'
import { onAuthExpired } from '@/lib/api/client'
import { applyMe, useSessionStore } from '@/stores/session'

const SessionExpiredSheet = lazy(() =>
  import('@/features/account/SessionExpiredSheet').then((m) => ({ default: m.SessionExpiredSheet })),
)

/**
 * Keeps the session store in step with `GET /me`, and handles a session that ends mid-visit: the member is
 * signed out locally and offered a sign-in that comes back to this page, with form drafts kept (PRD §6.3).
 */
export function SessionSync() {
  const queryClient = useQueryClient()
  const { data, isError } = useMe()
  const expired = useSessionStore((s) => s.expired)
  const dismissExpired = useSessionStore((s) => s.dismissExpired)

  useEffect(() => {
    // A failed check (offline, server down) browses as a guest; the next refetch corrects it
    if (data !== undefined) applyMe(data)
    else if (isError) applyMe(null)
  }, [data, isError])

  useEffect(
    () =>
      onAuthExpired(() => {
        if (useSessionStore.getState().status !== 'member') return
        forgetMember(queryClient)
        useSessionStore.getState().markExpired()
      }),
    [queryClient],
  )

  if (!expired) return null
  return (
    <Suspense fallback={null}>
      <SessionExpiredSheet open={expired} onClose={dismissExpired} />
    </Suspense>
  )
}
