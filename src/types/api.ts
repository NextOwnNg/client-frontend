/** API resource shapes (PRD §6, NX-PRD-001 §6). Money is integer kobo; times are ISO UTC strings. */

export type ListingStatus =
  'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'RESERVED' | 'EXPIRED' | 'COMPLETED' | 'CLOSED' | 'REMOVED'

export type TradeMode = 'CASH' | 'SWAP'

export type ItemCondition = 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'FOR_PARTS'

export type CashDirection = 'OFFERER_PAYS_OWNER' | 'OWNER_PAYS_OFFERER' | 'NONE'

export type Area = { id: string; name: string; cityId: string }

export type CategoryField = {
  id: string
  label: string
  type: 'text' | 'select' | 'percent'
  options?: string[]
  allowUnknown?: boolean
}

export type Category = { id: string; name: string; fields: CategoryField[] }

export type ListingImage = { url: string; alt: string; width: number; height: number }

export type PublicSeller = {
  id: string
  displayName: string
  avatarUrl?: string
  phoneConfirmed: boolean
  reviewCount: number
  rating?: number
  areaName: string
}

export type ListingSummary = {
  id: string
  slug: string
  title: string
  categoryId: string
  condition: ItemCondition
  /** One-line defect summary shown on cards; full disclosure lives on the detail. */
  defectSummary?: string
  acceptedModes: TradeMode[]
  /** Null when the listing is swap-only. */
  askingKobo: number | null
  areaName: string
  status: ListingStatus
  urgencyEndsAt?: string
  publishedAt: string
  cover: ListingImage
  /** True for fictional mock data. */
  sample?: boolean
}

/** Full public listing (PRD FE-LDT-01). Removed listings come back stripped: no photos, text or seller. */
export type ListingDetail = ListingSummary & {
  images: ListingImage[]
  description: string
  /** Disclosed defects, one per line; shown above the offer CTA. */
  defects: string[]
  repairs?: string
  accessories?: string
  /** What the owner would like in a swap. */
  desiredSwap?: string
  categoryFields: { label: string; value: string }[]
  seller: PublicSeller
}

/** A person's public profile (PRD FE-PRF-01): never a phone number or an exact location. */
export type PublicProfile = PublicSeller & { memberSince: string }

/** The signed-in member (`GET /me`). Only the last four digits of their own phone come back. */
export type Me = {
  id: string
  /** Null until onboarding sets it. */
  displayName: string | null
  areaId: string | null
  interests: string[]
  phoneLast4: string
  onboarded: boolean
  restricted: boolean
  restriction?: { reason: string }
  marketingOptIn: boolean
  reviewCount: number
  rating?: number
  memberSince: string
  deletionRequestedAt: string | null
}

/** `PATCH /me`. `acceptTerms` records the terms and 18+ acknowledgment that completes onboarding (ACC-04). */
export type MeUpdate = Partial<Pick<Me, 'displayName' | 'areaId' | 'interests' | 'marketingOptIn'>> & {
  acceptTerms?: { version: string; adult: boolean }
}

export type ListingSuggestion =
  { kind: 'query'; label: string } | { kind: 'category'; label: string; categoryId: string }

export type Paginated<T> = { items: T[]; nextCursor: string | null; total?: number }

export type RuntimeConfig = {
  cityName: string
  areas: Area[]
  categories: Category[]
  offerLifetimeHours: number
  quickSellOptionsHours: number[]
  reservationDays: number
  photoLimits: { min: number; max: number }
}
