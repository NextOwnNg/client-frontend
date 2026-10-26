import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { useMatch } from 'react-router'
import { meKey, useMe } from '@/features/account/api'
import { formatPhoneDisplay } from '@/lib/phone/phone'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_ID, SAMPLE_MEMBER_PHONE } from '@/mocks/db/auth'
import { mockFeed } from '@/mocks/db/feed'
import { mockMessages } from '@/mocks/db/messages'
import { listingsDb, mockListings } from '@/mocks/db/listings'
import { mockOffers } from '@/mocks/db/offers'
import { mockTransactions } from '@/mocks/db/transactions'
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
  const [liveListings, setLiveListings] = useState(() => listingsDb.goesLive())
  // On an offer's page, the offer controls act on that offer; elsewhere on the newest one that fits
  const offerId = useMatch('/offers/:id')?.params.id
  const dealId = useMatch('/transactions/:id')?.params.id
  const conversationId = useMatch('/messages/:id')?.params.id

  const refreshSession = () => queryClient.invalidateQueries({ queryKey: meKey })
  const act = (message: string, change: () => void) => {
    change()
    setNote(message)
    void refreshSession()
  }

  const listingsAct = (message: string, change: () => void) => {
    change()
    setNote(message)
    void queryClient.invalidateQueries({ queryKey: ['own-listings'] })
    void queryClient.invalidateQueries({ queryKey: ['listings'] })
  }

  const offersAct = (message: string, change: () => boolean) => {
    setNote(change() ? message : 'No open offer fits. Open one where the other person can act.')
    void queryClient.invalidateQueries({ queryKey: ['offers'] })
    void queryClient.invalidateQueries({ queryKey: ['my-items'] })
    void queryClient.invalidateQueries({ queryKey: ['own-listings'] })
    void queryClient.invalidateQueries({ queryKey: ['listings'] })
  }

  const dealAct = (message: string, change: () => boolean) => {
    setNote(change() ? message : 'No open deal fits. Open one that’s awaiting handover.')
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void queryClient.invalidateQueries({ queryKey: ['offers'] })
    void queryClient.invalidateQueries({ queryKey: ['own-listings'] })
    void queryClient.invalidateQueries({ queryKey: ['listings'] })
  }

  const communityAct = (message: string, change: () => boolean) => {
    setNote(change() ? message : 'Nothing fits. Open a conversation first.')
    void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['feed'] })
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
      className="fixed bottom-[calc(152px+env(safe-area-inset-bottom))] left-3 z-50 max-h-[70dvh] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-card bg-ink p-4 text-compact text-paper shadow-overlay desktop:bottom-4"
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
      </div>

      {me && (
        <div className="mt-4 border-t border-white/15 pt-3">
          <p className="font-semibold">Listings</p>
          <label className="mt-2 flex items-center justify-between gap-2">
            New listings go live straight away
            <input
              type="checkbox"
              checked={liveListings}
              onChange={(e) => {
                mockListings.publishLive(e.target.checked)
                setLiveListings(e.target.checked)
              }}
              className="size-4 accent-[var(--nx-teal)]"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => listingsAct('Listings under review approved.', () => mockListings.approvePending())}
              className={tool}
            >
              Approve reviews
            </button>
            <button
              type="button"
              onClick={() =>
                listingsAct('Your first active listing has expired.', () => {
                  const active = listingsDb.ownedBy(me.id).find((l) => l.status === 'ACTIVE')
                  if (active) mockListings.expire(active.id)
                })
              }
              className={tool}
            >
              Expire a listing
            </button>
          </div>
        </div>
      )}
      {me && (
        <div className="mt-4 border-t border-white/15 pt-3">
          <p className="font-semibold">Offers {offerId ? '· this offer' : '· newest open offer'}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => offersAct('The other person countered.', () => mockOffers.otherPartyCounters(offerId))}
              className={tool}
            >
              They counter
            </button>
            <button
              type="button"
              onClick={() => offersAct('The other person accepted.', () => mockOffers.otherPartyAccepts(offerId))}
              className={tool}
            >
              They accept
            </button>
            <button
              type="button"
              onClick={() =>
                offersAct('The owner accepted someone else’s offer.', () => mockOffers.closeByOtherAcceptance(offerId))
              }
              className={tool}
            >
              Owner picks another
            </button>
            <button
              type="button"
              onClick={() => offersAct('The offer expired.', () => mockOffers.expire(offerId))}
              className={tool}
            >
              Expire offer
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              mockOffers.saveThenFailNext()
              setNote('The next offer action saves, then its answer is lost.')
            }}
            className={`${tool} mt-2 w-full`}
          >
            Next offer action: save, then lose the answer
          </button>
        </div>
      )}
      {me && (
        <div className="mt-4 border-t border-white/15 pt-3">
          <p className="font-semibold">Exchange {dealId ? '· this deal' : '· newest open deal'}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                dealAct('They suggested a meeting.', () => mockTransactions.otherPartyProposesMeeting(dealId))
              }
              className={tool}
            >
              They suggest a meeting
            </button>
            <button
              type="button"
              onClick={() => dealAct('They confirmed their side.', () => mockTransactions.otherPartyConfirms(dealId))}
              className={tool}
            >
              They confirm
            </button>
            <button
              type="button"
              onClick={() => dealAct('They asked to cancel.', () => mockTransactions.otherPartyRequestsCancel(dealId))}
              className={tool}
            >
              They ask to cancel
            </button>
            <button
              type="button"
              onClick={() => dealAct('They reported a problem.', () => mockTransactions.otherPartyDisputes(dealId))}
              className={tool}
            >
              They report a problem
            </button>
            <button
              type="button"
              onClick={() => dealAct('The reservation has 20 hours left.', () => mockTransactions.nearlyEnd(dealId))}
              className={tool}
            >
              Reservation nearly over
            </button>
            <button
              type="button"
              onClick={() => dealAct('The reservation ended.', () => mockTransactions.endReservation(dealId))}
              className={tool}
            >
              End reservation
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              mockTransactions.saveThenFailNext()
              setNote('The next deal action saves, then its answer is lost.')
            }}
            className={`${tool} mt-2 w-full`}
          >
            Next deal action: save, then lose the answer
          </button>
        </div>
      )}
      {me && (
        <div className="mt-4 border-t border-white/15 pt-3">
          <p className="font-semibold">Community {conversationId ? '· this conversation' : '· newest conversation'}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => communityAct('They replied.', () => mockMessages.otherPartyReplies(conversationId))}
              className={tool}
            >
              They reply
            </button>
            <button
              type="button"
              onClick={() =>
                communityAct('Their last message was removed.', () =>
                  mockMessages.moderateLastFromOther(conversationId),
                )
              }
              className={tool}
            >
              Moderate their message
            </button>
            <button
              type="button"
              onClick={() => communityAct('Block switched.', () => mockMessages.toggleBlockedByOther(conversationId))}
              className={tool}
            >
              They block / unblock you
            </button>
            <button
              type="button"
              onClick={() => communityAct('A comment was removed.', () => mockFeed.removeNewestComment())}
              className={tool}
            >
              Remove a comment
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              mockFeed.rateLimitNextComment()
              setNote('Your next comment will be refused as too fast.')
            }}
            className={`${tool} mt-2 w-full`}
          >
            Rate-limit next comment
          </button>
        </div>
      )}
      <p role="status" className="mt-2 text-caption text-white/70 empty:hidden">
        {note}
      </p>
    </div>
  )
}
