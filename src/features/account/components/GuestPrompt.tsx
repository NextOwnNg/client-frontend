import { Button } from '@heroui/react'
import { ButtonLink } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { loginPath, signupPath } from '@/lib/auth/next'

export type GuestIntent = { title: string; body: string; next: string }

/** Asks a guest to sign in for one action, then brings them back to `next` (QA-01). */
export function GuestPrompt({ intent, onClose }: { intent: GuestIntent | null; onClose: () => void }) {
  return (
    <Sheet
      open={intent !== null}
      onOpenChange={(open) => !open && onClose()}
      title={intent?.title ?? ''}
      footer={
        <div className="flex w-full flex-col gap-2">
          <ButtonLink to={loginPath(intent?.next ?? '/')} fullWidth>
            Sign in
          </ButtonLink>
          <ButtonLink to={signupPath(intent?.next ?? '/')} variant="secondary" fullWidth>
            Create an account
          </ButtonLink>
          <Button variant="tertiary" fullWidth onPress={onClose}>
            Not now
          </Button>
        </div>
      }
    >
      <p className="text-body text-ink">{intent?.body}</p>
      <p className="mt-3 text-compact text-muted">
        We never show your email or phone number on your posts, comments or listings.
      </p>
    </Sheet>
  )
}
