import { requiredChecks } from '@/features/transactions/transaction-view'
import { authDb } from '@/mocks/db/auth'
import { listingsDb } from '@/mocks/db/listings'
import { notificationsDb } from '@/mocks/db/notifications'
import { offersDb } from '@/mocks/db/offers'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { seedTransactions } from '@/mocks/fixtures/transactions'
import type {
  AgreementSnapshot,
  CancelReason,
  ConfirmCheck,
  DisputeCategory,
  Meeting,
  NotificationKind,
  Review,
  ReviewWithContext,
  Transaction,
  TransactionStatus,
} from '@/types/api'

/**
 * The mock API's deals: one per accepted offer. FICTIONAL. The agreement is a copy made at acceptance;
 * items are reserved while the deal is open, completed when both people confirm, and released if it is
 * cancelled or its reservation ends unconfirmed.
 */

export type StoredTransaction = {
  id: string
  offerId: string
  offererId: string
  ownerId: string
  listingId: string
  offeredItemId: string | null
  status: TransactionStatus
  agreement: AgreementSnapshot
  meeting: Meeting | null
  confirmations: { offerer: string | null; owner: string | null }
  reservationExpiresAt: string
  cancellation?: Transaction['cancellation']
  dispute?: Transaction['dispute']
  endedReason?: string
  completedAt?: string
  endedAt?: string
  reviews: Review[]
  createdAt: string
  updatedAt: string
}

type Replay = { userId: string; transactionId: string; status: number }

const STORAGE_KEY = 'nextown-mock-transactions'
const persistent = import.meta.env.MODE !== 'test'
const DAY = 86_400_000

let transactions = new Map<string, StoredTransaction>()
let replays = new Map<string, Replay>()
let failAfterSave = false
let caseNumber = 104_200

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ transactions: [...transactions.values()], replays: [...replays], caseNumber }),
    )
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function seed() {
  transactions = new Map(seedTransactions().map((t) => [t.id, t]))
  replays = new Map()
  caseNumber = 104_200
}

function load() {
  seed()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as {
      transactions: StoredTransaction[]
      replays: [string, Replay][]
      caseNumber: number
    }
    transactions = new Map(saved.transactions.map((t) => [t.id, t]))
    replays = new Map(saved.replays)
    caseNumber = saved.caseNumber
  } catch {
    // Corrupted entry: start from the seeded deals
  }
}
load()

export const roleOf = (tx: StoredTransaction, userId: string) => (userId === tx.offererId ? 'offerer' : 'owner')
const otherOf = (tx: StoredTransaction, userId: string) => (userId === tx.offererId ? tx.ownerId : tx.offererId)

/** Tells the other person what `actorId` just did (MSG-03). Never the meeting place or time. */
function notifyOther(tx: StoredTransaction, actorId: string, kind: NotificationKind, verb: string) {
  notificationsDb.notify(
    otherOf(tx, actorId),
    kind,
    `${authDb.seller(actorId).displayName} ${verb}`,
    `/transactions/${tx.id}`,
    tx.agreement.listingItem.title,
  )
}

function touch(tx: StoredTransaction) {
  tx.updatedAt = new Date().toISOString()
}

/** Put both items into a state: reserved, completed, or back on offer. */
function setItems(tx: StoredTransaction, state: 'RESERVED' | 'COMPLETED' | 'ACTIVE') {
  listingsDb.setStatus(tx.listingId, state)
  if (!tx.offeredItemId) return
  if (!offersDb.setItemReserved(tx.offeredItemId, state !== 'ACTIVE')) listingsDb.setStatus(tx.offeredItemId, state)
}

function end(tx: StoredTransaction, status: 'CANCELLED' | 'EXPIRED', reason: string, release: boolean) {
  tx.status = status
  tx.endedReason = reason
  tx.endedAt = new Date().toISOString()
  tx.cancellation = undefined
  touch(tx)
  if (release) setItems(tx, 'ACTIVE')
}

/** The reservation's end is checked whenever a deal is read (ruling R5-4). */
function refresh(tx: StoredTransaction) {
  if (tx.status !== 'AWAITING_HANDOVER' || Date.parse(tx.reservationExpiresAt) > Date.now()) return
  const confirmed = Boolean(tx.confirmations.offerer || tx.confirmations.owner)
  if (confirmed) {
    // Never release items one person says they've exchanged: support looks at it first (UX-23)
    end(tx, 'EXPIRED', 'Only one person confirmed before the reservation ended. Support will review the deal.', false)
  } else {
    end(tx, 'EXPIRED', 'Neither person confirmed before the reservation ended, so both items were released.', true)
  }
  save()
}

function view(tx: StoredTransaction, viewerId: string): Transaction {
  const mine = tx.reviews.find((r) => r.authorId === viewerId)
  const theirs = tx.reviews.find((r) => r.subjectId === viewerId)
  const { reviews: _reviews, listingId: _listingId, offeredItemId: _offeredItemId, offererId, ownerId, ...rest } = tx
  return {
    ...rest,
    viewerRole: roleOf(tx, viewerId),
    offerer: authDb.seller(offererId),
    owner: authDb.seller(ownerId),
    review: { eligible: tx.status === 'COMPLETED', mine, theirs },
  }
}

export const transactionsDb = {
  create(
    fields: Pick<
      StoredTransaction,
      'id' | 'offerId' | 'offererId' | 'ownerId' | 'listingId' | 'offeredItemId' | 'agreement'
    >,
  ) {
    const now = new Date().toISOString()
    transactions.set(fields.id, {
      ...fields,
      status: 'AWAITING_HANDOVER',
      meeting: null,
      confirmations: { offerer: null, owner: null },
      reservationExpiresAt: new Date(Date.now() + runtimeConfig.reservationDays * DAY).toISOString(),
      reviews: [],
      createdAt: now,
      updatedAt: now,
    })
    save()
  },

  statusOf(id: string): TransactionStatus | undefined {
    const tx = transactions.get(id)
    if (tx) refresh(tx)
    return tx?.status
  },

  forUser(userId: string): Transaction[] {
    return [...transactions.values()]
      .filter((t) => t.offererId === userId || t.ownerId === userId)
      .map((t) => {
        refresh(t)
        return t
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((t) => view(t, userId))
  },

  get(id: string, userId: string): StoredTransaction | undefined {
    const tx = transactions.get(id)
    if (!tx || (tx.offererId !== userId && tx.ownerId !== userId)) return undefined
    refresh(tx)
    return tx
  },

  view,

  proposeMeeting(tx: StoredTransaction, userId: string, meeting: Pick<Meeting, 'place' | 'time' | 'note'>) {
    tx.meeting = { ...meeting, proposedBy: userId, agreedBy: [userId] }
    notifyOther(tx, userId, 'MEETING_UPDATED', 'suggested where and when to meet')
    touch(tx)
    save()
  },

  agreeMeeting(tx: StoredTransaction, userId: string) {
    if (tx.meeting && !tx.meeting.agreedBy.includes(userId)) tx.meeting.agreedBy.push(userId)
    touch(tx)
    save()
  },

  /** Records one person's confirmation; the second one completes the deal (FE-TRX-07). */
  confirm(tx: StoredTransaction, userId: string) {
    tx.confirmations[roleOf(tx, userId)] = new Date().toISOString()
    notifyOther(tx, userId, 'CONFIRMED', 'confirmed the exchange')
    if (tx.confirmations.offerer && tx.confirmations.owner) {
      tx.status = 'COMPLETED'
      tx.completedAt = new Date().toISOString()
      tx.cancellation = undefined
      setItems(tx, 'COMPLETED')
    }
    touch(tx)
    save()
  },

  requiredChecks: (tx: StoredTransaction, userId: string): ConfirmCheck[] =>
    requiredChecks(tx.agreement, roleOf(tx, userId)),

  requestCancel(tx: StoredTransaction, userId: string, reason: CancelReason, note?: string) {
    tx.cancellation = {
      requestedBy: userId,
      reason,
      note: note?.trim() || undefined,
      requestedAt: new Date().toISOString(),
    }
    notifyOther(tx, userId, 'CANCEL_REQUESTED', 'asked to cancel the deal')
    touch(tx)
    save()
  },

  clearCancel(tx: StoredTransaction) {
    tx.cancellation = undefined
    touch(tx)
    save()
  },

  acceptCancel(tx: StoredTransaction) {
    end(tx, 'CANCELLED', 'Both people agreed to cancel. Both items were released.', true)
    save()
  },

  dispute(tx: StoredTransaction, userId: string, category: DisputeCategory) {
    tx.status = 'DISPUTED'
    tx.cancellation = undefined
    tx.dispute = {
      caseRef: `NX-${String(++caseNumber).padStart(6, '0')}`,
      openedBy: userId,
      openedAt: new Date().toISOString(),
      category,
    }
    notifyOther(tx, userId, 'DISPUTE_OPENED', 'reported a problem with the deal')
    touch(tx)
    save()
  },

  review(tx: StoredTransaction, userId: string, rating: number, note?: string) {
    const subjectId = otherOf(tx, userId)
    tx.reviews.push({
      rating,
      note: note?.trim() || undefined,
      authorId: userId,
      subjectId,
      createdAt: new Date().toISOString(),
    })
    authDb.addReview(subjectId, rating)
    touch(tx)
    save()
  },

  reviewsOf(userId: string): { received: ReviewWithContext[]; given: ReviewWithContext[] } {
    const all = [...transactions.values()].flatMap((tx) =>
      tx.reviews.map((r) => ({
        ...r,
        authorName: authDb.seller(r.authorId).displayName,
        subjectName: authDb.seller(r.subjectId).displayName,
        itemTitle: tx.agreement.listingItem.title,
        transactionId: tx.id,
      })),
    )
    const newest = (a: Review, b: Review) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    return {
      received: all.filter((r) => r.subjectId === userId).sort(newest),
      given: all.filter((r) => r.authorId === userId).sort(newest),
    }
  },

  replay(key: string | null, userId: string) {
    const found = key ? replays.get(key) : undefined
    return found?.userId === userId ? found : undefined
  },

  remember(key: string | null, replay: Replay) {
    if (!key) return
    replays.set(key, replay)
    save()
  },

  takeFailAfterSave() {
    const fail = failAfterSave
    failAfterSave = false
    return fail
  },
}

/** The dev toolbar's target: the given deal, or the newest open one the member is part of. */
function target(id?: string) {
  const me = authDb.current()?.id
  if (!me) return undefined
  if (id) return transactionsDb.get(id, me)
  return [...transactions.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .find((t) => (t.offererId === me || t.ownerId === me) && (refresh(t), t.status === 'AWAITING_HANDOVER'))
}

const other = (tx: StoredTransaction) => otherOf(tx, authDb.current()!.id)

/** Controls for the dev toolbar and tests. Each one acts as the other person in the deal. */
export const mockTransactions = {
  otherPartyConfirms(id?: string) {
    const tx = target(id)
    if (!tx || tx.confirmations[roleOf(tx, other(tx))]) return false
    transactionsDb.confirm(tx, other(tx))
    return true
  },
  otherPartyProposesMeeting(id?: string) {
    const tx = target(id)
    if (!tx) return false
    const time = new Date(Date.now() + 2 * DAY)
    time.setUTCHours(15, 0, 0, 0)
    transactionsDb.proposeMeeting(tx, other(tx), {
      place: 'Pilot Mall, by the main entrance',
      time: time.toISOString(),
      note: 'I’ll be in a blue shirt. Call through the app if you’re running late.',
    })
    return true
  },
  otherPartyRequestsCancel(id?: string) {
    const tx = target(id)
    if (!tx || tx.confirmations.offerer || tx.confirmations.owner) return false
    transactionsDb.requestCancel(tx, other(tx), 'CANT_MEET', 'Something came up this week, sorry.')
    return true
  },
  otherPartyDisputes(id?: string) {
    const tx = target(id)
    if (!tx) return false
    transactionsDb.dispute(tx, other(tx), 'CONDITION')
    return true
  },
  /** The reservation has 20 hours left (shows the warning). */
  nearlyEnd(id?: string) {
    const tx = target(id)
    if (!tx) return false
    tx.reservationExpiresAt = new Date(Date.now() + 20 * 3_600_000).toISOString()
    save()
    return true
  },
  endReservation(id?: string) {
    const tx = target(id)
    if (!tx) return false
    tx.reservationExpiresAt = new Date(Date.now() - 60_000).toISOString()
    refresh(tx)
    return true
  },
  saveThenFailNext() {
    failAfterSave = true
  },
  reset() {
    seed()
    failAfterSave = false
  },
}
