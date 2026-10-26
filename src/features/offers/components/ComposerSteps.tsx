import { ArrowLeftRight, Banknote, Clock, Coins, Info, LifeBuoy, Plus, Shuffle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { OfferSum } from '@/components/domain/OfferSum'
import { PlainButton } from '@/components/ui/Button'
import { MoneyField } from '@/components/ui/MoneyField'
import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { OfferItemForm, offerOnlyNote } from '@/features/offers/components/OfferItemForm'
import { ItemThumb, SideCard, type SideEntry } from '@/features/offers/components/OfferParts'
import {
  allowedModes,
  modeLabels,
  NOTE_MAX,
  offerSum,
  tradeSentence,
  viewerPays,
  type TradeParts,
} from '@/features/offers/offer-terms'
import { draftTerms, type OfferDraft } from '@/features/offers/use-offer-draft'
import type { FieldErrors } from '@/features/selling/listing-input'
import { copy } from '@/lib/copy/copy'
import { conditionLabel } from '@/lib/copy/status'
import { formatNaira } from '@/lib/money/money'
import { useServerNow } from '@/lib/time/server-clock'
import { formatWAT } from '@/lib/time/time'
import type { CashDirection, ListingDetail, OfferMode, RuntimeConfig, SwapItem } from '@/types/api'

type StepProps = {
  listing: ListingDetail
  draft: OfferDraft
  change: (changes: Partial<OfferDraft>) => void
  errors: FieldErrors
}

const stepHeading = 'text-h3 text-ink'

/** Wraps a field so the error summary can move to it. */
function Anchor({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div id={`field-${name}`} className="flex scroll-mt-24 flex-col gap-1">
      {children}
    </div>
  )
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-compact text-danger">{message}</p> : null

/** The trade in words as it's being built; read out politely as it changes. */
function LiveSentence({ children, placeholder }: { children: ReactNode; placeholder: string }) {
  return (
    <p
      aria-live="polite"
      className="rounded-control bg-mint/60 px-4 py-3 text-body font-semibold text-ink data-[empty=true]:bg-cloud data-[empty=true]:font-normal data-[empty=true]:text-muted"
      data-empty={!children}
    >
      {children || placeholder}
    </p>
  )
}

/* ---------- Kind of offer (UX-14, FE-OFF-01) ---------- */

const modeIcons: Record<OfferMode, ReactNode> = {
  CASH: <Banknote aria-hidden className="size-5" />,
  SWAP: <ArrowLeftRight aria-hidden className="size-5" />,
  SWAP_PLUS_CASH: <Coins aria-hidden className="size-5" />,
}

const modeTitles: Record<OfferMode, string> = {
  CASH: 'Cash offer',
  SWAP: 'Swap an item',
  SWAP_PLUS_CASH: 'Swap + cash',
}

export function TypeStep({ listing, draft, change, errors }: StepProps) {
  // Sample terms in the listing's own numbers, so the choice reads like the real thing
  const example = (mode: OfferMode) => {
    const cashKobo = mode === 'CASH' ? (listing.askingKobo ?? 10_000_000) : 5_000_000
    const parts: TradeParts = {
      terms: {
        mode,
        offeredItemId: mode === 'CASH' ? null : 'example',
        cashKobo: mode === 'SWAP' ? 0 : cashKobo,
        cashDirection: mode === 'SWAP' ? 'NONE' : 'OFFERER_PAYS_OWNER',
        note: '',
      },
      listingTitle: listing.title,
      itemTitle: 'item',
    }
    return `For example: “${tradeSentence(parts, 'offerer')}”`
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className={stepHeading}>What kind of offer?</h2>
      <Anchor name="mode">
        <RadioCards<OfferMode>
          label="Kind of offer"
          hideLabel
          options={allowedModes(listing.acceptedModes).map(({ mode, allowed, reason }) => ({
            value: mode,
            title: modeTitles[mode],
            description: example(mode),
            icon: modeIcons[mode],
            disabled: !allowed,
            disabledReason: reason,
          }))}
          value={draft.mode}
          onChange={(mode) => change({ mode })}
        />
        <FieldError message={errors.mode} />
      </Anchor>
      <p className="text-compact text-muted">
        Offers are free to make. Any cash is paid directly between you and the owner when you meet.
      </p>
    </div>
  )
}

/* ---------- Your item (UX-16, FE-OFF-03) ---------- */

export function ItemStep({
  draft,
  change,
  errors,
  items,
  itemsState,
  userId,
  config,
}: StepProps & {
  items: SwapItem[]
  itemsState: 'pending' | 'error' | 'ready'
  userId: string | null
  config: RuntimeConfig
}) {
  const [adding, setAdding] = useState(false)
  const none = itemsState === 'ready' && items.length === 0
  const formOpen = adding || none

  return (
    <div className="flex flex-col gap-4">
      <h2 className={stepHeading}>Which item are you offering?</h2>
      <p className="text-compact text-muted">You can offer one item. The other person sees its photos and details.</p>

      <Anchor name="offeredItemId">
        {itemsState === 'pending' ? (
          <div aria-busy="true" aria-label="Loading your items" className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-control bg-cloud" />
            ))}
          </div>
        ) : itemsState === 'error' ? (
          <p className="text-compact text-muted">
            We couldn’t load your items. You can still add one below, or go back and try again.
          </p>
        ) : none ? (
          <p className="text-body text-ink">
            You don’t have an item to offer yet. Add the one you’d like to swap: it stays private to this offer.
          </p>
        ) : (
          <RadioCards<string>
            label="Your items"
            hideLabel
            options={items.map((item) => ({
              value: item.id,
              title: item.title,
              description: (
                <>
                  <span>{item.source === 'listing' ? 'Listed' : 'Only visible in offers'}</span> ·{' '}
                  {conditionLabel(item.condition)} condition
                </>
              ),
              icon: <ItemThumb url={item.photos[0]?.url} size="sm" />,
              disabled: !item.available,
              disabledReason: item.unavailableReason,
            }))}
            value={draft.offeredItemId}
            onChange={(offeredItemId) => change({ offeredItemId })}
          />
        )}
        <FieldError message={errors.offeredItemId} />
      </Anchor>

      {formOpen ? (
        <OfferItemForm
          userId={userId}
          config={config}
          onCreated={(item) => {
            change({ offeredItemId: item.id })
            setAdding(false)
          }}
          onCancel={none ? undefined : () => setAdding(false)}
        />
      ) : (
        <PlainButton variant="secondary" onClick={() => setAdding(true)} className="self-start">
          <Plus aria-hidden className="size-5" />
          Add an item
        </PlainButton>
      )}
    </div>
  )
}

/* ---------- Cash (UX-15, UX-17, FE-OFF-02, FE-OFF-04) ---------- */

export function TermsStep({
  listing,
  draft,
  change,
  errors,
  item,
  onSwitchToSwap,
}: StepProps & { item?: SwapItem; onSwitchToSwap: () => void }) {
  const terms = draftTerms(draft)
  const parts: TradeParts = { terms, listingTitle: listing.title, itemTitle: item?.title ?? 'item' }
  const asking = listing.askingKobo

  if (draft.mode === 'CASH') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className={stepHeading}>How much are you offering?</h2>
        <Anchor name="cashKobo">
          <MoneyField
            label="Your offer"
            hint={asking !== null ? `The asking price is ${formatNaira(asking)}.` : undefined}
            value={draft.cashKobo}
            onChange={(cashKobo) => change({ cashKobo })}
            error={errors.cashKobo}
          />
        </Anchor>
        <LiveSentence placeholder="Enter an amount to see your offer in words.">
          {terms.cashKobo > 0 && tradeSentence(parts, 'offerer')}
        </LiveSentence>
        <p className="text-compact text-muted">
          You pay the owner directly when you meet. NextOwn never takes payment.
        </p>
      </div>
    )
  }

  const zero = draft.cashKobo === 0 && Boolean(errors.cashKobo)
  return (
    <div className="flex flex-col gap-5">
      <h2 className={stepHeading}>Add cash to the swap</h2>
      <div className="grid grid-cols-2 gap-2">
        <MiniSide label="You give" title={item?.title ?? 'Your item'} photoUrl={item?.photos[0]?.url} />
        <MiniSide label="You receive" title={listing.title} photoUrl={listing.cover.url} />
      </div>
      <Anchor name="cashDirection">
        <RadioCards<Exclude<CashDirection, 'NONE'>>
          label="Who adds the cash?"
          columns={2}
          options={[
            { value: 'OFFERER_PAYS_OWNER', title: 'I add cash', description: 'You pay the owner on top of your item.' },
            {
              value: 'OWNER_PAYS_OFFERER',
              title: 'I receive cash',
              description: 'The owner pays you on top of their item.',
            },
          ]}
          value={draft.cashDirection === 'NONE' ? null : draft.cashDirection}
          onChange={(cashDirection) => change({ cashDirection })}
        />
        <FieldError message={errors.cashDirection} />
      </Anchor>
      <Anchor name="cashKobo">
        <MoneyField
          label="Cash amount"
          value={draft.cashKobo}
          onChange={(cashKobo) => change({ cashKobo })}
          error={errors.cashKobo}
        />
        {zero && (
          <PlainButton variant="secondary" size="sm" onClick={onSwitchToSwap} className="mt-2 self-start">
            <Shuffle aria-hidden className="size-4" />
            Switch to Swap
          </PlainButton>
        )}
      </Anchor>
      <LiveSentence placeholder="Choose who adds the cash and the amount to see the trade in words.">
        {terms.cashDirection !== 'NONE' && terms.cashKobo > 0 && tradeSentence(parts, 'offerer')}
      </LiveSentence>
    </div>
  )
}

function MiniSide({ label, title, photoUrl }: { label: string; title: string; photoUrl?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-control border border-border bg-surface p-3">
      <p className="text-caption font-semibold text-muted">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <ItemThumb url={photoUrl} size="sm" />
        <p className="line-clamp-2 min-w-0 text-compact font-semibold text-ink">{title}</p>
      </div>
    </div>
  )
}

/* ---------- Review and send (UX-18, FE-OFF-05) ---------- */

export function ReviewStep({
  listing,
  draft,
  change,
  errors,
  item,
  lifetimeHours,
  status,
}: StepProps & { item?: SwapItem; lifetimeHours: number; status?: ReactNode }) {
  const now = useServerNow()
  const terms = draftTerms(draft)
  const parts: TradeParts = { terms, listingTitle: listing.title, itemTitle: item?.title ?? null }
  const sum = offerSum(parts, 'offerer')
  const cash = terms.cashDirection !== 'NONE' && terms.cashKobo > 0
  const iPay = viewerPays(terms, 'offerer')
  const expiresAt = new Date(now + lifetimeHours * 3_600_000).toISOString()

  const give: SideEntry[] = []
  if (item) {
    give.push({
      kind: 'item',
      title: item.title,
      photoUrl: item.photos[0]?.url,
      condition: item.condition,
      defects: item.defects,
      href: item.listingSlug ? `/listings/${item.listingSlug}` : undefined,
      privateNote: item.source === 'offer-only' ? offerOnlyNote : undefined,
    })
  }
  if (cash && iPay) give.push({ kind: 'cash', kobo: terms.cashKobo })
  const receive: SideEntry[] = [
    {
      kind: 'item',
      title: listing.title,
      photoUrl: listing.cover.url,
      condition: listing.condition,
      defects: listing.defects,
      href: `/listings/${listing.slug}`,
    },
  ]
  if (cash && !iPay) receive.push({ kind: 'cash', kobo: terms.cashKobo })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={stepHeading}>Check your offer</h2>
        <p className="text-compact text-muted">{modeLabels[terms.mode]}</p>
        <p className="max-w-prose text-body font-semibold text-ink">{tradeSentence(parts, 'offerer')}</p>
      </div>

      <OfferSum {...sum} animateIn />

      <div className="grid gap-3 tablet:grid-cols-2">
        <SideCard title="You give" entries={give} />
        <SideCard title="You receive" entries={receive} />
      </div>

      <Anchor name="note">
        <TextAreaField
          label="Add a note (optional)"
          hint="Sent with your offer. The terms above are what count, not the note."
          rows={3}
          maxLength={NOTE_MAX}
          value={draft.note}
          onChange={(e) => change({ note: e.target.value })}
          error={errors.note}
        />
      </Anchor>

      <p className="flex items-start gap-2 text-compact text-ink">
        <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        <span>
          If {listing.seller.displayName} doesn’t answer, this offer expires{' '}
          <span className="tabular font-semibold">{formatWAT(expiresAt)}</span> (in {lifetimeHours} hours).
        </span>
      </p>

      <ul className="flex flex-col gap-2 rounded-control border border-border bg-surface p-4 text-compact text-ink">
        <li className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          {copy.beforeSend}
        </li>
        <li className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          This is an offer, not a completed transaction.
        </li>
        <li className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          <span>
            <span>{copy.handoverCaution}</span>{' '}
            <Link
              to="/support"
              className="inline-flex items-center gap-1 font-semibold text-action underline-offset-4 hover:underline"
            >
              <LifeBuoy aria-hidden className="size-3.5" />
              Safety tips
            </Link>
          </span>
        </li>
      </ul>

      {status}
    </div>
  )
}
