/** API resource shapes (PRD §6, NX-PRD-001 §6). Money is integer kobo; times are ISO UTC strings. */

export type ListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'RESERVED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'CLOSED'
  | 'REMOVED'

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
