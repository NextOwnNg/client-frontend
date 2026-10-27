import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  fetchTransaction,
  transactionKeys,
  useTransactionMutation,
  type TransactionAction,
} from '@/features/transactions/api'
import type { FieldErrors } from '@/features/selling/listing-input'
import { toApiError } from '@/lib/api/api-error'
import { fieldErrorsOf, isSignedOut } from '@/lib/api/error-message'
import type { Transaction } from '@/types/api'

export type ActionResult =
  | { kind: 'done'; tx: Transaction }
  | { kind: 'invalid'; fieldErrors: FieldErrors }
  /** The deal moved on (another state, or already answered); the page shows the reread state. */
  | { kind: 'refused'; message: string }
  | { kind: 'not-done'; silent?: boolean }
  | { kind: 'unknown' }

const MIN_CHECK_MS = 500

/** Did the server already make this change? Read from the deal as it is now (PRD §7.4). */
function happened(action: TransactionAction, tx: Transaction, viewerId: string) {
  switch (action.kind) {
    case 'confirm':
      return Boolean(tx.confirmations[tx.viewerRole])
    case 'meeting':
      return tx.meeting?.proposedBy === viewerId && tx.meeting.place === action.place.trim()
    case 'agree-meeting':
      return Boolean(tx.meeting?.agreedBy.includes(viewerId))
    case 'cancel-request':
      return tx.cancellation?.requestedBy === viewerId
    case 'cancel-accept':
      return tx.status === 'CANCELLED'
    case 'cancel-decline':
    case 'cancel-withdraw':
      return !tx.cancellation
    case 'dispute':
      return tx.status === 'DISPUTED'
    case 'review':
      return Boolean(tx.review.mine)
  }
}

/**
 * Every change to a deal goes through here: one idempotency key per intent, and when the answer is lost,
 * "Checking the latest status…", a reread, and the real outcome. Never "failed" (PRD §7.4, QA-21).
 */
export function useTransactionAction(tx: Transaction, viewerId: string) {
  const queryClient = useQueryClient()
  const mutation = useTransactionMutation(tx.id)
  const keys = useRef(new Map<string, string>())
  const [checking, setChecking] = useState(false)

  const keyFor = (action: TransactionAction) => {
    const intent = JSON.stringify(action)
    let key = keys.current.get(intent)
    if (!key) {
      key = crypto.randomUUID()
      keys.current.set(intent, key)
    }
    return key
  }

  async function reread() {
    const fresh = await fetchTransaction(tx.id)
    queryClient.setQueryData(transactionKeys.one(tx.id), fresh)
    void queryClient.invalidateQueries({ queryKey: transactionKeys.list() })
    return fresh
  }

  async function run(action: TransactionAction): Promise<ActionResult> {
    try {
      return { kind: 'done', tx: await mutation.mutateAsync({ action, idempotencyKey: keyFor(action) }) }
    } catch (error) {
      const e = toApiError(error)
      if (e.isOutcomeUnknown) {
        setChecking(true)
        try {
          const [fresh] = await Promise.all([reread(), new Promise((r) => setTimeout(r, MIN_CHECK_MS))])
          return happened(action, fresh, viewerId) ? { kind: 'done', tx: fresh } : { kind: 'not-done' }
        } catch {
          return { kind: 'unknown' }
        } finally {
          setChecking(false)
        }
      }
      const fields = fieldErrorsOf(e)
      if (fields) return { kind: 'invalid', fieldErrors: fields }
      if (isSignedOut(e)) return { kind: 'not-done', silent: true }
      // The deal moved on (the other person acted, or it's no longer open): show its state and why
      if (e.status === 403 || e.status === 409) {
        void reread().catch(() => undefined)
        return { kind: 'refused', message: e.message }
      }
      return { kind: 'not-done' }
    }
  }

  return { run, pending: mutation.isPending || checking, checking }
}
