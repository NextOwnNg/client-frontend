import { Link, Outlet } from 'react-router'
import { Logo } from '@/components/brand/Logo'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-content items-center px-4 tablet:px-6">
          <Link to="/" aria-label="NextOwn home" className="-m-2 rounded-control p-2">
            <Logo height={28} />
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-8 tablet:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-content flex-col gap-3 px-4 py-6 tablet:flex-row tablet:items-center tablet:justify-between tablet:px-6">
          <Logo height={24} />
          <p className="text-compact text-muted">Turn what you own into what you want.</p>
        </div>
      </footer>
    </div>
  )
}
