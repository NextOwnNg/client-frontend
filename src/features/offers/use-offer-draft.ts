import { toPayload, validateTerms } from '@/features/offers/offer-terms'
import type { FieldErrors } from '@/features/selling/listing-input'
import { useDraftStore, useFormDraft } from '@/stores/drafts'
import type { CashDirection, OfferMode, OfferTerms, TradeMode } from '@/types/api'

export type ComposerStep = 'type' | 'item' | 'terms' | 'review'

const stepLabels: Record<ComposerStep, string> = {
  type: 'Kind of offer',
  item: 'Your item',
  terms: 'Cash',
  review: 'Review',
}

/** Cash offers skip the item; plain swaps skip the cash. The note sits on the review step for every kind. */
export function composerSteps(mode: OfferMode | null): { id: ComposerStep; label: string }[] {
  const ids: ComposerStep[] =
    mode === 'SWAP'
      ? ['type', 'item', 'review']
      : mode === 'SWAP_PLUS_CASH'
        ? ['type', 'item', 'terms', 'review']
        : ['type', 'terms', 'review']
  return ids.map((id) => ({ id, label: stepLabels[id] }))
}

/** What the composer keeps between visits (PRD §7.7). The key belongs to one send intent (PRD §7.4). */
export type OfferDraft = {
  mode: OfferMode | null
  offeredItemId: string | null
  cashKobo: number | null
  cashDirection: CashDirection
  note: string
  idempotencyKey: string | null
}

export const emptyOfferDraft: OfferDraft = {
  mode: null,
  offeredItemId: null,
  cashKobo: null,
  cashDirection: 'NONE',
  note: '',
  idempotencyKey: null,
}

export const offerDraftKey = (userId: string | null, listingId: string) => `offer:${userId}:${listingId}`

/** The draft as the terms that would be sent. */
export function draftTerms(draft: OfferDraft): OfferTerms {
  return toPayload({
    mode: draft.mode ?? 'CASH',
    offeredItemId: draft.offeredItemId,
    cashKobo: draft.cashKobo ?? 0,
    cashDirection: draft.cashDirection,
    note: draft.note,
  })
}

const fieldStep: Record<string, ComposerStep> = {
  mode: 'type',
  offeredItemId: 'item',
  cashKobo: 'terms',
  cashDirection: 'terms',
  note: 'review',
}

export const stepOfOfferField = (field: string): ComposerStep => fieldStep[field] ?? 'review'

/** Problems that belong to `step`, or to every step up to the review. */
export function offerStepErrors(step: ComposerStep, draft: OfferDraft, acceptedModes: TradeMode[]): FieldErrors {
  if (step === 'type' && !draft.mode) return { mode: 'Choose how you want to make your offer.' }
  const errors = draft.mode ? validateTerms(draftTerms(draft), acceptedModes) : { mode: 'Choose a kind of offer.' }
  if (step === 'review') return errors
  return Object.fromEntries(Object.entries(errors).filter(([field]) => stepOfOfferField(field) === step))
}

/** The composer's form state, kept in the session draft store until the offer is sent (24 h at most). */
export function useOfferDraft(userId: string | null, listingId: string) {
  const key = offerDraftKey(userId, listingId)
  const [draft, , clear] = useFormDraft<OfferDraft>(key, emptyOfferDraft)

  // Read the latest stored value, so two changes in one event don't overwrite each other
  const latest = () => (useDraftStore.getState().drafts[key]?.value as OfferDraft | undefined) ?? emptyOfferDraft
  const save = (value: OfferDraft) => useDraftStore.getState().saveDraft(key, value)

  return {
    draft,
    /** Any change to the terms is a new intent, so it gets a new idempotency key when sent. */
    change: (changes: Partial<OfferDraft>) => save({ ...latest(), ...changes, idempotencyKey: null }),
    /** The key for this send: made once, reused on every retry of the same terms. */
    sendKey: () => {
      const current = latest()
      if (current.idempotencyKey) return current.idempotencyKey
      const idempotencyKey = crypto.randomUUID()
      save({ ...current, idempotencyKey })
      return idempotencyKey
    },
    clear,
  }
}
