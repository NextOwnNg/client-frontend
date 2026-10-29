import { Button, toast } from '@heroui/react'
import { Inbox } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ListingRow, ListingTile } from '@/features/listings/components/ListingCards'
import { Deadline } from '@/components/domain/Deadline'
import { OfferSum } from '@/components/domain/OfferSum'
import { payerSentence } from '@/components/domain/payer-sentence'
import { Price } from '@/components/domain/Price'
import { AreaLabel, TrustModule } from '@/components/domain/TrustModule'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { MoneyField } from '@/components/ui/MoneyField'
import { PhoneField } from '@/components/ui/PhoneField'
import { ProgressLine } from '@/components/ui/ProgressLine'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { ListingRowSkeleton, ListingTileSkeleton } from '@/components/ui/Skeletons'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextField } from '@/components/ui/TextField'
import { ActiveChips, ChipRow, FiltersButton, ModeToggles } from '@/features/listings/components/FilterChips'
import { FilterPanel } from '@/features/listings/components/FilterPanel'
import { Gallery } from '@/features/listings/components/Gallery'
import { ConditionAndDefects } from '@/features/listings/components/ConditionAndDefects'
import { ListingHeader } from '@/features/listings/components/ListingHeader'
import { SellerCard } from '@/features/listings/components/SellerCard'
import { defaultFilters, type ListingFilters } from '@/features/listings/filters'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { listingStatus } from '@/lib/copy/status'
import { listings } from '@/mocks/fixtures/listings'
import type { ListingStatus, ListingSummary } from '@/types/api'

/** Dev-only gallery (route /dev/components): every component in its states, with fictional data. */

function DiscoverSamples() {
  const [filters, setFilters] = useState<ListingFilters>({
    ...defaultFilters,
    q: 'mac',
    modes: ['SWAP'],
    conditions: ['GOOD'],
    priceMin: 50_000,
  })
  const macbook = listings.find((l) => l.slug === 'macbook-air-m1-2020-gold')!
  const ipad = listings.find((l) => l.slug === 'ipad-9th-gen-64gb')!
  const xbox = listings.find((l) => l.slug === 'xbox-series-x')!

  return (
    <>
      <Section
        title="Filters"
        note="Mode toggles widen each other; chips remove one filter each. The panel is the phone sheet's body and the desktop rail."
      >
        <ChipRow label="Trade type">
          <FiltersButton filters={filters} onPress={() => {}} />
          <ModeToggles filters={filters} onChange={setFilters} />
        </ChipRow>
        <ActiveChips filters={filters} config={runtimeConfig} onChange={setFilters} />
        <div className="max-w-sm rounded-card border border-border bg-surface p-4">
          <FilterPanel filters={filters} onChange={setFilters} config={runtimeConfig} />
        </div>
      </Section>

      <Section
        title="Listing detail parts"
        note="Gallery, header (with a real Quick Sell deadline), seller facts, and defects above the offer button."
      >
        <div className="grid gap-6 desktop:grid-cols-2">
          <Gallery images={macbook.images} slug="dev-gallery" />
          <div className="flex flex-col gap-5">
            <ListingHeader listing={macbook} />
            <SellerCard listing={macbook} />
            <ConditionAndDefects listing={macbook} />
            <ConditionAndDefects listing={ipad} />
          </div>
        </div>
        <ListingHeader listing={xbox} />
      </Section>
    </>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 text-ink">{title}</h2>
        {note && <p className="max-w-2xl text-compact text-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}

const HOUR = 3_600_000
const LOADED_AT = Date.now()
const at = (hours: number) => new Date(LOADED_AT + hours * HOUR).toISOString()
const sample = listings[0] as ListingSummary
const variants: { label: string; listing: ListingSummary }[] = [
  { label: 'Available, swap ok', listing: sample },
  { label: 'Quick Sell', listing: listings[1] as ListingSummary },
  { label: 'Swap only', listing: listings[2] as ListingSummary },
  { label: 'Reserved', listing: { ...sample, id: 'v-r', status: 'RESERVED' } },
  { label: 'Expired', listing: { ...sample, id: 'v-e', status: 'EXPIRED' } },
  { label: 'Removed', listing: { ...sample, id: 'v-x', status: 'REMOVED' } },
  {
    label: 'Long title, large amount',
    listing: {
      ...sample,
      id: 'v-l',
      title: 'Apple iPhone 15 Pro Max · 1TB · Natural Titanium with original box and two cases',
      defectSummary: 'Hairline crack under the screen protector, bottom left corner',
      askingKobo: 10_000_000_000,
    },
  },
  {
    label: 'Photo failed to load',
    listing: { ...sample, id: 'v-p', cover: { ...sample.cover, url: '/mock/items/missing.jpg' } },
  },
]

const statuses: ListingStatus[] = [
  'ACTIVE',
  'PENDING_REVIEW',
  'RESERVED',
  'EXPIRED',
  'COMPLETED',
  'CLOSED',
  'REMOVED',
  'DRAFT',
]

export function ComponentsPage() {
  const [mode, setMode] = useState<'CASH' | 'SWAP' | 'MIXED'>('CASH')
  const [money, setMoney] = useState<number | null>(12_000_000)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sumKey, setSumKey] = useState(0)

  return (
    <div className="flex flex-col gap-12 pb-16">
      <Seo title="Component gallery" noindex />
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-ink tablet:text-h1">Component gallery</h1>
        <p className="max-w-2xl text-body text-muted">
          Phase 0 building blocks with fictional sample data. Use the Sample data button to slow the network or fail a
          request.
        </p>
        <ButtonLink to="/dev/tokens" variant="tertiary" className="self-start">
          Design tokens
        </ButtonLink>
      </div>

      <Section
        title="The worked sum"
        note="The signature: every trade written out as a sum, with the payer sentence as its answer."
      >
        <div className="grid gap-4 desktop:grid-cols-2">
          <OfferSum
            key={sumKey}
            animateIn
            give={[
              { kind: 'item', title: 'Your PS5 Disc Edition' },
              { kind: 'cash', title: 'Cash you add', kobo: 12_000_000 },
            ]}
            receive={{ title: 'MacBook Air M1, 2020' }}
            sentence={payerSentence({ viewer: 'offerer', direction: 'OFFERER_PAYS_OWNER', kobo: 12_000_000 })}
          />
          <OfferSum
            heading="Counteroffer, version 2"
            give={[
              { kind: 'item', title: 'Your PS5 Disc Edition' },
              { kind: 'cash', title: 'Cash you add', kobo: 17_000_000 },
            ]}
            receive={{ title: 'MacBook Air M1, 2020' }}
            sentence={payerSentence({ viewer: 'offerer', direction: 'OFFERER_PAYS_OWNER', kobo: 17_000_000 })}
            delta={{ kobo: 5_000_000, label: 'more than version 1' }}
          />
          <OfferSum
            heading="They add cash"
            give={[{ kind: 'item', title: 'Your iPhone 12 Pro Max' }]}
            receive={{ title: 'iPhone 12 Pro', kobo: 5_000_000 }}
            sentence={payerSentence({ viewer: 'offerer', direction: 'OWNER_PAYS_OFFERER', kobo: 5_000_000 })}
          />
          <OfferSum
            heading="Straight swap"
            give={[{ kind: 'item', title: 'Your Nintendo Switch with dock' }]}
            receive={{ title: 'PS4 · 500GB' }}
            sentence={payerSentence({ viewer: 'offerer', direction: 'NONE', kobo: 0 })}
          />
        </div>
        <Button variant="tertiary" className="self-start" onPress={() => setSumKey((k) => k + 1)}>
          Replay the write-in
        </Button>
      </Section>

      <Section
        title="Listing rows"
        note="Explore on phones. Unavailable listings stay visible but can't be mistaken for available ones."
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 tablet:grid-cols-2">
          {variants.map(({ label, listing }) => (
            <div key={listing.id} className="flex min-w-0 flex-col gap-2">
              <p className="text-caption font-semibold text-muted">{label}</p>
              <ListingRow listing={listing} />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold text-muted">Loading</p>
            <ListingRowSkeleton />
          </div>
        </div>
      </Section>

      <Section title="Listing tiles" note="Explore grid on wider screens.">
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 tablet:gap-4 desktop:grid-cols-4">
          {variants.slice(0, 7).map(({ listing }) => (
            <ListingTile key={listing.id} listing={listing} />
          ))}
          <ListingTileSkeleton />
        </div>
      </Section>

      <DiscoverSamples />

      <Section title="Status" note="Text and icon always; colour only reinforces.">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const st = listingStatus(s)
            return (
              <StatusBadge key={s} tone={st.tone} icon={st.icon}>
                {st.label}
              </StatusBadge>
            )
          })}
          {(() => {
            const st = listingStatus('ACTIVE', { urgencyLabel: 'Ends in 18h' })
            return (
              <StatusBadge tone={st.tone} icon={st.icon}>
                {st.label}
              </StatusBadge>
            )
          })()}
        </div>
        <div className="grid gap-6 tablet:grid-cols-3">
          <Deadline variant="detail" endsAt={at(18)} startedAt={at(-30)} />
          <Deadline variant="detail" endsAt={at(140)} startedAt={at(-28)} />
          <Deadline variant="detail" endsAt={at(-1)} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Price kobo={28_500_000} size="lg" />
          <Price kobo={null} size="lg" />
          <AreaLabel name="[Pilot Area] Central" />
        </div>
      </Section>

      <Section title="Trust" note="Facts, not badges. Ratings always carry their count.">
        <div className="grid gap-6 tablet:grid-cols-3">
          <TrustModule phoneConfirmed reviewCount={12} rating={4.8} />
          <TrustModule phoneConfirmed reviewCount={1} rating={5} />
          <TrustModule phoneConfirmed reviewCount={0} />
        </div>
      </Section>

      <Section title="Fields">
        <div className="grid max-w-3xl gap-6 tablet:grid-cols-2">
          <TextField
            label="Title"
            placeholder="e.g. iPhone 12 Pro · 128GB"
            hint="Say what it is, plus model and storage."
          />
          <TextField label="Title" defaultValue="iP" error="Add a little more detail, at least 8 characters." />
          <MoneyField
            label="Your offer"
            value={money}
            onChange={setMoney}
            hint="Try 12.5 or ₦1,200,000 and leave the field."
          />
          <PhoneField value="" onChange={() => {}} />
          <TextField label="Disabled" defaultValue="Can't change after acceptance" disabled />
        </div>
        <div className="max-w-3xl">
          <RadioCards
            label="How do you want to trade?"
            value={mode}
            onChange={setMode}
            columns={3}
            options={[
              { value: 'CASH', title: 'Cash offer', description: 'You pay the seller directly.' },
              { value: 'SWAP', title: 'Swap an item', description: 'One of your items for theirs.' },
              {
                value: 'MIXED',
                title: 'Swap + cash',
                description: 'Your item plus cash, either way.',
                disabled: true,
                disabledReason: 'The seller only accepts cash.',
              },
            ]}
          />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Make an offer</Button>
          <Button variant="secondary">Counter</Button>
          <Button variant="tertiary">Review terms</Button>
          <Button variant="danger">Close listing</Button>
          <Button variant="primary" isPending>
            Sending
          </Button>
          <Button variant="primary" isDisabled>
            Disabled
          </Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
        </div>
      </Section>

      <Section
        title="Progress"
        note="One corridor from terms to both confirmations; ticks draw only when a step is truly done."
      >
        <div className="grid gap-8 tablet:grid-cols-2">
          <ProgressLine
            label="Handover progress"
            steps={[
              { id: 'terms', label: 'Check terms', state: 'done' },
              { id: 'meet', label: 'Arrange meeting', state: 'done' },
              { id: 'inspect', label: 'Inspect and exchange', state: 'current' },
              { id: 'confirm', label: 'Both confirm', state: 'todo' },
            ]}
          />
          <ProgressLine
            label="Listing steps"
            steps={[
              { id: 'photos', label: 'Photos and basics', state: 'done' },
              { id: 'condition', label: 'Condition', state: 'current' },
              { id: 'trade', label: 'Trade options', state: 'todo' },
              { id: 'preview', label: 'Preview', state: 'todo' },
            ]}
          />
        </div>
      </Section>

      <Section title="Messages and feedback">
        <div className="grid max-w-3xl gap-3">
          <Banner tone="info" title="Inspect the items first.">
            NextOwn does not hold or independently verify payments in this pilot.
          </Banner>
          <Banner tone="success" title="Your confirmation is recorded.">
            Waiting for the other person to confirm.
          </Banner>
          <Banner
            tone="warning"
            title="The offer has changed."
            action={
              <Button variant="secondary" size="sm">
                Review latest version
              </Button>
            }
          >
            Review the latest version before deciding.
          </Banner>
          <Banner tone="danger" title="This item is no longer available.">
            Your offer was not sent. Your draft is saved.
          </Banner>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onPress={() => toast.success('Saved to your list')}>
            Show a toast
          </Button>
          <Button variant="secondary" onPress={() => setSheetOpen(true)}>
            Open a sheet
          </Button>
          <Button variant="secondary" onPress={() => setConfirmOpen(true)}>
            Open a confirmation
          </Button>
        </div>
        <div className="grid gap-4 rounded-card border border-border bg-surface tablet:grid-cols-2">
          <EmptyState
            icon={Inbox}
            title="No offers yet"
            body="When someone makes an offer on your listing, it shows up here."
            action={
              <ButtonLink to="/explore" variant="secondary">
                Explore items
              </ButtonLink>
            }
          />
          <ErrorState onRetry={() => toast('Retrying…')} />
        </div>
      </Section>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filters"
        footer={
          <Button variant="primary" fullWidth onPress={() => setSheetOpen(false)}>
            Show 24 results
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-body text-muted">Drag down to dismiss on a phone, or press Escape.</p>
          <RadioCards
            label="Trade mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'CASH', title: 'For sale' },
              { value: 'SWAP', title: 'Open to swap' },
              { value: 'MIXED', title: 'Swap + cash' },
            ]}
          />
        </div>
      </Sheet>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Accept this offer?"
        body="Both items will be reserved and other offers on them will close. You'll arrange the handover next."
        confirmLabel="Accept offer"
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 900))}
      />
    </div>
  )
}
