# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People in one Nigerian pilot city (city not yet chosen) who own useful secondhand things and want something else.

- **Lead user (confirmed): the budget upgrader.** They want a better device without paying full price, by trading what they already own plus some cash. When journeys compete for attention, swap + cash clarity wins.
- Declutterers who want to move an item quickly (Quick Sell).
- Bargain buyers looking for reliable local secondhand items.
- Responsible casual flippers looking for viable local deals.

**Everyday context (confirmed):** a mid-range Android phone on mobile data, Chrome, a 390 px screen, a patchy connection and data that costs money. Desktop is supported but secondary.

## Product Purpose

NextOwn is an individual-first, person-to-person marketplace: "Turn what you own into what you want." A member can sell an item for cash, swap it for another item, or combine an item with cash, in either direction. Offers are structured and versioned, acceptance reserves the items, and people meet locally to inspect and exchange. Each person then confirms independently.

Success is **completed real-world exchanges** confirmed by both people, not engagement.

## Positioning

The structured **swap + cash** offer. One item plus an explicit amount, with an explicit payer ("You pay ₦300,000 directly at the exchange"), versioned counteroffers and a frozen agreement. Classifieds and DM-based selling can't offer this: they leave terms in scattered chat.

## Operating Context

- Discovery: Explore (search, categories, area, mode, Quick Sell) and a listing-linked feed. Both always point back to one canonical listing.
- Negotiation: offers and counteroffers with immutable versions; chat for logistics only.
- Exchange: offline, local, in person. NextOwn does **not** hold money, verify payment, verify identity, certify condition or deliver.
- Completion: two separate self-reported confirmations; reviews only after completion.
- Pilot runs in one city at area level; cities, areas and categories are configurable.

## Capabilities and Constraints

- Responsive web app (Vite + React SPA); mobile-first; admin console is a separate product.
- Phone OTP sign-in. "Phone confirmed" means phone possession only.
- Money is integer kobo; display ₦ with grouping. Times display in WAT.
- Backend not built yet: a mock API with clearly fictional sample data stands in.
- Categories are mock until confirmed (proposed: phones, laptops, gaming devices); category-specific fields are configurable.
- Undecided: launch city and areas, support hours, final pass/fail metrics.

## Brand Commitments

- Name: **NextOwn** (capital N and O). Line: "Turn what you own into what you want." Website hero: "Find your next thing."
- Approved Route 3 logo (two overlapping rounded squares); assets in `public/brand/`.
- Brand Kit v0.9 palette, Inter / Inter Display type, spacing and radius scale are binding (`docs/NextOwn Brand Kit and Design System.md`).
- Voice: practical, optimistic, dependable, friendly, direct. Never overpromise safety, value or verification.
- Banned claims: verified identity, escrow, protected or secure payment, guaranteed buyer, certified authentic, delivery guaranteed, fake scarcity.

## Evidence on Hand

- No real users, listings, transactions, reviews, statistics or photos exist yet. Do not fabricate them as real.
- Sample listings use free-to-use stock photos of secondhand items (confirmed) and are clearly fictional; locations use "[Pilot Area]"-style placeholders.
- Specs: `docs/prd.md`, `docs/NextOwn Product Requirements Document.md`, `docs/NextOwn UIUX Design Agent Ready Template.md`.

## Product Principles

1. **Clarity before exchange.** Who gives what and who pays whom is unmistakable before anyone commits.
2. **Trust through facts, not badges.** Show real photos, disclosed defects, review counts and exact limits; never imply checks that don't happen.
3. **One item, one truth.** Availability and price are the same on every surface; stale views never allow stale actions.
4. **Built for the phone in hand.** Low data, slow networks and small screens are the default case, not an edge case.
5. **Always a next step.** Every offer, hold, handover, failure and dispute tells people what happens next.

## Accessibility & Inclusion

WCAG 2.2 AA target. 320 px reflow with no clipped prices; 44 × 44 px touch targets; status never by colour alone; reduced-motion support; screen-reader-friendly money sentences. English UI for the pilot.
