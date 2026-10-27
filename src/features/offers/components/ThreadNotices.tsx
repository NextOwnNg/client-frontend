import { Button } from '@heroui/react'
import { LoaderCircle } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { type DecisionResult } from '@/features/offers/use-offer-decision'
import { copy } from '@/lib/copy/copy'
import type { Offer } from '@/types/api'

export type Notice = Exclude<DecisionResult['kind'], 'done' | 'invalid'> | null

export function ThreadNotices({
  notice,
  checking,
  offer,
  onDismiss,
  onRetryCheck,
}: {
  notice: Notice
  checking: boolean
  offer: Offer
  onDismiss: () => void
  onRetryCheck: () => void
}) {
  if (checking) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-control bg-mint p-4 text-body text-ink">
        <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-action" />
        Checking the latest status…
      </div>
    )
  }
  switch (notice) {
    case 'stale':
      return (
        <Banner tone="warning" title={copy.staleVersion}>
          Nothing was accepted. Read the changes below, then decide on the latest version.
        </Banner>
      )
    case 'unavailable':
      return (
        <Banner tone="warning" title="This item is no longer available.">
          {offer.closedReason ?? 'Nothing was accepted. The offer can’t go ahead.'}
        </Banner>
      )
    case 'expired':
      return (
        <Banner tone="warning" title="Offer expired">
          The deadline passed before your decision reached us.
        </Banner>
      )
    case 'refused':
      return <Banner tone="danger" title="This action isn’t available." />
    case 'not-done':
      return (
        <Banner
          tone="warning"
          title="Your decision didn’t go through"
          action={
            <Button variant="tertiary" size="sm" onPress={onDismiss}>
              Dismiss
            </Button>
          }
        >
          Nothing changed. Check your connection and try again.
        </Banner>
      )
    case 'unknown':
      return (
        <Banner
          tone="warning"
          title="We couldn’t confirm what happened"
          action={
            <Button variant="secondary" size="sm" onPress={onRetryCheck}>
              Check again
            </Button>
          }
        >
          Check your connection, then check again. Trying again can’t make the same decision twice.
        </Banner>
      )
    default:
      return null
  }
}
