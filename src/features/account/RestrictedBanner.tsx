import { Link, useMatch } from 'react-router'
import { Banner } from '@/components/ui/Banner'
import { useMe } from '@/features/account/api'

/** A restricted member keeps their account and records, and always sees why and how to appeal (PRD §3). */
export function RestrictedBanner({ className }: { className?: string }) {
  const { data: me } = useMe()
  // The appeal page explains the restriction itself
  const onAppeal = useMatch('/appeal')
  if (!me?.restricted || onAppeal) return null
  const pending = me.appeal && me.appeal.status !== 'DECIDED' ? me.appeal : null

  return (
    <Banner
      tone="warning"
      title="Your account is restricted"
      className={className}
      action={
        <Link
          to="/appeal"
          className="inline-flex min-h-11 items-center text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          {pending ? 'See your request' : 'Ask for a review'}
        </Link>
      }
    >
      {me.restriction?.reason ?? 'Our team is reviewing recent activity on your account.'} Until this is resolved you
      can’t list items, make offers or post. Your offers, deals and messages stay available.
      {pending && ` We’re reviewing your request (${pending.caseRef}).`}
    </Banner>
  )
}
