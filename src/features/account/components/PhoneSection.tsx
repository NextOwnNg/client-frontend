import { Phone } from 'lucide-react'
import { Link } from 'react-router'
import type { Me } from '@/types/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'

export function PhoneSection({ me }: { me: Me }) {
  return (
    <SettingsSection title="Phone number">
      <div className="flex items-center gap-3">
        <Phone aria-hidden className="size-5 text-action" />
        <div className="flex flex-col">
          <p className="tabular text-body font-semibold text-ink">+234 ••• ••• {me.phoneLast4}</p>
          <p className="text-compact text-muted">Phone confirmed. Never shown to other people.</p>
        </div>
      </div>
      <p className="text-compact text-muted">
        Need to change your number?{' '}
        <Link to="/support?topic=account" className="font-semibold text-action underline-offset-4 hover:underline">
          Contact support
        </Link>
        .
      </p>
    </SettingsSection>
  )
}
