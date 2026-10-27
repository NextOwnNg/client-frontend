import { Button, toast } from '@heroui/react'
import { ArrowLeft, Clock, Flag, LifeBuoy, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { OfferSum } from '@/components/domain/OfferSum'
import { Seo } from '@/components/seo/Seo'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AcceptSheet, CounterSheet } from '@/features/offers/components/DecisionSheets'
import { ListingPin, SideCard, type SideEntry } from '@/features/offers/components/OfferParts'
import { TermsDiff, VersionTimeline } from '@/features/offers/components/ThreadParts'
import {
  counterpartOf,
  diffVersions,
  expiryLabel,
  partsOf,
  tradeSentence,
  viewerPays,
  offerSum,
} from '@/features/offers/offer-terms'
import { useDecision, type DecisionResult } from '@/features/offers/use-offer-decision'
import type { FieldErrors } from '@/features/selling/listing-input'
import { useOnline } from '@/hooks/useOnline'
import { offerStatus } from '@/lib/copy/offer-status'
import { useServerNow } from '@/lib/time/server-clock'
import { formatWAT } from '@/lib/time/time'
import type { Offer, OfferVersion } from '@/types/api'
import { type Notice, ThreadNotices } from '@/features/offers/components/ThreadNotices'
import { DecisionBar } from '@/features/offers/components/DecisionBar'
import { ClosedState } from '@/features/offers/components/ClosedState'

export function OfferThread({
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
  const navigate = useNavigate()
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
    const result = await decide({ action: 'accept', expectedVersionId: acceptVersion.id })
    // An accepted offer becomes a deal: carry on there (FE-OFF-08, ruling R5-5)
    settle(result, () => {
      if (result.kind === 'done' && result.offer.transactionId)
        void navigate(`/transactions/${result.offer.transactionId}`)
    })
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
      <Link
        to={`/messages?offer=${offer.id}`}
        className="-mt-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control text-compact font-semibold text-action underline-offset-4 hover:underline"
      >
        <MessageCircle aria-hidden className="size-4" />
        Message {other.displayName}
      </Link>

      <ThreadNotices
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
