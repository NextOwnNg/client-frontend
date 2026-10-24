import { Button } from '@heroui/react'
import { useLocation } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { loginPath } from '@/lib/auth/next'

export function SessionExpiredSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname, search } = useLocation()

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Your session ended"
      footer={
        <div className="flex w-full flex-col gap-2">
          <ButtonLink to={loginPath(pathname + search)} onClick={onClose} fullWidth>
            Sign in again
          </ButtonLink>
          <Button variant="tertiary" fullWidth onPress={onClose}>
            Not now
          </Button>
        </div>
      }
    >
      <p className="text-body text-ink">Confirm your phone number again to carry on. We’ll bring you back here.</p>
      <p className="mt-3 text-compact text-muted">Anything you typed on this page is kept.</p>
    </Sheet>
  )
}
