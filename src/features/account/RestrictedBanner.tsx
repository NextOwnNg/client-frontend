import { Link } from 'react-router'
import { Banner } from '@/components/ui/Banner'
import { useMe } from '@/features/account/api'

/** A restricted member keeps their account and records, and always sees why and how to appeal (PRD §3). */
export function RestrictedBanner({ className }: { className?: string }) {
  const { data: me } = useMe()
  if (!me?.restricted) return null

  return (
    <Banner
      tone="warning"
      title="Your account is restricted"
      className={className}
      action={
        <Link
          to="/support?topic=appeal"
          className="inline-flex min-h-11 items-center text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          Ask for a review
        </Link>
      }
    >
      {me.restriction?.reason ?? 'Our team is reviewing recent activity on your account.'} Until this is resolved you
      can’t list items, make offers or post. Your offers, deals and messages stay available.
    </Banner>
  )
}
