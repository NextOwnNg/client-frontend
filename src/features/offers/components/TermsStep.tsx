import { Shuffle } from 'lucide-react'
import { PlainButton } from '@/components/ui/Button'
import { MoneyField } from '@/components/ui/MoneyField'
import { RadioCards } from '@/components/ui/RadioCards'
import { tradeSentence, type TradeParts } from '@/features/offers/offer-terms'
import { draftTerms } from '@/features/offers/use-offer-draft'
import { formatNaira } from '@/lib/money/money'
import type { CashDirection, SwapItem } from '@/types/api'
import { type StepProps, stepHeading } from '@/features/offers/components/composer-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'
import { FieldError } from '@/features/offers/components/FieldError'
import { LiveSentence } from '@/features/offers/components/LiveSentence'
import { MiniSide } from '@/features/offers/components/MiniSide'

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
        <FieldAnchor className="flex flex-col gap-1" name="cashKobo">
          <MoneyField
            label="Your offer"
            hint={asking !== null ? `The asking price is ${formatNaira(asking)}.` : undefined}
            value={draft.cashKobo}
            onChange={(cashKobo) => change({ cashKobo })}
            error={errors.cashKobo}
          />
        </FieldAnchor>
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
      <FieldAnchor className="flex flex-col gap-1" name="cashDirection">
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
      </FieldAnchor>
      <FieldAnchor className="flex flex-col gap-1" name="cashKobo">
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
      </FieldAnchor>
      <LiveSentence placeholder="Choose who adds the cash and the amount to see the trade in words.">
        {terms.cashDirection !== 'NONE' && terms.cashKobo > 0 && tradeSentence(parts, 'offerer')}
      </LiveSentence>
    </div>
  )
}
