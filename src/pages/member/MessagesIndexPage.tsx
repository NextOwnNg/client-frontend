import { MessageCircle, SearchX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { useOpenConversation } from '@/features/messages/api'

/**
 * `/messages` with nothing open. Arriving with `?offer=` or `?transaction=` (from an offer or a deal) finds or
 * starts that conversation and opens it.
 */
export function MessagesIndex() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const openConversation = useOpenConversation()
  const offerId = params.get('offer')
  const transactionId = params.get('transaction')
  const asked = useRef(false)

  useEffect(() => {
    if (asked.current || (!offerId && !transactionId)) return
    asked.current = true
    openConversation.mutate(offerId ? { offerId } : { transactionId: transactionId! }, {
      onSuccess: (id) => void navigate(`/messages/${id}`, { replace: true }),
    })
  }, [offerId, transactionId, openConversation, navigate])

  if (offerId || transactionId) {
    if (openConversation.isError) {
      return (
        <EmptyState
          icon={SearchX}
          title="We couldn’t open that conversation"
          body="The offer or deal may not exist, or it isn’t one of yours."
          action={<ButtonLink to="/messages">Go to your messages</ButtonLink>}
        />
      )
    }
    return <p className="py-12 text-center text-compact text-muted">Opening the conversation…</p>
  }
  return (
    <div className="hidden desktop:block">
      <EmptyState
        icon={MessageCircle}
        title="Choose a conversation"
        body="Pick one on the left to read it and reply."
      />
    </div>
  )
}
