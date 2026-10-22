# NextOwn — Frontend Product Requirements Document

*Turn what you own into what you want.*

| Field | Value |
| :---- | :---- |
| Document ID | NX-FE-PRD-001 · Revision 0.5 · 22 October 2026 |
| Scope | `client-frontend` — the responsive, mobile-first web client (public marketplace and member app) for the NextOwn one-city pilot. **The staff admin console is out of scope** and is built in its own repository |
| Parent documents | [NX-PRD-001 Product Requirements](./NextOwn%20Product%20Requirements%20Document.md) · [NX-UX-001 UI/UX Design & Agent-Ready Template](./NextOwn%20UIUX%20Design%20Agent%20Ready%20Template.md) · [Brand Kit & Design System](./NextOwn%20Brand%20Kit%20and%20Design%20System.md) |
| Status | Draft for review by product owner, frontend lead and design |
| Audience | Frontend engineers, product designers, QA, and the backend team that owns the API contract |

**Precedence.** NX-PRD-001 decides *behaviour* (rules, states, permissions). NX-UX-001 decides *presentation* (screens, states, copy). The Brand Kit decides *visual tokens*. This document decides *how the frontend implements all three*. If this document conflicts with a parent, the parent wins and this document gets corrected.

**Evidence key** (inherited from NX-PRD-001): **S** = from the source proposal; **R** = recommended implementation detail; **D** = open decision. **P0** = required for the pilot launch; **P1** = pilot improvement; **P2** = later phase.

> **Frontend decision principle.** When scope, time or polish conflict, protect the complete *listing → offer → agreement → handover → dual confirmation* journey, truthful trust copy, and correct money/availability display before adding engagement features or visual flourish.

---

## 1. Product Summary for Frontend Engineers

NextOwn is an individual-first, person-to-person marketplace for Nigeria. A member can list a used item and receive:

- a **cash offer**,
- a **swap** (one of the offerer's items for the listed item), or
- a **swap + cash** offer, where the top-up can flow *either* way.

**Quick Sell** is a real deadline on a listing, not a sales guarantee. A **discovery feed** of listing-linked highlights makes browsing enjoyable but always points back to the one canonical listing.

Acceptance of an offer **reserves** every item involved and creates a **transaction**. The two people meet offline, inspect, exchange and pay each other directly. Each then **confirms independently**. Only two confirmations (and no open dispute) make the transaction **Completed** and unlock reviews.

The pilot does **not** move money, verify identity, certify condition or arrange delivery. Much of the frontend's work is to communicate these limits honestly while keeping trading easy on a phone with patchy mobile data.

### 1.1 What the frontend owns

| Responsibility | Notes |
| :---- | :---- |
| Presentation of every user-facing P0 screen (UX-01 to UX-26) | Mobile-first at 390 × 844, stress-tested at 320 px, responsive to 1440+ px |
| Truthful rendering of server state | Status, availability, price, cash direction, deadlines and confirmations always come from the API; never inferred or fabricated client-side |
| Client-side validation and recovery | Helpful, immediate validation and preserved drafts. Client validation is a convenience; the server is authoritative (PRD §5) |
| Safe mutation behaviour | Idempotency keys, version-aware actions, read-before-retry on uncertain outcomes |
| Trust and safety copy | Required disclosures in context; banned phrases never shipped |
| Accessibility and performance | WCAG 2.2 AA target; Core Web Vitals budgets on mid-range Android over slow networks |
| Product analytics instrumentation | Client-side events from PRD §13.2 with privacy-safe dimensions |

### 1.2 What the frontend does not own

Authorisation decisions, state transitions, reservation locking, expiry workers, OTP generation, EXIF stripping (the server does it; the client may also help), notification delivery, search ranking, and audit logging. The client **displays** the results of these and **never** substitutes for them.

---

## 2. Goals, Non-goals and Success Measures

### 2.1 Frontend goals

1. A first-time user on a mid-range Android phone can browse, understand an item's condition and make a structured offer without help.
2. Any tester can say **what each person gives, what each person receives, and who pays whom how much** before sending or accepting an offer (UX rubric §14.4).
3. No screen ever presents an item as available when the server says it is reserved, expired, closed or removed.
4. One confirmation is never shown as a completed exchange.
5. Public listing pages are fast, shareable and indexable.

### 2.2 Non-goals for the pilot client (do not build or depict)

Escrow or wallets; "secure/protected payment" badges; bank-transfer verification; delivery tracking; auction bidding; multi-item or multi-party swaps; AI pricing or condition claims; identity-verification badges; searchable private "My Stuff" inventory; Following feed; video or live feeds; native mobile apps (PRD §3.1). Keep component and data models extensible, but ship no UI for these.

### 2.3 Frontend success measures

| Measure | Target / method |
| :---- | :---- |
| Offer comprehension | 100% of usability testers correctly state both items and cash payer/amount before sending (UX §14.3–14.4) |
| Trust comprehension | 0 testers interpret "Phone confirmed" as identity verification or believe NextOwn holds money |
| Core Web Vitals (p75, mobile RUM) | LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1 (PRD §11) |
| Accessibility | Zero critical axe violations on P0 routes; manual screen-reader pass on F-01 to F-06 |
| Funnel instrumentation | 100% of PRD §13.2 client events firing with schema-valid payloads in staging |
| Error recovery | Every 409/410/422/429/5xx path in §9 has a designed, tested UI state |

---

## 3. Users, Roles and Client-side Access Behaviour

| Role | What the client shows | Client behaviour on restricted action |
| :---- | :---- | :---- |
| Guest | Home, Explore, Feed, listing detail, public profiles, How it works, safety/support pages | Save, comment, message, offer and report prompt sign-in. The intended action and any draft are preserved and resumed after sign-in (QA-01) |
| Member | Everything public plus listing wizard, offers, messages, transactions, saved, notifications, profile, settings | Requires terms/privacy acknowledgment and 18+ confirmation before first listing or offer (ACC-04) |
| Restricted member | Own account, own records, support and appeal path | Create-listing, offer, comment and post actions are hidden or disabled with an explanation and appeal link. Own transaction records stay accessible (MSG-05) |

Staff roles (support agent, moderator, administrator) use the separate admin console; this app has no staff screens.

**Rule (R):** the client hides actions a role cannot take, for clarity. It never treats hiding as security. Every protected route also handles `401`, `403` and `404` from the API gracefully, without revealing whether a private object exists (QA-16).

---

## 4. Technical Architecture

The parent PRD is stack-agnostic (PRD §10.2). The stack below is the **confirmed frontend stack** for this repository.

### 4.1 Stack

| Concern | Choice | Role in NextOwn |
| :---- | :---- | :---- |
| Language | **TypeScript** 6 (strict mode, the version the official Vite template uses) | Compile-time safety on money, enums and API payloads |
| Build tool / dev server | **Vite** | Fast dev server, route-level code splitting, env handling (`import.meta.env`) |
| UI framework | **React** | Single-page application for the public marketplace and member app |
| Routing | **React Router** (data router: `createBrowserRouter`) | Nested layouts, lazy-loaded routes, auth/role guards, URL-synced filters |
| Component library | **HeroUI** | Accessible base components (built on React Aria): Button, Input, Modal, Drawer, Tabs, RadioGroup, Checkbox, Chip, Card, Avatar, Dropdown, Table, Skeleton, Toast. Themed with the brand tokens (§5.4) |
| Styling | **Tailwind CSS** built on the Brand Kit tokens | Brand colours, type, spacing, radius, shadow and motion exposed as Tailwind theme values and CSS variables. No raw hex in components |
| Icons | **Lucide** (`lucide-react`), rounded line, 20–24 px, 1.75–2 px stroke | Mandated by Brand §5.1 |
| Server state | **TanStack Query** | All API data: caching, background refetch, polling, retries, invalidation after mutations |
| Client state | **Zustand** | UI and session-view state only (§4.5). Never a second copy of server data |
| Forms and validation | **React Hook Form + Zod** | Accessible per-field errors, input preservation, schemas for every form and offer payload |
| SEO and document head | **React Helmet** (`react-helmet-async`, the maintained async-safe version) | Per-route `<title>`, meta description, canonical URL, Open Graph / Twitter tags and `robots` directives |
| Testing | **Vitest** + React Testing Library + MSW (+ `axe-core` for accessibility checks) | Unit, component, integration and accessibility tests. In-browser flow tests at mobile and desktop sizes through Vitest Browser Mode |
| HTTP client | **Axios** (one shared instance) with TypeScript types generated from the backend OpenAPI spec | All API calls; interceptors for credentials, request IDs, error normalisation and session expiry; upload progress for photos (§4.4) |
| Realtime | Polling through TanStack Query `refetchInterval` (pauses when the tab is hidden) | Resilient on unstable mobile data; WebSockets only if pilot evidence demands it |
| Dates/times | `Intl.DateTimeFormat` with `timeZone: 'Africa/Lagos'` | Store and send UTC; display WAT (PRD §3.2) |
| PWA (optional) | `vite-plugin-pwa`, static assets only | Low-data repeat visits. Never cache authenticated API responses |

### 4.2 Rendering, SEO and loading strategy

NextOwn's client is a **client-rendered SPA**. Each public route sets its own head tags with React Helmet:

| Surface | Head tags (React Helmet) | Loading |
| :---- | :---- | :---- |
| `/`, `/explore`, `/feed` | Title, description, canonical; Explore canonical keeps only meaningful filters (category, area) | Eager in the main bundle (first-visit routes) |
| `/listings/:slug` | Title "{item} · {area} · NextOwn", description from condition + modes, canonical, `og:title`, `og:image` (cover), `og:description`, availability-aware text; `noindex` when removed | Eager; listing data prefetched on card hover/touch |
| Auth, member and settings routes | Generic title, `noindex` | Lazy-loaded route chunks |

Search engines that run JavaScript (Google) read the Helmet tags. **Link-preview scrapers (WhatsApp, Facebook, X, Telegram, LinkedIn) do not run JavaScript**, so they only see the static `index.html`. Sharing listings on WhatsApp is expected to be a main way people discover NextOwn, so correct share previews are **required** (FE-SEO-01 to FE-SEO-03, §8.2).

### 4.3 Listing share previews (required)

A lightweight **server/edge function** sits in front of the SPA and handles `GET /listings/:slug`:

1. Fetch the public-safe listing summary from the API (title, cover image variant, area, condition, accepted modes, asking price if cash-enabled, status). Use a short timeout (≤ 800 ms).
2. Inject the listing's `<title>`, meta description, canonical, `og:*` and `twitter:*` tags into the built `index.html` and return it. The SPA then boots normally, and React Helmet takes over the head tags in the browser.
3. On API timeout, error or unknown slug, return `index.html` with the default brand tags. Never fail the page.
4. Cache the response at the edge for a short time (e.g., 60 s, with `stale-while-revalidate`) so price and availability stay close to real time.

Rules:

- **Same tag builder in both places.** One pure function (`src/lib/seo/listing-meta.ts`) builds the tag set and is used by both React Helmet and the edge function, so previews and in-app tags never disagree.
- **Public-safe data only:** area (never address), no phone, no seller details beyond display name, no offer-only items.
- **Truthful availability:** reserved, expired, closed and completed listings say so in the description (e.g., "Reserved: no longer accepting offers"). Removed listings return generic tags plus `noindex`.
- `og:image` is a 1200 × 630 (or at least 600 × 315) JPEG variant of the real cover photo under 300 KB. No price or text overlaid on the photo (Brand §6). If no photo is available, fall back to the default brand OG image.
- Prices in previews use the same `₦` formatting as the app.
- Non-listing public routes (`/`, `/explore`, `/feed`, policy pages) use static default tags in `index.html`. The function may extend to public profiles later (P1).

### 4.4 API layer (Axios)

All HTTP calls go through **one Axios instance** in `src/lib/api/client.ts`. Components never call Axios directly; they use TanStack Query hooks in `features/<domain>/api/`, which call typed endpoint functions.

| Concern | Implementation |
| :---- | :---- |
| Instance | `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, withCredentials: true, timeout: 15000, headers: { Accept: 'application/json' } })` |
| Types | Request/response types generated from the OpenAPI spec into `src/lib/api/generated/`. Endpoint functions are typed wrappers, e.g. `getListing(id, { signal })`, `acceptOffer(id, body, { idempotencyKey })` |
| Cancellation | Pass TanStack Query's `signal` into each Axios request so abandoned queries are cancelled (saves data on slow networks) |
| Request interceptor | Adds `X-Request-ID` (UUID) for tracing and the CSRF header if the API uses one. Does not add auth tokens (session is an HttpOnly cookie, FE-D-03) |
| Idempotency | Transaction-changing endpoint functions require an `idempotencyKey` argument and send it as `Idempotency-Key`. The key comes from the caller and is reused across retries of the same intent (§7.4) |
| Response interceptor | Normalises every failure into one `ApiError` type: `{ status, code, message, fieldErrors?, retryAfter?, requestId, kind }`, where `kind` is `http`, `network`, `timeout` or `cancelled` |
| 401 handling | Clears the Zustand session store and Query cache, saves the "resume after sign-in" intent, and routes to `/login?next=…`. No silent refresh loop |
| 429 handling | Reads `Retry-After` into `ApiError.retryAfter` for the neutral wait message |
| Retries | **Axios never retries automatically.** TanStack Query retries safe reads (GET) up to 2 times with backoff, never on 4xx. Mutations are not auto-retried; uncertain writes use read-before-retry (§7.4) |
| Uncertain outcomes | `kind: 'timeout' | 'network'` on a transaction-changing write is treated as **unknown**, not failed (§7.4) |
| Uploads | Photo and evidence uploads use Axios `onUploadProgress` to drive the Photo Uploader progress bar. Uploads to signed storage URLs use a separate bare Axios call (no credentials, no API interceptors) |
| Money and dates | Endpoint functions pass kobo integers and ISO UTC strings unchanged. Conversion happens only in `lib/money` and `lib/time` |
| Logging | Never log request bodies, phone numbers, OTPs or message text. Log only `requestId`, endpoint name, status and error code |
| Testing | MSW intercepts Axios requests in Vitest; each error code in §7.5 has a handler |

### 4.5 State ownership rules

| State | Owner | Examples |
| :---- | :---- | :---- |
| Server data | **TanStack Query** only | Listings, feed, offers, transactions, messages, notifications, profile, runtime config |
| URL state | **React Router** (search params) | Explore filters, sort, active tab, pagination cursor |
| Form state | **React Hook Form** | Listing wizard step fields, offer composer, report form |
| Client/UI state | **Zustand** | Session view (signed-in flag, user ID, role, onboarding done; no tokens), selected area, bottom-sheet/drawer open state, pending "resume after sign-in" intent, server clock offset |
| Persisted drafts | **Zustand + `persist` middleware** (storage wrapped in try/catch) | Offer composer draft (`sessionStorage`), pre-sign-in listing draft (`localStorage`) |

Rules:

- Never copy API responses into Zustand. A component that needs a listing reads it through a TanStack Query hook.
- Keep stores small and split by concern (`useSessionStore`, `useUiStore`, `useDraftStore`). Use selectors so components re-render only on what they use.
- After sign-out, clear the Query cache and reset all Zustand stores.

### 4.6 Project structure

```
client-frontend/
├── docs/                          # PRD, UX brief, brand kit, this document
├── edge/
│   └── listing-og.ts              # share-preview function for /listings/:slug (§4.3); adapter chosen with hosting (FE-D-02)
├── public/                        # favicon set, web manifest, robots.txt, default OG image
├── index.html                     # default meta + brand OG tags (fallback for scrapers)
├── vite.config.ts
├── vitest.config.ts               # or the `test` block in vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                   # mounts <App />
    ├── app/
    │   ├── App.tsx                # providers: HelmetProvider, QueryClientProvider, RouterProvider
    │   ├── router.tsx             # route tree; lazy() for member and auth routes
    │   ├── query-client.ts        # TanStack Query defaults (retry, staleTime, focus refetch)
    │   ├── layouts/               # PublicLayout, AuthLayout, MemberLayout (bottom nav)
    │   └── guards/                # RequireAuth, RequireOnboarding, RequireRole, RedirectIfAuthed
    ├── pages/                     # thin route components: compose features, set <Helmet> tags
    │   ├── public/                # HomePage, ExplorePage, FeedPage, ListingDetailPage, HowItWorksPage, policy pages
    │   ├── auth/                  # LoginPage, VerifyPage, OnboardingPage
    │   ├── member/                # ListingWizardPage, OffersPage, OfferThreadPage, OfferComposerPage,
    │   │                          # MessagesPage, TransactionPage, SavedPage, NotificationsPage, ProfilePage, SettingsPage
    │   └── NotFoundPage.tsx       # shared by 404 and private-resource 403 (QA-16)
    ├── features/                  # one folder per domain; each owns its API hooks, schemas, UI and store slice
    │   ├── auth/
    │   ├── listings/
    │   │   ├── api/               # query keys + useListing, useListings, useCreateListing, ...
    │   │   ├── components/        # ListingCard, ListingGallery, PhotoUploader, WizardSteps, ...
    │   │   ├── schemas/           # Zod schemas for wizard steps
    │   │   └── utils/
    │   ├── explore/
    │   ├── feed/
    │   ├── offers/                # composer (mode, direction, money), thread, version timeline, payload builder
    │   ├── transactions/          # agreement snapshot, handover, confirmation, dispute
    │   ├── chat/
    │   ├── notifications/
    │   ├── saved/
    │   ├── profile/
    │   ├── reports/
    │   └── reviews/
    ├── components/
    │   ├── ui/                    # brand wrappers around HeroUI: Button, TextField, MoneyField, StatusBadge,
    │   │                          # ConfirmModal, Sheet, EmptyState, ErrorState, Stepper, Toast helpers
    │   ├── domain/                # cross-feature: OfferSummary (You give / You receive), TrustModule,
    │   │                          # ActivityTimeline, PayerSentence, AreaPicker, CategoryPicker
    │   ├── layout/                # Header, BottomNav, Footer, OfflineBanner
    │   └── seo/                   # <Seo> wrapper around Helmet (title template, canonical, OG defaults)
    ├── stores/                    # Zustand: session.ts, ui.ts, drafts.ts
    ├── lib/
    │   ├── api/                   # Axios instance + interceptors (client.ts), ApiError, idempotency helper,
    │   │                          # endpoint functions, generated/ OpenAPI types
    │   ├── seo/                   # listing-meta.ts: shared tag builder for Helmet and edge/listing-og.ts
    │   ├── money/                 # kobo <-> naira, ₦ formatting
    │   ├── time/                  # UTC <-> WAT, server clock offset, relative deadlines
    │   ├── phone/                 # +234 normalisation
    │   ├── analytics/             # typed event emitter (PRD §13.2)
    │   ├── copy/                  # copy bank, status label map, banned-phrase list
    │   └── storage/               # safe localStorage/sessionStorage wrappers
    ├── hooks/                     # shared hooks: useOnline, useServerNow, useMediaQuery
    ├── styles/
    │   └── index.css              # Tailwind entry, brand tokens as CSS variables, @font-face
    ├── assets/                    # logo placeholder, illustrations
    └── test/
        ├── setup.ts               # Testing Library, jest-dom matchers, MSW server
        ├── msw/                   # handlers per API resource, including every error code
        ├── utils.tsx              # renderWithProviders (Query, HeroUI, Router, Helmet)
        └── flows/                 # Vitest Browser Mode flow tests (F-01 to F-08, QA cases)
```

Conventions:

- `pages/` stay thin. Business logic lives in `features/`; shared pure logic lives in `lib/`.
- A feature may import from `components/`, `lib/`, `stores/` and `hooks/`, but not from another feature's internals. Cross-feature UI moves to `components/domain/`.
- Unit tests sit next to the file they test (`money.test.ts`). Flow tests live in `src/test/flows/`.
- Path alias `@/` → `src/`.

### 4.7 Environments and configuration

- Environments: local (MSW mocks), staging (real API, test SMS), production.
- Build-time config through Vite env variables (`VITE_API_BASE_URL`, `VITE_ANALYTICS_KEY`, feature flags). Nothing secret goes in `VITE_*` variables, because they ship in the bundle.
- **Runtime config fetched from the API, never hard-coded** (PRD §3.2, ADM-03): pilot city and areas, categories, offer lifetime, Quick Sell deadline options, reservation duration, photo limits, support contacts.
- Feature flags for D-08 (feed posts and comments at day 1) and any P1 work.
- The host serves `index.html` for all unknown paths (SPA fallback) and long-cache headers for hashed assets.

---

## 5. Design System Implementation

### 5.1 Tokens

The [Brand Kit](./NextOwn%20Brand%20Kit%20and%20Design%20System.md) is the **only** source of visual values. The tokens below transcribe it. They are defined once as CSS variables in `src/styles/index.css`, exposed to Tailwind as theme values, and fed into the HeroUI theme (§5.4). Components reference **semantic** names (Brand §2.3), never raw hex. A change to any value starts with a Brand Kit version bump (Brand §9.1).

| Semantic token | Value | Use |
| :---- | :---- | :---- |
| `color.text.default` | Ink `#142D32` | Headings, body |
| `color.text.muted` | Slate `#486067` | Secondary copy |
| `color.action.primary` | Exchange Teal `#0B6159` | Primary buttons, links |
| `color.action.hover` | Teal Hover `#084B46` | Hover/pressed primary |
| `color.highlight` | Warm Gold `#F9BB55` | Highlights and genuine urgency tint; **Ink text only, never white** |
| `color.surface.page` | Cloud `#F7F9F7` | Page background |
| `color.surface.default` | Paper `#FFFFFF` | Cards, overlays |
| `color.surface.tinted` | Mint Mist `#E8F4EF` | Info surfaces, normal status chips |
| `color.border.default` | Border `#D6E2DE` | Decorative dividers, input outlines (not for focus or errors alone) |
| `color.feedback.success` | `#147D52` | Paired with icon + text |
| `color.feedback.warning` | `#9A5900` | Paired with icon + text |
| `color.feedback.error` | `#B42318` | Errors, destructive actions |
| `color.feedback.info` | `#2453A6` | Help, informational status |

| Token family | Values |
| :---- | :---- |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64 px only |
| Radius | sm 8 · control 12 · card 16 · feature 24 · pill 999 |
| Shadow | card `0 2px 12px rgba(20,45,50,.06)` · overlay `0 14px 36px rgba(20,45,50,.18)`; prefer borders over raised cards |
| Motion | fast 120 ms · standard 200 ms · slow 320 ms · ease-out · all motion disabled or reduced under `prefers-reduced-motion` |
| Breakpoints | mobile 320–767 · tablet 768–1023 · desktop 1024–1439 · wide 1440+ |
| Grid | mobile 4 col / 16 px margin / 12 px gutter · tablet 8 col / 24 px margin · desktop 12 col / 24 px gutter / 1200 px max |
| Controls | Buttons and inputs ≥ 48 px high; hit targets ≥ 44 × 44 px |

**Colour budget** (art direction, not a test): ~60% Cloud/white, ~25% Ink, ~10% Teal, ~5% Gold/semantic. Offer-decision and support screens use less Gold.

### 5.2 Typography

| Role | Font / weight | Size / line height |
| :---- | :---- | :---- |
| Display (desktop) | Inter Display 700 | 40 / 48 |
| H1 (mobile) | Inter Display 700 | 32 / 40 |
| H2 | Inter Display 650–700 | 26 / 34 |
| H3 | Inter Display 600 | 21 / 28 |
| Body | Inter 400 | 16 / 24 |
| Body medium | Inter 500 | 16 / 24 |
| Compact | Inter 400–600 | 14 / 21 |
| Caption | Inter 500 | 12 / 18 |
| Button | Inter 600 | 16 / 24 |
| Price | Inter 700, **tabular figures** | 24 / 30 |

- Self-host Inter / Inter Display WOFF2 files (e.g., via Fontsource packages) with `@font-face` in `index.css`. Subset to Latin plus `₦` (U+20A6), use `font-display: swap`, preload the body weight in `index.html`, and use size-adjusted fallbacks to avoid layout shift.
- Fallback stack: `Inter Display, Inter, system-ui, "Segoe UI", sans-serif`.
- Sentence case for headings, labels and buttons. No all-caps body copy.

### 5.3 Component library (P0)

Components are built **on HeroUI** and live in `src/components/ui` (brand wrappers) or `src/components/domain` (NextOwn-specific). Feature code imports the wrappers, not HeroUI directly, so brand rules are enforced in one place. Each component has Vitest + Testing Library tests covering every listed state, keyboard behaviour and an axe check. Names follow UX §10.1 (`Component/Button/Primary [State=…, Size=…]`) so they match the Figma variants.

| Component | Required variants and states | Key rules |
| :---- | :---- | :---- |
| Header / Navigation | Public · member; scrolled; mobile safe-area | Mobile bottom nav: Explore · Feed · List (+) · Offers · Profile (max five). Bell and chat icons in header with accessible names |
| Button | Primary (Teal) · Secondary (Teal outline) · Tertiary (text) · Danger; default/hover/focus/disabled/loading; M/L | No red for urgency. Loading state blocks double-submit |
| Listing Card | Available · Reserved · Expired · Removed · skeleton; Mode = Cash / Swap / Both; Quick Sell | Always shows photo, title, price **or** swap label, area, condition, mode chips, true urgency |
| Status Badge | Available, Reserved, Offer pending, Counteroffer received, Quick Sell, Awaiting handover, Your confirmation received, Completed, Under review, Expired, Closed, Phone confirmed | Colour + text + icon; never colour alone |
| Mode Selector | Cash / Swap / Swap + cash, filtered by `listing.accepted_modes` | Radio-group semantics |
| Money Field | Default/focus/error/disabled | `₦` label, digits only, grouping on blur, integer kobo output (§7.1) |
| Payer Direction Control | "I add cash" / "I receive cash" | Dynamic plain-language sentence beneath (UX-17) |
| Offer Summary / Comparison | Mode = Cash / Swap / Mixed; Direction = UserPays / OtherPays / None; current vs previous version | Symmetric **You give** / **You receive** panels plus a bold, redundant payer sentence |
| Photo Uploader | Empty, uploading (progress), compressing, failed (retry), reorder, cover, remove, limit reached | 1–8 photos; condition prompt; works on slow networks |
| Form Field | Label, hint, placeholder, error, success, required, optional counter | Errors programmatically associated (`aria-describedby`) |
| Category / Area Picker | Searchable, nested areas, empty, selected chip | Never asks for a home address |
| Filter Sheet / Rail | Mobile bottom sheet, desktop sticky rail; badge count; apply/reset; min > max error | Selections persist across navigation |
| Activity Timeline | Version created, countered, accepted, reserved, meeting set, each confirmation, dispute, support decision | Real statuses only; no fake progress |
| Conversation | Bubble (sent/delivered/failed/moderated), structured offer card, connection banner | Persistent "use an offer card" notice |
| Trust Module | Phone confirmed + explanation, review average **with count**, inspection reminder | No composite trust score |
| Alert / Toast / Banner | Success, error, warning, info | Critical transaction errors never auto-dismiss |
| Confirmation Modal | Destructive, send final terms, consent | States actor, object and consequence |
| Empty State | No results, no offers, no saved, no comments, no local listings, no alerts | Always offers a next action |
| Error State | Network, 409 conflict, stale version, 410 expired, 429 throttled, blocked | Preserves input and context |
| Progress Stepper | Listing wizard; handover progress | Accessible step descriptions |
| Review Module | 1–5 stars, optional note, distribution when enough data | Only on eligible completed transactions |

### 5.4 Tailwind and HeroUI theming (as implemented)

HeroUI v3 has no Tailwind plugin and no provider. It is themed entirely through CSS variables, which `src/styles/` sets from the Brand Kit:

| File | Role |
| :---- | :---- |
| `tokens.css` | Brand values as `--nx-*` variables, plus their mapping onto HeroUI's theme variables |
| `theme.css` | Tailwind `@theme` names built on the brand variables |
| `heroui-overrides.css` | Brand rules on HeroUI component classes, in the `components` layer so per-instance utilities still win |
| `index.css` | Entry: Inter variable font, `@heroui/styles` (includes Tailwind), tokens, base styles |

**Tailwind names:** `text-ink`, `text-muted`, `bg-action`, `hover:bg-action-hover`, `text-action-foreground`, `bg-highlight` / `text-highlight-foreground` (Warm Gold), `bg-background` (Cloud), `bg-surface` (Paper), `bg-mint`, `border-border`, `text-success` / `warning` / `danger` / `info`, the type scale `text-display` … `text-price`, `rounded-control` / `card` / `feature`, `shadow-card` / `overlay`, `max-w-content`, and breakpoints `tablet:` / `desktop:` / `wide:`. Arbitrary hex values in class names (`bg-[#…]`) are not allowed.

**HeroUI variable mapping** (`tokens.css`):

| HeroUI variable | Brand token | Notes |
| :---- | :---- | :---- |
| `--background` / `--foreground` | Cloud / Ink | Page canvas and default text |
| `--surface`, `--overlay` | Paper | Cards; modals, popovers, menus |
| `--surface-secondary`, `--default` | Mint Mist | Tinted surfaces, neutral fills |
| `--muted` | Slate | Secondary text |
| `--accent` / `--accent-hover` | Exchange Teal / Teal Hover (foreground white) | HeroUI's **primary interactive colour** |
| `--success`, `--warning`, `--danger` | Brand semantic colours, white foreground | Always with text + icon |
| `--border`, `--separator`, `--field-border` | Border | Lines and input outlines |
| `--focus`, `--link` | Exchange Teal | Focus ring, links |
| `--radius` | 8 px | HeroUI scale becomes lg 8 · xl 12 · 2xl 16 · 3xl 24, matching the Brand Kit radii |
| `--surface-shadow`, `--overlay-shadow` | Brand card / overlay shadows | |

**Naming note:** in HeroUI v3 "accent" means the primary interactive colour, so it maps to Exchange Teal. Warm Gold is exposed only as `highlight`, so it can never leak into interactive or status styles. The pilot ships a light theme only.

**Brand overrides on HeroUI defaults:**

- Buttons: 48 px high (44 px for `size="sm"`), 12 px control radius, 16/24 semibold labels. `variant="primary"` is Teal; `secondary` is white with a Teal border and label; `tertiary` is a Teal text action; `danger` is for destructive actions only.
- Inputs: at least 48 px high, 16 px text at every breakpoint (prevents iOS zoom), visible Border outline.
- No gradient, glow or heavy shadow styles. Cards use a border plus `shadow-card` at most.
- `Chip`/badge always shows a text label and, for status, an icon. Colour is never the only signal.
- Warm Gold surfaces always use Ink text.
- Toasts for critical transaction errors are replaced by persistent inline banners (Brand §8).
- Modals and drawers keep HeroUI/React Aria focus management; mobile filter and comment sheets use HeroUI `Drawer` from the bottom.
- Motion uses brand durations (120/200/320 ms); `prefers-reduced-motion` disables non-essential motion.
- React Aria's `RouterProvider` (re-exported by `@heroui/react`) receives React Router's `navigate` and `useHref` in `RootLayout`, so HeroUI links use client-side routing.
- A dev-only `/dev/tokens` route renders every token for visual checks.

---

## 6. Information Architecture and Routes

### 6.1 Route map

| Route | Screen(s) | Access | Loading / head |
| :---- | :---- | :---- | :---- |
| `/` | UX-01 Home | Public | Eager · Helmet title, description, OG defaults |
| `/explore` | UX-02 Explore, UX-03 Filters | Public | Eager · filters URL-synced · Helmet canonical |
| `/feed` | UX-05 Feed, UX-06 Post/comments (sheet) | Public view; member interactions | Eager · infinite scroll · Helmet |
| `/listings/:slug` | UX-04 Listing detail | Public | Eager · Helmet tags in-app; edge function injects OG tags for link previews (§4.3) |
| `/login`, `/verify` | UX-07, UX-08 | Public | Lazy · `noindex` |
| `/onboarding` | UX-09 | Member (new) | Lazy · `noindex` |
| `/listings/new`, `/listings/:id/edit` | UX-10 to UX-13 | Member | Lazy · `noindex` |
| `/offers/new?listing=:id` | UX-14 to UX-18 | Member (guest redirected with intent preserved) | Lazy · `noindex` |
| `/offers`, `/offers/:id` | UX-19 | Participants only | Lazy · `noindex` |
| `/messages`, `/messages/:id` | UX-20 | Participants only | Lazy · `noindex` |
| `/transactions/:id` | UX-21 to UX-24 | Participants only | Lazy · `noindex` |
| `/saved`, `/notifications` | UX-26 | Member | Lazy · `noindex` |
| `/me`, `/me/listings`, `/users/:id`, `/settings` | UX-25, UX-26 | Member / public profile | Lazy · public profile indexable, others `noindex` |
| `/support`, `/report/:type/:id` | UX-23 and safety guide | Public guide; report requires sign-in | Lazy |
| `/how-it-works`, `/terms`, `/privacy`, `/community-rules` | Policy and education | Public | Lazy · Helmet |

### 6.2 Navigation

- **Mobile (member):** bottom nav Explore · Feed · List (+) · Offers · Profile. Header shows the logo, the selected area, notifications (with unread count) and messages.
- **Desktop public:** Logo · Search · Explore · Feed · How it works · Sign in · **List an item**.
- **Member profile menu:** My listings · Sent/received offers · Transactions · Saved · Reviews · Account & privacy · Help.
- Safety guide, report and policy links appear **in context** (listing detail, offer review, handover, chat), not only in the footer.

### 6.3 Auth and redirect behaviour

- Unauthenticated access to a member route goes to `/login?next=<path>`. `next` must be a **same-origin relative path** (no open redirects).
- Offer composer and listing wizard drafts are saved locally before the redirect and restored after verification (QA-01; PRD §9.1 `AUTH_REQUIRED`).
- After a first sign-in, `/onboarding` runs once, then returns to `next`.
- Session expiry during a mutation shows a sign-in prompt **without losing the form**.

---

## 7. Cross-cutting Frontend Rules

These rules apply to every feature. They are the most common source of trust-breaking bugs, so each has a dedicated test suite.

### 7.1 Money

- The API sends and receives **integer kobo** with currency `NGN` (PRD §6). The client **never** uses floating-point arithmetic on money.
- Input is in **whole naira** (pilot). Convert with integer maths: `kobo = BigInt(nairaDigits) * 100n`, or plain integer multiplication after validating the input is digits within `Number.MAX_SAFE_INTEGER / 100`.
- Display uses `₦` with comma grouping and no decimals: `₦285,000`. Use `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })` and check it renders `₦`. Use tabular figures and never truncate amounts.
- **Cash direction is always explicit.** The UI renders the API enum (`OFFERER_PAYS_OWNER`, `OWNER_PAYS_OFFERER`, `NONE`) as a sentence from the *viewer's* perspective:
  - "You pay ₦300,000 directly at the exchange."
  - "The other person pays you ₦50,000 directly."
- `+` / `−` signs or colour must never be the only cue for direction (UX-17).
- Offer payload rules by mode (PRD §9.2):

| Mode | `offered_item_id` | `cash_amount_kobo` | `cash_direction` |
| :---- | :---- | :---- | :---- |
| `CASH` | `null` | > 0 | `OFFERER_PAYS_OWNER` (no toggle shown) |
| `SWAP` | required | 0 | `NONE` |
| `SWAP_PLUS_CASH` | required | > 0 | user-selected, required |

If a Swap + cash amount is zero, the UI suggests switching to Swap.

### 7.2 Time and deadlines

- All timestamps arrive in UTC and display in **WAT (`Africa/Lagos`)**.
- Relative countdowns ("Ends in 18h") are computed against **server time**. Estimate clock offset from the API `Date` header or a server-time field, and never trust the device clock alone.
- Detail screens show the **absolute** date/time alongside the relative label: "Quick Sell · Ends in 18h (Fri 24 Oct, 6:00 pm WAT)".
- **No animated urgency timers** and no seconds-level ticking (UX §2.1). Update relative labels at most once per minute.
- When a deadline passes on screen, the actions become non-actionable immediately, and the UI refetches to confirm server state.

### 7.3 Server state is the source of truth

- Never display optimistic state for **availability, acceptance, reservation, confirmation, completion or money** (PRD §10.3). Show a pending state until the server responds.
- Optimistic UI is allowed only for low-stakes, reversible actions: save/unsave, mark notification read, sending a chat message (with failed/retry state).
- Feed posts, notifications and saved items render **live listing status and price** from the canonical listing, never values copied into the post (DSC-04, MSG-04).
- Every actionable screen (offer composer, offer thread, transaction) refetches on focus and on visibility change.

### 7.4 Mutations, idempotency and uncertain outcomes

- Transaction-changing writes (send offer, counter, accept, reject, withdraw, confirm, cancel, dispute) send an **`Idempotency-Key`**. It is generated once per user intent and **reused on every retry** of that intent.
- Accept and counter send the **`expected_version_id`** of the version the user was looking at.
- Buttons enter a loading state and cannot be double-submitted.
- On timeout or 5xx for a transaction-changing write, the client **must not** say "failed". It shows "Checking the latest status…", refetches the resource, and then shows the true outcome (PRD §9.1 `SERVER_ERROR`; QA-21).

### 7.5 Error code → UI mapping

| API code | UI behaviour |
| :---- | :---- |
| `VALIDATION_ERROR` 422 | Per-field errors plus an error summary at top; input preserved; focus moves to the summary |
| `AUTH_REQUIRED` 401 | Persist safe draft; route to sign-in with `next`; resume afterwards |
| `FORBIDDEN` 403 | "This action isn't available." Never reveal another person's private object |
| `ITEM_UNAVAILABLE` 409 | "This item is no longer available. Your offer was not sent." Keep the draft; suggest similar listings |
| `STALE_OFFER_VERSION` 409 | "The offer has changed. Review the latest version before deciding." Fetch the latest version and show a side-by-side diff before allowing action |
| `OFFER_EXPIRED` 410 | Offer becomes read-only; invite a new offer only if the listing is still Available |
| `RATE_LIMITED` 429 | Neutral wait message with a retry time; never reveals OTP/account status |
| 5xx / network | Retry path; for writes, follow §7.4 read-before-retry |
| 404 on private resource | Same "not found or no access" page as 403, to avoid leaking existence (QA-16) |

### 7.6 Status vocabulary

One map in `lib/copy` turns API states into user-facing labels. Components never invent their own labels.

| Server state | Label | Badge tone |
| :---- | :---- | :---- |
| Listing `ACTIVE` (item available) | Available | Mint |
| Listing `ACTIVE` + `urgency_expires_at` | Quick Sell · Ends in {relative} | Gold tint, Ink text |
| Listing `PENDING_REVIEW` | Under review | Info |
| Listing `RESERVED` | Reserved | Warning |
| Listing `EXPIRED` / `CLOSED` | Expired / Closed | Neutral |
| Listing `COMPLETED` | Completed | Success |
| Listing `REMOVED` | No longer available | Neutral |
| Offer `PENDING` (you sent) | Offer sent | Info |
| Offer `PENDING` (your turn) | Counteroffer received / Offer received | Info |
| Offer `ACCEPTED` / `REJECTED` / `WITHDRAWN` / `EXPIRED` / `CLOSED_UNAVAILABLE` | Accepted / Declined / Withdrawn / Expired / No longer available | — |
| Transaction `AWAITING_HANDOVER`, 0 confirmations | Awaiting handover | Info |
| Transaction `AWAITING_HANDOVER`, you confirmed | Your confirmation received | Info |
| Transaction `AWAITING_HANDOVER`, other confirmed | Waiting for your confirmation | Info |
| Transaction `COMPLETED` | Completed | Success |
| Transaction `DISPUTED` | Under review | Warning |
| Transaction `CANCELLED` | Cancelled | Neutral |
| User `phone_confirmed_at` set | Phone confirmed | Neutral (never a shield or check-badge icon) |

### 7.7 Drafts and persistence

| Draft | Storage | Lifetime |
| :---- | :---- | :---- |
| Listing wizard (text fields + uploaded media IDs) | Server draft (`DRAFT` listing) once signed in; before that, Zustand `useDraftStore` persisted to `localStorage` | Until published or discarded |
| Offer composer | Zustand `useDraftStore` persisted to `sessionStorage`, keyed by listing ID | Until sent, or 24 h |
| Chat composer | Zustand (memory), persisted to `sessionStorage` per conversation | Session |
| Explore filters + scroll position | URL search params (React Router) + `ScrollRestoration` | Navigation |

- Never store OTPs, phone numbers, tokens, private handover details or chat history in web storage.
- All storage access is wrapped in try/catch. The app works when storage is unavailable.

### 7.8 Low-data and offline behaviour

- Text and CTAs render before images; image failure never blocks an action (UX §13).
- Lazy-load below-the-fold images; responsive `srcset`; thumbnails for cards; no autoplay media.
- Show an offline banner when the connection drops. Disable transaction-changing actions while offline, and explain why.
- Client-side image compression before upload (target long edge ~1600 px, JPEG/WebP ~0.8). Re-encoding through canvas also drops most metadata, but **the server still strips EXIF/GPS** (LST-06).
- Respect `Save-Data` / `navigator.connection.saveData` by serving smaller image variants.

---

## 8. Feature Requirements

Each requirement lists the parent PRD IDs and UX screens it implements. Acceptance criteria are written for frontend verification; server behaviour is assumed per NX-PRD-001.

### 8.1 Public home and exploration

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-HOM-01 | P0 | Home shows hero "Find your next thing.", the supporting line, Sell / Swap / Quick Sell chips, a search field, area selector, categories, recent local listings, a how-it-works/trust strip and footer | UX-01 | Renders at 320 px without horizontal scroll; no invented stats, sales volumes or trust badges |
| FE-HOM-02 | P0 | Area is the user-selected pilot area, never auto-located from GPS | UX-01, DSC-02 | No geolocation prompt on load |
| FE-HOM-03 | P0 | States: first visit, unknown area, empty city inventory, loading, guest, offline | UX-01 | Each state has a component test and flow-test coverage |
| FE-EXP-01 | P0 | Keyword search with suggestions; filters for category, area, mode (For Sale / Open to Swap / Quick Sell), price min/max, condition, urgent-only; sort by recent | DSC-01, UX-02/03 | Filters combine; active filters show as removable chips; state lives in the URL and survives Back from a listing |
| FE-EXP-02 | P0 | Results grid: 2-up mobile (1-up at large text settings), 3–4 per row desktop with filter rail | UX-02 | ₦ amounts never clipped at 320 px |
| FE-EXP-03 | P0 | Filter sheet: mobile bottom sheet with pinned Apply ("Show N results") and Reset; desktop sticky rail | UX-03 | Focus is trapped in the sheet and returned on close; min > max shows an inline error; price is disabled with an explanation for swap-only filters |
| FE-EXP-04 | P0 | Explicit empty, no-result, loading skeleton, partial-load and error states with reset/explore alternatives | DSC-07 | User is never stuck without a next action |
| FE-EXP-05 | P0 | Results include only available listings as available; a card that becomes unavailable while viewed shows its true state | DSC-02, QA-07 | Stale-card test passes |

### 8.2 Listing detail

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-LDT-01 | P0 | Order of content: gallery → status/area → title/asking price → allowed modes → seller trust module → condition and **defects** → repairs/accessories → desired swap → report/safety | UX-04 | Defects are visible **above** the primary CTA on mobile and in the desktop offer panel |
| FE-LDT-02 | P0 | Gallery: swipe/arrow navigation, thumbnails, count, zoom/full view, alt text; failed images show a placeholder without blocking content | UX-04, UX §13 | Keyboard-operable; works with images blocked |
| FE-LDT-03 | P0 | Primary CTA "Make an offer"; secondary "Save". Mobile sticky CTA bar that never covers content; desktop sticky right panel | UX-04 | CTA rechecks listing status on mount and on tap |
| FE-LDT-04 | P0 | States: Available, Reserved, Expired, Closed, Removed, swap-only (no price), own listing (show Manage instead of Offer), guest | LST-05, UX-04 | Unavailable states disable the offer CTA with an honest message: "Reserved: this item is no longer accepting offers." |
| FE-LDT-05 | P0 | Never show exact address or seller phone; show area only | DSC-02, ACC-03 | Snapshot test of rendered public data |
| FE-SEO-01 | P0 | Every public route sets title, description and canonical through the `<Seo>` component (React Helmet); member and auth routes set `noindex` | DSC-09 | Head tags verified in component tests for each public page |
| FE-SEO-02 | P0 | Listing share previews: edge function injects listing title, description, canonical, `og:*` and `twitter:*` tags into `index.html` for `/listings/:slug` (§4.3) | DSC-09 (raised from P1 to P0 by the product owner, 22 Oct 2026) | Pasting a listing link into WhatsApp, Facebook and X shows the real cover photo, title, area and price/swap label; tested with each platform's preview/debug tool |
| FE-SEO-03 | P0 | Previews are truthful and private: availability stated, removed listings `noindex` with generic tags, no address/phone/offer-only data, graceful fallback to default tags on API failure | DSC-02, DSC-09 | Unit tests for the shared tag builder; function returns 200 with default tags when the API is down |

### 8.3 Discovery feed

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-FED-01 | P0 | Vertical card stream: real item photo, author avatar/name, caption, area, mode chips, optional Quick Sell label, Save / Comments / View item | DSC-04, UX-05 | Status and price come from the linked listing, not the post |
| FE-FED-02 | P0 | "View item" opens the canonical listing; "Make an offer" only when the listing is Available | DSC-06, F-05 | Post for a reserved listing shows an unavailable state and no offer CTA (QA-07) |
| FE-FED-03 | P0 | Comments in an accessible sheet: recency order, composer, report/block, persistent note: "To make an offer, use Make an offer. Agreements made in comments are not tracked." | UX-06 | Guest sees a sign-in prompt; removed/flagged comments render as placeholders |
| FE-FED-04 | P0 | Always-visible "Explore marketplace" path from the feed | DSC-05 | Present at top of feed and in empty state |
| FE-FED-05 | P0 | Infinite scroll with cursor pagination, loading/error/retry and end-of-feed state | DSC-07 | No duplicate posts across pages |
| FE-FED-06 | P0 | Member can post a feed highlight linked to one of **their own active listings** (caption only) | DSC-04 | No standalone posts, no separate price fields |
| FE-FED-07 | P0 | Feed and comments are behind a feature flag pending decision D-08 | D-08 | Feed can be hidden without breaking navigation |

### 8.4 Authentication and onboarding

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-AUT-01 | P0 | Phone entry with fixed `+234`, numeric keyboard (`inputmode="tel"`), normalisation (accept `080…`, `80…`, `+23480…`) to E.164 | ACC-01, UX-07 | Invalid numbers show an inline error; one-line explanation of why the phone is needed |
| FE-AUT-02 | P0 | Six-digit OTP field: single accessible input (`autocomplete="one-time-code"`) or segmented with a single label; paste supported; **no forced auto-submit** | ACC-01, UX-08 | Screen reader announces the full field; "Confirm phone" submits |
| FE-AUT-03 | P0 | Resend available after a 60 s countdown; neutral messages for wrong/expired code, too many attempts and rate limits | ACC-02 | Copy never reveals whether a number has an account |
| FE-AUT-04 | P0 | Success label is **"Phone confirmed"**, never "verified" | ACC-01, TRU-06 | Banned-copy check passes (§10.2) |
| FE-AUT-05 | P0 | Onboarding: display name, pilot city/area, optional interests, terms/privacy acknowledgment, 18+ confirmation; marketing opt-in separate and unchecked | ACC-03/04, UX-09 | Cannot post or offer until acknowledgment is recorded |
| FE-AUT-06 | P0 | Logout, session expiry handling and a plain account-deletion request route in settings | ACC-05 | Logged-out tabs cannot mutate; expired session prompts sign-in without losing the form |

### 8.5 Listing creation and management

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-LST-01 | P0 | Wizard: (1) Basics and photos → (2) Condition → (3) Trade options and urgency → (4) Preview; stepper, Back, Save draft, sticky Continue | UX-10 to UX-13, F-07 | Progress survives refresh and sign-in |
| FE-LST-02 | P0 | Photo uploader: 1–8 photos, compression, upload progress, retry on failure, reorder, cover selection, remove; tips "Use photos of the actual item. Include its defects and any repairs." | LST-02/06, UX-10 | Works on throttled 3G profile; limit enforced from runtime config |
| FE-LST-03 | P0 | Required fields: category, title, make/model where relevant, condition (Like new / Good / Fair / For parts), defects, repairs, accessories, ownership declaration | LST-02, UX-11 | Publish is blocked until complete; errors link to the right step |
| FE-LST-04 | P0 | Trade options: Sell / Swap / Both; asking price (₦) when cash enabled; desired items or "Open to offers" when swap enabled; area | LST-03, UX-12 | Conditional fields appear without stealing focus |
| FE-LST-05 | P0 | Quick Sell toggle with deadline 24 h / 48 h / 72 h / 7 days and copy "Quick Sell puts your deadline in view. It does not guarantee a buyer." | LST-04 | Preview shows absolute expiry in WAT |
| FE-LST-06 | P0 | Preview renders the **real listing detail component** with a "Preview" banner, plus per-section Edit links | UX-13 | Preview and public detail share one component |
| FE-LST-07 | P0 | Post-publish states: live, under moderation review, duplicate-item rejection | LST-05/09/10 | Each state has explanatory copy and next step |
| FE-LST-08 | P0 | My listings tabs: Draft · Active · Reserved · Expired · Closed; actions edit, close, renew/revise (expired Quick Sell) | LST-08, QA-10 | Editing a reserved listing explains that accepted deal terms will not change |
| FE-LST-09 | P1 | Category-specific fields (storage, battery health, accessories) with "Not known" option | LST-11 | Irrelevant fields hidden per category config |

### 8.6 Offers and negotiation

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-OFF-01 | P0 | Choose offer type: only modes in `listing.accepted_modes` are selectable; tiles show label and a sample sentence | OFF-01, UX-14 | Own listing, unavailable listing or restricted user shows a blocked state |
| FE-OFF-02 | P0 | Cash composer: pinned listing summary and asking price, ₦ amount, optional note, sentence "You would pay ₦X to receive [item]" | UX-15 | No payer toggle; zero/negative/non-numeric rejected |
| FE-OFF-03 | P0 | Swap item: pick one owned eligible item **or** create an offer-only item inline (photos, title, condition, defects, repairs, ownership) with label "Only the person you're offering to can see this item." | LST-07, OFF-01, UX-16 | Reserved items are disabled with reason; only one item selectable |
| FE-OFF-04 | P0 | Swap + cash: "You give" / "You receive" cards, required "I add cash" / "I receive cash" choice, ₦ amount, live sentence (e.g., "You offer your PS5 and pay ₦300,000. They give you the MacBook.") | OFF-02, UX-17 | Cannot continue without a direction; QA-03 passes |
| FE-OFF-05 | P0 | Review and send: symmetric summary, bold payer sentence, defect links, offer expiry, "This is an offer, not a completed transaction.", off-platform payment notice | UX-18 | Payload matches §7.1 table; idempotent send; success routes to the offer thread |
| FE-OFF-06 | P0 | Offers inbox tabs: Received · Sent · Awaiting handover · Closed; cards show photos, mode, current terms, whose turn, expiry, unread | UX-19 | Lists update on polling and focus |
| FE-OFF-07 | P0 | Offer thread: immutable version timeline (read-only history), latest version highlighted, persistent decision bar with Accept / Counter / Reject (recipient) or Withdraw (sender) | OFF-03/04, UX-19 | Only the latest version shows actions; QA-04 passes |
| FE-OFF-08 | P0 | Accept shows a confirmation modal with full terms, then sends `expected_version_id` + Idempotency-Key; on success routes to the transaction | OFF-05/06, §7.4 | Stale version → diff view; unavailable → explanation; uncertain → read-before-retry |
| FE-OFF-09 | P0 | Counter reuses the composer pre-filled with current terms; may change amount, direction and note | OFF-04 | New version appears in the timeline; turn passes |
| FE-OFF-10 | P0 | Expiry: remaining time shown against server time; expired offers become read-only | OFF-09, QA-09 | Late action shows "Offer expired" state |
| FE-OFF-11 | P0 | Competing offer closed by another acceptance shows "No longer available" with reason | OFF-08 | Notification deep link lands on the closed state |
| FE-OFF-12 | P1 | Side-by-side comparison of previous vs new counter terms with changed values highlighted (text + visual) | OFF-11 | Amount and payer changes unmistakable |

### 8.7 Transactions, handover and completion

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-TRX-01 | P0 | Transaction page header "Offer accepted", transaction ID, status badge, **frozen agreement snapshot** (both items, photos, defects, who pays whom how much) | TRX-01, OFF-07, UX-21 | Snapshot renders from `agreement_snapshot`, not the live listing (QA-08) |
| FE-TRX-02 | P0 | Progress: Check terms → Arrange meeting → Inspect → Both confirm, driven by real state | UX-21 | No step shows complete unless the server says so |
| FE-TRX-03 | P0 | Private meeting details section (venue/time), visible only to participants; link to chat | TRX-02 | Never rendered on public pages or shareable summaries |
| FE-TRX-04 | P0 | Persistent handover notice: "Inspect the items before exchanging. Payment is arranged directly between you and the other person. NextOwn does not hold or independently verify payment in this pilot." plus safe-meetup tips | TRX-09, PRD §12.1 | Present on every handover screen |
| FE-TRX-05 | P0 | Confirm my side: separate checkboxes (inspected item received; exchanged my item, if swap; handled agreed cash, if relevant) and self-report statement; button "Confirm my side of exchange" | TRX-03/04, UX-22 | Button disabled until applicable boxes are checked; no celebration after one confirmation |
| FE-TRX-06 | P0 | Partial state: "Your confirmation is recorded. Waiting for the other person." Other party sees "Waiting for your confirmation." | TRX-03, QA-11 | Review entry point hidden |
| FE-TRX-07 | P0 | Completed state only when the server says `COMPLETED`; receipt shows terms and both confirmation timestamps; then review prompt | TRX-03, QA-12 | Copy says both people confirmed, not that payment was verified |
| FE-TRX-08 | P0 | Request cancellation (with reason) and Report a problem / dispute entry points | TRX-05/06, UX-23 | Disputed shows "Under review"; reviews and completion frozen |
| FE-TRX-09 | P0 | Reservation expiry warning and expired/partial-timeout states with support path | TRX-07 | Never presents expiry as completion (QA-14/15) |
| FE-TRX-10 | P1 | Shareable/downloadable transaction summary that labels payment as self-reported and omits private venue | TRX-10 | Print stylesheet or generated image/PDF |

### 8.8 Messaging and notifications

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-MSG-01 | P0 | Conversation list and thread anchored to a listing/offer; header with item context, report and block | MSG-01, UX-20 | Only participants can open (403/404 handled) |
| FE-MSG-02 | P0 | Bubbles with timestamp and status (sending, sent, failed + retry); offers render as structured cards | MSG-02 | Retrying a failed message does not duplicate it (client message ID) |
| FE-MSG-03 | P0 | Persistent notice: "Accept or counter through an offer card so the agreed terms are recorded." | UX-20 | Visible in every thread |
| FE-MSG-04 | P0 | Message text rendered as **plain text** (no HTML), links not auto-fetched; long words wrap | MSG-02 | XSS test strings render inert |
| FE-MSG-05 | P0 | Polling (e.g., 5 s while thread visible, 30 s for inbox, paused when tab hidden); new messages announced in an `aria-live="polite"` region | MSG-01 | Keyboard-resilient composer on mobile |
| FE-MSG-06 | P0 | Blocked, completed/cancelled transaction, moderated message and disconnected states | MSG-05 | Blocked users cannot send; own records remain readable |
| FE-NTF-01 | P0 | Notification inbox with unread count in header; mark read; deep links to context | MSG-03/04, UX-26 | Deep link always re-fetches the target; old "accept" notifications respect current state |
| FE-NTF-02 | P1 | Notification preferences: essential transaction/security alerts separated from optional ones | ACC-07, MSG-06 | Essential alerts cannot be switched off |

### 8.9 Saved, profile and settings

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-SAV-01 | P0 | Save/unsave listings and feed posts (optimistic toggle with rollback); Saved page with Listings / Posts tabs | DSC-03, UX-26 | Saved items that became unavailable show their true state |
| FE-PRF-01 | P0 | Public profile: display name, avatar, area, "Phone confirmed", review average **with count**, active listings | ACC-03, TRU-02, UX-25 | No phone or exact location; a one-review rating is visually distinct (e.g., "5.0 · 1 review") |
| FE-PRF-02 | P0 | Own profile hub: My listings, offers, transaction history, reviews, help | UX-25 | Restricted account banner with appeal link |
| FE-SET-01 | P0 | Settings: display name, avatar, area, interests, privacy, terms, account deletion request, logout | ACC-03/05, UX-26 | Destructive actions use confirmation modal |

### 8.10 Trust, reporting and reviews

| ID | Pri | Requirement | Traces to | Acceptance |
| :---- | :---- | :---- | :---- | :---- |
| FE-TRU-01 | P0 | Report entry from listing, message, feed post, comment, profile and transaction; form with reason category, description, optional evidence upload, urgent-safety guidance | TRU-03, UX-23 | Submission shows case reference ("We received report NX-000123.") |
| FE-TRU-02 | P0 | Block from profile, post, comment and chat; explain effect | DSC-08 | Blocked state reflected in chat and offer entry points |
| FE-TRU-03 | P0 | "My reports" status list without moderator notes | API `/me/reports` | Shows status only |
| FE-TRU-04 | P0 | Review form (1–5 stars, optional note) available only when the server marks the transaction eligible | TRU-01, QA-20 | Old links to a cancelled deal show "Reviews are available after both people confirm the exchange." |
| FE-TRU-05 | P0 | Policy links (community rules, prohibited goods, safety guide) at listing publish, offer review, handover and report contexts | TRU-05 | Link presence covered by E2E |

---

## 9. Key Flows (Frontend View)

| Flow | Screens | Frontend-critical moments |
| :---- | :---- | :---- |
| F-01 Cash purchase | Explore/Feed → Listing → Cash composer → Review → Send → Thread → Accepted → Transaction → Confirm → Review | Guest intent preserved across sign-in; idempotent send; acceptance never optimistic |
| F-02 Swap | Listing → Swap → Select/create item → Review → Send → Counter/Accept → Reserved → Confirm | Offer-only item privacy label; reserved own items disabled |
| F-03 Swap + cash | Listing → Swap + cash → Item → Direction → Amount → Summary → Send → Versions → Accept | Direction required; bold payer sentence at every step; diff on counter |
| F-04 Quick Sell | Wizard → Mode → Urgency + deadline → Preview → Publish → Expiry → Renew/revise/close | Absolute + relative deadline; no animated timer |
| F-05 Feed to trade | Feed → Comments → Listing → Composer | Disabled CTA if listing unavailable; comment disclaimer |
| F-06 Dispute | Transaction → One confirms → Other reports → Under review → Outcome | No celebratory UI; case reference; support limits stated |
| F-07 Listing lifecycle | Draft → Photos/condition → Mode/location → Preview → Publish → Edit/close | Draft persistence; moderation state |
| F-08 Reputation | Both confirmed → Eligible → Rating → Profile aggregate with count | Eligibility from server only |

Clickable prototypes and E2E tests must cover F-01, F-03, F-04, F-05 and F-06 including their unavailable/conflict branches.

---

## 10. Content and Trust Language

### 10.1 Required copy (use verbatim or near-verbatim; owned by `lib/copy`)

| Context | Copy |
| :---- | :---- |
| Hero | Find your next thing. |
| Brand line | Turn what you own into what you want. |
| Supporting line | Sell what you no longer need, swap for something better, or add cash to make the exchange work. |
| CTA pair | Explore items · List an item |
| Phone badge explanation | Phone confirmed. This does not verify identity or ownership. |
| Quick Sell | Quick Sell puts your deadline in view. It does not guarantee a buyer. |
| Before send | Review what each person gives and receives. Offers can be countered or rejected. |
| Offer accepted | Both items are reserved. Arrange an inspection and handover with the other person. |
| Handover caution | Inspect the items first. NextOwn does not hold or independently verify payments in this pilot. |
| Partial confirmation | Your confirmation is recorded. Waiting for the other person to confirm. |
| Unavailable | This item is no longer available. Your offer was not sent. |
| Stale version | The offer has changed. Review the latest version before deciding. |
| Expired listing | The deadline passed. Renew, update or close your listing. |
| Dispute | We have recorded your report. Your case reference is [ID]. Support will review the information. |
| Review gate | Reviews are available after both people confirm the exchange. |
| Support limit | We can review reports and account activity. We cannot reverse a transfer made outside NextOwn. |
| Comments | To make an offer, use Make an offer. Agreements made in comments are not tracked. |
| Chat | Accept or counter through an offer card so the agreed terms are recorded. |

### 10.2 Banned phrases (enforced in CI)

A CI check (ESLint rule or test that scans `src/` and copy files, case-insensitive) fails the build if any of these appear in user-facing strings:

> Verified person · Verified seller · Identity verified · Escrow · Escrow protected · Guaranteed buyer · Secure payment · Protected payment · We hold your money · Funds secured · Payment confirmed by NextOwn · Certified authentic · Fraud-free · Delivery guaranteed · You have successfully paid through NextOwn

Also prohibited: shield/check-badge icons next to people or payments, fake scarcity ("Only 1 left!", "3 people viewing"), and celebratory UI while a dispute is open.

### 10.3 Formatting rules

- Sentence case for labels and buttons. Use "Open to swap", "Quick Sell" and "Phone confirmed" consistently.
- `₦` with comma grouping; payer stated in words in every mixed offer.
- Errors are calm, specific and blame-free, and always include a next step.
- English UI for the pilot. All strings live in the copy module so localisation can be added later.

---

## 11. Accessibility Requirements

Target: **WCAG 2.2 AA** on all P0 routes (PRD §11, UX §10.2).

- Semantic landmarks and heading order on every page; skip-to-content link.
- Every interactive element is keyboard reachable in logical order, with a visible focus ring (≥ 3:1 contrast, not border-colour-only).
- Dialogs and sheets move focus in, trap it while open, and return it to the trigger on close; `Esc` closes non-critical dialogs.
- Form errors: inline message linked with `aria-describedby`, plus an error summary on submit that receives focus.
- Status changes (offer sent, confirmation recorded, new message) are announced through polite live regions.
- Money and direction sentences read naturally to screen readers ("You pay three hundred thousand naira directly at the exchange"); `₦` symbol paired with visually hidden "naira" where needed.
- Reflow at 320 px and 200% zoom without clipping prices or cash descriptions.
- Colour never the sole signal for status, urgency, errors or reservation.
- No time limits that require fast action; countdowns are informational.
- `prefers-reduced-motion` disables non-essential motion.
- Touch targets ≥ 44 × 44 px; adjacent destructive controls spaced apart.
- Product photos have meaningful alt text (title + angle/cover); condition and defects always exist as text.

Verification: axe-core in component and E2E tests; manual VoiceOver (iOS Safari) and TalkBack (Android Chrome) passes on F-01 to F-06 before launch.

---

## 12. Performance Requirements

| Budget | Target |
| :---- | :---- |
| LCP (p75 mobile, field) | ≤ 2.5 s |
| INP (p75 mobile, field) | ≤ 200 ms |
| CLS (p75) | ≤ 0.1 |
| Initial JS for public routes | ≤ 170 KB gzipped (R; to confirm after first build) |
| Listing card thumbnail | ≤ 40 KB at mobile density |
| Fonts | ≤ 2 font files on first load, subset, preloaded |

Practices:

- Keep the public entry chunk small: React, React Router, TanStack Query, HeroUI components actually used (import per component, tree-shaken) and the public pages. Use `React.lazy` / route `lazy()` so chat, listing-wizard and offer-composer chunks never load on public pages.
- Start the first API request early: route loaders or `queryClient.prefetchQuery` on navigation and on card hover/touch, so data and code load in parallel.
- Show layout-stable skeletons (HeroUI `Skeleton`) for the first paint; no full-page spinners.
- `<img>` with `width`/`height`, `srcset`/`sizes` from API image variants, `loading="lazy"` below the fold, `decoding="async"`, and `fetchpriority="high"` for the listing hero image; fixed aspect ratios (4:3 or 1:1) to prevent layout shift.
- Check bundle size on every PR (e.g., `rollup-plugin-visualizer` report plus a size budget).
- Avoid heavy third-party scripts; analytics loads after interaction-ready.
- Test on a real mid-range Android over throttled "Slow 4G" and "3G" profiles; Lighthouse CI on PRs with budgets.
- Real-user monitoring of Web Vitals feeding the operations dashboard.

---

## 13. Security and Privacy on the Client

- Session in **HttpOnly, Secure, SameSite** cookies; no tokens in `localStorage`. CSRF protection on mutations as defined by the API.
- Strict Content Security Policy; no `dangerouslySetInnerHTML` for user content; all user text rendered as text.
- Same-origin validation of `next`/redirect parameters.
- Never log or send to analytics: phone numbers, OTPs, chat content, handover venues, exact locations or evidence files.
- Private media (offer-only items, chat attachments, evidence) loaded through short-lived signed URLs; never cached by the service worker.
- `Referrer-Policy: strict-origin-when-cross-origin`; external links use `rel="noopener noreferrer"`.
- Public pages and share previews include only public-safe fields (area, not address; no phone).
- Dependency auditing in CI; lockfile committed.

---

## 14. Analytics Instrumentation

Implement the client-side events from PRD §13.2 through one typed module (`lib/analytics`). Events not visible to the client (e.g., `reservation_created`, `offer_expired`) are emitted by the server.

| Group | Client events | Safe dimensions |
| :---- | :---- | :---- |
| Onboarding | `otp_requested`, `otp_verified`, `onboarding_completed` | method, city, validation_error_code |
| Listings | `listing_draft_started`, `listing_published`, `listing_edited`, `listing_closed` | category, city, condition, allowed_modes, urgent |
| Discovery | `search_submitted`, `filter_applied`, `listing_viewed`, `feed_post_viewed`, `feed_to_listing_opened`, `item_saved` | category, area, referral_surface |
| Offers | `offer_submitted`, `offer_countered`, `offer_rejected`, `offer_withdrawn`, `offer_accepted`, `offer_unavailable` | mode, turn, error_code |
| Transactions | `handover_scheduled`, `participant_confirmed`, `transaction_cancelled`, `dispute_opened` | mode, age, reason |
| Trust | `report_submitted`, `review_created` | broad reason class |

Every event carries a client-generated `event_id` (UUID), `occurred_at` (UTC), session or user ID, entity ID, `client_platform`, and experiment flag where relevant. Events are emitted **after** the server confirms the action (not on click), and retries reuse the same `event_id` so the warehouse can de-duplicate. Analytics loading respects the approved consent policy (D-05).

---

## 15. Testing Strategy and Acceptance

### 15.1 Test layers

| Layer | Tooling | Coverage focus |
| :---- | :---- | :---- |
| Unit | Vitest | Money conversion/formatting, payer sentence generator, status label map, time/countdown with server offset, phone normalisation, offer payload builder per mode |
| Component | Vitest + React Testing Library + `axe-core` (jsdom) | Every `components/ui` and `components/domain` component and state; focus management; error association |
| Contract | Generated types + MSW handlers from OpenAPI | Client compiles against the current spec; mocks cover each error code |
| Integration | Vitest + Testing Library + MSW, full providers (`renderWithProviders`) | Feature screens with TanStack Query, React Router, Zustand and RHF/Zod wired together; every API error code path |
| Flow (in-browser) | Vitest Browser Mode (mobile 390 × 844 and 320 px, desktop 1440 × 900) | Flows F-01 to F-08 and adverse branches; real layout, focus and scrolling |
| Share previews | Vitest | `listing-meta.ts` tag builder for every listing status; `edge/listing-og.ts` with mocked API (success, removed, timeout, unknown slug) |
| State | Vitest | Zustand stores (reset on sign-out, persisted drafts, storage failure fallback) |
| Performance | Lighthouse CI + RUM | §12 budgets |
| Copy | Banned-phrase scan | §10.2 |

### 15.2 Frontend acceptance matrix (from PRD §14)

| QA case | Frontend verification |
| :---- | :---- |
| QA-01 | Guest taps Make offer → sign-in → returns to composer with draft intact |
| QA-02 | Area/category/mode filters reflected in URL and results; chips removable |
| QA-03 | Swap + cash with "I receive cash" ₦50,000 shows both items and correct direction sentence for both viewers |
| QA-04 | Counter from ₦300,000 to ₦350,000 keeps v1 read-only in history; only v2 actionable |
| QA-05 | Second concurrent accept shows the 409 unavailable state, not a generic error |
| QA-06 | Offering an item reserved elsewhere shows `ITEM_UNAVAILABLE` and keeps the draft |
| QA-07 | Stale feed post / listing card for a reserved item has no active offer CTA |
| QA-08 | Transaction page shows the accepted price after the listing price is edited |
| QA-09 | Expired offer is read-only; late accept shows expired state |
| QA-10 | Expired Quick Sell shows renew / revise / close to the owner; urgent badge removed publicly |
| QA-11 | One confirmation → "Waiting for the other person"; no review entry |
| QA-12 | Two confirmations → Completed receipt, one review per party |
| QA-13 | Dispute → "Under review"; completion and review blocked |
| QA-14 / 15 | Reservation expiry states never display as completed |
| QA-16 | Guessed private IDs render the generic not-found page with no leaked metadata |
| QA-17 | Uploaded test image with GPS EXIF: public image response contains no GPS (verified against API) |
| QA-18 | Blocked user sees disabled message/offer entry points |
| QA-20 | Review form unreachable for a cancelled deal, even via an old URL |
| QA-21 | Timeout after accept → status check → original transaction shown once |
| QA-22 | Throttled Android profile: every required field, label and action usable at 320 px without horizontal scroll |

### 15.3 Definition of done (per feature)

- Implements the listed PRD/UX requirements and all mandatory states (loading, empty, error, unavailable).
- Vitest unit, component, integration and flow tests passing; axe clean.
- Analytics events implemented and verified in staging.
- Copy pulled from the copy module; banned-phrase check passes.
- Works at 320 px, 390 px, 768 px and 1440 px; keyboard and screen-reader checked.
- Product and design sign-off on staging.

---

## 16. Delivery Plan

Aligned with PRD §15.1. Week numbers are relative to the project start and are not a fixed estimate until team capacity is agreed.

| Phase | Weeks | Frontend deliverables |
| :---- | :---- | :---- |
| 0. Foundations | 1–3 | Repo setup, CI (lint, types, tests, Lighthouse, banned copy), Vite + TypeScript scaffold, Tailwind brand tokens, HeroUI theme variables, fonts, `components/ui` wrappers, React Helmet `<Seo>` component, Zustand stores, TanStack Query client, Axios instance with interceptors and generated API types, MSW mocks, React Router app shell, layouts and auth guards |
| 1. Accounts and listings | 3–5 | Phone auth, onboarding, settings, listing wizard, photo uploader, My listings, listing detail, Explore and filters, listing share-preview edge function |
| 2. Offers and feed | 4–6 | Offer composer (all modes), offers inbox and thread, counters, accept flow, feed and comments (flagged), saves |
| 3. Transactions and trust | 6–8 | Transaction/handover, confirmations, cancellation/dispute, reports, blocks, reviews, notifications, messaging |
| 4. Hardening and beta | 8–9 | Full QA matrix, accessibility and device testing, performance tuning, analytics QA, closed beta fixes |
| 5. Pilot | 9–10+ | One-city launch, RUM monitoring, weekly UX fixes from evidence |

---

## 17. Dependencies, Open Questions and Decisions

### 17.1 Frontend dependencies on other teams

| Dependency | Needed from | Needed by |
| :---- | :---- | :---- |
| OpenAPI spec with stable error codes, enums and pagination | Backend | Phase 0 |
| Public-safe listing summary endpoint fast enough for the share-preview function (p95 < 300 ms) | Backend | Phase 1 |
| Hosting that supports edge/server functions in front of the SPA | Engineering + ops | Phase 1 |
| Runtime config endpoint (cities, areas, categories, expiries, photo limits, support contacts) | Backend | Phase 1 |
| Signed upload flow and image variant URLs | Backend | Phase 1 |
| Server time source (header or field) for countdowns | Backend | Phase 2 |
| Final logo, favicon set, OG template (BR-01) | Brand designer | Before beta |
| Figma component library and screens UX-01 to UX-26 | Product design | Rolling, per phase |
| Approved copy deck and legal disclosures (BR-04) | Product + legal | Before beta |
| Consent/analytics policy (D-05) | Privacy counsel | Before analytics ships |

### 17.2 Open frontend decisions

| ID | Question | Recommendation | Owner |
| :---- | :---- | :---- | :---- |
| FE-D-01 | Polling vs WebSockets for chat and offers | Polling via TanStack Query for the pilot | Frontend + backend |
| FE-D-02 | Hosting/CDN for the SPA (Nigeria latency, SPA fallback, edge functions for share previews) | Static hosting with edge functions (required by §4.3) and edge presence in or near Lagos | Engineering + ops |
| FE-D-03 | Session model (HttpOnly cookie vs bearer tokens) | HttpOnly, Secure, SameSite cookie session; no tokens in Zustand or web storage | Frontend + backend |
| FE-D-04 | PWA install prompt at pilot? | `vite-plugin-pwa` manifest and static caching yes; install prompt P1 | Product |
| FE-D-05 | Analytics vendor and consent banner requirement | Pending D-05 | Product + counsel |
| FE-D-06 | Inter Display licensing and hosting | Self-host WOFF2 (e.g., Fontsource), subset, preloaded | Design + frontend (BR-03) |
| FE-D-07 | Is Vitest Browser Mode enough for cross-browser flow tests (iOS Safari/WebKit)? | Yes for the pilot, plus manual testing on physical iOS and Android devices | Frontend lead + QA |

### 17.3 Inherited product decisions that block frontend work

D-01 launch city and areas · D-02 categories and device-condition fields · D-04 reservation lifetime and cancellation rules · D-08 feed and comments at day 1 · D-09 one-confirmation case handling · D-10 logo and brand approval · BR-01 to BR-06 brand approvals. Until resolved, the client reads these from runtime config or feature flags and uses neutral placeholders (e.g., "[Pilot Area]"). **Never invent a live city, user counts, transaction stats or real prices.**

---

## Appendix A. Screen → Requirement Traceability

| Screen | Frontend IDs | Parent PRD IDs |
| :---- | :---- | :---- |
| UX-01 Home | FE-HOM-01..03 | DSC-01/02 |
| UX-02/03 Explore, Filters | FE-EXP-01..05 | DSC-01/02/07 |
| UX-04 Listing detail | FE-LDT-01..05, FE-SEO-01..03 | LST-02/05, DSC-02/09 |
| UX-05/06 Feed, Comments | FE-FED-01..07 | DSC-04/05/06/08 |
| UX-07/08/09 Auth, Onboarding | FE-AUT-01..06 | ACC-01..05 |
| UX-10..13 Listing wizard, My listings | FE-LST-01..09 | LST-01..11 |
| UX-14..18 Offer composer | FE-OFF-01..05 | OFF-01/02/05 |
| UX-19 Offers inbox/thread | FE-OFF-06..12 | OFF-03..11 |
| UX-20 Messages | FE-MSG-01..06 | MSG-01/02/05 |
| UX-21/22 Handover, Confirm | FE-TRX-01..06, 09 | TRX-01..04, 07, 09 |
| UX-23 Dispute/Report | FE-TRX-08, FE-TRU-01..03 | TRX-05/06, TRU-03 |
| UX-24 Result/Review | FE-TRX-07, FE-TRU-04 | TRX-03, TRU-01/02 |
| UX-25 Profile | FE-PRF-01..02 | ACC-03, TRU-02 |
| UX-26 Saved, Alerts, Settings | FE-SAV-01, FE-NTF-01..02, FE-SET-01 | DSC-03, MSG-03/04/06, ACC-05/07 |

## Appendix B. Glossary

| Term | Meaning in the client |
| :---- | :---- |
| Item | The one record for a physical possession; shared by its listing and any swap offers |
| Listing | The public presentation of an item with accepted modes, price and status |
| Offer-only item | An item created inside a swap offer, visible only to the recipient |
| Offer / version | A negotiation and its immutable sets of terms; only the latest version is actionable |
| Cash direction | Who pays the top-up: offerer → owner, owner → offerer, or none |
| Reservation | The hold on every item in an accepted deal |
| Agreement snapshot | Frozen terms at acceptance; what the transaction page displays |
| Confirmation | One participant's self-reported statement that the exchange happened |
| Completed | Both participants confirmed and no dispute is open; not payment verification |
| Phone confirmed | The person proved possession of a phone number by OTP; nothing more |
| WAT | West Africa Time (`Africa/Lagos`), the display time zone |
| Kobo | 1/100 naira; all API money is integer kobo |
