import { Checkbox } from '@/components/ui/Checkbox'
import { useUpdateMe } from '@/features/account/api'
import { errorMessage } from '@/lib/api/error-message'
import type { Me } from '@/types/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'

export function MessagesSection({ me }: { me: Me }) {
  const update = useUpdateMe()

  return (
    <SettingsSection title="Messages from NextOwn">
      <p className="text-compact text-muted">
        Messages about your account, offers and handovers are always sent, so you never miss something you need to act
        on.
      </p>
      <Checkbox
        checked={update.isPending ? (update.variables.marketingOptIn ?? me.marketingOptIn) : me.marketingOptIn}
        onChange={(marketingOptIn) => update.mutate({ marketingOptIn })}
      >
        Text me occasional tips and news from NextOwn
      </Checkbox>
      {update.isError && (
        <p role="alert" className="text-compact text-danger">
          {errorMessage(update.error, 'We couldn’t update this.')}
        </p>
      )}
    </SettingsSection>
  )
}
