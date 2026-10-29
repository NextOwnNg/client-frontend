---
name: NextOwn
description: A person-to-person marketplace where every trade is written out like a neat exercise-book sum.
colors:
  ink: "#142d32"
  exchange-teal: "#0b6159"
  teal-hover: "#084b46"
  warm-gold: "#f9bb55"
  cloud: "#f7f9f7"
  paper: "#ffffff"
  mint-mist: "#e8f4ef"
  slate: "#486067"
  border: "#d6e2de"
  success: "#147d52"
  warning: "#9a5900"
  danger: "#b42318"
  info: "#2453a6"
typography:
  display:
    fontFamily: "Inter Variable, Inter Display, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: "3rem"
  h1:
    fontFamily: "Inter Variable, Inter Display, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: "2.5rem"
  h2:
    fontFamily: "Inter Variable, Inter Display, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: "2.125rem"
  h3:
    fontFamily: "Inter Variable, Inter Display, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  compact:
    fontFamily: "Inter Variable, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.3125rem"
  caption:
    fontFamily: "Inter Variable, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1.125rem"
  price:
    fontFamily: "Inter Variable, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "1.875rem"
  price-sm:
    fontFamily: "Inter Variable, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: "1.5rem"
    fontFeature: "tnum"
  button:
    fontFamily: "Inter Variable, Inter, system-ui, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
rounded:
  sm: "8px"
  control: "12px"
  card: "16px"
  feature: "24px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  control: "48px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.exchange-teal}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
  button-primary-sm:
    height: "44px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.exchange-teal}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.mint-mist}"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.exchange-teal}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "48px"
  button-tertiary-hover:
    backgroundColor: "{colors.mint-mist}"
  field-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  field-input-disabled:
    backgroundColor: "{colors.cloud}"
    textColor: "{colors.slate}"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
  listing-row:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    height: "120px"
  offer-sum:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 16px 12px 28px"
  progress-line:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  status-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  status-badge-info:
    backgroundColor: "{colors.mint-mist}"
    textColor: "{colors.exchange-teal}"
  status-badge-highlight:
    backgroundColor: "{colors.warm-gold}"
    textColor: "{colors.ink}"
  status-badge-neutral:
    backgroundColor: "{colors.cloud}"
    textColor: "{colors.slate}"
  banner:
    rounded: "{rounded.control}"
    padding: "16px"
  bottom-nav:
    backgroundColor: "{colors.paper}"
    height: "64px"
  header:
    backgroundColor: "{colors.paper}"
    height: "56px"
---

# Design System: NextOwn

## Overview

**Creative North Star: "The Exercise Book"**

Every trade is written out like a neat exercise-book sum: the items and the cash in the working, the answer under a double rule, and a tick only when both sides check out. The page is a Cloud sheet with white cards laid on it, set in Ink on a 24px ruled rhythm. A thin Exchange Teal margin rule, the exercise book's red margin translated into the brand, runs down the left of every worked sum, separates each listing's photo from its facts, and becomes the single corridor of a transaction timeline.

The system is calm, light and factual. Item photographs carry attention; the interface around them is quiet Ink and Slate type, hairline Border outlines and one Teal voice for action. Warm Gold is rationed: it appears only for real urgency (Quick Sell) and as a deadline bar whose length is the true share of time left. Money is always set in tabular figures so amounts compare at a glance. The pilot ships a light theme only.

HeroUI v3 provides the component primitives and is themed entirely through CSS variables in `src/styles/tokens.css`; its `accent` is Exchange Teal. All brand tokens are `--nx-*` custom properties mapped to Tailwind theme names in `src/styles/theme.css`; components never use raw hex.

**Key Characteristics:**
- Cloud page, white cards, Ink type, one Teal action voice.
- A 2px Teal margin rule as the recurring structural mark.
- Totals under a 3px double rule; ticks only for completed steps.
- Gold only for real urgency and its deadline bar.
- Tabular numerals on every ₦ amount.
- 48px controls, 44px minimum targets, status always text plus icon.

## Colors

A restrained, high-confidence palette: Ink foundation, one Teal action colour, light open surfaces and one rationed Gold accent.

### Primary
- **Exchange Teal** (#0b6159): primary actions, links, focus ring, the margin rule, the payer sentence, active navigation, selected states and ticks. White text on it reaches 7.32:1. Exposed as Tailwind `action` and as HeroUI `accent`, `focus` and `link`.
- **Teal Hover** (#084b46): hovered and pressed primary buttons only (`action-hover`, HeroUI `accent-hover`).

### Secondary
- **Warm Gold** (#f9bb55): Quick Sell urgency tag and the deadline bar. Always with Ink text (8.45:1), never white. Exposed only as Tailwind `highlight` so it never leaks into HeroUI's interactive or status styles.

### Neutral
- **Ink** (#142d32): primary text, headings, the double rule under totals (`text-ink`, HeroUI `foreground`).
- **Slate** (#486067): secondary copy, hints, placeholders, operators in the sum (`text-muted`, HeroUI `muted`).
- **Cloud** (#f7f9f7): page background, disabled fields, neutral badges and quiet explainer panels.
- **Paper** (#ffffff): cards, header, bottom nav, sheets, fields (HeroUI `surface`, `overlay`, `field-background`).
- **Mint Mist** (#e8f4ef): info surfaces, hover fill for secondary and tertiary actions, "Swap ok" and delta chips, image placeholders (`bg-mint`, HeroUI `default` and `surface-secondary`).
- **Border** (#d6e2de): card outlines, dividers, input outlines, the undone part of a timeline. Never text.

### Semantic
- **Success** (#147d52), **Warning** (#9a5900), **Danger** (#b42318), **Info** (#2453a6): status tones. Badges and banners use a 10% tint of the tone as background with the tone (badge) or Ink (banner) as text, and always carry an icon and a status word.

### Named Rules
**The One Voice Rule.** Exchange Teal is the only interactive colour. If something is clickable or selected, it speaks in Teal; nothing decorative does.

**The Real Urgency Rule.** Warm Gold appears only when there is a real deadline (Quick Sell). It never decorates, never marks a primary action, and always carries Ink text.

**The Word and Icon Rule.** Status is never colour alone. Every status shows a word and a Lucide icon via the status badge; copy and icons come from `src/lib/copy/status.ts`.

## Typography

**Display Font:** Inter Variable with optical sizing (renders as Inter Display at large sizes), fallback Inter, system-ui, Segoe UI, sans-serif
**Body Font:** Inter Variable, same fallbacks

**Character:** One family doing two jobs. Optical sizing tightens headings into Inter Display while body and controls stay in text Inter, so the voice is plain, legible and consistent across widths. Inter is self-hosted (`@fontsource-variable/inter/opsz.css`).

### Hierarchy
- **Display** (700, 40/48px): the desktop home hero only.
- **H1** (700, 32/40px, 36/44px from 1024px): page titles from tablet width (768px) up.
- **H2** (700, 26/34px): section headings, and page titles on phones.
- **H3** (600, 18/24px on phones, 21/28px from 768px): card and sub-section headings, sheet and dialog titles, and large swap-only price text. The H1 and H3 steps live in the token variables (`--nx-text-h1`, `--nx-text-h3`), so no page adds breakpoints for them.
- **Body** (400, 16/24px): default copy, field text at every breakpoint (prevents iOS zoom), listing titles at 600.
- **Compact** (400 to 600, 14/21px): secondary facts such as condition and defect lines, desktop nav links, banner detail.
- **Caption** (500, 12/18px): badges, bottom-nav labels, the worked-sum heading, timestamps.
- **Price** (700, 24/30px, tabular figures): prominent asking prices on detail views.
- **Price small** (700, 18/24px, tabular figures, `text-price-sm`): prices in listing rows and tiles, sitting on the 24px ruling.
- **Button** (600, 16/24px): all button labels.

### Named Rules
**The Tabular Money Rule.** Every ₦ amount, ID and time uses tabular figures (`.tabular`), so ₦300,000 and ₦350,000 line up and compare precisely.

**The Responsive Page Title Rule.** Every screen's `h1` steps down on phones: `text-h2 tablet:text-h1` (26px under 768px, 32px from 768px). The home hero adds `desktop:text-display` (40px). Never set a page title as a fixed `text-h1` at every width. Body, compact and caption sizes stay fixed (16/14/12px in rem, so they follow the phone's text-size setting). Check titles at 320 and 390px before handing a screen over.

**The 24px Ruling Rule.** Text sits on a 24px line: body line height, sum lines, fact lines in listing rows (compact text set to a 24px line) and timeline step spacing all step in 24px.

## Layout

Mobile first on a 24px ruled rhythm. Breakpoints: tablet 768px, desktop 1024px, wide 1440px (Tailwind defaults stay alongside because HeroUI uses them). Content is capped at 1200px (`max-w-content`) and centred.

- **Side margins:** 16px on phones, 24px from tablet.
- **Shell:** a sticky 56px white header (64px on desktop) with logo, area pill, messages and notifications. Under 1024px a fixed 64px bottom nav carries Explore, Feed, List, Offers, Profile; from 1024px it is replaced by inline header links and a primary "List an item" button.
- **Listings:** horizontal listing rows on phones; listing tiles in a 2, 3 (tablet) and 4 (desktop) column grid with 12 to 16px gaps (as shown in the component gallery; no production listing page ships yet).
- **Spacing:** the Brand Kit scale 4, 8, 12, 16, 24, 32, 48, 64px, using Tailwind's 4px step utilities.
- **Narrow phones:** the build is stress-tested at 320px. Below 380px the logo collapses to the mark and the listing-row photo narrows from 112px to 96px so prices never clip.

## Elevation & Depth

Mostly flat, with outlines doing the separating. Cards rest on the Cloud page with a 1px Border outline and no shadow; a shadow appears as a response to state (tile hover on fine pointers) or to mark something floating.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 2px 12px rgba(20, 45, 50, 0.06)`): hovered listing tiles, the raised List button in the bottom nav, badges floated over photos.
- **Overlay** (`box-shadow: 0 14px 36px rgba(20, 45, 50, 0.18)`): modals, sheets and popovers (HeroUI `overlay-shadow`).

The header and bottom nav are 95% white with a small backdrop blur, divided from content by a 1px Border line. Modal backdrop is Ink at 50%.

### Named Rules
**The Outline-First Rule.** Cards at rest have a 1px Border and no shadow. Do not stack shadows on nested elements.

## Shapes

Soft, consistent rounding on four steps: 8px small (`rounded-small`: checkboxes, thumbnails), 12px controls (buttons, fields, banners, radio cards, nav links), 16px cards (cards, listing rows and tiles, worked sums, centred modals), 24px feature surfaces (bottom-sheet top corners). Pills (full radius) for badges, chips, icon buttons and the margin rule's rounded ends.

The recurring line forms are the system's geometry: a 2px rounded Teal margin rule set 12px in from the top and bottom of its container, a 3px double Ink rule above totals, and 24px circular step markers on a 2px corridor line.

## Components

### Buttons
Confident and plain: one height, one radius, one weight.
- **Shape:** gently curved (12px).
- **Primary:** Exchange Teal fill, white 16px semibold label, 48px tall, 24px side padding. For Offer, List, Confirm.
- **Hover / Focus:** fills to Teal Hover over 120ms; a 2px Teal focus outline at 2px offset on `:focus-visible`.
- **Secondary:** white surface, 1px Teal border, Teal label; fills Mint Mist on hover and press. For Counter, Save, Review terms.
- **Tertiary:** a Teal text action with 12px side padding and a Mint Mist hover fill.
- **Small:** 44px tall with 16px padding (still meets the 44px target). Icon-only buttons are 48px or 44px squares.
- Router links styled as buttons use `ButtonLink`, which reuses HeroUI's button variants.

### Chips
- **Style:** full-pill, 24px tall, 12px semibold caption text, 8px side padding.
- **Swap ok / delta:** Mint Mist with Teal (or Ink) text.
- **Quick Sell:** an opaque Gold tint (`bg-highlight-tint`, Gold 32% on white) with a Gold ring, Ink text and a timer icon, so it stays solid over photos; becomes a neutral Cloud chip with a Border ring once ended.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Paper on the Cloud page. Cloud for quiet explainers inside a Paper card only: a quiet box sitting directly on the Cloud page uses Paper with a 1px Border, or it disappears.
- **Shadow Strategy:** none at rest; see Elevation.
- **Border:** 1px Border; listing cards shift to 40% Teal on fine-pointer hover.
- **Press:** listing cards scale to 0.98 on press.

### Inputs / Fields
- **Style:** white, 1px Border, 12px radius, 48px tall, 16px side padding, 16px Ink text, Slate placeholder, Teal caret. One shared field style for text, money (₦ prefix) and phone (+234 prefix) fields.
- **Hover:** border darkens slightly toward Slate.
- **Focus:** border turns Teal with a 3px Teal ring at 22% opacity.
- **Error:** Danger border (and Danger ring on focus) with an explicit, programmatically associated message.
- **Disabled:** Cloud fill, Slate text, not-allowed cursor.
- **Radio cards:** 12px-radius option cards; selected adds a Teal border, a 1px inner Teal ring and a half-strength Mint fill.

### Navigation
- **Bottom nav (under 1024px):** five equal columns, 24px outline icons with caption labels in Slate. Active turns Teal, goes semibold, thickens the icon stroke and gains a 2px Teal bar at the top that slides between items with a spring. List is a filled 36px Teal square with a card shadow.
- **Header (desktop):** compact medium links with 12px radius and Mint hover; the active link is Teal.
- **Icons:** Lucide outline icons at roughly 1.75px stroke, 20 to 24px.

### Feedback
- **Banner:** persistent inline message, 12px radius, 16px padding, tinted by tone with a coloured icon and Ink title. Critical transaction errors use a banner, never an auto-dismissing toast.
- **Sheets:** centred 16px modal on desktop, bottom drawer with 24px top corners on phones (max 88% of viewport height).
- **Skeletons:** match the real card shapes, with Mint image blocks and Cloud text bars.

### Worked Sum (signature)
The trade written out as a sum on a white 16px card. A 2px Teal margin rule runs down the left inside the card. A caption heading in Slate names the card. Give lines sit on 24px lines with `+` operators in Slate. Cash amounts are semibold and item lines are marked "item". A 3px double Ink rule sits above the `=` result line, which is bold. The payer sentence ("You pay ₦120,000 directly at the exchange.") follows in compact semibold Teal. A counteroffer can add a Mint delta chip ("+₦50,000 more than version 1"). On first appearance the lines write in one by one (200ms each, 40ms stagger).

### Progress Line (signature)
A single vertical corridor for transaction steps. A 2px line connects 24px circular markers, Teal for completed segments and Border for the rest. Done steps fill Teal and draw their white tick over 320ms. The current step is a Teal-ringed circle with a Teal dot and a semibold label. Todo steps are Border-ringed with Slate labels. Steps are spaced on the 24px rhythm. Nothing ticks until the server confirms the step is done.

### Listing Row and Listing Tile (signature)
- **Row (phones):** a 120px-tall horizontal card with a 112px photo (96px under 380px). A 2px Teal margin rule sits as an internal divider between photo and facts. Facts are a semibold title, then condition and defect line in compact Slate, then a tabular price with a Swap ok or Quick Sell chip.
- **Tile (tablet and up):** photo on top, the same margin rule down the left of the facts block.
- **Unavailable:** listings stay visible with a dimmed, partly desaturated photo and a status badge in place of the price.

### Deadline
Quick Sell time left. Compact form is the Gold chip. Detail form adds an Ink label with a warning-tone timer icon, the WAT end time in tabular caption, and a 4px Mint track whose Gold fill length is the real share of time remaining. It never animates or ticks by the second.

### Avatar
A 40px (or 64px on profiles) circle. It shows the person's photo cropped to cover, or their initials in bold Teal on Mint when there's no photo or it fails to load. It's decorative: the name always sits beside it.

### Help and policy pages
Read mode, through one layout (`PolicyPage`): the title, a lead line in Slate, and a Gold-tint draft note for texts awaiting legal sign-off. An "On this page" list wraps above the text on phones and sits in a sticky 14rem column from 1024px. Sections are H3-sized `h2`s with body text at a 65ch measure, disc lists with Teal markers, and numbered steps in Mint circles where order matters. Anchors land below the sticky header. The content lives in typed data files (`features/help/content`), never in the layout.

### Report, block and appeal
- **Report:** what's being reported comes first, in a Paper box, before anything is asked. The danger guidance banner comes first in the form, and the support limit is stated before sending. The confirmation is a calm Paper card with an inbox icon and the case reference. No ticks and no celebration.
- **Block:** a confirmation that states the effect on both people and that they aren't told. Unblock is immediate and uses an undo arrow, never a person-with-tick icon.
- **Case status:** a status badge plus one line saying what the status means. Never moderator notes.

### Motion
Motion values come from `src/lib/motion/presets.ts`: fast 120ms, standard 200ms, slow 320ms, all on ease-out `cubic-bezier(0.16, 1, 0.3, 1)`. There are springs for sheets and press feedback; fade-rise entrances; 16px step slides in the direction of travel; and a 0.98 press scale.

First-load motion is CSS, so it stays smooth while a page loads and keeps Framer Motion out of the entry chunk: the bottom-nav bar slides with a transform transition, the offline banner drops in (`animate-drop`), the route progress bar grows after a 150ms wait (`animate-route-progress`), and the worked sum writes in line by line (`animate-rise`, 40ms apart). A listing's cover photo morphs from card to detail with a View Transition (240ms). Framer Motion is reserved for interactive motion (springs, drag, path drawing) and is scoped with `MotionProvider` (`MotionConfig reducedMotion="user"` + `LazyMotion`). A global reduced-motion rule collapses CSS transitions, animations and view transitions.

## Do's and Don'ts

### Do:
- **Do** use the Tailwind theme names (`text-ink`, `text-muted`, `bg-action`, `bg-highlight`, `bg-mint`, `rounded-control`, `rounded-card`, `rounded-feature`, `shadow-card`, `shadow-overlay`, `text-display` through `text-price` and `text-price-sm`, `rounded-small`, `bg-highlight-tint`, `tablet:`/`desktop:`/`wide:`, `max-w-content`); never raw hex in components.
- **Do** run the 2px Teal margin rule through worked sums, listing facts and timelines; it is the system's structural mark.
- **Do** put every total under the 3px double Ink rule, and tick a step only when the server confirms it.
- **Do** set every ₦ amount in tabular figures.
- **Do** give every page title the responsive classes (`text-h2 tablet:text-h1`), so headings scale down on phones.
- **Do** keep primary controls and fields at 48px and every target at 44px or more.
- **Do** pair every status colour with a word and an icon through the status badge.
- **Do** take durations and easings from the motion presets, and respect reduced motion.

### Don't:
- **Don't** use Warm Gold for anything but real urgency, and never put white text on it.
- **Don't** map Gold into HeroUI's accent, status or interactive variables.
- **Don't** use Teal decoratively; it means action, selection or the margin rule.
- **Don't** communicate status or clickability by colour alone.
- **Don't** use Border as a text colour.
- **Don't** add shadows to cards at rest or to nested elements.
- **Don't** add a dark theme; the pilot is light only.
- **Don't** use auto-dismissing toasts for critical transaction errors; use a persistent banner.
- **Don't** put shield or check-badge icons next to people or payments (PRD §10.2), including for Unblock.
- **Don't** put a colored left border on callouts or boxes; the 2px Teal rule belongs only to sums, listing facts and timelines.
- **Don't** end a sentence straight after a name that ends in an initial ("Chidi O."): add the full stop only when the name doesn't already have one.
