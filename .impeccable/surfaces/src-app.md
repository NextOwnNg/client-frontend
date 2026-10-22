---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/pages","src/components"]
---

# NextOwn app shell and member app

Scope: the whole user-facing web app (shell, Explore, listing, offers, transactions, account). Visitor mode: **Operate** (Home's hero region leans Persuade but inherits this world).

Audience and job: a budget upgrader on a mid-range Android phone over mobile data, trading what they own plus cash for something better. Proof and content: real item photos (sample stock photos for now), disclosed defects, explicit cash direction. Constraints: Brand Kit v0.9 palette, Inter / Inter Display and the Route 3 logo are fixed; WCAG 2.2 AA; 320 px reflow; low data.

Memorable moment: the swap + cash offer written out as a worked sum, with the answer underlined and the payer sentence below it.

## Direction contract

THESIS: Every trade is written out like a neat exercise-book sum: the items and the cash in the working, the answer double-underlined, and a tick only when both sides check out. It refuses the classifieds photo-wall where price is the only fact and terms live in DMs.

OWN-WORLD: Cloud page and white cards in Ink type, laid on a strict 24px ruled baseline rhythm. A thin Teal margin rule (the exercise book's red margin, translated to brand) separates each item's photo from its facts and runs down offer and transaction timelines. Totals sit under a double rule; ticks mark completed steps. Gold appears only for real urgency (Quick Sell) and as a deadline bar whose length is the real time left. Tabular numerals align every ₦ amount.

STORY: The visitor sees real nearby items with condition beside the price, understands that they can add their own item and cash, sees exactly who pays whom, and makes a structured offer instead of a DM.

FIRST VIEWPORT: Explore at 390 px: a 56px white header (logo, area pill); "Find your next thing." at 26/32; a 48px search; For sale / Open to swap / Quick Sell chips; one worked swap + cash sum card (margin rule, + and = operators, double-ruled total, Teal payer sentence); then horizontal listing rows (112px photo, Teal margin rule, title, condition and defect line, tabular price and mode tag). Bottom nav: Explore · Feed · List + · Offers · Profile, with List as the Teal action.

FORM: The Exercise Book, position 6 of 7 on the grounded list (assigned by the roll; raised by Exposure Record deltas, Labanotation duration bars, Convention Catalogue whole-card repack and seen marks, Transit Map single-corridor progress, Crouwel tabular grid). seed:b02862ec5b57c896

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction and motion grammar

- Signature: the worked sum (OfferSum). Lines write in one by one (opacity plus 8px rise, 200ms, 40ms apart) the first time a sum appears, and a changed amount in a counteroffer flashes a Mint highlight and shows its delta (+₦50,000).
- Ticks draw with an SVG path-length stroke (320ms) when a step genuinely completes; nothing ticks optimistically.
- Press: 0.98 scale, 120ms. Sheets: spring slide-up with drag-to-dismiss. Images fade in over 200ms.
- Reduced motion: every animation becomes an instant state change.

## Unresolved

- Launch city and areas; final categories (mock until confirmed).
