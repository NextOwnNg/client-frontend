import { runtimeConfig } from '@/mocks/fixtures/config'
import { sellers } from '@/mocks/fixtures/listings'
import { SAMPLE_CODE } from '@/mocks/sample-code'
import type { Me, PublicProfile } from '@/types/api'

/**
 * The mock API's accounts, codes and session: a stand-in for the server and its HttpOnly cookie.
 * FICTIONAL. In the browser the signed-in account is kept in the mock's own storage (no phone number),
 * so a reload stays signed in; tests keep everything in memory and reset after each test.
 */

export { SAMPLE_CODE }
export const SAMPLE_MEMBER_ID = 'u-tolu'
export const SAMPLE_MEMBER_PHONE = '+2348030000001'

const CODE_TTL_MS = 10 * 60_000
const RESEND_AFTER_SECONDS = 60
const REQUEST_WINDOW_MS = 10 * 60_000
const MAX_REQUESTS = 3
const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 10 * 60
const STORAGE_KEY = 'nextown-mock-session'
const persistent = import.meta.env.MODE !== 'test'

type Account = Me & { phone?: string }
type Code = { expiresAt: number; attempts: number; locked: boolean; requests: number[] }

const memberSince = (id: string) => `2026-0${(id.length % 6) + 3}-12T09:00:00.000Z`

function seedAccounts(): Map<string, Account> {
  const seeded = sellers.map<Account>((s) => ({
    id: s.id,
    displayName: s.displayName,
    areaId: s.areaName.split('] ')[1]?.toLowerCase() ?? null,
    interests: [],
    phoneLast4: '0001',
    phone: s.id === SAMPLE_MEMBER_ID ? SAMPLE_MEMBER_PHONE : undefined,
    onboarded: true,
    restricted: false,
    marketingOptIn: false,
    reviewCount: s.reviewCount,
    rating: s.rating,
    memberSince: memberSince(s.id),
    deletionRequestedAt: null,
  }))
  return new Map(seeded.map((a) => [a.id, a]))
}

let accounts = seedAccounts()
let codes = new Map<string, Code>()
let sessionUserId: string | null = null
let rateLimitNext = false

function save() {
  if (!persistent) return
  try {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    if (!account) localStorage.removeItem(STORAGE_KEY)
    else {
      const { phone: _phone, ...stored } = account
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    }
  } catch {
    // Storage unavailable: the mock session lasts until reload
  }
}

function load() {
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const stored = JSON.parse(raw) as Me
    accounts.set(stored.id, { ...accounts.get(stored.id), ...stored })
    sessionUserId = stored.id
  } catch {
    // Corrupted entry: start signed out
  }
}
load()

export type CodeRequestResult = { ok: true } | { ok: false; retryAfterSeconds: number }

export type VerifyResult =
  | { ok: true; user: Me; isNew: boolean }
  | { ok: false; reason: 'invalid' | 'expired' }
  | { ok: false; reason: 'locked'; retryAfterSeconds: number }

const toMe = ({ phone: _phone, ...me }: Account): Me => me

export const authDb = {
  requestCode(phone: string): CodeRequestResult {
    const now = Date.now()
    const existing = codes.get(phone)
    const requests = (existing?.requests ?? []).filter((t) => now - t < REQUEST_WINDOW_MS)

    if (rateLimitNext) {
      rateLimitNext = false
      return { ok: false, retryAfterSeconds: 5 * 60 }
    }
    if (requests.length >= MAX_REQUESTS) {
      return { ok: false, retryAfterSeconds: Math.ceil((requests[0]! + REQUEST_WINDOW_MS - now) / 1000) }
    }
    codes.set(phone, { expiresAt: now + CODE_TTL_MS, attempts: 0, locked: false, requests: [...requests, now] })
    return { ok: true }
  },

  verify(phone: string, code: string): VerifyResult {
    const entry = codes.get(phone)
    if (entry?.locked) return { ok: false, reason: 'locked', retryAfterSeconds: LOCK_SECONDS }
    if (!entry || entry.expiresAt <= Date.now()) return { ok: false, reason: 'expired' }
    if (code !== SAMPLE_CODE) {
      entry.attempts += 1
      if (entry.attempts >= MAX_ATTEMPTS) {
        entry.locked = true
        return { ok: false, reason: 'locked', retryAfterSeconds: LOCK_SECONDS }
      }
      return { ok: false, reason: 'invalid' }
    }

    codes.delete(phone)
    let account = [...accounts.values()].find((a) => a.phone === phone)
    const isNew = !account
    if (!account) {
      account = {
        id: `u-new-${phone.slice(-4)}-${accounts.size}`,
        displayName: null,
        areaId: null,
        interests: [],
        phoneLast4: phone.slice(-4),
        phone,
        onboarded: false,
        restricted: false,
        marketingOptIn: false,
        reviewCount: 0,
        memberSince: new Date().toISOString(),
        deletionRequestedAt: null,
      }
      accounts.set(account.id, account)
    }
    sessionUserId = account.id
    save()
    return { ok: true, user: toMe(account), isNew }
  },

  current(): Me | null {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    return account ? toMe(account) : null
  },

  update(changes: Partial<Me>): Me | null {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    if (!account) return null
    Object.assign(account, changes)
    save()
    return toMe(account)
  },

  signOut() {
    sessionUserId = null
    save()
  },

  publicProfile(id: string): PublicProfile | null {
    const account = accounts.get(id)
    if (!account?.onboarded) return null
    const seller = sellers.find((s) => s.id === id)
    return {
      id,
      displayName: account.displayName ?? seller?.displayName ?? 'Member',
      phoneConfirmed: true,
      reviewCount: account.reviewCount,
      rating: account.rating,
      areaName:
        runtimeConfig.areas.find((a) => a.id === account.areaId)?.name ?? seller?.areaName ?? runtimeConfig.cityName,
      memberSince: account.memberSince,
    }
  },
}

/** Controls for the dev toolbar and tests. */
export const mockAuth = {
  signInAs(id: string) {
    if (!accounts.has(id)) return
    sessionUserId = id
    save()
  },
  /** The server forgets the session; the client still thinks it's signed in until its next request. */
  expireSession() {
    authDb.signOut()
  },
  setRestricted(restricted: boolean) {
    authDb.update({
      restricted,
      restriction: restricted ? { reason: 'Some of your recent listings are being reviewed.' } : undefined,
    })
  },
  rateLimitNextRequest() {
    rateLimitNext = true
  },
  expireCodes() {
    for (const entry of codes.values()) entry.expiresAt = 0
  },
  reset() {
    accounts = seedAccounts()
    codes = new Map()
    sessionUserId = null
    rateLimitNext = false
  },
}

export const authLimits = { resendAfterSeconds: RESEND_AFTER_SECONDS }
