import { runtimeConfig } from '@/mocks/fixtures/config'
import { sellers } from '@/mocks/fixtures/listings'
import { SAMPLE_CODE } from '@/mocks/sample-code'
import type { Me, PublicProfile, PublicSeller } from '@/types/api'

/**
 * The mock API's accounts, codes and session: a stand-in for the server and its HttpOnly cookie.
 * FICTIONAL. In the browser the signed-in account is kept in the mock's own storage (no password or phone),
 * so a reload stays signed in; tests keep everything in memory and reset after each test.
 */

export { SAMPLE_CODE }
export const SAMPLE_MEMBER_ID = 'u-tolu'
export const SAMPLE_MEMBER_EMAIL = 'tolu@nextown.example'
/** Every seeded account signs in with this password. */
export const SAMPLE_PASSWORD = 'nextown-pilot'

const CODE_TTL_MS = 10 * 60_000
const RESEND_AFTER_SECONDS = 60
const REQUEST_WINDOW_MS = 10 * 60_000
const MAX_REQUESTS = 3
const MAX_ATTEMPTS = 5
const MAX_SIGN_IN_FAILURES = 5
const LOCK_SECONDS = 10 * 60
const STORAGE_KEY = 'nextown-mock-session'
const persistent = import.meta.env.MODE !== 'test'

/** The server's own fields: the password and the full phone never leave it. */
type Account = Me & { password: string; phone?: string; emailConfirmed: boolean }
/** A code for one purpose: confirming a new email, or resetting a password. */
type Purpose = 'signup' | 'reset'
type Code = { expiresAt: number; attempts: number; locked: boolean; requests: number[] }

const memberSince = (id: string) => `2026-0${(id.length % 6) + 3}-12T09:00:00.000Z`

function seedAccounts(): Map<string, Account> {
  const seeded = sellers.map<Account>((s) => ({
    id: s.id,
    displayName: s.displayName,
    email: s.id === SAMPLE_MEMBER_ID ? SAMPLE_MEMBER_EMAIL : `${s.id.slice(2)}@nextown.example`,
    password: SAMPLE_PASSWORD,
    emailConfirmed: true,
    areaId: s.areaName.split('] ')[1]?.toLowerCase() ?? null,
    interests: [],
    phoneLast4: '0001',
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
let signInFailures = new Map<string, number>()
let sessionUserId: string | null = null
let rateLimitNext = false

const codeKey = (purpose: Purpose, email: string) => `${purpose}:${email}`
const byEmail = (email: string) => [...accounts.values()].find((a) => a.email === email)

function save() {
  if (!persistent) return
  try {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    if (!account) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(toMe(account)))
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
    // A session saved before email sign-in has no email: start signed out
    if (!stored.email) return
    const known = accounts.get(stored.id)
    accounts.set(stored.id, {
      password: SAMPLE_PASSWORD,
      emailConfirmed: true,
      ...known,
      ...stored,
    })
    sessionUserId = stored.id
  } catch {
    // Corrupted entry: start signed out
  }
}
load()

export type CodeRequestResult = { ok: true } | { ok: false; retryAfterSeconds: number }

export type CodeCheck =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' }
  | { ok: false; reason: 'locked'; retryAfterSeconds: number }

export type SignInResult =
  | { ok: true; user: Me }
  | { ok: false; reason: 'invalid' | 'unconfirmed' }
  | { ok: false; reason: 'locked'; retryAfterSeconds: number }

const toMe = ({ password: _password, phone: _phone, emailConfirmed: _confirmed, ...me }: Account): Me => me

function issueCode(purpose: Purpose, email: string): CodeRequestResult {
  const now = Date.now()
  const key = codeKey(purpose, email)
  const requests = (codes.get(key)?.requests ?? []).filter((t) => now - t < REQUEST_WINDOW_MS)

  if (rateLimitNext) {
    rateLimitNext = false
    return { ok: false, retryAfterSeconds: 5 * 60 }
  }
  if (requests.length >= MAX_REQUESTS) {
    return { ok: false, retryAfterSeconds: Math.ceil((requests[0]! + REQUEST_WINDOW_MS - now) / 1000) }
  }
  codes.set(key, { expiresAt: now + CODE_TTL_MS, attempts: 0, locked: false, requests: [...requests, now] })
  return { ok: true }
}

function checkCode(purpose: Purpose, email: string, code: string): CodeCheck {
  const key = codeKey(purpose, email)
  const entry = codes.get(key)
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
  codes.delete(key)
  return { ok: true }
}

function startSession(account: Account): Me {
  sessionUserId = account.id
  save()
  return toMe(account)
}

export const authDb = {
  /**
   * A new account waits for its email to be confirmed. An email that already has a confirmed account gets no
   * code (the real server emails its owner instead), and the answer is the same either way (FE-AUT-03).
   */
  signUp(email: string, password: string): CodeRequestResult {
    const existing = byEmail(email)
    if (existing?.emailConfirmed) return { ok: true }
    if (existing) existing.password = password
    else {
      const account: Account = {
        id: `u-new-${accounts.size}`,
        displayName: null,
        email,
        password,
        emailConfirmed: false,
        areaId: null,
        interests: [],
        phoneLast4: null,
        onboarded: false,
        restricted: false,
        marketingOptIn: false,
        reviewCount: 0,
        memberSince: new Date().toISOString(),
        deletionRequestedAt: null,
      }
      accounts.set(account.id, account)
    }
    return issueCode('signup', email)
  },

  /** Another sign-up code; only an account still waiting for its email gets one, with the same answer. */
  resendSignUpCode(email: string): CodeRequestResult {
    const account = byEmail(email)
    if (!account || account.emailConfirmed) return { ok: true }
    return issueCode('signup', email)
  },

  verifyEmail(email: string, code: string): { ok: true; user: Me; isNew: boolean } | Exclude<CodeCheck, { ok: true }> {
    const account = byEmail(email)
    if (!account || account.emailConfirmed) return { ok: false, reason: 'expired' }
    const check = checkCode('signup', email, code)
    if (!check.ok) return check
    account.emailConfirmed = true
    return { ok: true, user: startSession(account), isNew: true }
  },

  signIn(email: string, password: string): SignInResult {
    const failures = signInFailures.get(email) ?? 0
    if (rateLimitNext || failures >= MAX_SIGN_IN_FAILURES) {
      rateLimitNext = false
      return { ok: false, reason: 'locked', retryAfterSeconds: LOCK_SECONDS }
    }
    const account = byEmail(email)
    if (!account || account.password !== password) {
      signInFailures.set(email, failures + 1)
      return { ok: false, reason: 'invalid' }
    }
    signInFailures.delete(email)
    if (!account.emailConfirmed) return { ok: false, reason: 'unconfirmed' }
    return { ok: true, user: startSession(account) }
  },

  /**
   * A reset code. The limits apply to any email, so the answer never shows whether it has an account
   * (FE-AUT-03); a code for an email without one simply never works.
   */
  forgotPassword(email: string): CodeRequestResult {
    return issueCode('reset', email)
  },

  resetPassword(email: string, code: string, password: string): SignInResult | Exclude<CodeCheck, { ok: true }> {
    const account = byEmail(email)
    if (!account?.emailConfirmed) return { ok: false, reason: 'expired' }
    const check = checkCode('reset', email, code)
    if (!check.ok) return check
    account.password = password
    signInFailures.delete(email)
    return { ok: true, user: startSession(account) }
  },

  current(): Me | null {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    return account ? toMe(account) : null
  },

  /** Whether the signed-in account has its contact phone yet (onboarding needs one). */
  hasPhone(): boolean {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    return Boolean(account?.phoneLast4)
  },

  update(changes: Partial<Me> & { phone?: string }): Me | null {
    const account = sessionUserId ? accounts.get(sessionUserId) : undefined
    if (!account) return null
    const { phone, ...rest } = changes
    Object.assign(account, rest, phone && { phone, phoneLast4: phone.slice(-4) })
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
      ...(account.avatarUrl && { avatarUrl: account.avatarUrl }),
      emailConfirmed: true,
      reviewCount: account.reviewCount,
      rating: account.rating,
      areaName:
        runtimeConfig.areas.find((a) => a.id === account.areaId)?.name ?? seller?.areaName ?? runtimeConfig.cityName,
      memberSince: account.memberSince,
    }
  },

  /** The public card shown in offers and deals; a placeholder if the account is gone. */
  seller(id: string): PublicSeller {
    const profile = authDb.publicProfile(id)
    if (!profile) {
      return { id, displayName: 'Member', emailConfirmed: true, reviewCount: 0, areaName: runtimeConfig.cityName }
    }
    const { memberSince: _memberSince, ...seller } = profile
    return seller
  },

  /** A new review moves the person's count and average, as the server would. */
  addReview(subjectId: string, rating: number) {
    const account = accounts.get(subjectId)
    if (!account) return
    const count = account.reviewCount
    account.rating = Math.round((((account.rating ?? rating) * count + rating) / (count + 1)) * 10) / 10
    account.reviewCount = count + 1
    if (subjectId === sessionUserId) save()
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
    signInFailures = new Map()
    sessionUserId = null
    rateLimitNext = false
  },
}

export const authLimits = { resendAfterSeconds: RESEND_AFTER_SECONDS }
