import { Bell, MessageCircle, Search } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { AreaPicker } from '@/components/layout/AreaPicker'
import { ButtonLink } from '@/components/ui/Button'
import { cx } from '@/lib/cx'

function IconLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Bell }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-120 ease-out active:scale-95 pointer-fine:hover:bg-mint"
    >
      <Icon aria-hidden className="size-5.5" strokeWidth={1.75} />
    </Link>
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
          <LogoMark size={28} label="" className="min-[380px]:hidden" />
          <Logo height={22} className="hidden min-[380px]:block desktop:hidden" />
          <Logo height={26} className="hidden desktop:block" />
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
          <IconLink to="/messages" label="Messages" icon={MessageCircle} />
          <IconLink to="/notifications" label="Notifications" icon={Bell} />
          <ButtonLink to="/listings/new" variant="primary" className="ml-2 hidden desktop:inline-flex">
            List an item
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
