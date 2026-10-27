import { RadioCards } from '@/components/ui/RadioCards'
import { allowedModes, tradeSentence, type TradeParts } from '@/features/offers/offer-terms'
import type { OfferMode } from '@/types/api'
import { type StepProps, stepHeading } from '@/features/offers/components/composer-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'
import { FieldError } from '@/features/offers/components/FieldError'
import { modeIcons, modeTitles } from '@/features/offers/components/offer-modes'

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
      <FieldAnchor className="flex flex-col gap-1" name="mode">
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
      </FieldAnchor>
      <p className="text-compact text-muted">
        Offers are free to make. Any cash is paid directly between you and the owner when you meet.
      </p>
    </div>
  )
}
