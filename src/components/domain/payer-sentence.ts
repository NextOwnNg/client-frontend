import { formatNaira } from '@/lib/money/money'
import type { CashDirection } from '@/types/api'

type PayerSentenceInput = {
  /** Who is reading: the person who made the offer, or the listing owner. */
  viewer: 'offerer' | 'owner'
  direction: CashDirection
  kobo: number
}

/** The cash direction as an everyday sentence, from the reader's side (PRD §7.1). Never a +/- sign alone. */
export function payerSentence({ viewer, direction, kobo }: PayerSentenceInput): string {
  if (direction === 'NONE' || kobo === 0) return 'No cash changes hands.'

  const viewerPays =
    (direction === 'OFFERER_PAYS_OWNER' && viewer === 'offerer') ||
    (direction === 'OWNER_PAYS_OFFERER' && viewer === 'owner')

  const amount = formatNaira(kobo)
  return viewerPays
    ? `You pay ${amount} directly at the exchange.`
    : `The other person pays you ${amount} directly at the exchange.`
}
