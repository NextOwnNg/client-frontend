import { WifiOff } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, useNavigation } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { useOnline } from '@/hooks/useOnline'
import { copy } from '@/lib/copy/copy'

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="animate-drop border-b border-warning/20 bg-warning/10">
      <p className="mx-auto flex max-w-content items-start gap-2 px-4 py-2 text-compact text-ink tablet:px-6">
        <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
        {copy.offline}
      </p>
    </div>
  )
}

/** Thin Teal bar while a lazy route loads. Appears only after 150ms so fast loads don't flash. */
export function RouteProgress() {
  const navigation = useNavigation()
  if (navigation.state !== 'loading') return null
  return <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left animate-route-progress bg-action" />
}

const footerLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/support', label: 'Safety and help' },
  { to: '/community-rules', label: 'Community rules' },
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
]

const SiteFooter = lazy(() => import('@/components/layout/SiteFooter').then((m) => ({ default: m.SiteFooter })))

/** The full footer loads after the page, keeping first-load code inside budget; the compact one holds its place. */
export function Footer() {
  return (
    <Suspense fallback={<CompactFooter />}>
      <SiteFooter />
    </Suspense>
  )
}

function CompactFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 py-8 tablet:px-6 desktop:flex-row desktop:items-center desktop:justify-between">
        <div className="flex flex-col gap-2">
          {/* Same sizes as the header */}
          <Logo height={26} className="desktop:hidden" />
          <Logo height={32} className="hidden desktop:block" />
          <p className="text-compact text-muted">{copy.brandLine}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {footerLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="text-compact text-muted underline-offset-4 pointer-fine:hover:text-ink pointer-fine:hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
