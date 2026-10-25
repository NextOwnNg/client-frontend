import { ArrowLeftRight, Banknote, Bookmark, ChevronRight, Flag, LifeBuoy, LoaderCircle, Settings2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { Deadline } from '@/components/domain/Deadline'
import { Price } from '@/components/domain/Price'
import { AreaLabel, TrustModule } from '@/components/domain/TrustModule'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { copy } from '@/lib/copy/copy'
import { conditionLabel, isAvailable, listingStatus } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import { formatWAT } from '@/lib/time/time'
import { useSessionStore } from '@/stores/session'
import { unavailableMessage } from '@/features/listings/copy'
import type { Intent } from '@/features/listings/components/SignInPrompt'
import type { ListingDetail } from '@/types/api'

const sectionHeading = 'text-h3 text-ink'

/** Status, area, title, price, accepted modes and any real Quick Sell deadline. */
export function ListingHeader({ listing, titleAs: Title = 'h1' }: { listing: ListingDetail; titleAs?: 'h1' | 'h2' }) {
  const available = isAvailable(listing.status)
  const status = listingStatus(listing.status)

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {!available && (
          <StatusBadge tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusBadge>
        )}
        <AreaLabel name={listing.areaName} />
        <span className="text-compact text-muted">Listed {formatWAT(listing.publishedAt, { withTime: false })}</span>
      </div>
      <Title className={cx('text-h2 desktop:text-h1', available ? 'text-ink' : 'text-muted')}>{listing.title}</Title>
      <Price kobo={listing.askingKobo} size="lg" className={cx(!available && 'text-muted')} />
      <ul aria-label="Accepted offers" className="flex flex-wrap gap-2">
        {listing.acceptedModes.includes('CASH') && listing.askingKobo !== null && (
          <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-mint px-3 text-compact font-semibold text-action">
            <Banknote aria-hidden className="size-4" />
            Cash offers
          </li>
        )}
        {listing.acceptedModes.includes('SWAP') && (
          <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-mint px-3 text-compact font-semibold text-action">
            <ArrowLeftRight aria-hidden className="size-4" />
            Open to swap
          </li>
        )}
      </ul>
      {available && listing.urgencyEndsAt && (
        <div className="flex flex-col gap-1">
          <Deadline endsAt={listing.urgencyEndsAt} variant="detail" />
          <p className="text-caption text-muted">{copy.quickSellNote}</p>
        </div>
      )}
    </header>
  )
}

export function SellerCard({ listing }: { listing: ListingDetail }) {
  const { seller } = listing
  return (
    <section
      aria-labelledby="seller-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 id="seller-heading" className="text-caption font-semibold text-muted">
        Listed by
      </h2>
      <div className="flex items-center gap-3">
        <Avatar name={seller.displayName} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-body font-semibold text-ink">{seller.displayName}</p>
          <AreaLabel name={seller.areaName} />
        </div>
        <Link
          to={`/users/${seller.id}`}
          aria-label={`See ${seller.displayName}’s profile`}
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          Profile
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <TrustModule phoneConfirmed={seller.phoneConfirmed} reviewCount={seller.reviewCount} rating={seller.rating} />
    </section>
  )
}

/** Disclosed defects sit above the offer button (FE-LDT-01), written out like the rest of the working. */
export function ConditionAndDefects({ listing }: { listing: ListingDetail }) {
  return (
    <section aria-labelledby="condition-heading" className="relative flex flex-col gap-2 pl-4">
      <span aria-hidden className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full bg-action" />
      <h2 id="condition-heading" className={sectionHeading}>
        Condition and defects
      </h2>
      <p className="text-body text-ink">
        <span className="font-semibold">{conditionLabel(listing.condition)}</span>
        <span className="text-muted"> condition</span>
      </p>
      {listing.defects.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {listing.defects.map((d) => (
            <li key={d} className="flex gap-2 text-body leading-6 text-ink">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-warning" />
              {d}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-compact text-muted">No defects disclosed by the seller. Inspect the item before you pay.</p>
      )}
    </section>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={sectionHeading}>{title}</h2>
      {children}
    </section>
  )
}

/** Everything after the offer decision point: description, details, extras, swap wishes, safety. */
export function ListingBody({ listing }: { listing: ListingDetail }) {
  return (
    <div className="flex flex-col gap-8">
      {listing.description && (
        <Block title="About this item">
          <p className="max-w-prose text-body text-ink">{listing.description}</p>
        </Block>
      )}
      {listing.categoryFields.length > 0 && (
        <Block title="Details">
          <dl className="tabular grid grid-cols-[auto_1fr] gap-x-6 border-t border-border">
            {listing.categoryFields.map((f) => (
              <div key={f.label} className="col-span-2 grid grid-cols-subgrid border-b border-border py-2.5">
                <dt className="text-compact text-muted">{f.label}</dt>
                <dd className="text-body text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}
      {(listing.repairs || listing.accessories) && (
        <Block title="Repairs and what's included">
          {listing.repairs && (
            <p className="text-body text-ink">
              <span className="font-semibold">Repairs: </span>
              {listing.repairs}
            </p>
          )}
          {listing.accessories && (
            <p className="text-body text-ink">
              <span className="font-semibold">Included: </span>
              {listing.accessories}
            </p>
          )}
        </Block>
      )}
      {listing.desiredSwap && listing.acceptedModes.includes('SWAP') && (
        <Block title="Would swap for">
          <p className="text-body text-ink">{listing.desiredSwap}</p>
          <p className="text-compact text-muted">
            You can offer your item, add cash, or ask for cash on top. The offer shows who pays whom.
          </p>
        </Block>
      )}
      <Block title="Before you meet">
        <p className="max-w-prose text-body text-ink">{copy.handoverCaution}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Link
            to="/support"
            className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            <LifeBuoy aria-hidden className="size-4" />
            Safety tips
          </Link>
          <Link
            to={`/report/listing/${listing.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <Flag aria-hidden className="size-4" />
            Report this listing
          </Link>
        </div>
      </Block>
      {listing.sample && (
        <p className="text-caption text-muted">
          Sample listing: fictional data for development. Photo from Wikimedia Commons.
        </p>
      )}
    </div>
  )
}

const loadSignInPrompt = () => import('@/features/listings/components/SignInPrompt')
const SignInPrompt = lazy(() => loadSignInPrompt().then((m) => ({ default: m.SignInPrompt })))

type OfferActionsProps = {
  listing: ListingDetail
  /** Fetches the listing again; resolves with the fresh copy (FE-LDT-03: recheck before acting). */
  recheck: () => Promise<ListingDetail | undefined>
  layout: 'panel' | 'bar'
}

/**
 * The decision point. Available: Make an offer + Save. Own listing: Manage. Unavailable: an honest message and
 * a disabled button. Every tap rechecks the listing first, so a stale page never sends anyone forward.
 */
export function OfferActions({ listing, recheck, layout }: OfferActionsProps) {
  const userId = useSessionStore((s) => s.userId)
  const restricted = useSessionStore((s) => s.restricted)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [checking, setChecking] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const available = isAvailable(listing.status)
  const own = userId !== null && userId === listing.seller.id
  const bar = layout === 'bar'

  async function act(next: Intent) {
    setChecking(true)
    const fresh = await recheck().finally(() => setChecking(false))
    if (!fresh || !isAvailable(fresh.status)) return
    if (!userId) {
      setIntent(next)
      setPromptOpen(true)
    } else if (next === 'offer') void navigate(`/offers/new?listing=${fresh.id}`)
    // Saved items arrive with Phase 6; say so rather than pretend
    else void import('@heroui/react').then(({ toast }) => toast("Saved items aren't available yet in this preview."))
  }

  // Back from signing in with `?intent=save` (QA-01): finish the save once, then tidy the URL
  const resumed = useRef(false)
  const resumeSave = useEffectEvent(() => {
    resumed.current = true
    const rest = new URLSearchParams(params)
    rest.delete('intent')
    setParams(rest, { replace: true, preventScrollReset: true })
    void act('save')
  })
  useEffect(() => {
    if (!resumed.current && userId && params.get('intent') === 'save') resumeSave()
  }, [userId, params])

  const save = (
    <PlainButton
      variant="secondary"
      onClick={() => void act('save')}
      onPointerEnter={loadSignInPrompt}
      disabled={checking}
      fullWidth={!bar}
      className={cx(bar && 'shrink-0 px-5')}
    >
      <Bookmark aria-hidden className="size-5" />
      Save
    </PlainButton>
  )

  let actions: ReactNode
  if (own) {
    actions = (
      <>
        <p className={cx('text-compact text-muted', bar && 'sr-only')}>This is your listing.</p>
        <ButtonLink
          to={`/listings/${listing.id}/edit`}
          variant="secondary"
          fullWidth={!bar}
          className={cx(bar && 'flex-1')}
        >
          <Settings2 aria-hidden className="size-5" />
          Manage listing
        </ButtonLink>
      </>
    )
  } else if (restricted && available) {
    actions = (
      <>
        <p className={cx('text-compact text-ink', bar && 'min-w-0 flex-1')}>
          Your account can’t make offers right now.{' '}
          <Link to="/support?topic=appeal" className="font-semibold text-action underline-offset-4 hover:underline">
            Why?
          </Link>
        </p>
        {save}
      </>
    )
  } else if (!available) {
    actions = (
      <>
        {!bar && <Banner tone="warning" title={unavailableMessage(listing.status)} />}
        <div className={cx('flex w-full gap-3', !bar && 'flex-col')}>
          <PlainButton variant="primary" disabled className={cx(bar && 'flex-1')} fullWidth={!bar}>
            Not accepting offers
          </PlainButton>
          {save}
        </div>
      </>
    )
  } else {
    actions = (
      <div className={cx('flex w-full gap-3', !bar && 'flex-col')}>
        <PlainButton
          variant="primary"
          aria-busy={checking || undefined}
          disabled={checking}
          onClick={() => void act('offer')}
          onPointerEnter={loadSignInPrompt}
          onTouchStart={loadSignInPrompt}
          className={cx(bar && 'flex-1')}
          fullWidth={!bar}
        >
          {checking && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
          Make an offer
        </PlainButton>
        {save}
      </div>
    )
  }

  return (
    <>
      {bar ? (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:hidden">
          {!available && !own && (
            <p className="mb-2 text-compact font-semibold text-ink">{unavailableMessage(listing.status)}</p>
          )}
          <div className="mx-auto flex max-w-content items-center gap-3">{actions}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">{actions}</div>
      )}
      {intent && (
        <Suspense fallback={null}>
          <SignInPrompt intent={intent} open={promptOpen} listing={listing} onClose={() => setPromptOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
