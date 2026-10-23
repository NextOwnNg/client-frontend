import { ArrowLeftRight, Banknote, Check, Gamepad2, Laptop, Refrigerator, Search, Shapes, Smartphone, Timer, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { OfferSum } from '@/components/domain/OfferSum'
import { payerSentence } from '@/components/domain/payer-sentence'
import { ButtonLink } from '@/components/ui/Button'
import { copy } from '@/lib/copy/copy'
import type { Category } from '@/types/api'

/** Search that hands off to Explore. Suggestions live on Explore, keeping Home's first load light. */
export function HomeSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState('')

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        const q = text.trim()
        navigate(q ? `/explore?${new URLSearchParams({ q })}` : '/explore')
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label="Search items"
        enterKeyHint="search"
        placeholder="Search phones, laptops…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="field-input pl-12"
      />
    </form>
  )
}

const tradeRoutes: { label: string; hint: string; href: string; icon: LucideIcon; iconClass: string }[] = [
  { label: 'For sale', hint: 'Pay cash', href: '/explore?mode=cash', icon: Banknote, iconClass: 'text-action' },
  { label: 'Open to swap', hint: 'Trade, add cash', href: '/explore?mode=swap', icon: ArrowLeftRight, iconClass: 'text-action' },
  { label: 'Quick Sell', hint: 'Real deadlines', href: '/explore?mode=quick-sell', icon: Timer, iconClass: 'text-warning' },
]

/** The three ways to trade (Sell / Swap / Quick Sell), each a filtered Explore. */
export function TradeRoutes() {
  return (
    <nav aria-label="Ways to trade" className="flex flex-wrap gap-2 tablet:grid tablet:grid-cols-3">
      {tradeRoutes.map(({ label, hint, href, icon: Icon, iconClass }) => (
        <Link
          key={label}
          to={href}
          className="flex min-h-11 flex-col justify-center gap-0.5 rounded-full border border-border bg-surface px-4 py-2 outline-none tablet:rounded-control tablet:px-3 tablet:py-2.5 transition-[border-color,transform] duration-120 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-focus pointer-fine:hover:border-action/50"
        >
          <span className="flex items-center gap-1.5 text-compact font-semibold text-ink">
            <Icon aria-hidden className={`size-4 shrink-0 ${iconClass}`} />
            <span className="whitespace-nowrap">{label}</span>
          </span>
          {/* The hint needs the card width from 768px; phones get compact chips */}
          <span className="truncate text-caption text-muted max-tablet:hidden">{hint}</span>
        </Link>
      ))}
    </nav>
  )
}

/** The signature, shown once as a worked example so a first-time visitor sees how a mixed trade reads. */
export function ExampleSum() {
  return (
    <figure className="flex flex-col gap-2">
      <OfferSum
        heading="Example: a swap with cash added"
        give={[
          { kind: 'item', title: 'Your iPhone 11 · 64GB' },
          { kind: 'cash', title: 'Cash from you', kobo: 120_000_00 },
        ]}
        receive={{ title: 'MacBook Air M1, 2020' }}
        sentence={payerSentence({ viewer: 'offerer', direction: 'OFFERER_PAYS_OWNER', kobo: 120_000_00 })}
        animateIn
        className="shadow-card"
      />
      <figcaption className="px-1 text-caption text-muted">Every offer is written out like this, so both people see who gives what.</figcaption>
    </figure>
  )
}

export function HeroActions() {
  return (
    <div className="grid grid-cols-2 gap-3 tablet:flex">
      <ButtonLink to="/explore" className="w-full tablet:w-auto">
        Explore items
      </ButtonLink>
      <ButtonLink to="/listings/new" variant="secondary" className="w-full tablet:w-auto">
        List an item
      </ButtonLink>
    </div>
  )
}

const categoryIcons: Record<string, LucideIcon> = { phones: Smartphone, laptops: Laptop, gaming: Gamepad2, home: Refrigerator }

export function CategoryShortcuts({ categories }: { categories: Category[] }) {
  return (
    <nav aria-label="Browse by category" className="flex flex-col gap-3">
      <h2 className="text-h3 text-ink tablet:text-h2">Browse by category</h2>
      <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-4 tablet:gap-3">
        {categories.map((c) => {
          const Icon = categoryIcons[c.id] ?? Shapes
          return (
            <li key={c.id}>
              <Link
                to={`/explore?category=${encodeURIComponent(c.id)}`}
                className="flex min-h-14 items-center gap-3 rounded-control border border-border bg-surface px-3 text-compact font-semibold text-ink outline-none transition-[border-color,transform] duration-120 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-focus pointer-fine:hover:border-action/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint text-action">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="min-w-0">{c.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const steps = [
  { title: 'Find or list an item', body: 'Every listing shows its condition and any defects, with real photos.' },
  { title: 'Make a structured offer', body: 'Offer cash, your own item, or your item plus cash. Each offer says who pays whom.' },
  { title: 'Meet, inspect, confirm', body: 'Inspect in person and pay directly. The trade completes when you both confirm.' },
]

/** Three steps on the margin rule, each ticked: how a trade moves from listing to confirmation. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="flex flex-col gap-4 rounded-card bg-surface p-5 ring-1 ring-border tablet:p-8">
      <h2 id="how-heading" className="text-h3 text-ink tablet:text-h2">
        How a trade works
      </h2>
      <ol className="relative flex flex-col gap-5 tablet:grid tablet:grid-cols-3 tablet:gap-8">
        {steps.map((step) => (
          <li key={step.title} className="relative flex gap-3 tablet:flex-col">
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-body font-semibold text-ink">{step.title}</h3>
              <p className="text-compact text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-border pt-4 text-compact text-muted">{copy.handoverCaution}</p>
    </section>
  )
}
