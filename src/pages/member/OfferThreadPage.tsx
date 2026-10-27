import { useQueryClient } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { offerKeys, useOffer } from '@/features/offers/api'
import { isMissingOrPrivate } from '@/lib/api/error-checks'
import { useSessionStore } from '@/stores/session'
import type { Offer } from '@/types/api'
import { OfferThread } from '@/features/offers/components/OfferThread'

/** FE-OFF-07..12: `/offers/:id`, for the two people in the negotiation only. */
export function OfferThreadPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const userId = useSessionStore((s) => s.userId) ?? ''
  const queryClient = useQueryClient()
  const { data: offer, isPending, isError, error, refetch } = useOffer(id)
  const back = `/offers${params.get('tab') ? `?tab=${params.get('tab')}` : ''}`

  // Opening the thread reads it; the inbox drops its "New" mark without waiting for the next poll
  useEffect(() => {
    if (!offer) return
    queryClient.setQueryData<Offer[]>(offerKeys.list(), (list) =>
      list?.map((o) => (o.id === offer.id && o.unread ? { ...o, unread: false } : o)),
    )
  }, [offer, queryClient])

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading offer" className="flex flex-col gap-4">
        <div className="h-24 animate-pulse rounded-card bg-cloud" />
        <div className="h-72 animate-pulse rounded-card bg-cloud" />
      </div>
    )
  }
  if (isError && !offer) {
    // Not found and not yours look the same, so an offer's existence never leaks (QA-16)
    if (isMissingOrPrivate(error)) {
      return (
        <>
          <Seo title="Offer" noindex />
          <EmptyState
            icon={SearchX}
            title="We couldn’t find that offer"
            body="It may not exist, or it isn’t one of yours."
            action={<ButtonLink to="/offers">Go to your offers</ButtonLink>}
          />
        </>
      )
    }
    return <ErrorState title="We couldn't load this offer" onRetry={() => void refetch()} />
  }

  return (
    <MotionProvider>
      <OfferThread key={offer.id} offer={offer} viewerId={userId} back={back} onRefetch={() => void refetch()} />
    </MotionProvider>
  )
}
