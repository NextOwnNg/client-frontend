# Phase 1: Discover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest can browse, search, filter and evaluate an item comfortably on a phone, and reserved or removed items are unmistakable.

**Architecture:** The public pages are thin route components in `src/pages/public`. Data hooks, filter logic and listing UI live in `src/features/listings` and `src/features/explore`. Explore filters live in the URL. Listing head tags come from one pure builder, `src/lib/seo/listing-meta.ts`, shared with the framework-neutral edge function `edge/listing-og.ts`. Mock data is extended with listing details and served by MSW.

**Tech Stack:** React 19, React Router 8 (`viewTransition` links), TanStack Query 5 (`useInfiniteQuery`), HeroUI v3, Framer Motion (`LazyMotion` + `m`), Tailwind v4, Vitest + Testing Library + MSW.

**Spec:** `docs/prd.md` §4.2, §4.3, §7.6–7.8, §8.1, §8.2, §10–12; UX brief UX-01 to UX-04; direction contract `.impeccable/surfaces/src-app.md`; `DESIGN.md`.

## Global Constraints

- Money is integer kobo shown with `formatNaira` (₦ with grouping); never clipped at 320 px.
- Status always pairs text with an icon. Labels come only from `lib/copy/status.ts`.
- No geolocation prompt anywhere. Area is the user-selected pilot area.
- No invented stats, sales volumes, trust badges or fake scarcity. The banned-phrase test stays green.
- Never render an exact address or seller phone (FE-LDT-05).
- Touch targets are at least 44 px. Focus is visible. Sheets trap focus and return it on close.
- Motion uses `lib/motion/presets.ts` timings. Reduced motion means instant state changes.
- The initial JS for public routes is at most 170 KB gzipped (PRD §12), measured as the entry chunk plus the landing route's chunk.
- No commits. The user reviews and commits.

## Review Focus

1. A listing becomes unavailable while the guest is looking at it: the card and the detail both show the true state (FE-EXP-05, QA-07). Tested in Task 6.
2. A filter URL is shared or edited by hand with junk values (`price_min=abc`, an unknown category, min > max): the page still renders, with invalid values ignored or flagged. Tested in Task 4.
3. Images are blocked or fail on slow data: the content and the CTAs still render (FE-LDT-02). Tested in Task 7.
4. The share-preview function meets an API timeout or a removed listing: it returns 200 with default tags, and noindex for removed (FE-SEO-03). Tested in Task 3.
5. Back from a listing to Explore keeps the filters and the scroll position. Tested in Task 5 (URL state); scroll via `ScrollRestoration`.

---

### Task 1: Bundle budget and DESIGN.md drift

**Files:** `src/app/App.tsx`, every `framer-motion` importer, `src/lib/motion/features.ts`, `src/app/router.tsx`, `src/components/layout/AreaPicker.tsx`, `src/styles/theme.css`, `src/components/domain/Price.tsx`, `src/components/domain/Deadline.tsx`, `DESIGN.md`.

- [ ] Replace `motion` with `m` everywhere, and wrap the app in `<LazyMotion features={() => import('@/lib/motion/features').then(r => r.default)} strict>`.
- [ ] Code-split routes. Every page except Home is a `lazy` route. The area sheet's body loads on open.
- [ ] Add `text-price-sm` (18/24) to the type ramp and use it in `Price`. Add `rounded-input` (8px). Change the Quick Sell compact chip to a Gold tint (`bg-highlight/25`) with Ink text.
- [ ] Verify with `npm run build`. Expected: the entry chunk plus the Home chunk is ≤170 KB gzipped, or the measured floor is recorded as a ruling.

### Task 2: Listing detail data and query hooks

**Files:** `src/types/api.ts`, `src/mocks/fixtures/listings.ts`, `src/mocks/handlers/index.ts`, `public/mock/items/*-detail-*.jpg`, `src/features/listings/api.ts`, `src/test/mock-api.test.ts`.

**Interfaces produced:**
- `ListingDetail = ListingSummary & { images: ListingImage[]; description: string; defects: string[]; repairs?: string; accessories?: string; desiredSwap?: string; seller: PublicSeller; categoryFields: { label: string; value: string }[] }`
- `ListingFilters = { q?; category?; area?; modes: ('CASH'|'SWAP'|'QUICK_SELL')[]; priceMin?: number /*naira*/; priceMax?; conditions: ItemCondition[]; sort: 'recent' }`
- `listingKeys.list(filters)`, `listingKeys.detail(slug)`; `useListings(filters)` (infinite), `useListing(slug)`, `usePrefetchListing()`, `useListingSuggestions(q)`.

- [ ] Tests first (mock-api): `/listings` supports `mode` as a list, `price_min`/`price_max` in naira, `condition` as a list, `sort=recent`. `/listings/:slug` returns detail for every status, including RESERVED and REMOVED, with removed listings stripped to generic fields. `/listings/suggest?q=` returns up to 6 titles and categories.
- [ ] Extend the fixtures: a description, defects, repairs and accessories where honest, a desired swap, category field values, and 2 to 3 images per listing (the cover plus detail crops of the same photo, made with `sips`). Add one CLOSED and one REMOVED sample.
- [ ] Hooks: `useListing` writes the detail's status back into every cached list page (`setQueriesData`), so the cards show the true state.

### Task 3: Share-preview tag builder and edge function (FE-SEO-01..03)

**Files:** `src/lib/seo/listing-meta.ts` (+test), `src/components/seo/Seo.tsx`, `edge/listing-og.ts` (+test), `edge/README.md`, `tsconfig.test.json`.

**Interfaces produced:** `buildListingMeta(listing: ListingMetaInput | null, opts: { origin: string }) => { title; description; canonical; image; noindex; tags: MetaTag[] }`; `injectMeta(html: string, tags: MetaTag[]) => string`; `handleListingOg(request: Request, deps: { fetchListing(slug, signal): Promise<ListingMetaInput | null>; indexHtml: string; timeoutMs?: number }) => Promise<Response>`.

- [ ] Tests first:
  - title `"{item} · {area} · NextOwn"`;
  - the description carries the condition, the modes and the price or "Open to swap";
  - reserved, expired and closed listings say they're unavailable;
  - removed or null gives default tags plus noindex;
  - no phone or address fields leak;
  - HTML is escaped.
- [ ] Edge tests: on success the tags are injected, `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Timeout, 5xx and unknown slug all give 200 with the default tags.
- [ ] `Seo` accepts `type`, `twitter:card` and an image alt. Listing pages pass `buildListingMeta` output into `Seo`.

### Task 4: Explore filter model (URL)

**Files:** `src/features/explore/filters.ts` (+test).

**Interfaces produced:** `parseFilters(params: URLSearchParams, config?: RuntimeConfig) => { filters: ListingFilters; issues: FilterIssue[] }`; `serializeFilters(filters) => URLSearchParams`; `activeChips(filters, config) => { key; label; remove(): ListingFilters }[]`; `validatePrice(min?, max?) => 'min_gt_max' | null`; `priceDisabled(filters) => boolean` (swap-only).

- [ ] Tests first:
  - round trip;
  - junk values are dropped;
  - an unknown category is dropped once the config is known;
  - min > max is flagged and not sent to the API;
  - swap-only disables the price;
  - chips are labelled and removable;
  - the canonical keeps only the category and the area.

### Task 5: Explore page (UX-02/03, FE-EXP-01..05)

**Files:** `src/pages/public/ExplorePage.tsx` (+test), `src/features/explore/components/{SearchBox,CategoryRail,ModeChips,ActiveChips,FilterPanel,FilterSheet,ResultsGrid}.tsx`.

- [ ] Tests first:
  - searching updates the URL and the results;
  - a mode chip filters;
  - removing a chip;
  - the empty state offers "Clear filters";
  - an error shows a retry;
  - a filter sheet min > max shows an inline error and disables Apply;
  - Apply shows "Show N results";
  - the URL survives navigating to a listing and back.
- [ ] Layout:
  - Phones: a search with suggestions, a scrollable category rail, mode chips, a "Filters (n)" button opening the sheet, and active chips. Results are horizontal rows (the direction contract), with skeleton rows while loading.
  - Tablet: 2-up tiles.
  - Desktop: a sticky filter rail with 3-up tiles.
  - Wide: 4-up tiles.
- [ ] Infinite results: an IntersectionObserver sentinel plus a visible "Show more" button (keyboard and no-JS-observer fallback). A partial load failure keeps the loaded results and shows an inline retry.

### Task 6: Listing cards and true status (FE-EXP-05)

**Files:** `src/components/domain/ListingRow.tsx`, `src/features/listings/components/ListingCardLink.tsx` (prefetch on hover/touch, `viewTransition`), tests.

- [ ] Tests first:
  - Available, Reserved, Expired and Removed variants show their label and icon;
  - a swap-only listing shows "Open to swap";
  - Quick Sell shows the real countdown;
  - stale card: the list is cached ACTIVE, the detail fetch returns RESERVED, and the card now reads "Reserved".

### Task 7: Listing detail page (UX-04, FE-LDT-01..05)

**Files:** `src/pages/public/ListingDetailPage.tsx` (+test), `src/features/listings/components/{Gallery,GalleryViewer,ListingFacts,OfferPanel,OfferBar,SignInPrompt}.tsx`.

- [ ] Tests first:
  - the content follows the FE-LDT-01 order, with the defects before "Make an offer" in DOM order;
  - the gallery has count text, arrows, thumbnails and keyboard arrows, and a failed image shows a placeholder while the CTA still works;
  - a guest who taps "Make an offer" or "Save" sees the sign-in prompt with `next`;
  - Reserved disables the CTA with "Reserved: this item is no longer accepting offers.";
  - Expired, Closed and Removed show honest states (removed gets noindex and no photos);
  - own listing shows "Manage listing";
  - the CTA refetches the status on tap and shows the real state if it changed;
  - no phone or address appears in the rendered output (snapshot of the public fields);
  - 404 shows the not-found state.
- [ ] Layout: phones get the gallery full-bleed, then the facts, with a sticky bottom offer bar (`pb` reserve so it never covers content, above the bottom nav). Desktop gets the media on the left and a sticky right panel holding the price, the modes, the defects summary, the CTAs and the trust module.
- [ ] Gallery: CSS scroll-snap for native swipe, arrows from tablet, a count ("2 of 3"), thumbnails, a full view in a Modal with tap-to-zoom, and alt text from the API.

### Task 8: Home page (UX-01, FE-HOM-01..03)

**Files:** `src/pages/public/HomePage.tsx` (+test), `src/features/home/components/{HomeHero,RouteChips,CategoryShortcuts,RecentNearby,HowItWorks}.tsx`.

- [ ] Tests first:
  - the hero copy, a search that submits to `/explore?q=`, and Sell / Swap / Quick Sell chips linking to the filtered Explore;
  - the categories come from the config;
  - recent listings filter by the selected area;
  - unknown area shows the "Choose your area" prompt and no geolocation call;
  - an empty area shows the empty-inventory state with "See all areas" and "List an item";
  - loading shows skeletons;
  - offline shows the banner;
  - guests see the "List an item" CTA.
- [ ] The first viewport follows the direction contract:
  - the hero, the search and the mode chips;
  - one worked swap + cash sum (the `OfferSum` with sample values, labelled as an example);
  - recent rows;
  - a 3-step how-it-works strip using ticks.
- [ ] Desktop: a two-column hero (copy and search on the left, the example sum on the right) and a multi-column grid.

### Task 9: Discover motion and approval package

- [ ] Shared image from card to detail via View Transitions (`viewTransition` on links, `view-transition-name` on the cover), disabled under reduced motion.
- [ ] Card press 0.98, the image fade, and the filter sheet spring are already in Phase 0; verify them.
- [ ] Gallery dev entries for the new components in `/dev/components`.
- [ ] Verification: typecheck, lint, the whole suite, the build size, the impeccable detector, and screenshots at 320, 390 and 1440 px of Home, Explore (results, empty, filter sheet) and Detail (available, reserved, removed).
