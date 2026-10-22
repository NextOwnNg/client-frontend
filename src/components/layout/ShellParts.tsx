import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { Link, useNavigation } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { useOnline } from '@/hooks/useOnline'
import { copy } from '@/lib/copy/copy'
import { transitions } from '@/lib/motion/presets'

export function OfflineBanner() {
  const online = useOnline()
  return (
    <AnimatePresence initial={false}>
      {!online && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: transitions.fast }}
          transition={transitions.standard}
          className="border-b border-warning/20 bg-warning/10"
        >
          <p className="mx-auto flex max-w-content items-start gap-2 px-4 py-2 text-compact text-ink tablet:px-6">
            <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            {copy.offline}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Thin Teal bar while a lazy route loads. Appears only after 150ms so fast loads don't flash. */
export function RouteProgress() {
  const navigation = useNavigation()
  return (
    <AnimatePresence>
      {navigation.state === 'loading' && (
        <motion.div
          aria-hidden
          className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-action"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 0.85, opacity: 1, transition: { delay: 0.15, duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: transitions.fast }}
        />
      )}
    </AnimatePresence>
  )
}

const footerLinks = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/support', label: 'Safety and help' },
  { to: '/community-rules', label: 'Community rules' },
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 py-8 tablet:px-6 desktop:flex-row desktop:items-center desktop:justify-between">
        <div className="flex flex-col gap-2">
          <Logo height={24} />
          <p className="text-compact text-muted">{copy.brandLine}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {footerLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="text-compact text-muted underline-offset-4 pointer-fine:hover:text-ink pointer-fine:hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
