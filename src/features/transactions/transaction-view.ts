import type { ProgressStep } from '@/components/ui/ProgressLine'
import { viewerPays, type TradeParts, type Viewer } from '@/features/offers/offer-terms'
import type { AgreementSnapshot, CancelReason, ConfirmCheck, SnapshotItem, Transaction } from '@/types/api'

/** Cash changes hands in these terms. */
export const hasCash = (a: Pick<AgreementSnapshot, 'cashKobo' | 'cashDirection'>) =>
  a.cashDirection !== 'NONE' && a.cashKobo > 0

/**
 * The statements a person must tick to confirm their side (FE-TRX-05): receiving an item, handing over
 * an item, and the cash, each only where it applies to them.
 */
export function requiredChecks(
  agreement: Pick<AgreementSnapshot, 'mode' | 'cashKobo' | 'cashDirection'>,
  role: Viewer,
): ConfirmCheck[] {
  const checks: ConfirmCheck[] = []
  // In a cash deal only the owner hands over an item, and only the offerer receives one
  const swap = agreement.mode !== 'CASH'
  if (role === 'offerer' || swap) checks.push('received')
  if (role === 'owner' || swap) checks.push('gave')
  if (hasCash(agreement)) checks.push('cash')
  return checks
}

/** What the reader gives and receives, read from the frozen agreement (never the live listing, QA-08). */
export function sidesOf(agreement: AgreementSnapshot, role: Viewer) {
  const mine: SnapshotItem | null = role === 'offerer' ? agreement.offeredItem : agreement.listingItem
  const theirs: SnapshotItem | null = role === 'offerer' ? agreement.listingItem : agreement.offeredItem
  const cash = hasCash(agreement)
  const iPay = viewerPays(agreement, role)
  return {
    mine,
    theirs,
    cashKobo: agreement.cashKobo,
    /** The reader hands over the cash. */
    iPayCash: cash && iPay,
    /** The reader receives the cash. */
    iGetCash: cash && !iPay,
  }
}

export const otherRole = (role: Viewer): Viewer => (role === 'offerer' ? 'owner' : 'offerer')

/** Has this person confirmed their side? */
export const confirmedAt = (tx: Pick<Transaction, 'confirmations'>, role: Viewer) => tx.confirmations[role]

/**
 * Progress from server state only (FE-TRX-02, ruling R5-1): nothing ticks until the server says so, and an
 * ended deal shows no current step.
 */
export function transactionSteps(tx: Transaction): ProgressStep[] {
  const meetingAgreed = Boolean(tx.meeting && tx.meeting.agreedBy.length >= 2)
  const done = [true, meetingAgreed, Boolean(confirmedAt(tx, tx.viewerRole)), tx.status === 'COMPLETED']
  const labels = ['Check terms', 'Arrange meeting', 'Inspect and exchange', 'Both confirm']
  const ids = ['terms', 'meeting', 'inspect', 'confirm']
  const active = tx.status === 'AWAITING_HANDOVER'
  // The step after the furthest one done is current: a meeting arranged outside the app doesn't hold things up
  const current = active ? done.lastIndexOf(true) + 1 : -1
  return labels.map((label, i) => ({
    id: ids[i]!,
    label,
    state: done[i] ? 'done' : i === current ? 'current' : 'todo',
  }))
}

export type TransactionTab = 'active' | 'completed' | 'ended'

export function transactionTab(tx: Pick<Transaction, 'status'>): TransactionTab {
  if (tx.status === 'AWAITING_HANDOVER' || tx.status === 'DISPUTED') return 'active'
  return tx.status === 'COMPLETED' ? 'completed' : 'ended'
}

/** Time left on the reservation is worth a warning in its last 48 hours (ruling R5-4). */
export const RESERVATION_WARNING_MS = 48 * 3_600_000

/** The agreement as sentence-ready parts, for the shared offer wording. */
export function agreementParts(agreement: AgreementSnapshot): TradeParts {
  return {
    terms: {
      mode: agreement.mode,
      offeredItemId: agreement.offeredItem ? 'agreed-item' : null,
      cashKobo: agreement.cashKobo,
      cashDirection: agreement.cashDirection,
      note: '',
    },
    listingTitle: agreement.listingItem.title,
    itemTitle: agreement.offeredItem?.title ?? null,
  }
}

export const cancelReasons: { value: CancelReason; title: string }[] = [
  { value: 'CANT_MEET', title: 'I can’t meet any more' },
  { value: 'CHANGED_MIND', title: 'I’ve changed my mind' },
  { value: 'ITEM_PROBLEM', title: 'Something’s wrong with an item' },
  { value: 'OTHER', title: 'Another reason' },
]

export const cancelReasonLabel = (reason: CancelReason) => cancelReasons.find((r) => r.value === reason)!.title
