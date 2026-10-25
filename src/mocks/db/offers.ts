import { authDb } from '@/mocks/db/auth'
import { listingsDb, toSummary } from '@/mocks/db/listings'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { seedOffers } from '@/mocks/fixtures/offers'
import type { ListingDetail, Offer, OfferItemInput, OfferStatus, OfferTerms, PublicSeller, SwapItem } from '@/types/api'

/**
 * The mock API's negotiations and offer-only items. FICTIONAL. Offers keep their versions as they were sent;
 * listings and items are looked up live, so a card always shows the item as it is now. In the browser the
 * state is kept in storage, so a negotiation survives a reload.
 */

export type StoredVersion = OfferTerms & { id: string; number: number; authorId: string; createdAt: string }

export type StoredOffer = {
  id: string
  listingId: string
  offererId: string
  ownerId: string
  status: OfferStatus
  versions: StoredVersion[]
  expiresAt: string
  createdAt: string
  updatedAt: string
  closedReason?: string
  transactionId?: string
  /** Participants who haven't seen the latest change. */
  unreadFor: string[]
}

/** An offer-only item: private to the negotiations it is offered in (LST-07). */
export type StoredItem = Omit<SwapItem, 'source' | 'available' | 'unavailableReason' | 'listingSlug'> & {
  ownerId: string
  reserved: boolean
}

type Replay = { userId: string; offerId: string; status: number }

const STORAGE_KEY = 'nextown-mock-offers'
const persistent = import.meta.env.MODE !== 'test'
const HOUR = 3_600_000

let offers = new Map<string, StoredOffer>()
let items = new Map<string, StoredItem>()
let replays = new Map<string, Replay>()
let failAfterSave = false
let counter = 0

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`
const lifetime = () => new Date(Date.now() + runtimeConfig.offerLifetimeHours * HOUR).toISOString()

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ offers: [...offers.values()], items: [...items.values()], replays: [...replays] }),
    )
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function seed() {
  const seeded = seedOffers()
  offers = new Map(seeded.offers.map((o) => [o.id, o]))
  items = new Map(seeded.items.map((i) => [i.id, i]))
  replays = new Map()
}

function load() {
  seed()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { offers: StoredOffer[]; items: StoredItem[]; replays: [string, Replay][] }
    offers = new Map(saved.offers.map((o) => [o.id, o]))
    items = new Map(saved.items.map((i) => [i.id, i]))
    replays = new Map(saved.replays)
  } catch {
    // Corrupted entry: start from the seeded negotiations
  }
}
load()

function seller(id: string): PublicSeller {
  const profile = authDb.publicProfile(id)
  if (!profile)
    return { id, displayName: 'Member', phoneConfirmed: true, reviewCount: 0, areaName: runtimeConfig.cityName }
  const { memberSince: _memberSince, ...rest } = profile
  return rest
}

function listingItem(detail: ListingDetail): SwapItem {
  const reason =
    detail.status === 'ACTIVE'
      ? undefined
      : detail.status === 'RESERVED'
        ? 'Reserved for another deal'
        : detail.status === 'PENDING_REVIEW'
          ? 'Still under review'
          : 'No longer listed'
  return {
    id: detail.id,
    title: detail.title,
    condition: detail.condition,
    defects: detail.defects,
    repairs: detail.repairs,
    photos: detail.images.map((image, i) => ({ ...image, id: `${detail.id}-photo-${i}` })),
    source: 'listing',
    listingSlug: detail.slug,
    available: detail.status === 'ACTIVE',
    unavailableReason: reason,
  }
}

function toSwapItem({ ownerId: _ownerId, reserved, ...item }: StoredItem): SwapItem {
  return {
    ...item,
    source: 'offer-only',
    available: !reserved,
    unavailableReason: reserved ? 'Reserved for another deal' : undefined,
  }
}

/** Any item that can sit in a swap, with the id of the person it belongs to. */
function findItem(id: string): { item: SwapItem; ownerId: string } | undefined {
  const own = items.get(id)
  if (own) return { item: toSwapItem(own), ownerId: own.ownerId }
  const listing = listingsDb.byIdOrSlug(id)
  return listing ? { item: listingItem(listing.detail), ownerId: listing.ownerId } : undefined
}

export const currentVersion = (offer: StoredOffer) => offer.versions.at(-1)!

/** The person who has to decide next: whoever didn't write the latest version. */
export const turnOf = (offer: StoredOffer) =>
  offer.status !== 'PENDING'
    ? null
    : currentVersion(offer).authorId === offer.offererId
      ? offer.ownerId
      : offer.offererId

function close(offer: StoredOffer, status: OfferStatus, reason?: string) {
  offer.status = status
  offer.closedReason = reason
  offer.updatedAt = new Date().toISOString()
  offer.unreadFor = [offer.offererId, offer.ownerId]
}

/** Deadlines and availability are checked whenever an offer is read, as the server would. */
function refresh(offer: StoredOffer) {
  if (offer.status !== 'PENDING') return
  if (Date.parse(offer.expiresAt) <= Date.now()) {
    close(offer, 'EXPIRED')
  } else if (listingsDb.byIdOrSlug(offer.listingId)?.detail.status !== 'ACTIVE') {
    close(offer, 'CLOSED_UNAVAILABLE', 'The item is no longer available.')
  }
}

function view(offer: StoredOffer, viewerId: string): Offer {
  const listing = listingsDb.byIdOrSlug(offer.listingId)!.detail
  return {
    id: offer.id,
    listing: toSummary(listing),
    offerer: seller(offer.offererId),
    owner: seller(offer.ownerId),
    viewerRole: viewerId === offer.offererId ? 'offerer' : 'owner',
    status: offer.status,
    versions: offer.versions.map((v) => ({
      ...v,
      offeredItem: v.offeredItemId ? (findItem(v.offeredItemId)?.item ?? null) : null,
    })),
    turnUserId: turnOf(offer),
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    closedReason: offer.closedReason,
    transactionId: offer.transactionId,
    unread: offer.unreadFor.includes(viewerId),
  }
}

function addVersion(offer: StoredOffer, authorId: string, terms: OfferTerms) {
  const now = new Date().toISOString()
  offer.versions.push({ ...terms, id: newId('v'), number: offer.versions.length + 1, authorId, createdAt: now })
  offer.expiresAt = lifetime()
  offer.updatedAt = now
  offer.unreadFor = [authorId === offer.offererId ? offer.ownerId : offer.offererId]
}

function accept(offer: StoredOffer) {
  const terms = currentVersion(offer)
  offer.status = 'ACCEPTED'
  offer.transactionId = `t-${offer.id}`
  offer.updatedAt = new Date().toISOString()
  offer.unreadFor = [offer.offererId, offer.ownerId]

  listingsDb.setStatus(offer.listingId, 'RESERVED')
  const reserved = [offer.listingId]
  if (terms.offeredItemId) {
    reserved.push(terms.offeredItemId)
    const own = items.get(terms.offeredItemId)
    if (own) own.reserved = true
    else listingsDb.setStatus(terms.offeredItemId, 'RESERVED')
  }

  // Both items are spoken for now: every other open negotiation involving either one closes (ruling R4-5)
  for (const other of offers.values()) {
    if (other.id === offer.id || other.status !== 'PENDING') continue
    const otherItem = currentVersion(other).offeredItemId
    if (other.listingId === offer.listingId) {
      close(other, 'CLOSED_UNAVAILABLE', 'The owner accepted another offer.')
    } else if (reserved.includes(other.listingId) || (otherItem && reserved.includes(otherItem))) {
      close(other, 'CLOSED_UNAVAILABLE', 'One of the items is now reserved for another deal.')
    }
  }
}

export const offersDb = {
  /** Every offer the person is part of, newest activity first. */
  forUser(userId: string): Offer[] {
    const mine = [...offers.values()].filter((o) => o.offererId === userId || o.ownerId === userId)
    mine.forEach(refresh)
    save()
    return mine.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map((o) => view(o, userId))
  },

  /** The stored offer, refreshed, if `userId` takes part in it. */
  get(id: string, userId: string): StoredOffer | undefined {
    const offer = offers.get(id)
    if (!offer || (offer.offererId !== userId && offer.ownerId !== userId)) return undefined
    refresh(offer)
    return offer
  },

  view,

  markRead(offer: StoredOffer, userId: string) {
    offer.unreadFor = offer.unreadFor.filter((id) => id !== userId)
    save()
  },

  openOfferOn(listingId: string, offererId: string): StoredOffer | undefined {
    return [...offers.values()].find((o) => {
      if (o.listingId !== listingId || o.offererId !== offererId) return false
      refresh(o)
      return o.status === 'PENDING'
    })
  },

  create(listingId: string, offererId: string, ownerId: string, terms: OfferTerms): StoredOffer {
    const now = new Date().toISOString()
    const offer: StoredOffer = {
      id: newId('o'),
      listingId,
      offererId,
      ownerId,
      status: 'PENDING',
      versions: [],
      expiresAt: lifetime(),
      createdAt: now,
      updatedAt: now,
      unreadFor: [],
    }
    addVersion(offer, offererId, terms)
    offers.set(offer.id, offer)
    save()
    return offer
  },

  counter(offer: StoredOffer, authorId: string, terms: OfferTerms) {
    addVersion(offer, authorId, terms)
    save()
  },

  accept(offer: StoredOffer) {
    accept(offer)
    save()
  },

  end(offer: StoredOffer, status: 'REJECTED' | 'WITHDRAWN') {
    close(offer, status)
    save()
  },

  /** The member's items that could go into a swap: listings in play and offer-only items. */
  itemsOf(userId: string): SwapItem[] {
    const listed = listingsDb
      .ownedBy(userId)
      .filter((l) => ['ACTIVE', 'PENDING_REVIEW', 'RESERVED'].includes(l.status))
      .map((l) => listingItem(listingsDb.byIdOrSlug(l.id)!.detail))
    const own = [...items.values()].filter((i) => i.ownerId === userId).map(toSwapItem)
    return [...own.reverse(), ...listed]
  },

  item: findItem,

  createItem(ownerId: string, input: OfferItemInput): SwapItem {
    const item: StoredItem = {
      id: newId('i'),
      ownerId,
      title: input.title.trim(),
      condition: input.condition!,
      defects: input.noDefects ? [] : input.defects.map((d) => d.trim()).filter(Boolean),
      repairs: input.repairs.trim() || undefined,
      photos: input.photos,
      reserved: false,
    }
    items.set(item.id, item)
    save()
    return toSwapItem(item)
  },

  /** A write already answered for this key: the same result comes back instead of a second change (PRD §7.4). */
  replay(key: string | null, userId: string): Replay | undefined {
    const found = key ? replays.get(key) : undefined
    return found?.userId === userId ? found : undefined
  },

  remember(key: string | null, replay: Replay) {
    if (!key) return
    replays.set(key, replay)
    save()
  },

  /** True once: the write was saved, but the response is lost (dev toolbar, QA-21). */
  takeFailAfterSave() {
    const fail = failAfterSave
    failAfterSave = false
    return fail
  },
}

/** Picks the dev toolbar's target: the given offer, or the first open one where the member is waiting. */
function target(offerId: string | undefined, test: (offer: StoredOffer, me: string) => boolean) {
  const me = authDb.current()?.id
  if (!me) return undefined
  if (offerId) return offersDb.get(offerId, me)
  return [...offers.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .find((o) => {
      if (o.offererId !== me && o.ownerId !== me) return false
      refresh(o)
      return o.status === 'PENDING' && test(o, me)
    })
}

const STEP = 500_000 // ₦5,000

/** The other person's counter: a nudge in their favour, the way people actually haggle. */
function counterTerms(offer: StoredOffer, authorId: string): OfferTerms {
  const terms = currentVersion(offer)
  const authorIsOwner = authorId === offer.ownerId
  if (terms.mode === 'SWAP') {
    return authorIsOwner
      ? {
          ...terms,
          mode: 'SWAP_PLUS_CASH',
          cashKobo: 2_000_000,
          cashDirection: 'OFFERER_PAYS_OWNER',
          note: 'Add ₦20,000 and it’s a deal.',
        }
      : { ...terms, note: 'Straight swap is the best I can do.' }
  }
  const authorReceives = (terms.cashDirection === 'OFFERER_PAYS_OWNER') === authorIsOwner
  const factor = authorReceives ? 1.08 : 0.94
  const cashKobo = Math.max(STEP, Math.round((terms.cashKobo * factor) / STEP) * STEP)
  return { ...terms, cashKobo, note: authorReceives ? 'Can you do a little more?' : 'That’s a bit high for me.' }
}

/** Controls for the dev toolbar and tests. Each one acts as the other person in the negotiation. */
export const mockOffers = {
  otherPartyCounters(offerId?: string) {
    const offer = target(offerId, (o, me) => turnOf(o) !== me)
    if (!offer) return false
    const other = turnOf(offer)!
    offersDb.counter(offer, other, counterTerms(offer, other))
    return true
  },
  otherPartyAccepts(offerId?: string) {
    const offer = target(offerId, (o, me) => turnOf(o) !== me)
    if (!offer) return false
    offersDb.accept(offer)
    return true
  },
  /** The owner accepts someone else's offer on the item the member offered for (FE-OFF-11). */
  closeByOtherAcceptance(offerId?: string) {
    const me = authDb.current()?.id
    const offer = target(offerId, (o) => o.offererId === me)
    if (!offer) return false
    listingsDb.setStatus(offer.listingId, 'RESERVED')
    close(offer, 'CLOSED_UNAVAILABLE', 'The owner accepted another offer.')
    save()
    return true
  },
  expire(offerId?: string) {
    const offer = target(offerId, () => true)
    if (!offer) return false
    offer.expiresAt = new Date(Date.now() - 60_000).toISOString()
    refresh(offer)
    save()
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
