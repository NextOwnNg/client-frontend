import { Bell, MessageCircle, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { AreaPicker } from '@/components/layout/AreaPicker'
import { ButtonLink } from '@/components/ui/Button'
import { useNotificationCounts } from '@/features/notifications/api'
import { loginPath } from '@/lib/auth/next'
import { cx } from '@/lib/cx'
import { useSessionStore } from '@/stores/session'

function IconLink({
  to,
  label,
  icon: Icon,
  count = 0,
}: {
  to: string
  label: string
  icon: typeof Bell
  count?: number
}) {
  return (
    <Link
      to={to}
      aria-label={count > 0 ? `${label}, ${count} unread` : label}
      className="relative flex size-11 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-120 ease-out active:scale-95 pointer-fine:hover:bg-mint"
    >
      <Icon aria-hidden className="size-5.5" strokeWidth={1.75} />
      {count > 0 && (
        <span
          aria-hidden
          className="tabular absolute top-1 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-action px-1 text-[0.6875rem] leading-none font-bold text-action-foreground ring-2 ring-surface"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

/** Members get their inboxes and profile; guests get one way in, which brings them back to this page. */
function SessionLinks() {
  const status = useSessionStore((s) => s.status)
  const { pathname, search } = useLocation()
  const { data: counts } = useNotificationCounts()

  // Nothing until the session check answers, so the header doesn't flash "Sign in" at a member
  if (status === 'unknown') return null
  if (status === 'guest') {
    return (
      <Link
        to={loginPath(pathname + search)}
        className="ml-1 inline-flex min-h-11 shrink-0 items-center rounded-control px-3 text-compact font-semibold text-action transition-colors duration-120 pointer-fine:hover:bg-mint"
      >
        Sign in
      </Link>
    )
  }
  return (
    <>
      <IconLink to="/messages" label="Messages" icon={MessageCircle} count={counts?.messages} />
      <IconLink to="/notifications" label="Notifications" icon={Bell} count={counts?.notifications} />
      {/* Phones reach the profile from the bottom nav */}
      <span className="hidden desktop:contents">
        <IconLink to="/me" label="Your profile" icon={UserRound} />
      </span>
    </>
  )
}

const desktopLinks = [
  { to: '/explore', label: 'Explore' },
  { to: '/feed', label: 'Feed' },
  { to: '/how-it-works', label: 'How it works' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-content items-center gap-3 px-4 tablet:px-6 desktop:h-16">
        <Link to="/" aria-label="NextOwn home" className="-ml-1 shrink-0 rounded-control p-1">
          {/* Full lockup from 380px (brand minimum 92px wide); the mark alone on the narrowest phones */}
          <LogoMark size={32} label="" className="min-[380px]:hidden" />
          <Logo height={26} className="hidden min-[380px]:block desktop:hidden" />
          <Logo height={32} className="hidden desktop:block" />
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 desktop:flex">
          {desktopLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cx(
                  'rounded-control px-3 py-2 text-compact font-medium transition-colors duration-120',
                  isActive ? 'text-action' : 'text-ink pointer-fine:hover:bg-mint',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-0.5 desktop:gap-2">
          <AreaPicker />
          <Link
            to="/explore"
            aria-label="Search"
            className="hidden size-11 items-center justify-center rounded-full text-ink desktop:flex pointer-fine:hover:bg-mint"
          >
            <Search aria-hidden className="size-5.5" strokeWidth={1.75} />
          </Link>
          <SessionLinks />
          <ButtonLink to="/listings/new" variant="primary" className="ml-2 hidden desktop:inline-flex">
            List an item
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
