import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { cx } from '@/lib/cx'

type BackButtonProps = {
  /** Where to go when the visitor landed straight on this page (e.g. from a shared WhatsApp link). */
  fallbackTo: string
  fallbackLabel: string
  className?: string
}

// Hover (mouse only, so taps don't leave a stuck state): Cloud wash, Teal text, and the arrow nudges back
const style =
  'group inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-control px-2 -ml-2 text-compact font-semibold text-ink outline-none transition-[background-color,color,transform] duration-120 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-focus pointer-fine:hover:bg-cloud pointer-fine:hover:text-action'
const arrow = 'size-5 transition-transform duration-200 ease-out pointer-fine:group-hover:-translate-x-[3px]'

/**
 * In-app Back. After navigating inside the app it returns to the exact previous page (filters and scroll
 * included, like the browser's Back). When this is the first page of the visit, there's nothing in the app
 * to go back to, so it becomes a link to a sensible parent instead of leaving the site.
 */
export function BackButton({ fallbackTo, fallbackLabel, className }: BackButtonProps) {
  const location = useLocation()
  const navigate = useNavigate()
  // React Router gives the first entry of a visit the key "default"
  const cameFromApp = location.key !== 'default'
  // Pages opened from inside a multi-step flow say how many entries to skip (see use-composer-trail)
  const steps = (location.state as { backSteps?: number } | null)?.backSteps ?? 1

  if (!cameFromApp) {
    return (
      <Link to={fallbackTo} className={cx(style, className)}>
        <ArrowLeft aria-hidden className={arrow} />
        {fallbackLabel}
      </Link>
    )
  }

  return (
    <button type="button" onClick={() => void navigate(-steps)} className={cx(style, className)}>
      <ArrowLeft aria-hidden className={arrow} />
      Back
    </button>
  )
}
