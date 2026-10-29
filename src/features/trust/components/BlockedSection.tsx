import { SettingsSection } from '@/features/account/components/SettingsSection'
import { Avatar } from '@/components/domain/Avatar'
import { useBlockedPeople } from '@/features/trust/api'
import { BlockButton } from '@/features/trust/components/BlockButton'
import { formatWAT } from '@/lib/time/time'

/** FE-TRU-02: everyone the member blocked, each with Unblock. */
export function BlockedSection() {
  const { data: people, isPending, isError, refetch } = useBlockedPeople()

  return (
    <SettingsSection title="Blocked people">
      <p className="text-compact text-muted">
        People you block can’t message you or make offers to you, and you don’t see their posts or comments. They aren’t
        told.
      </p>
      {isPending ? (
        <div
          aria-busy="true"
          aria-label="Loading blocked people"
          className="h-14 animate-pulse rounded-control bg-cloud"
        />
      ) : isError ? (
        <p className="text-compact text-ink">
          We couldn’t load this list.{' '}
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 font-semibold text-action underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </p>
      ) : people.length === 0 ? (
        <p className="text-body text-ink">You haven’t blocked anyone.</p>
      ) : (
        <ul aria-label="Blocked people" className="flex flex-col divide-y divide-border">
          {people.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <Avatar name={person.displayName} src={person.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-ink">{person.displayName}</p>
                <p className="text-caption text-muted">Blocked {formatWAT(person.blockedAt, { withTime: false })}</p>
              </div>
              <BlockButton person={person} />
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  )
}
