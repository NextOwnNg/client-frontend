import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { listingKeys } from '@/features/listings/api'
import { ownListingKeys } from '@/features/selling/api'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import type { NewOffer, Offer, OfferItemInput, OfferTerms, SwapItem } from '@/types/api'

/** Member data: signing out removes these with everything else that isn't public. */
export const offerKeys = {
  all: ['offers'] as const,
  list: () => ['offers', 'list'] as const,
  one: (id: string) => ['offers', 'one', id] as const,
}
export const myItemsKey = ['my-items'] as const

/** Offers change when the other person acts, so open screens poll (PRD §7.3, FE-OFF-06). */
export const OFFER_POLL_MS = 30_000

export function useOffers() {
  return useQuery({
    queryKey: offerKeys.list(),
    queryFn: ({ signal }) => apiClient.get<Offer[]>('/offers', { signal }).then((r) => r.data),
    refetchInterval: OFFER_POLL_MS,
  })
}

export const fetchOffer = (id: string, signal?: AbortSignal) =>
  apiClient.get<Offer>(`/offers/${id}`, { signal }).then((r) => r.data)

export function useOffer(id: string) {
  return useQuery({
    queryKey: offerKeys.one(id),
    queryFn: ({ signal }) => fetchOffer(id, signal),
    refetchInterval: OFFER_POLL_MS,
    // Every actionable screen rereads on focus (PRD §7.3), even if it was fetched moments ago
    refetchOnWindowFocus: 'always',
  })
}

export function useMyItems() {
  return useQuery({
    queryKey: myItemsKey,
    queryFn: ({ signal }) => apiClient.get<SwapItem[]>('/me/items', { signal }).then((r) => r.data),
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OfferItemInput) => apiClient.post<SwapItem>('/me/items', input).then((r) => r.data),
    onSuccess: (item) => {
      queryClient.setQueryData<SwapItem[]>(myItemsKey, (items) => (items ? [item, ...items] : [item]))
    },
  })
}

/** After a decision, the offer, the inbox and both listings may have changed. */
export function settleOffer(queryClient: QueryClient, offer?: Offer) {
  if (offer) queryClient.setQueryData(offerKeys.one(offer.id), offer)
  void queryClient.invalidateQueries({ queryKey: offerKeys.list() })
  void queryClient.invalidateQueries({ queryKey: myItemsKey })
  void queryClient.invalidateQueries({ queryKey: listingKeys.all })
  void queryClient.invalidateQueries({ queryKey: ownListingKeys.all })
}

/** Sends an offer. The caller makes `idempotencyKey` once per intent and reuses it on retries (PRD §7.4). */
export function useSendOffer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ offer, idempotencyKey }: { offer: NewOffer; idempotencyKey: string }) =>
      apiClient.post<Offer>('/offers', offer, { headers: idempotencyHeaders(idempotencyKey) }).then((r) => r.data),
    onSuccess: (offer) => settleOffer(queryClient, offer),
  })
}

export type OfferDecision =
  | { action: 'accept'; expectedVersionId: string }
  | { action: 'counter'; expectedVersionId: string; terms: OfferTerms }
  | { action: 'decline' | 'withdraw' }

export function useOfferDecision(offerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ decision, idempotencyKey }: { decision: OfferDecision; idempotencyKey: string }) => {
      const body =
        decision.action === 'counter'
          ? { expectedVersionId: decision.expectedVersionId, ...decision.terms }
          : decision.action === 'accept'
            ? { expectedVersionId: decision.expectedVersionId }
            : {}
      return apiClient
        .post<Offer>(`/offers/${offerId}/${decision.action}`, body, { headers: idempotencyHeaders(idempotencyKey) })
        .then((r) => r.data)
    },
    onSuccess: (offer) => settleOffer(queryClient, offer),
  })
}
