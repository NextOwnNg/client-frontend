import { matchPath, NavLink, useLocation } from 'react-router'
import { mainNavItems } from '@/components/layout/nav-items'
import { cx } from '@/lib/cx'

/** Thumb-reachable navigation under 1024px. List is the one Teal action; the active item gets a sliding bar. */
export function BottomNav() {
  const { pathname } = useLocation()
  const active = mainNavItems.findIndex((item) => matchPath({ path: item.to, end: item.end ?? false }, pathname))
  // List is the Teal button and carries its own emphasis; no bar under it
  const showBar = active >= 0 && mainNavItems[active]?.label !== 'List'

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm desktop:hidden"
    >
      <ul className="relative mx-auto grid h-16 max-w-xl grid-cols-5">
        {/* One bar that slides between items (CSS transform, so it stays smooth while a page loads) */}
        <li
          aria-hidden
          className={cx(
            'pointer-events-none absolute top-0 left-0 flex w-1/5 justify-center transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
            showBar ? 'opacity-100' : 'opacity-0',
          )}
          style={{ transform: `translateX(${Math.max(active, 0) * 100}%)` }}
        >
          <span className="h-0.5 w-8 rounded-full bg-action" />
        </li>
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
