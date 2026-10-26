import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listingKeys } from '@/features/listings/api'
import { offerKeys } from '@/features/offers/api'
import { ownListingKeys } from '@/features/selling/api'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import type { CancelReason, ConfirmCheck, DisputeCategory, MediaRef, ReviewWithContext, Transaction } from '@/types/api'

/** Member data: signing out removes these with everything else that isn't public. */
export const transactionKeys = {
  all: ['transactions'] as const,
  list: () => ['transactions', 'list'] as const,
  one: (id: string) => ['transactions', 'one', id] as const,
  reviews: ['my-reviews'] as const,
}

/** The other person can confirm, propose or report at any time, so open screens poll (PRD §7.3). */
export const TRANSACTION_POLL_MS = 30_000

export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.list(),
    queryFn: ({ signal }) => apiClient.get<Transaction[]>('/transactions', { signal }).then((r) => r.data),
    refetchInterval: TRANSACTION_POLL_MS,
  })
}

export const fetchTransaction = (id: string, signal?: AbortSignal) =>
  apiClient.get<Transaction>(`/transactions/${id}`, { signal }).then((r) => r.data)

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.one(id),
    queryFn: ({ signal }) => fetchTransaction(id, signal),
    refetchInterval: TRANSACTION_POLL_MS,
    refetchOnWindowFocus: 'always',
  })
}

export function useMyReviews() {
  return useQuery({
    queryKey: transactionKeys.reviews,
    queryFn: ({ signal }) =>
      apiClient
        .get<{ received: ReviewWithContext[]; given: ReviewWithContext[] }>('/me/reviews', { signal })
        .then((r) => r.data),
  })
}

export type TransactionAction =
  | { kind: 'meeting'; place: string; time: string; note: string }
  | { kind: 'agree-meeting' }
  | { kind: 'confirm'; checks: ConfirmCheck[] }
  | { kind: 'cancel-request'; reason: CancelReason; note: string }
  | { kind: 'cancel-accept' }
  | { kind: 'cancel-decline' }
  | { kind: 'cancel-withdraw' }
  | { kind: 'dispute'; category: DisputeCategory; description: string; evidence: MediaRef[] }
  | { kind: 'review'; rating: number; note: string }

function send(id: string, action: TransactionAction, idempotencyKey: string) {
  const base = `/transactions/${id}`
  const config = { headers: idempotencyHeaders(idempotencyKey) }
  const { kind: _kind, ...body } = action as TransactionAction & Record<string, unknown>
  switch (action.kind) {
    case 'meeting':
      return apiClient.put<Transaction>(`${base}/meeting`, body, config)
    case 'agree-meeting':
      return apiClient.post<Transaction>(`${base}/meeting/agree`, {}, config)
    case 'confirm':
      return apiClient.post<Transaction>(`${base}/confirm`, body, config)
    case 'cancel-request':
      return apiClient.post<Transaction>(`${base}/cancellation`, body, config)
    case 'cancel-accept':
      return apiClient.post<Transaction>(`${base}/cancellation/accept`, {}, config)
    case 'cancel-decline':
      return apiClient.post<Transaction>(`${base}/cancellation/decline`, {}, config)
    case 'cancel-withdraw':
      return apiClient.delete<Transaction>(`${base}/cancellation`, config)
    case 'dispute':
      return apiClient.post<Transaction>(`${base}/dispute`, body, config)
    case 'review':
      return apiClient.post<Transaction>(`${base}/review`, body, config)
  }
}

export function useTransactionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, idempotencyKey }: { action: TransactionAction; idempotencyKey: string }) =>
      send(id, action, idempotencyKey).then((r) => r.data),
    onSuccess: (tx) => {
      queryClient.setQueryData(transactionKeys.one(tx.id), tx)
      void queryClient.invalidateQueries({ queryKey: transactionKeys.list() })
      void queryClient.invalidateQueries({ queryKey: transactionKeys.reviews })
      // A deal's end changes listings, offers and the profile's review count
      void queryClient.invalidateQueries({ queryKey: offerKeys.all })
      void queryClient.invalidateQueries({ queryKey: listingKeys.all })
      void queryClient.invalidateQueries({ queryKey: ownListingKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
