import { useCallback } from 'react'
import { z } from 'zod'
import { toPayload, validateTerms } from '@/features/offers/offer-terms'
import { addFieldIssues } from '@/lib/forms/form-errors'
import { useDraftStore, useFormDraft } from '@/stores/drafts'
import type { CashDirection, OfferMode, OfferTerms, SwapItem, TradeMode } from '@/types/api'

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

/** The fields a person fills in; the idempotency key belongs to sending, not to the form. */
export type OfferFields = Omit<OfferDraft, 'idempotencyKey'>

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
export function draftTerms(draft: OfferFields): OfferTerms {
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

/** The fields each step asks for; Continue checks only these (the review checks everything). */
export const fieldsOfStep = (step: ComposerStep) =>
  (Object.keys(fieldStep) as (keyof OfferFields)[]).filter((field) => fieldStep[field] === step)

/**
 * The composer's rules as a schema. The terms rules are `validateTerms`, shared with counteroffers, so they
 * aren't repeated here; an item that's been reserved meanwhile can't be offered either.
 */
export function offerSchema(acceptedModes: TradeMode[], items: SwapItem[]) {
  return z
    .object({
      mode: z.custom<OfferMode | null>(),
      offeredItemId: z.string().nullable(),
      cashKobo: z.number().nullable(),
      cashDirection: z.custom<CashDirection>(),
      note: z.string(),
    })
    .superRefine((fields, ctx) => {
      if (!fields.mode) {
        ctx.addIssue({ code: 'custom', path: ['mode'], message: 'Choose how you want to make your offer.' })
        return
      }
      const errors = validateTerms(draftTerms(fields), acceptedModes)
      const item = items.find((i) => i.id === fields.offeredItemId)
      if (fields.mode !== 'CASH' && item && !item.available && !errors.offeredItemId) {
        errors.offeredItemId = `${item.title}: ${item.unavailableReason}.`
      }
      addFieldIssues(ctx, errors)
    })
}

/** The composer's form state, kept in the session draft store until the offer is sent (24 h at most). */
export function useOfferDraft(userId: string | null, listingId: string) {
  const key = offerDraftKey(userId, listingId)
  const [draft, , clear] = useFormDraft<OfferDraft>(key, emptyOfferDraft)

  // Read the latest stored value, so two changes in one event don't overwrite each other
  const latest = useCallback(
    () => (useDraftStore.getState().drafts[key]?.value as OfferDraft | undefined) ?? emptyOfferDraft,
    [key],
  )
  const save = useCallback((value: OfferDraft) => useDraftStore.getState().saveDraft(key, value), [key])

  /** Any change to the terms is a new intent, so it gets a new idempotency key when sent. */
  const change = useCallback(
    (changes: Partial<OfferFields>) => save({ ...latest(), ...changes, idempotencyKey: null }),
    [latest, save],
  )

  /** The key for this send: made once, reused on every retry of the same terms. */
  const sendKey = useCallback(() => {
    const current = latest()
    if (current.idempotencyKey) return current.idempotencyKey
    const idempotencyKey = crypto.randomUUID()
    save({ ...current, idempotencyKey })
    return idempotencyKey
  }, [latest, save])

  return { draft, change, sendKey, clear }
}
