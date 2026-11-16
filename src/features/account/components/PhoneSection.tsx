import { Mail, Phone } from 'lucide-react'
import { Link } from 'react-router'
import type { Me } from '@/types/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'

/** The sign-in email and the contact phone. Neither is ever shown to other people. */
export function PhoneSection({ me }: { me: Me }) {
  return (
    <SettingsSection title="Email and phone">
      <div className="flex items-center gap-3">
        <Mail aria-hidden className="size-5 shrink-0 text-action" />
        <div className="flex min-w-0 flex-col">
          <p className="text-body font-semibold break-all text-ink">{me.email}</p>
          <p className="text-compact text-muted">Email confirmed. You sign in with it.</p>
        </div>
      </div>
      {me.phoneLast4 && (
        <div className="flex items-center gap-3">
          <Phone aria-hidden className="size-5 shrink-0 text-action" />
          <div className="flex flex-col">
            <p className="tabular text-body font-semibold text-ink">+234 ••• ••• {me.phoneLast4}</p>
            <p className="text-compact text-muted">Never shown to other people.</p>
          </div>
        </div>
      )}
      <p className="text-compact text-muted">
        Need to change your email or number?{' '}
        <Link to="/support?topic=account" className="font-semibold text-action underline-offset-4 hover:underline">
          Contact support
        </Link>
        .
      </p>
    </SettingsSection>
  )
}
