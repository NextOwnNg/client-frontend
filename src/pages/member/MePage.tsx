import {
  Bookmark,
  ChevronRight,
  Flag,
  Handshake,
  LifeBuoy,
  Package,
  ReceiptText,
  Settings,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { useMeProfile } from '@/features/account/use-me-profile'
import { ProfileCard } from '@/pages/public/ProfilePage'

type HubLink = { to: string; label: string; hint: string; icon: LucideIcon }

const groups: { label: string; links: HubLink[] }[] = [
  {
    label: 'Trading',
    links: [
      { to: '/me/listings', label: 'My listings', hint: 'Drafts, active, reserved and closed', icon: Package },
      { to: '/offers', label: 'Offers', hint: 'Sent and received', icon: Handshake },
      { to: '/transactions', label: 'Transactions', hint: 'Agreed deals and handovers', icon: ReceiptText },
      { to: '/saved', label: 'Saved', hint: 'Items you’re keeping an eye on', icon: Bookmark },
      { to: '/me/reviews', label: 'Reviews', hint: 'From people you’ve traded with', icon: Star },
    ],
  },
  {
    label: 'Account',
    links: [
      { to: '/settings', label: 'Account settings', hint: 'Profile, messages, sign out', icon: Settings },
      { to: '/me/reports', label: 'My reports', hint: 'Status of what you reported', icon: Flag },
      { to: '/support', label: 'Safety and help', hint: 'Meeting safely, reporting, appeals', icon: LifeBuoy },
    ],
  },
]

/** UX-25 own profile hub (FE-PRF-02). The restricted banner comes from the app shell. */
export function MePage() {
  const profile = useMeProfile()

  if (!profile) {
    return (
      <div aria-busy="true" aria-label="Loading your profile" className="h-40 animate-pulse rounded-card bg-cloud" />
    )
  }

  return (
    <div className="flex flex-col gap-6 desktop:grid desktop:grid-cols-[20rem_minmax(0,1fr)] desktop:items-start desktop:gap-10">
      <Seo title="Your profile" noindex />
      <div className="flex flex-col gap-3 desktop:sticky desktop:top-24">
        <ProfileCard profile={profile} />
        <Link
          to={`/users/${profile.id}`}
          className="inline-flex min-h-11 items-center gap-1 self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          See your public profile
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>

      <nav aria-label="Your account" className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
            <h2 className="text-caption font-semibold text-muted">{group.label}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {group.links.map(({ to, label, hint, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-120 outline-none focus-visible:bg-cloud pointer-fine:hover:bg-cloud"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-action">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-semibold text-ink">{label}</span>
                      <span className="truncate text-compact text-muted">{hint}</span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-5 shrink-0 text-muted transition-transform duration-120 group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  )
}
