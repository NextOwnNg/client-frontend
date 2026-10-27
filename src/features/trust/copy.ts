import { CircleCheck, CircleSlash, Eye, Inbox } from 'lucide-react'
import type { StatusDisplay } from '@/lib/copy/status'
import type { DisputeCategory, ReportReason, ReportStatus, ReportTargetType } from '@/types/api'

/** Report reasons in the reporter's words (ruling R7-2). The hints say what each covers, not what will happen. */
export const reportReasons: { value: ReportReason; title: string; description: string }[] = [
  {
    value: 'SCAM',
    title: 'Scam or fraud',
    description: 'Asking for payment first, fake proof of payment, a bait item',
  },
  { value: 'MISLEADING', title: 'Misleading or fake item', description: 'Photos or details that aren’t the real item' },
  { value: 'PROHIBITED', title: 'Prohibited item', description: 'Something the community rules don’t allow' },
  { value: 'HARASSMENT', title: 'Harassment or hate', description: 'Insults, pressure or abuse aimed at a person' },
  { value: 'UNSAFE', title: 'Threat or safety risk', description: 'Threats, or a meeting that felt unsafe' },
  { value: 'SPAM', title: 'Spam', description: 'Repeated posts, ads or links' },
  { value: 'OTHER', title: 'Something else', description: 'Tell us in your own words' },
]

const disputeReasons: Record<DisputeCategory, string> = {
  CONDITION: 'Item not as described',
  NO_SHOW: 'They didn’t show up',
  PAYMENT: 'Payment disagreement',
  UNSAFE: 'Felt unsafe',
  OTHER: 'Something else',
}

export function reasonLabel(reason: ReportReason | DisputeCategory): string {
  return reportReasons.find((r) => r.value === reason)?.title ?? disputeReasons[reason as DisputeCategory]
}

export const targetNoun: Record<ReportTargetType, string> = {
  listing: 'listing',
  post: 'post',
  comment: 'comment',
  conversation: 'conversation',
  offer: 'offer',
  user: 'profile',
  transaction: 'deal',
}

/** FE-TRU-03: what a case's status means, without moderator notes. */
export const reportStatuses: Record<ReportStatus, StatusDisplay & { meaning: string }> = {
  RECEIVED: { label: 'Received', tone: 'info', icon: Inbox, meaning: 'Waiting for the safety team.' },
  IN_REVIEW: { label: 'In review', tone: 'warning', icon: Eye, meaning: 'Someone is looking into it.' },
  ACTION_TAKEN: {
    label: 'Action taken',
    tone: 'success',
    icon: CircleCheck,
    meaning: 'We acted on what you reported.',
  },
  CLOSED: { label: 'Closed', tone: 'neutral', icon: CircleSlash, meaning: 'Reviewed. No further action.' },
}

/** FE-TRU-01 confirmation, verbatim. */
export const reportReceived = (caseRef: string) => `We received report ${caseRef}.`

/** Ends a sentence on a name without doubling an initial's full stop: "You blocked Chidi O." */
export const endsWith = (name: string) => (name.endsWith('.') ? name : `${name}.`)

export const blockEffect = (name: string) =>
  `You and ${name} won’t be able to message each other or make new offers to each other, and you won’t see their posts or comments. They aren’t told. Your existing offers, deals and messages stay readable.`
