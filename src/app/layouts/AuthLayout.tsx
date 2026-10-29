import { lazy, Suspense } from 'react'
import { Link, Outlet, useMatches } from 'react-router'
import type { AuthHandle } from '@/app/layouts/auth-handle'
import { Logo } from '@/components/brand/Logo'
import { OfflineBanner, RouteProgress } from '@/components/layout/ShellParts'
import { AuthShowcase } from '@/features/account/components/AuthShowcase'
import { cx } from '@/lib/cx'

const ToastRegion = lazy(() => import('@/components/layout/ToastRegion').then((m) => ({ default: m.ToastRegion })))

const links = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/support', label: 'Safety and help' },
]

/**
 * Sign-in and first-time setup: one calm column without the app's navigation, so nothing competes with the task.
 * A centred panel from 768px (UX-09). Sign in and the code step add an example trade beside the form from 1024px,
 * and sign in shows a short version of it above the form on phones.
 */
export function AuthLayout() {
  const showcase = useMatches()
    .map((m) => (m.handle as AuthHandle | undefined)?.showcase)
    .findLast(Boolean)

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
      >
        Skip to content
      </a>
      <RouteProgress />
      <header className="mx-auto flex h-14 w-full max-w-content items-center gap-3 px-4 tablet:px-6 desktop:h-16">
        <Link to="/" aria-label="NextOwn home" className="-ml-1 rounded-control p-1">
          <Logo height={22} />
        </Link>
        <Link
          to="/explore"
          className="ml-auto inline-flex min-h-11 items-center rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 hover:text-ink"
        >
          Keep browsing
        </Link>
      </header>
      <OfflineBanner />

      <main
        id="main"
        className={cx(
          'mx-auto w-full flex-1 px-4 pt-4 pb-12 tablet:pt-10',
          showcase
            ? 'max-w-[30rem] desktop:grid desktop:max-w-content desktop:grid-cols-[minmax(0,1fr)_30rem] desktop:items-center desktop:gap-12 desktop:px-6'
            : 'max-w-[30rem]',
        )}
      >
        {/* The form comes first for screen readers and keyboards; the panel sits to its left on wide screens */}
        <div className="flex flex-col gap-4 desktop:col-start-2 desktop:row-start-1">
          {showcase === 'always' && <AuthShowcase variant="card" />}
          <div className="tablet:rounded-feature tablet:border tablet:border-border tablet:bg-surface tablet:p-8 tablet:shadow-card">
            <Outlet />
          </div>
        </div>
        {showcase && (
          <div className="desktop:col-start-1 desktop:row-start-1 desktop:self-stretch">
            <AuthShowcase variant="panel" />
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <nav aria-label="Policies" className="mx-auto flex max-w-content flex-wrap gap-x-5 px-4 py-4 tablet:px-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex min-h-11 items-center text-compact text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
      <Suspense fallback={null}>
        <ToastRegion />
      </Suspense>
    </div>
  )
}
