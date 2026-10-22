import { motion } from 'framer-motion'
import { NavLink } from 'react-router'
import { mainNavItems } from '@/components/layout/nav-items'
import { cx } from '@/lib/cx'
import { springs } from '@/lib/motion/presets'

/** Thumb-reachable navigation under 1024px. List is the one Teal action; the active item gets a sliding bar. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm desktop:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {mainNavItems.map((item) => (
          <li key={item.to} className="flex">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-caption font-medium whitespace-nowrap outline-none',
                  'transition-[color,transform] duration-120 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset',
                  isActive ? 'text-action' : 'text-muted',
                )
              }
            >
              {({ isActive }) =>
                item.label === 'List' ? (
                  <>
                    <span className="flex size-9 items-center justify-center rounded-control bg-action text-action-foreground shadow-card">
                      <item.icon aria-hidden className="size-5" strokeWidth={2.5} />
                    </span>
                    <span className={isActive ? 'font-semibold' : undefined}>{item.label}</span>
                  </>
                ) : (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="bottom-nav-indicator"
                        transition={springs.indicator}
                        aria-hidden
                        className="absolute top-0 h-0.5 w-8 rounded-full bg-action"
                      />
                    )}
                    <item.icon aria-hidden className="size-6" strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className={isActive ? 'font-semibold' : undefined}>{item.label}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
