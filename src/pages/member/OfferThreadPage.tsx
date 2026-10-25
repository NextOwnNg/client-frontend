import { Button, toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Flag, LifeBuoy, LoaderCircle, SearchX } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { OfferSum } from '@/components/domain/OfferSum'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { offerKeys, useOffer } from '@/features/offers/api'
import { AcceptSheet, CounterSheet } from '@/features/offers/components/DecisionSheets'
import { ListingPin, SideCard, type SideEntry } from '@/features/offers/components/OfferParts'
import { TermsDiff, VersionTimeline } from '@/features/offers/components/ThreadParts'
import {
  counterpartOf,
  diffVersions,
  expiryLabel,
  offerSum,
  partsOf,
  tradeSentence,
  viewerPays,
} from '@/features/offers/offer-terms'
import { useDecision, type DecisionResult } from '@/features/offers/use-offer-decision'
import type { FieldErrors } from '@/features/selling/listing-input'
import { useOnline } from '@/hooks/useOnline'
import { isApiError } from '@/lib/api/api-error'
import { copy } from '@/lib/copy/copy'
import { offerStatus } from '@/lib/copy/offer-status'
import { isAvailable } from '@/lib/copy/status'
import { useServerNow } from '@/lib/time/server-clock'
import { formatWAT } from '@/lib/time/time'
import { useSessionStore } from '@/stores/session'
import type { Offer, OfferVersion } from '@/types/api'

/** FE-OFF-07..12: `/offers/:id`, for the two people in the negotiation only. */
export function OfferThreadPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const userId = useSessionStore((s) => s.userId) ?? ''
  const queryClient = useQueryClient()
  const { data: offer, isPending, isError, error, refetch } = useOffer(id)
  const back = `/offers${params.get('tab') ? `?tab=${params.get('tab')}` : ''}`

  // Opening the thread reads it; the inbox drops its "New" mark without waiting for the next poll
  useEffect(() => {
    if (!offer) return
    queryClient.setQueryData<Offer[]>(offerKeys.list(), (list) =>
      list?.map((o) => (o.id === offer.id && o.unread ? { ...o, unread: false } : o)),
    )
  }, [offer, queryClient])

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading offer" className="flex flex-col gap-4">
        <div className="h-24 animate-pulse rounded-card bg-cloud" />
        <div className="h-72 animate-pulse rounded-card bg-cloud" />
      </div>
    )
  }
  if (isError && !offer) {
    // Not found and not yours look the same, so an offer's existence never leaks (QA-16)
    if (isApiError(error) && (error.status === 404 || error.status === 403)) {
      return (
        <>
          <Seo title="Offer" noindex />
          <EmptyState
            icon={SearchX}
            title="We couldn’t find that offer"
            body="It may not exist, or it isn’t one of yours."
            action={<ButtonLink to="/offers">Go to your offers</ButtonLink>}
          />
        </>
      )
    }
    return <ErrorState title="We couldn't load this offer" onRetry={() => void refetch()} />
  }

  return (
    <MotionProvider>
      <Thread key={offer.id} offer={offer} viewerId={userId} back={back} onRefetch={() => void refetch()} />
    </MotionProvider>
  )
}

type Notice = Exclude<DecisionResult['kind'], 'done' | 'invalid'> | null

function Thread({
  offer,
  viewerId,
  back,
  onRefetch,
}: {
  offer: Offer
  viewerId: string
  back: string
  onRefetch: () => void
}) {
  const now = useServerNow()
  const online = useOnline()
  const { decide, pending, checking } = useDecision(offer, viewerId)
  const [sheet, setSheet] = useState<'accept' | 'counter' | 'decline' | 'withdraw' | null>(null)
  const [acceptVersion, setAcceptVersion] = useState<OfferVersion | null>(null)
  const [staleFrom, setStaleFrom] = useState<OfferVersion | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [counterErrors, setCounterErrors] = useState<FieldErrors>({})

  const viewer = offer.viewerRole
  const other = counterpartOf(offer)
  const latest = offer.versions.at(-1)!
  const previous = offer.versions.at(-2)
  const status = offerStatus(offer, viewerId)
  const pendingOffer = offer.status === 'PENDING'
  // A deadline that passes on screen stops the actions at once; the server confirms on the refetch (PRD §7.2)
  const expiredOnScreen = pendingOffer && Date.parse(offer.expiresAt) <= now
  const open = pendingOffer && !expiredOnScreen
  const myTurn = open && offer.turnUserId === viewerId
  const parts = partsOf(offer, latest)
  const title = viewer === 'owner' ? `${offer.offerer.displayName}’s offer` : `Your offer to ${offer.owner.displayName}`

  useEffect(() => {
    if (expiredOnScreen) onRefetch()
  }, [expiredOnScreen, onRefetch])

  /** Every decision ends here: what happened, said plainly (PRD §7.5). */
  function settle(result: DecisionResult, after?: () => void) {
    setSheet(null)
    if (result.kind === 'done') {
      setNotice(null)
      setStaleFrom(null)
      after?.()
      return
    }
    if (result.kind === 'invalid') return
    if (result.kind === 'stale') setStaleFrom(acceptVersion ?? latest)
    setNotice(result.kind === 'not-done' && result.silent ? null : result.kind)
  }

  async function accept() {
    if (!acceptVersion) return
    settle(await decide({ action: 'accept', expectedVersionId: acceptVersion.id }))
  }

  async function end(action: 'decline' | 'withdraw') {
    settle(await decide({ action }))
  }

  // The amount moved in the same direction: show the change on the sum itself, with the words in "What changed"
  const delta =
    previous &&
    previous.cashDirection === latest.cashDirection &&
    previous.cashKobo !== latest.cashKobo &&
    latest.cashKobo > 0
      ? { kobo: latest.cashKobo - previous.cashKobo, label: `vs version ${previous.number}` }
      : undefined

  const cash = latest.cashDirection !== 'NONE' && latest.cashKobo > 0
  const iPay = viewerPays(latest, viewer)
  const offered: SideEntry | null = latest.offeredItem
    ? {
        kind: 'item',
        title: latest.offeredItem.title,
        photoUrl: latest.offeredItem.photos[0]?.url,
        condition: latest.offeredItem.condition,
        defects: latest.offeredItem.defects,
        href: latest.offeredItem.listingSlug ? `/listings/${latest.offeredItem.listingSlug}` : undefined,
        privateNote:
          latest.offeredItem.source === 'offer-only' ? 'Only visible to the two of you in this offer.' : undefined,
      }
    : null
  const listed: SideEntry = {
    kind: 'item',
    title: offer.listing.title,
    photoUrl: offer.listing.cover.url,
    condition: offer.listing.condition,
    defectSummary: offer.listing.defectSummary,
    href: `/listings/${offer.listing.slug}`,
  }
  const cashEntry: SideEntry = { kind: 'cash', kobo: latest.cashKobo }
  const mine = viewer === 'offerer' ? offered : listed
  const theirs = viewer === 'offerer' ? listed : offered
  const give = [mine, cash && iPay ? cashEntry : null].filter((e): e is SideEntry => Boolean(e))
  const receive = [theirs, cash && !iPay ? cashEntry : null].filter((e): e is SideEntry => Boolean(e))

  const diffFrom = staleFrom && staleFrom.id !== latest.id ? staleFrom : previous

  return (
    <article className="flex flex-col gap-6 pb-44 desktop:pb-0">
      <Seo title={`Offer · ${offer.listing.title}`} noindex />
      <Link
        to={back}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 hover:bg-cloud hover:text-ink desktop:hidden"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All offers
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge tone={status.tone} icon={status.icon}>
            {expiredOnScreen ? 'Expired' : status.label}
          </StatusBadge>
          {open && (
            <span className="tabular inline-flex items-center gap-1 text-compact text-muted">
              <Clock aria-hidden className="size-4" />
              {expiryLabel(offer.expiresAt, now)} · {formatWAT(offer.expiresAt)}
            </span>
          )}
        </div>
        <h1 className="text-h2 text-balance text-ink tablet:text-h1">{title}</h1>
      </header>

      <ListingPin listing={offer.listing} ownerName={offer.owner.displayName} label="Offer for" />

      <Notices
        notice={notice}
        checking={checking}
        offer={offer}
        onDismiss={() => setNotice(null)}
        onRetryCheck={onRefetch}
      />

      <section aria-labelledby="terms-heading" className="flex flex-col gap-4">
        <h2 id="terms-heading" className="text-h3 text-ink">
          {offer.status === 'ACCEPTED' ? 'Agreed terms' : 'Current terms'}
        </h2>
        <p className="max-w-prose text-body font-semibold text-ink">
          {tradeSentence(parts, viewer, offer.status === 'ACCEPTED')}
        </p>
        <OfferSum {...offerSum(parts, viewer)} delta={delta} />
        <div className="grid gap-3 tablet:grid-cols-2">
          <SideCard title="You give" entries={give} />
          <SideCard title="You receive" entries={receive} />
        </div>
      </section>

      {diffFrom && (
        <TermsDiff
          changes={diffVersions(diffFrom, latest, viewer)}
          caption={
            staleFrom
              ? `Version ${latest.number} compared with version ${diffFrom.number}, the one you were looking at.`
              : `Version ${latest.number} compared with version ${diffFrom.number}.`
          }
        />
      )}

      <DecisionBar>
        {open ? (
          <>
            {!online && <p className="text-compact text-muted">You’re offline. Decisions need a connection.</p>}
            {!myTurn && <p className="text-compact text-ink">Waiting for {other.displayName} to decide.</p>}
            <div className="flex w-full flex-wrap gap-2">
              {myTurn && (
                <>
                  <Button
                    isDisabled={!online || pending}
                    onPress={() => {
                      setAcceptVersion(latest)
                      setSheet('accept')
                    }}
                    className="flex-1 desktop:flex-none desktop:px-8"
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    isDisabled={!online || pending}
                    onPress={() => {
                      setCounterErrors({})
                      setSheet('counter')
                    }}
                    className="flex-1 desktop:flex-none"
                  >
                    Counter
                  </Button>
                </>
              )}
              <Button
                variant="tertiary"
                isDisabled={!online || pending}
                onPress={() => setSheet(viewer === 'owner' ? 'decline' : 'withdraw')}
                className={myTurn ? 'w-full desktop:w-auto' : 'shrink-0'}
              >
                {viewer === 'owner' ? 'Decline' : 'Withdraw offer'}
              </Button>
            </div>
          </>
        ) : (
          <ClosedState offer={offer} expiredOnScreen={expiredOnScreen} />
        )}
      </DecisionBar>

      <VersionTimeline offer={offer} viewerId={viewerId} />

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <Link
          to="/support"
          className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          <LifeBuoy aria-hidden className="size-4" />
          Safety tips
        </Link>
        <Link
          to={`/report/offer/${offer.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          <Flag aria-hidden className="size-4" />
          Report this offer
        </Link>
      </div>

      {acceptVersion && (
        <AcceptSheet
          offer={offer}
          version={acceptVersion}
          open={sheet === 'accept'}
          pending={pending}
          onOpenChange={(next) => !next && setSheet(null)}
          onConfirm={() => void accept()}
        />
      )}
      {sheet === 'counter' && (
        <CounterSheet
          key={latest.id}
          offer={offer}
          open
          pending={pending}
          serverErrors={counterErrors}
          onOpenChange={(next) => !next && setSheet(null)}
          onSubmit={(terms, expectedVersionId) =>
            void decide({ action: 'counter', expectedVersionId, terms }).then((result) => {
              if (result.kind === 'invalid') return setCounterErrors(result.fieldErrors)
              settle(result, () => toast.success('Counteroffer sent.'))
            })
          }
        />
      )}
      <ConfirmModal
        open={sheet === 'decline'}
        onOpenChange={(next) => !next && setSheet(null)}
        title="Decline this offer?"
        body={`${other.displayName} will see that you declined. They can make a new offer while the item is available.`}
        confirmLabel="Decline offer"
        tone="danger"
        onConfirm={() => end('decline')}
      />
      <ConfirmModal
        open={sheet === 'withdraw'}
        onOpenChange={(next) => !next && setSheet(null)}
        title="Withdraw this offer?"
        body={`${other.displayName} will no longer be able to accept it. You can make a new offer while the item is available.`}
        confirmLabel="Withdraw offer"
        tone="danger"
        onConfirm={() => end('withdraw')}
      />
    </article>
  )
}

/** Fixed above the tab bar on phones so the decision is always in reach (UX-19); in the page flow on desktop. */
function DecisionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:static desktop:rounded-card desktop:border desktop:bg-surface desktop:p-4 desktop:backdrop-blur-none">
      <div className="mx-auto flex max-w-content flex-col gap-2">{children}</div>
    </div>
  )
}

function ClosedState({ offer, expiredOnScreen }: { offer: Offer; expiredOnScreen: boolean }) {
  const other = counterpartOf(offer)
  const mine = offer.viewerRole
  if (expiredOnScreen || offer.status === 'EXPIRED') {
    const canOfferAgain = mine === 'offerer' && isAvailable(offer.listing.status)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">Offer expired</p>
        <p className="text-compact text-muted">
          No one decided in time, so this offer closed. Its terms can’t be accepted any more.
        </p>
        {canOfferAgain && (
          <ButtonLink to={`/offers/new?listing=${offer.listing.id}`} variant="secondary" className="self-start">
            Make a new offer
          </ButtonLink>
        )}
      </div>
    )
  }
  switch (offer.status) {
    case 'ACCEPTED':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold text-ink">Offer accepted</p>
          <p className="text-compact text-ink">{copy.offerAccepted}</p>
          <p className="text-compact text-muted">{copy.handoverCaution}</p>
          {offer.transactionId && (
            <ButtonLink to={`/transactions/${offer.transactionId}`} className="self-start">
              View the agreement
            </ButtonLink>
          )}
        </div>
      )
    case 'REJECTED':
      return (
        <p className="text-body text-ink">
          {mine === 'owner' ? 'You declined this offer.' : `${other.displayName} declined this offer.`}
        </p>
      )
    case 'WITHDRAWN':
      return (
        <p className="text-body text-ink">
          {mine === 'offerer' ? 'You withdrew this offer.' : `${other.displayName} withdrew this offer.`}
        </p>
      )
    case 'CLOSED_UNAVAILABLE':
      return (
        <div className="flex flex-col gap-1">
          <p className="text-body font-semibold text-ink">No longer available</p>
          <p className="text-compact text-muted">{offer.closedReason ?? 'The item is no longer available.'}</p>
        </div>
      )
    default:
      return null
  }
}

function Notices({
  notice,
  checking,
  offer,
  onDismiss,
  onRetryCheck,
}: {
  notice: Notice
  checking: boolean
  offer: Offer
  onDismiss: () => void
  onRetryCheck: () => void
}) {
  if (checking) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-control bg-mint p-4 text-body text-ink">
        <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-action" />
        Checking the latest status…
      </div>
    )
  }
  switch (notice) {
    case 'stale':
      return (
        <Banner tone="warning" title={copy.staleVersion}>
          Nothing was accepted. Read the changes below, then decide on the latest version.
        </Banner>
      )
    case 'unavailable':
      return (
        <Banner tone="warning" title="This item is no longer available.">
          {offer.closedReason ?? 'Nothing was accepted. The offer can’t go ahead.'}
        </Banner>
      )
    case 'expired':
      return (
        <Banner tone="warning" title="Offer expired">
          The deadline passed before your decision reached us.
        </Banner>
      )
    case 'refused':
      return <Banner tone="danger" title="This action isn’t available." />
    case 'not-done':
      return (
        <Banner
          tone="warning"
          title="Your decision didn’t go through"
          action={
            <Button variant="tertiary" size="sm" onPress={onDismiss}>
              Dismiss
            </Button>
          }
        >
          Nothing changed. Check your connection and try again.
        </Banner>
      )
    case 'unknown':
      return (
        <Banner
          tone="warning"
          title="We couldn’t confirm what happened"
          action={
            <Button variant="secondary" size="sm" onPress={onRetryCheck}>
              Check again
            </Button>
          }
        >
          Check your connection, then check again. Trying again can’t make the same decision twice.
        </Banner>
      )
    default:
      return null
  }
}
