import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { fetchOffer, offerKeys, useOfferDecision, type OfferDecision } from '@/features/offers/api'
import type { FieldErrors } from '@/features/selling/listing-input'
import { toApiError } from '@/lib/api/api-error'
import { fieldErrorsOf, isRefused, isSignedOut } from '@/lib/api/error-message'
import type { Offer } from '@/types/api'

export type DecisionResult =
  | { kind: 'done'; offer: Offer }
  | { kind: 'stale' }
  | { kind: 'unavailable' }
  | { kind: 'expired' }
  | { kind: 'invalid'; fieldErrors: FieldErrors }
  | { kind: 'refused' }
  /** Nothing changed on the server; safe to try again with the same key. */
  | { kind: 'not-done'; silent?: boolean }
  /** The answer was lost and the check failed too. */
  | { kind: 'unknown' }

/** Long enough to read, so a quick answer doesn't flash past. */
const MIN_CHECK_MS = 500

/** Did the server already make this change? Read from the offer as it is now (PRD §7.4). */
function happened(decision: OfferDecision, fresh: Offer, before: Offer, viewerId: string) {
  switch (decision.action) {
    case 'accept':
      return fresh.status === 'ACCEPTED'
    case 'decline':
      return fresh.status === 'REJECTED'
    case 'withdraw':
      return fresh.status === 'WITHDRAWN'
    case 'counter':
      return fresh.versions.length > before.versions.length && fresh.versions.at(-1)!.authorId === viewerId
  }
}

/**
 * Accept, counter, decline and withdraw (FE-OFF-08/09). One idempotency key per intent, reused if the same
 * decision is retried. When the answer is lost, it says "Checking the latest status…", rereads the offer and
 * reports what really happened, never "failed".
 */
/** Codes that mean the offer moved on since it was loaded; each opens its own state on the offer page. */
const offerMovedOn: Partial<Record<string, 'stale' | 'unavailable' | 'expired'>> = {
  STALE_OFFER_VERSION: 'stale',
  ITEM_UNAVAILABLE: 'unavailable',
  OFFER_EXPIRED: 'expired',
}

export function useDecision(offer: Offer, viewerId: string) {
  const queryClient = useQueryClient()
  const mutation = useOfferDecision(offer.id)
  const keys = useRef(new Map<string, string>())
  const [checking, setChecking] = useState(false)

  const keyFor = (decision: OfferDecision) => {
    const intent = JSON.stringify(decision)
    let key = keys.current.get(intent)
    if (!key) {
      key = crypto.randomUUID()
      keys.current.set(intent, key)
    }
    return key
  }

  async function reread() {
    const fresh = await fetchOffer(offer.id)
    queryClient.setQueryData(offerKeys.one(offer.id), fresh)
    void queryClient.invalidateQueries({ queryKey: offerKeys.list() })
    return fresh
  }
  const rereadQuietly = () => void reread().catch(() => undefined)

  async function decide(decision: OfferDecision): Promise<DecisionResult> {
    try {
      const result = await mutation.mutateAsync({ decision, idempotencyKey: keyFor(decision) })
      return { kind: 'done', offer: result }
    } catch (error) {
      const e = toApiError(error)
      if (e.isOutcomeUnknown) {
        setChecking(true)
        try {
          const [fresh] = await Promise.all([reread(), new Promise((r) => setTimeout(r, MIN_CHECK_MS))])
          return happened(decision, fresh, offer, viewerId) ? { kind: 'done', offer: fresh } : { kind: 'not-done' }
        } catch {
          return { kind: 'unknown' }
        } finally {
          setChecking(false)
        }
      }
      const fields = fieldErrorsOf(e)
      if (fields) return { kind: 'invalid', fieldErrors: fields }
      // The session prompt takes over; nothing to add here
      if (isSignedOut(e)) return { kind: 'not-done', silent: true }
      // Show the offer as it is now, with the state that explains why
      const outcome = offerMovedOn[e.code]
      if (outcome || isRefused(e)) {
        rereadQuietly()
        return { kind: outcome ?? 'refused' }
      }
      return { kind: 'not-done' }
    }
  }

  return { decide, pending: mutation.isPending || checking, checking }
}
