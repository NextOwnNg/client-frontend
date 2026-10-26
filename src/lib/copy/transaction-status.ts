import { CircleCheck, CircleSlash, Clock, Eye, Handshake, Hourglass } from 'lucide-react'
import type { StatusDisplay } from '@/lib/copy/status'
import type { Transaction } from '@/types/api'

/* Deal labels live apart from listing labels so these icons stay out of the first-load chunk. */

const ended: Record<Exclude<Transaction['status'], 'AWAITING_HANDOVER'>, StatusDisplay> = {
  COMPLETED: { label: 'Completed', tone: 'success', icon: CircleCheck },
  DISPUTED: { label: 'Under review', tone: 'warning', icon: Eye },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', icon: CircleSlash },
  // Never worded as completion, whatever was confirmed (QA-14/15)
  EXPIRED: { label: 'Reservation ended', tone: 'neutral', icon: Clock },
}

/** Single source for deal state labels, from the reader's side (PRD §7.6). */
export function transactionStatus(tx: Pick<Transaction, 'status' | 'viewerRole' | 'confirmations'>): StatusDisplay {
  if (tx.status !== 'AWAITING_HANDOVER') return ended[tx.status]
  const other = tx.viewerRole === 'offerer' ? 'owner' : 'offerer'
  if (tx.confirmations[tx.viewerRole]) return { label: 'Your confirmation received', tone: 'info', icon: Hourglass }
  if (tx.confirmations[other]) return { label: 'Waiting for your confirmation', tone: 'info', icon: Hourglass }
  return { label: 'Awaiting handover', tone: 'info', icon: Handshake }
}
