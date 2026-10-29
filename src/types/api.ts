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
  /** For a signed-in viewer: whether they blocked the seller (ruling R7-4). Never says if the seller blocked them. */
  viewer?: { blockedSeller: boolean }
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
  avatarUrl?: string
  /** The member's open or decided request to lift a restriction (ruling R7-5). */
  appeal?: Appeal
}

export type Appeal = { caseRef: string; status: 'RECEIVED' | 'IN_REVIEW' | 'DECIDED'; createdAt: string }

/** `PATCH /me`. `acceptTerms` records the terms and 18+ acknowledgment that completes onboarding (ACC-04). */
export type MeUpdate = Partial<Pick<Me, 'displayName' | 'areaId' | 'interests' | 'marketingOptIn'>> & {
  acceptTerms?: { version: string; adult: boolean }
  /** An uploaded photo's media id, or null to remove the profile photo. */
  avatarId?: string | null
}

/** An uploaded photo: the image plus the media id the listing refers to. */
export type MediaRef = ListingImage & { id: string }

/**
 * What the owner edits in the listing wizard (PRD LST-02/03/04). Drafts may be incomplete; publishing
 * validates it. `defects` is one disclosed defect per entry; `noDefects` is the explicit "none" answer.
 */
export type ListingInput = {
  title: string
  categoryId: string | null
  /** Category field id → value; `"unknown"` records "Not known". */
  categoryFields: Record<string, string>
  description: string
  /** In display order; the first is the cover. */
  photos: MediaRef[]
  condition: ItemCondition | null
  defects: string[]
  noDefects: boolean
  repairs: string
  accessories: string
  ownershipConfirmed: boolean
  modes: TradeMode[]
  askingKobo: number | null
  desiredSwap: string
  openToOffers: boolean
  areaId: string | null
  quickSell: boolean
  quickSellHours: number | null
}

/** One of the member's own listings, in any state (`GET /me/listings`). */
export type OwnListing = ListingInput & {
  id: string
  slug: string
  status: ListingStatus
  updatedAt: string
  publishedAt?: string
  urgencyEndsAt?: string
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
  /** How to reach support (PRD §3.2: from config, never hard-coded). Each part is optional; unset ones aren't shown. */
  support?: SupportContacts
  /** Official social channels, in the order to show them. */
  social?: SocialChannel[]
}

export type SupportContacts = {
  email?: string
  /** Display form, e.g. "+234 803 123 4567". */
  phone?: string
  /** International digits for a wa.me link, e.g. "2348031234567". */
  whatsapp?: string
  /** When a person answers, e.g. "Mon to Sat, 9am to 6pm WAT". */
  hours?: string
}

export type SocialChannel = { network: 'instagram' | 'x' | 'tiktok' | 'facebook'; handle: string; url: string }

/** How an offer is made up (PRD §7.1). Listings accept CASH and/or SWAP; Swap + cash balances a swap. */
export type OfferMode = 'CASH' | 'SWAP' | 'SWAP_PLUS_CASH'

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED' | 'CLOSED_UNAVAILABLE'

/**
 * Something the offerer can put into a swap: one of their own listings, or an offer-only item that only the
 * person they offer it to can see (LST-07).
 */
export type SwapItem = {
  id: string
  title: string
  condition: ItemCondition
  defects: string[]
  repairs?: string
  photos: MediaRef[]
  source: 'listing' | 'offer-only'
  /** Public listing page, for items that are listed. */
  listingSlug?: string
  /** False once the item is reserved for another deal, or no longer listed. */
  available: boolean
  unavailableReason?: string
}

/** What a person creates in "Add an item" while making a swap offer. */
export type OfferItemInput = {
  title: string
  condition: ItemCondition | null
  defects: string[]
  noDefects: boolean
  repairs: string
  photos: MediaRef[]
  ownershipConfirmed: boolean
}

/** The terms of one offer version, as sent to the API (PRD §7.1 payload table). */
export type OfferTerms = {
  mode: OfferMode
  offeredItemId: string | null
  cashKobo: number
  cashDirection: CashDirection
  note: string
}

/** One immutable version of an offer: the first offer or a counter. */
export type OfferVersion = OfferTerms & {
  id: string
  number: number
  authorId: string
  offeredItem: SwapItem | null
  createdAt: string
}

/** A negotiation between the person offering and the listing's owner, as seen by one of them. */
export type Offer = {
  id: string
  /** The listing as it is now (live status and price), not as it was when the offer was made. */
  listing: ListingSummary
  offerer: PublicSeller
  owner: PublicSeller
  viewerRole: 'offerer' | 'owner'
  status: OfferStatus
  /** Oldest first; the last one is current. */
  versions: OfferVersion[]
  /** Whose decision is next; null once the offer is closed. */
  turnUserId: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
  /** Why it closed, in words, e.g. "The owner accepted another offer." */
  closedReason?: string
  /** Set once accepted. */
  transactionId?: string
  /** Where the deal stands once accepted. */
  transactionStatus?: TransactionStatus
  /** Changed since the viewer last opened it. */
  unread: boolean
}

export type NewOffer = OfferTerms & { listingId: string }

export type TransactionStatus = 'AWAITING_HANDOVER' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED' | 'EXPIRED'

/** One item exactly as it was agreed: copied at acceptance, never read from the live listing (QA-08). */
export type SnapshotItem = {
  title: string
  condition: ItemCondition
  defects: string[]
  repairs?: string
  photos: ListingImage[]
  listingSlug?: string
}

/** The frozen terms of an accepted offer (FE-TRX-01). */
export type AgreementSnapshot = {
  mode: OfferMode
  listingItem: SnapshotItem
  offeredItem: SnapshotItem | null
  cashKobo: number
  cashDirection: CashDirection
  versionNumber: number
  acceptedAt: string
}

/** Private to the two people (FE-TRX-03). `agreedBy` holds who has said yes to this exact proposal. */
export type Meeting = { place: string; time: string; note: string; proposedBy: string; agreedBy: string[] }

/** The statements a person ticks when confirming their side (FE-TRX-05). */
export type ConfirmCheck = 'received' | 'gave' | 'cash'

export type CancelReason = 'CHANGED_MIND' | 'CANT_MEET' | 'ITEM_PROBLEM' | 'OTHER'

export type DisputeCategory = 'CONDITION' | 'NO_SHOW' | 'PAYMENT' | 'UNSAFE' | 'OTHER'

export type Review = {
  rating: number
  note?: string
  authorId: string
  subjectId: string
  createdAt: string
}

export type Transaction = {
  id: string
  offerId: string
  status: TransactionStatus
  viewerRole: 'offerer' | 'owner'
  offerer: PublicSeller
  owner: PublicSeller
  agreement: AgreementSnapshot
  meeting: Meeting | null
  /** When each person confirmed their side, or null. */
  confirmations: { offerer: string | null; owner: string | null }
  reservationExpiresAt: string
  cancellation?: { requestedBy: string; reason: CancelReason; note?: string; requestedAt: string }
  dispute?: { caseRef: string; openedBy: string; openedAt: string; category: DisputeCategory }
  /** Why it ended, in words, for cancelled and expired deals. */
  endedReason?: string
  completedAt?: string
  endedAt?: string
  /** Reviews unlock only on COMPLETED; `mine` once the reader has left one. */
  review: { eligible: boolean; mine?: Review; theirs?: Review }
  createdAt: string
  updatedAt: string
}

export type ReviewWithContext = Review & {
  authorName: string
  subjectName: string
  itemTitle: string
  transactionId: string
}

/** A feed highlight (FE-FED-01): a caption on one of the author's listings. Price and status are the listing's own. */
export type FeedPost = {
  id: string
  author: PublicSeller
  caption: string
  /** The listing as it is now; null once the listing or the post was removed. */
  listing: ListingSummary | null
  commentCount: number
  createdAt: string
  /** Set when moderators removed the post or its listing (ruling R6-2). */
  removed?: boolean
}

export type FeedComment = {
  id: string
  author: PublicSeller
  /** Empty when moderators removed it. */
  body: string
  removed: boolean
  createdAt: string
}

/** What the member has saved, for toggles (FE-SAV-01). */
export type SavedIds = { listings: string[]; posts: string[] }

export type SavedKind = 'listing' | 'post'

/** An offer version as it appears in chat: the terms in words come from these, never from message text (R6-6). */
export type OfferCardData = {
  offerId: string
  versionNumber: number
  authorId: string
  terms: OfferTerms
  listingTitle: string
  itemTitle: string | null
  /** The offer's status now, and whether this is still the version on the table. */
  offerStatus: OfferStatus
  current: boolean
}

export type ChatMessage = {
  id: string
  /** Chosen by the sender; a retry with the same one is stored once (FE-MSG-02). */
  clientId: string
  senderId: string
  kind: 'text' | 'offer' | 'event'
  /** Plain text. Empty when moderated. */
  body: string
  moderated?: boolean
  offer?: OfferCardData
  /** For events: where the line links, e.g. the deal. */
  link?: string
  createdAt: string
}

export type ConversationBlock = 'none' | 'by-me' | 'by-them'

/** A chat between two people about one listing, tied to an offer and, once accepted, a deal (ruling R6-5). */
export type Conversation = {
  id: string
  listing: ListingSummary
  other: PublicSeller
  /** The reader's side in the offer, so offer cards read from their side. */
  viewerRole: 'offerer' | 'owner'
  offerId: string
  offerStatus: OfferStatus
  transactionId?: string
  transactionStatus?: TransactionStatus
  blocked: ConversationBlock
  lastMessage?: { body: string; senderId: string; createdAt: string; kind: ChatMessage['kind'] }
  unreadCount: number
  updatedAt: string
}

export type ConversationDetail = Conversation & { messages: ChatMessage[] }

export type NotificationKind =
  | 'OFFER_RECEIVED'
  | 'OFFER_COUNTERED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'OFFER_WITHDRAWN'
  | 'MEETING_UPDATED'
  | 'CONFIRMED'
  | 'CANCEL_REQUESTED'
  | 'DISPUTE_OPENED'
  | 'MESSAGE'
  | 'COMMENT'

/** An in-app alert (FE-NTF-01). The text says what happened then; `link` opens where things stand now. */
export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  link: string
  read: boolean
  createdAt: string
}

export type NotificationCounts = { notifications: number; messages: number }

/** What can be reported from `/report/:type/:id` (FE-TRU-01). Deals are reported from the deal (ruling R7-1). */
export type ReportTargetType = 'listing' | 'post' | 'comment' | 'conversation' | 'offer' | 'user' | 'transaction'

export type ReportReason = 'PROHIBITED' | 'SCAM' | 'MISLEADING' | 'HARASSMENT' | 'UNSAFE' | 'SPAM' | 'OTHER'

export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACTION_TAKEN' | 'CLOSED'

/** What a report is about, as the reporter may see it. `author` is who would be blocked alongside the report. */
export type ReportTarget = {
  type: ReportTargetType
  id: string
  label: string
  author: { id: string; displayName: string } | null
}

export type NewReport = {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  description: string
  evidenceIds: string[]
  alsoBlock?: boolean
}

/** One of the member's own cases (FE-TRU-03): status only, never moderator notes. */
export type CaseReport = {
  id: string
  caseRef: string
  targetType: ReportTargetType
  targetLabel: string
  reason: ReportReason | DisputeCategory
  status: ReportStatus
  createdAt: string
  updatedAt: string
}

/** `POST /reports`. `duplicate` when the same target was already reported and the case is still open. */
export type ReportReceipt = { report: CaseReport; duplicate: boolean }

export type BlockedPerson = { id: string; displayName: string; avatarUrl?: string; blockedAt: string }
