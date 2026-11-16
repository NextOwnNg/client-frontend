import { Button } from '@heroui/react'
import { ButtonLink } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { loginPath, signupPath } from '@/lib/auth/next'
import type { ListingDetail } from '@/types/api'

export type Intent = 'offer' | 'save'

/** Guest gate for Make an offer and Save. `next` brings them back to the same intent after sign-in (QA-01). */
export function SignInPrompt({
  intent,
  open,
  listing,
  onClose,
}: {
  intent: Intent
  open: boolean
  listing: ListingDetail
  onClose: () => void
}) {
  const next = intent === 'save' ? `/listings/${listing.slug}?intent=save` : `/offers/new?listing=${listing.id}`
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => !open && onClose()}
      title={intent === 'save' ? 'Sign in to save items' : 'Sign in to make an offer'}
      footer={
        <div className="flex w-full flex-col gap-2">
          <ButtonLink to={loginPath(next)} fullWidth>
            Sign in
          </ButtonLink>
          <ButtonLink to={signupPath(next)} variant="secondary" fullWidth>
            Create an account
          </ButtonLink>
          <Button variant="tertiary" fullWidth onPress={onClose}>
            Not now
          </Button>
        </div>
      }
    >
      <p className="text-body text-ink">
        {intent === 'save'
          ? 'Sign in to keep a list of items you like. We’ll bring you back here.'
          : 'Sign in to send a structured offer. We’ll bring you back to this item.'}
      </p>
      <p className="mt-3 text-compact text-muted">
        We never show your email or phone number on your listings or offers.
      </p>
    </Sheet>
  )
}
