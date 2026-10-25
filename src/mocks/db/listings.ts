import { detailToInput, emptyListingInput, inputToDetail } from '@/features/selling/listing-input'
import { authDb, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { listings as fixtures } from '@/mocks/fixtures/listings'
import type { ListingDetail, ListingInput, ListingStatus, ListingSummary, OwnListing, PublicSeller } from '@/types/api'

/**
 * Every listing the mock API knows: the fictional fixtures plus anything members create in the wizard.
 * A listing is its public detail plus, once edited in the wizard, the owner's input it was built from.
 * In the browser, listings that were created or changed are kept in storage so drafts survive a reload.
 */

type MockListing = { detail: ListingDetail; input?: ListingInput; ownerId: string; updatedAt: string }

const STORAGE_KEY = 'nextown-mock-listings'
const persistent = import.meta.env.MODE !== 'test'
const HOUR = 3_600_000

function seed(): Map<string, MockListing> {
  const map = new Map<string, MockListing>()
  for (const detail of fixtures) {
    map.set(detail.id, { detail, ownerId: detail.seller.id, updatedAt: detail.publishedAt })
  }
  // One unfinished draft for the sample member, so My listings has something in every common tab
  const draftInput: ListingInput = { ...emptyListingInput, title: 'PS4 DualShock controller', categoryId: 'gaming' }
  map.set(
    'l-draft-sample',
    build({ id: 'l-draft-sample', slug: 'l-draft-sample', status: 'DRAFT' }, draftInput, SAMPLE_MEMBER_ID),
  )
  return map
}

let store = new Map<string, MockListing>()
const touched = new Set<string>()
let goLive = false

function sellerFor(ownerId: string): PublicSeller {
  const profile = authDb.publicProfile(ownerId)
  if (!profile)
    return {
      id: ownerId,
      displayName: 'Member',
      phoneConfirmed: true,
      reviewCount: 0,
      areaName: runtimeConfig.cityName,
    }
  const { memberSince: _memberSince, ...seller } = profile
  return seller
}

function build(
  meta: {
    id: string
    slug: string
    status: ListingStatus
    publishedAt?: string
    urgencyEndsAt?: string
    sample?: boolean
  },
  input: ListingInput,
  ownerId: string,
): MockListing {
  const updatedAt = new Date().toISOString()
  const detail = inputToDetail(input, {
    ...meta,
    publishedAt: meta.publishedAt ?? updatedAt,
    seller: sellerFor(ownerId),
    config: runtimeConfig,
  })
  return { detail, input, ownerId, updatedAt }
}

function save(id: string) {
  touched.add(id)
  if (!persistent) return
  try {
    const records = Object.fromEntries([...touched].flatMap((key) => (store.has(key) ? [[key, store.get(key)]] : [])))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, removed: [...touched].filter((k) => !store.has(k)) }))
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function load() {
  store = seed()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { records: Record<string, MockListing>; removed: string[] }
    for (const [id, record] of Object.entries(saved.records)) {
      store.set(id, record)
      touched.add(id)
    }
    for (const id of saved.removed) {
      store.delete(id)
      touched.add(id)
    }
  } catch {
    // Corrupted entry: start from the fixtures
  }
}
load()

const toOwn = (record: MockListing): OwnListing => {
  const { detail } = record
  return {
    ...(record.input ?? detailToInput(detail, runtimeConfig)),
    id: detail.id,
    slug: detail.slug,
    status: detail.status,
    updatedAt: record.updatedAt,
    publishedAt: detail.status === 'DRAFT' ? undefined : detail.publishedAt,
    urgencyEndsAt: detail.urgencyEndsAt,
  }
}

const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'listing'

let counter = 0
const newId = () => `l-${Date.now().toString(36)}${(counter++).toString(36)}`

export type ListingChanges = {
  status?: ListingStatus
  publishedAt?: string
  urgencyEndsAt?: string | null
  slug?: string
}

export const listingsDb = {
  /** Public details of every listing (callers filter by status). */
  details(): ListingDetail[] {
    return [...store.values()].map((r) => r.detail)
  },

  byIdOrSlug(key: string): MockListing | undefined {
    return store.get(key) ?? [...store.values()].find((r) => r.detail.slug === key)
  },

  ownedBy(userId: string): OwnListing[] {
    return [...store.values()]
      .filter((r) => r.ownerId === userId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map(toOwn)
  },

  own(id: string): OwnListing | undefined {
    const record = store.get(id)
    return record ? toOwn(record) : undefined
  },

  ownerOf(id: string): string | undefined {
    return store.get(id)?.ownerId
  },

  create(ownerId: string, input: ListingInput): OwnListing {
    const id = newId()
    store.set(id, build({ id, slug: id, status: 'DRAFT' }, input, ownerId))
    save(id)
    return toOwn(store.get(id)!)
  },

  /** Replaces the input and/or changes state; the public detail is rebuilt from the input. */
  update(id: string, input: ListingInput, changes: ListingChanges = {}): OwnListing {
    const record = store.get(id)!
    const { detail } = record
    const urgencyEndsAt = changes.urgencyEndsAt === null ? undefined : (changes.urgencyEndsAt ?? detail.urgencyEndsAt)
    store.set(
      id,
      build(
        {
          id,
          slug: changes.slug ?? detail.slug,
          status: changes.status ?? detail.status,
          publishedAt: changes.publishedAt ?? (detail.status === 'DRAFT' ? undefined : detail.publishedAt),
          urgencyEndsAt,
          sample: detail.sample,
        },
        input,
        record.ownerId,
      ),
    )
    save(id)
    return toOwn(store.get(id)!)
  },

  remove(id: string) {
    store.delete(id)
    save(id)
  },

  newSlug(title: string, id: string) {
    return `${slugify(title)}-${id.slice(-4)}`
  },

  /** Changes only the state, e.g. when an accepted offer reserves the item. */
  setStatus(id: string, status: ListingStatus) {
    const record = store.get(id)
    if (record) listingsDb.update(id, toOwnInput(record), { status })
  },

  goesLive: () => goLive,
}

/** What cards and lists get: the detail without its long-form fields. */
export const toSummary = ({
  images: _images,
  description: _description,
  defects: _defects,
  repairs: _repairs,
  accessories: _accessories,
  desiredSwap: _desiredSwap,
  categoryFields: _categoryFields,
  seller: _seller,
  ...summary
}: ListingDetail): ListingSummary => summary

/** Controls for the dev toolbar and tests. */
export const mockListings = {
  publishLive(live: boolean) {
    goLive = live
  },
  approvePending() {
    for (const [id, record] of store) {
      if (record.detail.status === 'PENDING_REVIEW') listingsDb.update(id, toOwnInput(record), { status: 'ACTIVE' })
    }
  },
  /** Ends a listing's run as if its deadline passed (QA-10). */
  expire(id: string) {
    const record = store.get(id)
    if (!record) return
    listingsDb.update(id, toOwnInput(record), {
      status: 'EXPIRED',
      urgencyEndsAt: record.detail.urgencyEndsAt ? new Date(Date.now() - HOUR).toISOString() : null,
    })
  },
  reset() {
    store = seed()
    touched.clear()
    goLive = false
  },
}

function toOwnInput(record: MockListing): ListingInput {
  return record.input ?? detailToInput(record.detail, runtimeConfig)
}
