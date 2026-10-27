import { ArrowLeftRight, Banknote, Timer, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

const tradeRoutes: { label: string; hint: string; href: string; icon: LucideIcon; iconClass: string }[] = [
  { label: 'For sale', hint: 'Pay cash', href: '/explore?mode=cash', icon: Banknote, iconClass: 'text-action' },
  {
    label: 'Open to swap',
    hint: 'Trade, add cash',
    href: '/explore?mode=swap',
    icon: ArrowLeftRight,
    iconClass: 'text-action',
  },
  {
    label: 'Quick Sell',
    hint: 'Real deadlines',
    href: '/explore?mode=quick-sell',
    icon: Timer,
    iconClass: 'text-warning',
  },
]

/** The three ways to trade (Sell / Swap / Quick Sell), each a filtered Explore. */
export function TradeRoutes() {
  return (
    <nav aria-label="Ways to trade" className="flex flex-wrap gap-2 tablet:grid tablet:grid-cols-3">
      {tradeRoutes.map(({ label, hint, href, icon: Icon, iconClass }) => (
        <Link
          key={label}
          to={href}
          className="flex min-h-11 flex-col justify-center gap-0.5 rounded-full border border-border bg-surface px-4 py-2 transition-[border-color,transform] duration-120 ease-out outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.97] tablet:rounded-control tablet:px-3 tablet:py-2.5 pointer-fine:hover:border-action/50"
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
