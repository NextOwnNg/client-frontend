# Phase 0 — Experience Foundations Implementation Plan

> **For agentic workers:** Execute natively with superpowers:executing-plans. **No git commits and no review agents**: the product owner reviews and commits. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the reusable foundation every later phase builds on: logic helpers, motion presets, brand components (including the signature worked-sum), the responsive app shell, a mock API with fictional sample data, and a `/dev/components` gallery.

**Architecture:** Pure logic in `src/lib/*` (test-first). Brand wrappers over HeroUI in `src/components/ui`; NextOwn-specific pieces in `src/components/domain`; shell in `src/app/layouts`. Framer Motion presets live in `src/lib/motion` and every animated component uses them. MSW runs in the browser in dev (`src/mocks/browser.ts`) and in Node for tests, sharing one handler set and one fixture set.

**Tech stack:** as in the roadmap, plus Framer Motion 14.

**Spec:** [docs/prd.md](../../prd.md) · [roadmap](2026-10-22-ui-build-roadmap.md) · direction contract in `.impeccable/surfaces/src-app.md` · chosen sketch `.impeccable/mocks/decision/assigned.html`

## Global Constraints

- Brand Kit tokens only (`src/styles/*`); no raw hex in components.
- 24px baseline rhythm: vertical spacing in multiples of 4, text blocks on 24px lines; tabular numerals for amounts, IDs and times.
- Teal margin rule: 2px `--nx-teal`, used for item facts, sums and timelines (direction contract OWN-WORLD).
- Motion: 120 / 200 / 320 ms, ease-out `[0.16, 1, 0.3, 1]`; `<MotionConfig reducedMotion="user">` at the root.
- Controls 48px, targets ≥ 44px; status = text + icon.
- Required and banned copy per PRD §10.
- Sample data is fictional, uses "[Pilot Area]"-style areas and mock categories, and is labelled sample in the dev toolbar.

## Review Focus

1. **Amounts at extremes:** `formatNaira(0)`, `formatNaira(10_000_000_000)` (₦100,000,000) and a `MoneyField` paste of "₦1,200,000.50" all behave predictably (decimals rejected with a message, never silently rounded).
2. **Deadlines across midnight WAT and in the past:** `relativeDeadline` returns "Ended" for past times and never negative values.
3. **Phone input variants:** `0803 123 4567`, `803-123-4567`, `+234 803 123 4567` and `2348031234567` normalise to the same E.164; 10-digit landline-like input is rejected.
4. **Shell at 320px:** header, chips and bottom nav don't overflow; nav labels never wrap.
5. **Reduced motion:** with `prefers-reduced-motion`, OfferSum lines and ticks render in their final state immediately.

---

### Task 1: Money, phone and time logic

**Files:**
- Create: `src/lib/money/money.ts`, `src/lib/money/money.test.ts`
- Create: `src/lib/phone/phone.ts`, `src/lib/phone/phone.test.ts`
- Create: `src/lib/time/time.ts`, `src/lib/time/time.test.ts`

**Interfaces (produces):**
- `formatNaira(kobo: number): string` → `"₦285,000"` (whole naira, grouping, `₦` prefix)
- `parseNairaInput(input: string): { ok: true; kobo: number } | { ok: false; error: 'empty' | 'invalid' | 'decimal' | 'too_large' }` (accepts digits, commas, spaces, leading ₦; max ₦1,000,000,000)
- `nairaToKobo(naira: number): number`, `koboToNaira(kobo: number): number`
- `normalisePhone(input: string): { ok: true; e164: string } | { ok: false }` (Nigerian mobile: 10 national digits starting 7/8/9)
- `formatPhoneDisplay(e164: string): string` → `"+234 803 123 4567"`
- `formatWAT(iso: string, opts?: { withTime?: boolean }): string` → `"Fri 24 Oct, 6:00 pm WAT"`
- `relativeDeadline(iso: string, now: number): { label: string; fractionLeft: number; ended: boolean }` (`"Ends in 18h"`, `"Ends in 2 days"`, `"Ended"`; `fractionLeft` 0–1 against an optional total)

- [ ] Write tests: `formatNaira(28_500_000) === '₦285,000'`; `formatNaira(0) === '₦0'`; `parseNairaInput('₦1,200,000')` → kobo `120_000_000`; `'1200.50'` → `decimal`; `''` → `empty`; `'12a'` → `invalid`; `'2,000,000,000'` → `too_large`; the four phone variants in Review Focus 3 → `+2348031234567`; `'012345678'` → not ok; `relativeDeadline` with +18h → `"Ends in 18h"`, +50h → `"Ends in 2 days"`, −1h → `{ label: 'Ended', ended: true, fractionLeft: 0 }`; `formatWAT('2026-10-24T17:00:00Z')` contains `"6:00 pm"` and `"WAT"`.
- [ ] Run `npx vitest run src/lib` → FAIL (modules missing).
- [ ] Implement the three modules (`Intl.NumberFormat('en-NG')`, `Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos' })`; integer maths only for money).
- [ ] Run `npx vitest run src/lib` → PASS.

### Task 2: Copy, status vocabulary and the banned-phrase guard

**Files:**
- Create: `src/lib/copy/copy.ts`, `src/lib/copy/status.ts`, `src/lib/copy/banned.ts`, `src/lib/copy/banned.test.ts`, `src/lib/copy/status.test.ts`

**Interfaces (produces):**
- `copy` object with PRD §10.1 strings (keys: `hero`, `brandLine`, `supportingLine`, `phoneBadgeExplainer`, `quickSellNote`, `beforeSend`, `offerAccepted`, `handoverCaution`, `partialConfirmation`, `unavailable`, `staleVersion`, `expiredListing`, `reviewGate`, `supportLimit`, `commentsNote`, `chatNote`)
- `type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'highlight'`
- `listingStatus(status: ListingStatus, opts?: { urgencyLabel?: string }): { label: string; tone: StatusTone; icon: LucideIcon }`
- `BANNED_PHRASES: readonly string[]` (PRD §10.2)

- [ ] Write tests: `listingStatus('RESERVED').label === 'Reserved'`; `listingStatus('REMOVED').label === 'No longer available'`; a test that globs `src/**/*.{ts,tsx}` (excluding `banned.ts` and tests) and asserts no file contains any banned phrase (case-insensitive).
- [ ] Run → FAIL. Implement. Run → PASS.

### Task 3: Motion presets

**Files:**
- Create: `src/lib/motion/presets.ts`
- Modify: `src/app/App.tsx` (wrap in `<MotionConfig reducedMotion="user" transition={transitions.standard}>`)

**Interfaces (produces):**
- `durations = { fast: 0.12, standard: 0.2, slow: 0.32 }`, `easeOut = [0.16, 1, 0.3, 1]`
- `transitions.{fast,standard,slow}`, `springs.sheet = { type: 'spring', stiffness: 420, damping: 40 }`, `springs.press = { type: 'spring', stiffness: 600, damping: 35 }`
- `variants.fadeRise` (opacity 0→1, y 8→0), `variants.stepSlide(direction: 1 | -1)` (x ±16)
- `pressable = { whileTap: { scale: 0.98 } }`

- [ ] No unit test (constants); verified through component tests in Tasks 4–5 and the gallery.

### Task 4: Brand UI components

**Files (each with a `.test.tsx` where behaviour exists):**
- Create in `src/components/ui/`: `Button.tsx` (re-exports HeroUI `Button` plus `ButtonLink` for router links), `TextField.tsx`, `MoneyField.tsx`, `PhoneField.tsx`, `RadioCards.tsx`, `StatusBadge.tsx`, `Sheet.tsx`, `ConfirmModal.tsx`, `Banner.tsx`, `toast.ts`, `EmptyState.tsx`, `ErrorState.tsx`, `SkeletonCard.tsx`, `ProgressLine.tsx`, `ImageWithFade.tsx`

**Interfaces (produces):**
- `TextField({ label, hint?, error?, ...inputProps })`: label above, hint and error linked via `aria-describedby`
- `MoneyField({ label, value: number | null /* kobo */, onChange(kobo: number | null), error?, hint? })`: `₦` prefix, `inputMode="numeric"`, groups on blur, uses `parseNairaInput`, shows the parse error message
- `PhoneField({ value, onChange(e164 | null), error? })`: fixed `+234` prefix, `inputMode="tel"`, `autoComplete="tel-national"`
- `RadioCards<T extends string>({ label, options: { value: T; title; description?; disabled?; disabledReason? }[], value, onChange })`: radio-group semantics, 48px+ cards, Teal selected border plus check icon
- `StatusBadge({ tone, icon, children })`
- `Sheet({ open, onOpenChange, title, children, footer? })`: bottom sheet under 768px (Framer drag-to-dismiss, `springs.sheet`), centred dialog at 768px and above; focus trap and Escape via HeroUI Modal/Drawer underneath
- `ConfirmModal({ open, onOpenChange, title, body, confirmLabel, tone?: 'primary' | 'danger', onConfirm(): Promise<void> | void })`: loading state blocks a double confirm
- `Banner({ tone, title, children?, action? })`: persistent, `role="status"` (info/success) or `role="alert"` (danger/warning)
- `toast.success(message)`, `toast.error(message)`, for low-stakes feedback only
- `EmptyState({ icon, title, body?, action? })`, `ErrorState({ title?, body?, onRetry? })`
- `ProgressLine({ steps: { id; label; state: 'done' | 'current' | 'todo' }[] })`: the Teal margin-rule corridor; done steps draw a tick (SVG path length, 320ms)
- `ImageWithFade({ src, alt, aspect: '4/3' | '1/1', sizes? })`: Mint placeholder, 200ms fade on load, keeps layout on error with an icon

- [ ] Tests: `MoneyField` typing `1200000` then blur shows `1,200,000` and calls `onChange(120_000_000)`; typing `12.5` shows "Use whole naira, without kobo." and calls `onChange(null)`. `PhoneField` with `08031234567` calls `onChange('+2348031234567')`. `RadioCards` is keyboard-selectable with arrow keys and exposes `role="radiogroup"`. `ConfirmModal` calls `onConfirm` once on a double click while pending. `ProgressLine` exposes a list with each step's state in its accessible name ("Check terms, done").
- [ ] Run → FAIL. Implement (read `impeccable/reference/craft-floor.md` first). Run → PASS.

### Task 5: Domain primitives and the worked sum

**Files:**
- Create in `src/components/domain/`: `Price.tsx`, `payer-sentence.ts` (+ `.test.ts`), `OfferSum.tsx` (+ `.test.tsx`), `TrustModule.tsx`, `AreaLabel.tsx`, `Deadline.tsx`, `ListingRow.tsx`, `ListingTile.tsx`

**Interfaces (produces):**
- `type CashDirection = 'OFFERER_PAYS_OWNER' | 'OWNER_PAYS_OFFERER' | 'NONE'`
- `payerSentence({ viewer: 'offerer' | 'owner', direction: CashDirection, kobo: number }): string`: "You pay ₦120,000 directly at the exchange." / "The other person pays you ₦50,000 directly." / "No cash changes hands."
- `OfferSum({ give: { title: string; kind: 'item' | 'cash'; kobo?: number }[], receive: { title: string; kobo?: number }, sentence: string, delta?: { kobo: number; label: string }, animateIn?: boolean })`: the signature. Margin rule, `+` / `=` operators, a double-ruled total, Teal answer sentence; lines rise in 40ms apart on first mount; `delta` shows a Mint highlight chip (+₦50,000)
- `Price({ kobo: number | null, size?: 'md' | 'lg' })`: `null` renders "Open to swap"
- `TrustModule({ phoneConfirmed: boolean, reviewCount: number, rating?: number })`: "Phone confirmed" with an explainer popover; "No reviews yet" or "4.8 · 12 reviews"
- `Deadline({ endsAt: string, startedAt?: string, variant: 'compact' | 'detail' })`: compact = Gold tag "Quick Sell · Ends in 18h"; detail adds the absolute WAT time and a duration bar (`fractionLeft`)
- `ListingRow` and `ListingTile({ listing: ListingSummary })`: row = sketch's horizontal card (112px photo, margin rule, facts, price + mode tag); tile = 2-up grid card for desktop; both cover Available / Reserved / Expired / Removed and a long title

- [ ] Tests: the payer sentence for all three directions × both viewers; `OfferSum` renders "You pay ₦120,000 directly at the exchange." and the delta chip text "+₦50,000"; `ListingRow` for a RESERVED listing shows "Reserved" and no price CTA styling.
- [ ] Run → FAIL. Implement. Run → PASS.

### Task 6: Mock API and fictional sample data

**Files:**
- Create: `src/mocks/fixtures/{categories,areas,users,listings}.ts`, `src/mocks/handlers/{config,listings}.ts`, `src/mocks/handlers/index.ts`, `src/mocks/browser.ts`, `src/mocks/dev-settings.ts` (Zustand: `latencyMs`, `failNext`, `persona: 'guest' | 'member'`)
- Create: `public/mock/items/*.jpg` (sample stock photos, downloaded, ≤ 120 KB each, provenance in `public/mock/items/SOURCES.md`)
- Modify: `src/main.tsx` (start the worker in dev before render), `src/test/msw/handlers.ts` (reuse `src/mocks/handlers`)
- Create: `src/types/api.ts` (`ListingSummary`, `ListingStatus`, `Category`, `Area`, `RuntimeConfig`, `Paginated<T>`)

**Interfaces (produces):**
- `GET /config` → `RuntimeConfig` (areas, categories with field definitions, `offerLifetimeHours: 72`, `quickSellOptionsHours: [24, 48, 72, 168]`, `reservationDays: 7`, `photoLimits: { min: 1, max: 8 }`)
- `GET /listings?category&area&mode&q&cursor` → `Paginated<ListingSummary>`
- Mock categories (R-4): Phones, Laptops, Gaming, Home & appliances, each with example fields (storage, battery health, accessories); all in `fixtures/categories.ts`
- 16 fictional listings across the four categories and statuses, every one with `sample: true`

- [ ] Test: `GET /listings?category=phones` via `apiClient` returns only phones; `GET /listings/:id` for a missing id returns 404 `NOT_FOUND`.
- [ ] Run → FAIL. Implement. Run → PASS.

### Task 7: App shell

**Files:**
- Create: `src/app/layouts/AppLayout.tsx` (replaces `PublicLayout`), `src/components/layout/{Header.tsx,BottomNav.tsx,DesktopNav.tsx,Footer.tsx,OfflineBanner.tsx,RouteProgress.tsx,DevToolbar.tsx}`
- Create: `src/hooks/useOnline.ts`
- Modify: `src/app/router.tsx` (AppLayout; placeholder routes `/explore`, `/feed`, `/listings/new`, `/offers`, `/me` rendering a calm "Coming in phase N" EmptyState so nav works)

**Behaviour:**
- Header 56px: Logo (28px), area pill (opens an area Sheet), on 1024px+ inline nav (Explore · Feed · How it works) plus search entry and "List an item"; notification and message icon buttons with `aria-label`s.
- BottomNav (under 1024px): 64px plus safe-area; Explore · Feed · List (Teal 40px tile) · Offers · Profile; the active item gets Teal plus an indicator bar that slides between items (Framer `layoutId`); labels never wrap at 320px.
- OfflineBanner when `navigator.onLine` is false; RouteProgress thin Teal bar while lazy routes load.
- DevToolbar (dev only): latency, fail-next, persona, "Sample data" label.

- [ ] Test: the bottom nav renders five links with accessible names and marks the current route with `aria-current="page"`; the offline banner appears when an `offline` event fires.
- [ ] Run → FAIL. Implement. Run → PASS.

### Task 8: Component gallery and Phase 0 verification

**Files:**
- Create: `src/pages/dev/ComponentsPage.tsx` (route `/dev/components`, dev only): every component in every listed state, including OfferSum with a delta, ListingRow in all statuses with a long title, MoneyField errors, and Sheet/ConfirmModal triggers
- Modify: `src/pages/dev/TokensPage.tsx` (link to the gallery)

- [ ] `npm run typecheck && npm run lint && npx vitest run && npm run build` → all pass.
- [ ] Run the impeccable detector: `impeccable detect --json src` → fix mechanical findings.
- [ ] Capture `/dev/components` and the shell at 320, 390, 768 and 1440 into `.impeccable/review/`; check overlap, clipping, focus and reduced motion; fix in one batch, then recapture once.
- [ ] Generate `DESIGN.md` with the `impeccable-documenter` agent (documentation, not review).
- [ ] Hand over the approval package (roadmap §Phases) and stop.
