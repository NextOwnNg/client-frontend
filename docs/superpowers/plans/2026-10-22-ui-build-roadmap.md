# NextOwn Client UI — Build Roadmap

> **For agentic workers:** This is a phase roadmap, not a task list. Before a phase starts, write its detailed plan with superpowers:writing-plans (`docs/superpowers/plans/YYYY-MM-DD-phase-N-<name>.md`), then execute it natively in-session with superpowers:executing-plans. **No git commits and no review agents**: the product owner reviews and commits each phase. A phase starts only after the product owner approves the previous one.

**Goal:** Build the complete user-facing NextOwn web app (UX-01 to UX-26) as a calm, realistic, well-crafted marketplace experience, one approvable phase at a time.

**Architecture:** Each phase delivers a vertical slice: screens, components, state and mock API, all working end to end in the browser. The backend isn't ready, so a typed **MSW mock API** (browser worker in dev, same handlers in tests) stands in for it. Handlers follow the PRD contract (§7, PRD §9), so swapping in the real API changes only the base URL.

**Tech stack:** React 19, Vite, TypeScript, React Router 8, TanStack Query, Axios, Zustand, React Hook Form + Zod, HeroUI v3, Tailwind v4 brand tokens, Lucide, React Helmet, Vitest + Testing Library + MSW.

**Spec:** [docs/prd.md](../../prd.md) · [Brand Kit](../../NextOwn%20Brand%20Kit%20and%20Design%20System.md) · [UX brief](../../NextOwn%20UIUX%20Design%20Agent%20Ready%20Template.md)

## Global Constraints

- Brand Kit is the only source of visual values; components use semantic tokens, never raw hex.
- Mobile-first at 390 × 844; no horizontal scroll at 320 px; responsive to 1440+.
- Touch targets ≥ 44 × 44 px; primary controls 48 px.
- WCAG 2.2 AA; every status uses text + icon, never colour alone.
- Motion: 120 / 200 / 320 ms, ease-out, full `prefers-reduced-motion` path; no animated urgency timers.
- Money: integer kobo from the API, `₦` with grouping, tabular figures; cash direction always written as a sentence.
- Time: UTC in, WAT out; relative deadlines always paired with the absolute time on detail screens.
- Banned copy (PRD §10.2) never appears; required copy (PRD §10.1) used verbatim.
- No invented cities, user counts, stats or real prices; sample data uses "[Pilot Area]" and clearly illustrative items.
- Never show availability, acceptance, confirmation or completion optimistically.

## Review Focus

Things the spec implies that are easy to miss in a UI build. Each phase plan must include a test for the ones it touches.

1. **Long or awkward content:** 80-character titles, ₦100,000,000 amounts, a missing photo or a single-word 30-character name. Layout holds at 320 px with nothing clipped.
2. **Slow and failing networks:** every screen has designed loading, empty, error and offline states. Images failing never blocks an action.
3. **State changes underneath the user:** a listing becomes reserved while the user is reading it or composing an offer. The UI shows the true state and keeps the draft.
4. **Double actions:** a double tap on Send, Accept or Confirm never fires twice, and a retry after a timeout checks status first.
5. **Keyboard and screen reader:** sheets, modals, the wizard and the offer composer work without a mouse, and status changes are announced.

---

## Experience Direction

The aim is an app that feels **quietly confident and tactile**, like a well-made local tool. It is not a showcase.

| Principle | What it means in the build |
| :---- | :---- |
| Real items lead | Photos and item facts carry the visual weight. The UI around them stays calm: Cloud canvas, white cards, Ink type, Teal only for action |
| One decision at a time | Progressive steps (listing wizard, offer composer, handover) with clear progress and easy back-tracking |
| Money is unmistakable | "You give / You receive" panels and a bold payer sentence wherever terms appear |
| Honest feedback | Pending states read as pending; a completed exchange gets a restrained moment of celebration, a single confirmation does not |
| Fast on slow phones | Skeletons that match the final layout, images that fade in once loaded, text and buttons usable before images arrive |

**Motion vocabulary** (defined in Phase 0, reused everywhere):

| Moment | Motion |
| :---- | :---- |
| Press feedback | Buttons and cards scale to 0.98 over 120 ms |
| Sheets and modals | Bottom sheets slide up over 320 ms, modals fade and scale from 0.96 over 200 ms; both are interruptible |
| Images | Fade in over 200 ms once loaded; gallery swipe follows the finger with momentum |
| Lists | New items (messages, offer versions) slide in 8 px and fade over 200 ms; no staggered cascades on page load |
| Step changes | Wizard and composer steps slide horizontally by 16 px over 200 ms, with direction matching forward or back |
| Status changes | Badges cross-fade; the confirmation stepper fills over 320 ms |
| Listing card → detail | Shared-element image transition using React's `<ViewTransition>` where supported, otherwise a plain cross-fade |
| Save | The heart icon gives a 200 ms pop; the toggle feels instant and rolls back on failure |

Implementation: **Framer Motion** (R-1) for component motion, springs, gestures (gallery swipe, sheet drag) and presence animations; CSS transitions for simple hover/press states; React `<ViewTransition>` for the card-to-detail image. All motion goes through shared presets in `src/lib/motion/` so durations and easing stay on brand and reduced motion is handled in one place.

## How the Installed Skills Are Used

| Skill | When |
| :---- | :---- |
| `impeccable` | Phase 0: set the design direction and write `DESIGN.md`. Every phase: shape screens before building them, then critique, audit and polish before approval. The `impeccable-finish-reviewer` agent reviews each phase against `DESIGN.md` |
| `taste-skill:design-taste-frontend` and `minimalist-ui` | Guard against generic, template-looking layouts; editorial restraint for the marketing and home surfaces |
| `taste-skill:high-end-visual-design` | Spacing, card and type finishing passes |
| `emil-design-eng` and `apple-design` | Interaction craft: press states, sheets, gestures, interruptible transitions, typography details |
| `animate`, `find-animation-opportunities`, `improve-animations` | Build the motion vocabulary; per phase, find where motion helps and reject where it doesn't; final audit in Phase 7 |
| `superpowers:test-driven-development` | Behaviour (money, payer sentences, state rules, flows) is written test-first |
| `superpowers:verification-before-completion` and `run` / `built-in-browser` | Before each approval: run the app and capture screens at 320, 390, 768 and 1440 px |
| `taste-skill:full-output-enforcement` | Long generated files (fixtures, component variants) are written in full |

Image-generation skills (`imagegen-frontend-web`, `imagegen-frontend-mobile`, `brandkit`, `image-to-code`) need an image-generation tool, which this environment doesn't have. Design exploration therefore happens directly in code, with screenshots for review.

---

## Phases

Every phase ends with the same **approval package**:
- The running app, with routes to try.
- Screenshots at 390 and 1440 px (plus 320 px for dense screens).
- A list of states to try, including adverse ones.
- Test results: typecheck, lint, Vitest.
- An accessibility pass and an impeccable critique summary.
- Known gaps.

### Phase 0 — Experience foundations

**Why first:** every later screen reuses these pieces; getting them right once is what makes the app feel consistent.

| Deliverable | Detail |
| :---- | :---- |
| `DESIGN.md` | Design direction, layout rhythm, card anatomy, motion vocabulary, voice. Produced with `impeccable` from the Brand Kit |
| Core components (`components/ui`) | Button, IconButton, TextField, MoneyField, PhoneField, Select, Checkbox, RadioCards, Chip/StatusBadge, Card, Sheet (bottom on mobile, side on desktop), Modal/ConfirmModal, Banner, Toast, Skeleton, EmptyState, ErrorState, Stepper, Avatar, Tabs |
| Domain primitives (`components/domain`) | Price, PayerSentence, TrustModule (Phone confirmed + review count), AreaLabel, Deadline (relative + absolute WAT) |
| Logic (`lib/`) | `money` (kobo ↔ naira, ₦ formatting), `time` (WAT, server clock offset, relative deadlines), `copy` (status label map, required copy, banned-phrase list with a CI test), `phone` (+234 normalisation) |
| App shell | Responsive header (logo, area, search entry, alerts and messages), mobile bottom nav (Explore · Feed · List + · Offers · Profile), desktop top nav, footer, offline banner, route-change progress, scroll restoration |
| Mock API | MSW browser worker in dev; fixtures for users, items and listings with honest illustrative data; handlers for every PRD error code; a dev toolbar to simulate slow network, errors and signed-in/guest |
| Gallery | `/dev/components` showing every component in every state |

**Approve when:** the shell feels right on a phone and desktop, components look and move as intended, and `DESIGN.md` reflects the direction you want.

### Phase 1 — Discover (guest experience)

Screens: UX-01 Home, UX-02 Explore, UX-03 Filters, UX-04 Listing detail. Requirements FE-HOM-01..03, FE-EXP-01..05, FE-LDT-01..05, FE-SEO-01.

| Highlight | Detail |
| :---- | :---- |
| Home | "Find your next thing.", the Sell / Swap / Quick Sell routes, a search field, area selector, categories and recent local listings; how-it-works and trust strip |
| Explore | Search, category rail, mode chips, filter sheet (mobile) or rail (desktop), URL-synced filters, removable chips, skeleton grid, infinite results, empty and no-result states |
| Listing card | Photo, title, price or "Open to swap", condition, area, mode chips, true urgency; Available, Reserved, Expired and Removed variants |
| Listing detail | Swipeable gallery with zoom, defects above the CTA, trust module, sticky mobile offer bar, desktop sticky panel, and honest unavailable states. "Make an offer" and "Save" prompt sign-in (resumed in Phase 2) |
| Motion | Card press, image fade-in, card-to-detail shared image, sheet slide |

**Approve when:** a guest can browse, filter and evaluate an item comfortably on a phone, and reserved or removed items are unmistakable.

### Phase 2 — Join (accounts)

Screens: UX-07 Phone, UX-08 Code, UX-09 Onboarding, UX-25 public profile, UX-26 settings (account parts). Requirements FE-AUT-01..06, FE-PRF-01..02, FE-SET-01.

| Highlight | Detail |
| :---- | :---- |
| Sign-in | +234 field with normalisation, one accessible OTP field (paste, `one-time-code` autofill), 60 s resend, neutral rate-limit messages |
| Onboarding | Two short steps: name and area, then interests, terms and 18+. Marketing opt-in separate and unchecked |
| Intent resume | "Make an offer" or "Save" as a guest → sign in → back to exactly where you were, with the draft intact (QA-01) |
| Profile and settings | Public profile with "Phone confirmed" explained and the review count; settings, logout and deletion request |
| Session | Auth guards, session expiry without losing forms, restricted-account banner |

**Approve when:** signing up feels quick and trustworthy, and nothing implies identity verification.

### Phase 3 — Sell (create and manage listings)

Screens: UX-10 to UX-13. Requirements FE-LST-01..09, using mock categories and category fields (R-4).

| Highlight | Detail |
| :---- | :---- |
| Wizard | Four steps (Photos & basics → Condition → Trade options → Preview) with saved drafts, a sticky Continue button and step transitions |
| Photo uploader | 1–8 photos, client compression with progress, retry, drag or long-press reorder, cover selection, photo tips |
| Condition | Like new / Good / Fair / For parts radio cards, defect and repair disclosure, ownership declaration |
| Trade options | Sell / Swap / Both, MoneyField, desired items or "Open to offers", Quick Sell deadline with honest copy |
| Preview and publish | The real listing-detail component in preview mode, publish, moderation pending state |
| My listings | Draft · Active · Reserved · Expired · Closed tabs; edit, close, renew |

**Approve when:** listing a phone with three photos takes a couple of minutes and the preview matches what buyers will see.

### Phase 4 — Offer (negotiation)

Screens: UX-14 to UX-19. Requirements FE-OFF-01..12.

| Highlight | Detail |
| :---- | :---- |
| Composer | Mode choice (only allowed modes), cash amount, choose or create an offer-only swap item, payer direction, a live payer sentence |
| Review and send | Symmetric "You give / You receive", defects, expiry, idempotent send, unavailable/stale handling with the draft kept |
| Offers inbox | Received · Sent · Awaiting handover · Closed tabs; "your turn" emphasis; expiry |
| Thread | Immutable version timeline, decision bar (Accept / Counter / Reject / Withdraw), side-by-side counter diff, read-before-retry on uncertain accept |
| Motion | Version items slide in; changed amounts highlight briefly; the accept confirmation sheet |

**Approve when:** in a quick usability check, anyone can say who gives what and who pays whom before sending or accepting (PRD §2.3).

### Phase 5 — Exchange (agreement, handover, completion)

Screens: UX-21 to UX-24. Requirements FE-TRX-01..09, FE-TRU-04.

| Highlight | Detail |
| :---- | :---- |
| Agreement | Frozen snapshot, real progress (Check terms → Arrange meeting → Inspect → Both confirm), private meeting details, safety notice |
| Confirmation | Separate self-report checkboxes, "Confirm my side", a calm waiting state, no celebration at 1 of 2 |
| Completion | Receipt with both timestamps; a restrained success moment; review prompt (1–5 stars) |
| Off-ramps | Cancellation request, dispute/report flow with case reference, "Under review" state, reservation expiry warnings |

**Approve when:** a one-confirmation state can't be mistaken for a completed exchange, and every off-ramp is easy to find.

### Phase 6 — Community (feed, messages, notifications, saved)

Screens: UX-05, UX-06, UX-20, UX-26 (saved and alerts). Requirements FE-FED-01..07, FE-MSG-01..06, FE-NTF-01..02, FE-SAV-01.

| Highlight | Detail |
| :---- | :---- |
| Feed | Listing-linked cards with live status, a comments sheet with the "not tracked" note, posting a highlight from your own listing. Ships without a feature flag (R-3) |
| Messages | Listing/offer-anchored threads, sending/sent/failed with retry, structured offer cards, polling, live-region announcements |
| Notifications | Inbox with unread count, deep links that refetch current state |
| Saved | Listings and posts tabs, true availability |

**Approve when:** browsing the feed feels light and leads naturally to listings, and chat never looks like a place to agree terms.

### Phase 7 — Trust, support and finish

Requirements FE-TRU-01..03, FE-TRU-05, FE-LDT-06 / SEO, plus whole-app quality.

| Highlight | Detail |
| :---- | :---- |
| Safety | Report flows from every surface, block, My reports, safety guide, How it works, policy pages |
| Finish pass | `impeccable` audit and polish across the app; `improve-animations` audit; accessibility (keyboard, VoiceOver/TalkBack checklist); performance budgets (§12) on a throttled profile; banned-copy scan |
| Handoff | Updated `DESIGN.md`, README and a list of mock-API endpoints for the backend team |

**Approve when:** the full journey from discovery to completed exchange and review works smoothly on a phone, with every adverse path designed.

---

## Decisions (confirmed 2026-10-22)

| ID | Decision |
| :---- | :---- |
| R-1 | **Framer Motion** is the animation library |
| R-2 | **MSW mock API** with clearly fictional sample data until the backend exists |
| R-3 | The feed ships **without** a feature flag |
| R-4 | **Mock categories and category fields**, kept in one fixture so they can be swapped for confirmed ones |
| Execution | Native, in-session. No commits; the product owner reviews and commits each phase |
