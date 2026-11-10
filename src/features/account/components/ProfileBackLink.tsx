import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { cx } from '@/lib/cx'

/** Router state the Profile hub puts on its links, so shared pages know they were opened from it. */
export const fromProfileState = { fromProfile: true } as const

export function useOpenedFromProfile() {
  const state = useLocation().state as { fromProfile?: boolean } | null
  return Boolean(state?.fromProfile)
}

type ProfileBackLinkProps = {
  /** For pages with their own place in the nav (Offers, Safety and help): show only when opened from Profile. */
  onlyFromProfile?: boolean
  className?: string
}

/** Returns to the Profile hub from the pages it lists. */
export function ProfileBackLink({ onlyFromProfile = false, className }: ProfileBackLinkProps) {
  const openedFromProfile = useOpenedFromProfile()
  if (onlyFromProfile && !openedFromProfile) return null

  return (
    <Link
      to="/me"
      className={cx(
        'group -ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 outline-none focus-visible:ring-2 focus-visible:ring-focus pointer-fine:hover:bg-cloud pointer-fine:hover:text-ink',
        className,
      )}
    >
      <ArrowLeft
        aria-hidden
        className="size-4 transition-transform duration-200 ease-out pointer-fine:group-hover:-translate-x-[3px]"
      />
      Back to profile
    </Link>
  )
}
