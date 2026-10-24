import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { Footer, OfflineBanner, RouteProgress } from '@/components/layout/ShellParts'

const ToastRegion = lazy(() => import('@/components/layout/ToastRegion').then((m) => ({ default: m.ToastRegion })))

const DevToolbar = import.meta.env.DEV
  ? lazy(() => import('@/components/layout/DevToolbar').then((m) => ({ default: m.DevToolbar })))
  : null

/** The member app shell: sticky header, content, footer, and the bottom nav under 1024px. */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
      >
        Skip to content
      </a>
      <RouteProgress />
      <Header />
      <OfflineBanner />

      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 pt-4 pb-8 tablet:px-6 desktop:pt-8">
        <Outlet />
      </main>

      <div className="pb-[calc(64px+env(safe-area-inset-bottom))] desktop:pb-0">
        <Footer />
      </div>
      <BottomNav />
      <Suspense fallback={null}>
        <ToastRegion />
      </Suspense>
      {DevToolbar && (
        <Suspense fallback={null}>
          <DevToolbar />
        </Suspense>
      )}
    </div>
  )
}
