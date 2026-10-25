import { payerSentence } from '@/components/domain/payer-sentence'
import type { FieldErrors } from '@/features/selling/listing-input'
import { formatNaira } from '@/lib/money/money'
import { relativeDeadline } from '@/lib/time/time'
import type { CashDirection, Offer, OfferMode, OfferTerms, OfferVersion, SwapItem, TradeMode } from '@/types/api'

export const offerModes: OfferMode[] = ['CASH', 'SWAP', 'SWAP_PLUS_CASH']

export const NOTE_MAX = 500

/**
 * Which kinds of offer a listing takes (FE-OFF-01). Swap + cash balances a swap, so it comes with swaps
 * (ruling R4-1); a cash-only listing says why the swap options are off.
 */
export function allowedModes(acceptedModes: TradeMode[]): { mode: OfferMode; allowed: boolean; reason?: string }[] {
  const cash = acceptedModes.includes('CASH')
  const swap = acceptedModes.includes('SWAP')
  return [
    { mode: 'CASH', allowed: cash, reason: cash ? undefined : 'The owner only wants to swap this item.' },
    { mode: 'SWAP', allowed: swap, reason: swap ? undefined : 'The owner isn’t taking swaps for this item.' },
    { mode: 'SWAP_PLUS_CASH', allowed: swap, reason: swap ? undefined : 'The owner isn’t taking swaps for this item.' },
  ]
}

/** The payload rules for each mode (PRD §7.1), with messages that say what to do next. */
export function validateTerms(terms: OfferTerms, acceptedModes: TradeMode[]): FieldErrors {
  const errors: FieldErrors = {}
  if (!allowedModes(acceptedModes).find((m) => m.mode === terms.mode)?.allowed) {
    errors.mode = 'This item doesn’t take that kind of offer. Choose another.'
  }
  const withItem = terms.mode !== 'CASH'
  if (withItem && !terms.offeredItemId) errors.offeredItemId = 'Choose the item you’re offering.'
  if (!withItem && terms.offeredItemId) errors.offeredItemId = 'A cash offer doesn’t include an item.'

  if (terms.mode === 'CASH') {
    if (!(terms.cashKobo > 0)) errors.cashKobo = 'Enter an amount above ₦0.'
    if (terms.cashDirection !== 'OFFERER_PAYS_OWNER') errors.cashDirection = 'In a cash offer, you pay the owner.'
  } else if (terms.mode === 'SWAP') {
    if (terms.cashKobo !== 0) errors.cashKobo = 'A swap has no cash. Choose Swap + cash to add an amount.'
  } else {
    if (!(terms.cashKobo > 0)) errors.cashKobo = 'Enter an amount above ₦0, or switch to Swap.'
    if (terms.cashDirection === 'NONE') errors.cashDirection = 'Choose who adds the cash.'
  }
  if (terms.note.length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`
  return errors
}

/** Cash and direction as each mode requires, so what is sent always matches what was shown (PRD §7.1). */
export function toPayload(terms: OfferTerms): OfferTerms {
  const note = terms.note.trim()
  if (terms.mode === 'CASH') {
    return { ...terms, note, offeredItemId: null, cashDirection: 'OFFERER_PAYS_OWNER' }
  }
  if (terms.mode === 'SWAP') return { ...terms, note, cashKobo: 0, cashDirection: 'NONE' }
  return { ...terms, note }
}

export const directionOf = (mode: OfferMode, chosen: CashDirection): CashDirection =>
  mode === 'CASH' ? 'OFFERER_PAYS_OWNER' : mode === 'SWAP' ? 'NONE' : chosen

export type Viewer = 'offerer' | 'owner'

/** One version's terms plus the names a sentence needs. `itemTitle` is the offered item, if any. */
export type TradeParts = { terms: OfferTerms; listingTitle: string; itemTitle: string | null }

export const modeLabels: Record<OfferMode, string> = {
  CASH: 'Cash offer',
  SWAP: 'Swap',
  SWAP_PLUS_CASH: 'Swap + cash',
}

export const shortModeLabels: Record<OfferMode, string> = { CASH: 'Cash', SWAP: 'Swap', SWAP_PLUS_CASH: 'Swap + cash' }

/** Does the reader hand over the cash in these terms? */
export function viewerPays(terms: Pick<OfferTerms, 'cashDirection'>, viewer: Viewer) {
  return (
    (terms.cashDirection === 'OFFERER_PAYS_OWNER' && viewer === 'offerer') ||
    (terms.cashDirection === 'OWNER_PAYS_OFFERER' && viewer === 'owner')
  )
}

const hasCash = (terms: OfferTerms) => terms.cashDirection !== 'NONE' && terms.cashKobo > 0

/**
 * The whole trade in words, from the reader's side (UX-17): "You offer your PS5 and pay ₦300,000. They give
 * you the MacBook." Every mixed offer names the payer; nothing relies on a sign or a colour (PRD §7.1).
 */
export function tradeSentence({ terms, listingTitle, itemTitle }: TradeParts, viewer: Viewer, settled = false) {
  const amount = formatNaira(terms.cashKobo)
  const cash = hasCash(terms)
  const pays = viewerPays(terms, viewer)
  const would = settled ? '' : 'would '

  if (terms.mode === 'CASH') {
    return viewer === 'offerer'
      ? `You ${would}pay ${amount} to receive the ${listingTitle}.`
      : `They ${would}pay you ${amount} for your ${listingTitle}.`
  }
  if (viewer === 'offerer') {
    const give = `You offer your ${itemTitle}${cash && pays ? ` and pay ${amount}` : ''}.`
    const get = `They give you the ${listingTitle}${cash && !pays ? ` and pay you ${amount}` : ''}.`
    return `${give} ${get}`
  }
  const get = `They offer their ${itemTitle}${cash && !pays ? ` and pay you ${amount}` : ''}.`
  const give = `You give them your ${listingTitle}${cash && pays ? ` and pay them ${amount}` : ''}.`
  return `${get} ${give}`
}

/** Props for `OfferSum`: what the reader gives, what they receive, and who pays whom. */
export function offerSum({ terms, listingTitle, itemTitle }: TradeParts, viewer: Viewer) {
  const cash = hasCash(terms)
  const pays = viewerPays(terms, viewer)
  const myItem = viewer === 'offerer' ? itemTitle : listingTitle
  const theirItem = viewer === 'offerer' ? listingTitle : itemTitle

  const give: { kind: 'item' | 'cash'; title: string; kobo?: number }[] = []
  if (myItem) give.push({ kind: 'item', title: myItem })
  if (cash && pays) give.push({ kind: 'cash', title: 'Cash', kobo: terms.cashKobo })

  const receive = theirItem
    ? { title: theirItem, kobo: cash && !pays ? terms.cashKobo : undefined }
    : { title: formatNaira(terms.cashKobo) }

  return {
    give,
    receive,
    sentence: payerSentence({ viewer, direction: terms.cashDirection, kobo: terms.cashKobo }),
  }
}

export type TermsChange = {
  field: 'mode' | 'payer' | 'cash'
  label: string
  before: string
  after: string
  note?: string
}

const payerLabel = (terms: OfferTerms, viewer: Viewer) =>
  !hasCash(terms) ? 'No cash' : viewerPays(terms, viewer) ? 'You pay' : 'They pay you'

/**
 * What changed between two versions, in words from the reader's side (FE-OFF-12). The amount and the payer
 * are separate rows, so a switch of direction can't hide inside a familiar number.
 */
export function diffVersions(before: OfferTerms, after: OfferTerms, viewer: Viewer): TermsChange[] {
  const changes: TermsChange[] = []
  if (before.mode !== after.mode) {
    changes.push({
      field: 'mode',
      label: 'Kind of offer',
      before: shortModeLabels[before.mode],
      after: shortModeLabels[after.mode],
    })
  }
  const payerBefore = payerLabel(before, viewer)
  const payerAfter = payerLabel(after, viewer)
  const payerChanged = payerBefore !== payerAfter
  if (payerChanged) changes.push({ field: 'payer', label: 'Who pays', before: payerBefore, after: payerAfter })

  if (before.cashKobo !== after.cashKobo) {
    const change: TermsChange = {
      field: 'cash',
      label: 'Cash',
      before: formatNaira(before.cashKobo),
      after: formatNaira(after.cashKobo),
    }
    if (!payerChanged && hasCash(after)) {
      const difference = formatNaira(Math.abs(after.cashKobo - before.cashKobo))
      const direction = after.cashKobo > before.cashKobo ? 'more' : 'less'
      change.note = `You would ${viewerPays(after, viewer) ? 'pay' : 'receive'} ${difference} ${direction}.`
    }
    changes.push(change)
  }
  return changes
}

export type OfferTab = 'received' | 'sent' | 'handover' | 'closed'

/** Inbox tab (FE-OFF-06): open offers by who made them, accepted ones until handover, then everything else. */
export function offerTab(offer: Pick<Offer, 'status' | 'viewerRole'>): OfferTab {
  if (offer.status === 'PENDING') return offer.viewerRole === 'owner' ? 'received' : 'sent'
  return offer.status === 'ACCEPTED' ? 'handover' : 'closed'
}

/** The parts a sentence needs, from one version of an offer. */
export const partsOf = (
  offer: Pick<Offer, 'listing'>,
  version: OfferVersion | (OfferTerms & { offeredItem?: SwapItem | null }),
): TradeParts => ({
  terms: version,
  listingTitle: offer.listing.title,
  itemTitle: version.offeredItem?.title ?? null,
})

/** The cash in a few words from the reader's side, for cards: "You pay ₦195,000". */
export function payerShort(terms: OfferTerms, viewer: Viewer) {
  if (!hasCash(terms)) return 'No cash'
  return viewerPays(terms, viewer)
    ? `You pay ${formatNaira(terms.cashKobo)}`
    : `They pay you ${formatNaira(terms.cashKobo)}`
}

/** The other person in the negotiation. */
export const counterpartOf = (offer: Pick<Offer, 'viewerRole' | 'offerer' | 'owner'>) =>
  offer.viewerRole === 'offerer' ? offer.owner : offer.offerer

/** "Expires in 30h", against server time; offers never show a ticking clock (PRD §7.2). */
export function expiryLabel(expiresAt: string, now: number) {
  const { label, ended } = relativeDeadline(expiresAt, now)
  return ended ? 'Offer expired' : label.replace('Ends in', 'Expires in')
}
