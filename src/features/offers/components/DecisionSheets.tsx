import { Button } from '@heroui/react'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { OfferSum } from '@/components/domain/OfferSum'
import { MoneyField } from '@/components/ui/MoneyField'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { TextAreaField } from '@/components/ui/TextAreaField'
import {
  diffVersions,
  NOTE_MAX,
  offerSum,
  partsOf,
  toPayload,
  tradeSentence,
  validateTerms,
  viewerPays,
} from '@/features/offers/offer-terms'
import type { FieldErrors } from '@/features/selling/listing-input'
import { copy } from '@/lib/copy/copy'
import type { CashDirection, Offer, OfferTerms, OfferVersion } from '@/types/api'

/**
 * The last look before accepting (FE-OFF-08): the full terms of the exact version being accepted, and what
 * accepting does. The version is fixed when the sheet opens, so a counter that arrives meanwhile can't slip in.
 */
export function AcceptSheet({
  offer,
  version,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  offer: Offer
  version: OfferVersion
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const parts = partsOf(offer, version)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title="Accept this offer?"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 tablet:flex-row tablet:justify-end">
          <Button
            variant="tertiary"
            isDisabled={pending}
            onPress={() => onOpenChange(false)}
            className="w-full tablet:w-auto"
          >
            Cancel
          </Button>
          <Button isPending={pending} onPress={onConfirm} className="w-full tablet:w-auto">
            Accept offer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body font-semibold text-ink">{tradeSentence(parts, offer.viewerRole)}</p>
        <OfferSum {...offerSum(parts, offer.viewerRole)} heading={`Version ${version.number}, worked out`} />
        <ul className="flex flex-col gap-2 text-compact text-ink">
          <li className="flex items-start gap-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
            Accepting reserves both items for this deal and closes other offers on them.
          </li>
          <li className="flex items-start gap-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
            {copy.handoverCaution}
          </li>
        </ul>
      </div>
    </Sheet>
  )
}

type CashChoice = 'none' | 'pay' | 'receive'

/** The reader's cash choice as the API's direction: "I add cash" means different things to each side. */
function directionFor(choice: CashChoice, viewer: Offer['viewerRole']): CashDirection {
  if (choice === 'none') return 'NONE'
  const offererPays = (choice === 'pay') === (viewer === 'offerer')
  return offererPays ? 'OFFERER_PAYS_OWNER' : 'OWNER_PAYS_OFFERER'
}

/**
 * A counteroffer (FE-OFF-09), filled in with the current terms. The amount, who pays and the note can change;
 * the item stays the same (ruling R4-3). What changed is spelled out as it's typed.
 */
export function CounterSheet({
  offer,
  open,
  pending,
  serverErrors,
  onOpenChange,
  onSubmit,
}: {
  offer: Offer
  open: boolean
  pending: boolean
  serverErrors: FieldErrors
  onOpenChange: (open: boolean) => void
  onSubmit: (terms: OfferTerms, expectedVersionId: string) => void
}) {
  const latest = offer.versions.at(-1)!
  const viewer = offer.viewerRole
  const isCash = latest.mode === 'CASH'
  const [choice, setChoice] = useState<CashChoice>(() =>
    latest.cashDirection === 'NONE' ? 'none' : viewerPays(latest, viewer) ? 'pay' : 'receive',
  )
  const [cashKobo, setCashKobo] = useState<number | null>(latest.cashKobo || null)
  const [note, setNote] = useState('')
  const [shown, setShown] = useState(false)

  const terms: OfferTerms = toPayload({
    mode: isCash ? 'CASH' : choice === 'none' ? 'SWAP' : 'SWAP_PLUS_CASH',
    offeredItemId: latest.offeredItemId,
    cashKobo: cashKobo ?? 0,
    cashDirection: isCash ? 'OFFERER_PAYS_OWNER' : directionFor(choice, viewer),
    note,
  })
  const changes = diffVersions(latest, terms, viewer)
  const errors: FieldErrors = { ...validateTerms(terms, offer.listing.acceptedModes), ...serverErrors }
  if (changes.length === 0 && !terms.note) errors.terms = 'Change the amount, who pays, or add a note to counter.'
  const visible = shown ? errors : serverErrors
  const parts = { ...partsOf(offer, latest), terms }

  function submit() {
    if (Object.keys(errors).length) return setShown(true)
    onSubmit(terms, latest.id)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title="Make a counteroffer"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 tablet:flex-row tablet:justify-end">
          <Button
            variant="tertiary"
            isDisabled={pending}
            onPress={() => onOpenChange(false)}
            className="w-full tablet:w-auto"
          >
            Cancel
          </Button>
          <Button isPending={pending} onPress={submit} className="w-full tablet:w-auto">
            Send counteroffer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {!isCash && (
          <div className="flex flex-col gap-1">
            <RadioCards<CashChoice>
              label="Cash on top of the swap"
              options={[
                { value: 'none', title: 'No cash', description: 'A straight swap.' },
                { value: 'pay', title: 'I add cash', description: 'You pay the other person on top.' },
                { value: 'receive', title: 'I receive cash', description: 'The other person pays you on top.' },
              ]}
              value={choice}
              onChange={setChoice}
            />
            {visible.cashDirection && <p className="text-compact text-danger">{visible.cashDirection}</p>}
          </div>
        )}
        {(isCash || choice !== 'none') && (
          <MoneyField label="Cash amount" value={cashKobo} onChange={setCashKobo} error={visible.cashKobo} />
        )}
        <TextAreaField
          label="Add a note (optional)"
          rows={2}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={visible.note}
        />

        <div aria-live="polite" className="flex flex-col gap-2 rounded-control bg-mint/60 px-4 py-3">
          {changes.length > 0 ? (
            <ul className="flex flex-col gap-1 text-compact text-ink">
              {changes.map((change) => (
                <li key={change.field}>
                  <span className="font-semibold">{change.label}:</span>{' '}
                  <span className="tabular">
                    {change.before} → {change.after}
                  </span>
                  {change.note && <span className="block font-semibold text-action">{change.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-compact text-muted">Same terms as version {latest.number} so far.</p>
          )}
          {terms.cashKobo > 0 || terms.mode === 'SWAP' ? (
            <p className="text-body font-semibold text-ink">{tradeSentence(parts, viewer)}</p>
          ) : null}
        </div>
        {visible.terms && <p className="text-compact text-danger">{visible.terms}</p>}
        {visible.offeredItemId && <p className="text-compact text-danger">{visible.offeredItemId}</p>}
        {visible.mode && <p className="text-compact text-danger">{visible.mode}</p>}
      </div>
    </Sheet>
  )
}
