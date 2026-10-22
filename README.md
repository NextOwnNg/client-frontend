# NextOwn client frontend

The user-facing web app for NextOwn, a person-to-person marketplace for selling, swapping and item-plus-cash exchanges in Nigeria. The staff admin console lives in a separate repository.

- Product and engineering requirements: [docs/prd.md](docs/prd.md)
- Visual source of truth: [docs/NextOwn Brand Kit and Design System.md](docs/NextOwn%20Brand%20Kit%20and%20Design%20System.md)

## Stack

React 19 · Vite · TypeScript · React Router · TanStack Query · Axios · Zustand · React Hook Form + Zod · HeroUI v3 · Tailwind CSS v4 · Lucide · React Helmet (async) · Vitest + Testing Library + MSW · oxlint

## Getting started

```bash
cp .env.example .env.local   # set VITE_API_BASE_URL
npm install
npm run dev                  # http://localhost:5173
```

| Script | What it does |
| :---- | :---- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | oxlint |
| `npm test` / `npm run test:run` | Vitest in watch mode / once |

## Design tokens

Tokens implement Brand Kit v0.9 and live in `src/styles/`:

| File | Purpose |
| :---- | :---- |
| `tokens.css` | Brand values as CSS variables (`--nx-*`) and their mapping onto HeroUI's theme variables |
| `theme.css` | Tailwind theme names built on those variables |
| `heroui-overrides.css` | Brand rules on HeroUI components (48px controls, 12px radius, button variants) |
| `index.css` | Entry: Inter font, Tailwind + HeroUI, tokens, base styles |

Use the semantic class names, never raw hex:

| Need | Classes |
| :---- | :---- |
| Text | `text-ink`, `text-muted` |
| Primary action | `bg-action text-action-foreground hover:bg-action-hover` (or HeroUI `variant="primary"`) |
| Surfaces | `bg-background` (Cloud), `bg-surface` (Paper), `bg-mint` |
| Highlight (Quick Sell, delight) | `bg-highlight text-highlight-foreground`. Ink text only |
| Status | `text-success`, `text-warning`, `text-danger`, `text-info` (always with a label and icon) |
| Lines | `border-border` |
| Type scale | `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-compact`, `text-caption`, `text-price` |
| Shape | `rounded-control` (12), `rounded-card` (16), `rounded-feature` (24), `shadow-card`, `shadow-overlay` |
| Layout | `max-w-content` (1200px), breakpoints `tablet:` (768), `desktop:` (1024), `wide:` (1440) |
| Numbers | `tabular` for prices, IDs and times |

HeroUI's `accent` colour is Exchange Teal, its primary interactive colour. Warm Gold is called `highlight` so it never leaks into interactive or status styles.

In development, open **`/dev/tokens`** to see every token rendered. The route is excluded from production builds.

Brand changes start with a Brand Kit version bump and must also be applied to the admin-frontend repository (Brand §9.1).

## Logo and icons

The approved Route 3 logo: two overlapping rounded squares, one possession becoming the next.

| Asset | Where | Use |
| :---- | :---- | :---- |
| `<Logo />` | `src/components/brand/Logo.tsx` | Lockup in the app. `variant="primary"` on light surfaces, `"reverse"` on Ink/Teal, `"mono"` for one-colour use. Height ≥ 20px mobile, ≥ 24px desktop |
| `<LogoMark />` | same file | Mark only, for tight spaces. Pass `label=""` when it sits next to visible "NextOwn" text |
| `nextown-lockup-primary.svg`, `nextown-lockup-mono.svg` | `public/brand/` | Original files as supplied (wordmark is live text in Inter Display) |
| `*-outlined.svg` | `public/brand/` | Same lockups with the wordmark converted to outlines. Use these anywhere outside the app (email, docs, partners), where Inter Display may not be installed |
| `nextown-appicon.svg` | `public/brand/`, also `public/favicon.svg` | App icon / favicon (reverse mark on Ink) |
| `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | `public/` | Raster icons for browsers, iOS home screen and the web manifest |
| `og-default.png` | `public/brand/` | 1200 × 630 default link preview |

Do not stretch, recolour outside these variants, add effects, or place the mark where it could read as a verification badge (Brand §4).

## Project structure

```
src/
  app/          router, providers, query client, layouts
  pages/        thin route components (set <Seo> tags)
  features/     one folder per domain: api hooks, components, schemas   (added as features land)
  components/   shared UI: ui/ (HeroUI wrappers), domain/, layout/, seo/
  stores/       Zustand stores (UI and session view only; API data stays in TanStack Query)
  lib/          api (Axios client, ApiError), and later money, time, copy, analytics
  styles/       design tokens and global CSS
  test/         Vitest setup, MSW server and handlers, render helpers
```
