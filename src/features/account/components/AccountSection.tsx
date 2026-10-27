import { Button, toast } from '@heroui/react'
import { useState } from 'react'
import { Banner } from '@/components/ui/Banner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useDeleteRequest, useLogout } from '@/features/account/api'
import { errorMessage } from '@/lib/api/error-message'
import { formatWAT } from '@/lib/time/time'
import type { Me } from '@/types/api'
import { SettingsSection } from '@/features/account/components/SettingsSection'

export function AccountSection({ me }: { me: Me }) {
  const logout = useLogout()
  const deletion = useDeleteRequest()
  const [confirming, setConfirming] = useState(false)

  return (
    <SettingsSection title="Account">
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="self-start"
          isPending={logout.isPending}
          onPress={() => logout.mutate(undefined, { onSuccess: () => toast('You’ve signed out.') })}
        >
          Sign out
        </Button>
        {logout.isError && (
          <p role="alert" className="text-compact text-danger">
            {errorMessage(logout.error, 'We couldn’t sign you out.')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {me.deletionRequestedAt ? (
          <Banner tone="info" title="We’ve received your deletion request">
            Sent {formatWAT(me.deletionRequestedAt, { withTime: false })}
            {deletion.data && <> · Reference {deletion.data.reference}</>}. Our team will text you about your data and
            anything still open, like offers or deals.
          </Banner>
        ) : (
          <>
            <p className="text-compact text-muted">
              Ask us to delete your account and personal data. Our team reviews each request under the Privacy Policy.
            </p>
            <Button variant="danger-soft" className="self-start" onPress={() => setConfirming(true)}>
              Request account deletion
            </Button>
          </>
        )}
        {deletion.isError && (
          <p role="alert" className="text-compact text-danger">
            {errorMessage(deletion.error, 'We couldn’t send your request.')}
          </p>
        )}
      </div>

      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        title="Request account deletion?"
        body="We’ll review your request and text you about your data and anything still open, like offers or deals. Once your account is deleted, it can’t be restored."
        confirmLabel="Send request"
        tone="danger"
        onConfirm={async () => {
          await deletion.mutateAsync()
        }}
      />
    </SettingsSection>
  )
}
