import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { meKey, useMe } from '@/features/account/api'
import { formatPhoneDisplay } from '@/lib/phone/phone'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_ID, SAMPLE_MEMBER_PHONE } from '@/mocks/db/auth'
import { useDevSettings } from '@/mocks/dev-settings'

const tool = 'flex-1 rounded-control bg-white/10 px-2 py-2 font-medium hover:bg-white/20'

/**
 * Development and preview deployments: shows that the data is fictional and lets reviewers simulate slow
 * networks, a failed request, and account states through the mock API's real sign-in.
 */
export function DevToolbar() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { latencyMs, setLatency, failNext, setFailNext } = useDevSettings()
  const { data: me } = useMe()
  const [note, setNote] = useState<string | null>(null)

  const refreshSession = () => queryClient.invalidateQueries({ queryKey: meKey })
  const act = (message: string, change: () => void) => {
    change()
    setNote(message)
    void refreshSession()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(152px+env(safe-area-inset-bottom))] left-3 z-50 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-caption font-semibold text-paper shadow-overlay desktop:bottom-4"
      >
        <FlaskConical aria-hidden className="size-3.5" />
        Sample data
      </button>
    )
  }

  return (
    <div
      role="region"
      aria-label="Developer tools"
      className="fixed bottom-[calc(152px+env(safe-area-inset-bottom))] left-3 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-card bg-ink p-4 text-compact text-paper shadow-overlay desktop:bottom-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Mock API · fictional sample data</p>
        <button
          type="button"
          aria-label="Close developer tools"
          onClick={() => setOpen(false)}
          className="rounded p-1 hover:bg-white/10"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <label className="flex items-center justify-between gap-2 py-1">
        Network delay
        <select
          value={latencyMs}
          onChange={(e) => setLatency(Number(e.target.value))}
          className="rounded bg-white/10 px-2 py-1 text-paper"
        >
          <option value={0}>None</option>
          <option value={400}>Normal (0.4s)</option>
          <option value={1500}>Slow 3G (1.5s)</option>
          <option value={4000}>Very slow (4s)</option>
        </select>
      </label>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => setFailNext(true)} className={tool}>
          {failNext ? 'Next request fails' : 'Fail next request'}
        </button>
        <button type="button" onClick={() => void queryClient.invalidateQueries()} className={tool}>
          Refetch all
        </button>
      </div>

      <div className="mt-4 border-t border-white/15 pt-3">
        <p className="font-semibold">Account</p>
        <p className="mt-1 font-medium">{me ? `Signed in as ${me.displayName ?? 'a new member'}` : 'Signed out'}</p>
        <p className="mt-1 text-white/70">
          Any number works with code <span className="tabular font-semibold text-paper">{SAMPLE_CODE}</span>; the sample
          member is <span className="tabular whitespace-nowrap">{formatPhoneDisplay(SAMPLE_MEMBER_PHONE)}</span>.
        </p>
        <div className="mt-2 flex gap-2">
          {me ? (
            <button type="button" onClick={() => act('Signed out.', () => mockAuth.expireSession())} className={tool}>
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => act('Signed in as the sample member.', () => mockAuth.signInAs(SAMPLE_MEMBER_ID))}
              className={tool}
            >
              Sign in as sample member
            </button>
          )}
          <button
            type="button"
            onClick={() => act('Next code request will be refused.', () => mockAuth.rateLimitNextRequest())}
            className={tool}
          >
            Rate-limit next code
          </button>
        </div>
        {me && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                // The server forgets the session but the app isn't told: the next member request finds out
                mockAuth.expireSession()
                setNote('Session expired. Save something to see the prompt.')
              }}
              className={tool}
            >
              Expire session
            </button>
            <button
              type="button"
              onClick={() =>
                act(me.restricted ? 'Restriction lifted.' : 'Account restricted.', () =>
                  mockAuth.setRestricted(!me.restricted),
                )
              }
              className={tool}
            >
              {me.restricted ? 'Lift restriction' : 'Restrict account'}
            </button>
          </div>
        )}
        <p role="status" className="mt-2 text-caption text-white/70 empty:hidden">
          {note}
        </p>
      </div>
    </div>
  )
}
