import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { useMe } from '@/features/account/api'
import { useRuntimeConfig } from '@/features/config/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'
import { ProfileSection } from '@/features/account/components/ProfileSection'
import { PhoneSection } from '@/features/account/components/PhoneSection'
import { MessagesSection } from '@/features/account/components/MessagesSection'
import { AccountSection } from '@/features/account/components/AccountSection'

/** UX-26 / FE-SET-01: grouped settings. Destructive actions confirm first; profile edits survive an expired session. */
export function SettingsPage() {
  const { data: me } = useMe()
  const { data: config } = useRuntimeConfig()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo title="Account settings" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Account settings</h1>
      {!me ? (
        <div aria-busy="true" aria-label="Loading settings" className="h-64 animate-pulse rounded-card bg-cloud" />
      ) : (
        <>
          <ProfileSection me={me} config={config} />
          <PhoneSection me={me} />
          <MessagesSection me={me} />
          <SettingsSection title="Privacy and policies">
            <ul className="flex flex-col">
              {[
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms' },
                { to: '/community-rules', label: 'Community rules' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-flex min-h-11 items-center text-body font-medium text-action underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </SettingsSection>
          <AccountSection me={me} />
        </>
      )}
    </div>
  )
}
