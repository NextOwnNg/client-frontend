import { seedSaved } from '@/mocks/fixtures/community'
import type { SavedIds, SavedKind } from '@/types/api'

/**
 * What each member saved (DSC-03). FICTIONAL. Only ids are kept: lists are joined with the live listings and
 * posts when read, so an item that became unavailable shows its true state.
 */

const STORAGE_KEY = 'nextown-mock-saved'
const persistent = import.meta.env.MODE !== 'test'

let saved: Record<string, SavedIds> = {}

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function load() {
  saved = seedSaved()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) saved = JSON.parse(raw) as Record<string, SavedIds>
  } catch {
    // Corrupted entry: start from the seeded saves
  }
}
load()

const bucket = (kind: SavedKind) => (kind === 'listing' ? 'listings' : 'posts')

export const savedDb = {
  /** Newest first. */
  ids(userId: string): SavedIds {
    const own = saved[userId] ?? { listings: [], posts: [] }
    return { listings: [...own.listings], posts: [...own.posts] }
  },

  /** Saving twice is the same as saving once. */
  set(userId: string, kind: SavedKind, id: string, on: boolean) {
    const own = (saved[userId] ??= { listings: [], posts: [] })
    const list = own[bucket(kind)].filter((x) => x !== id)
    own[bucket(kind)] = on ? [id, ...list] : list
    save()
  },
}

export const mockSaved = {
  reset() {
    saved = seedSaved()
  },
}
