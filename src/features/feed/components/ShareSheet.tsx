import { Button } from '@heroui/react'
import { PackageOpen } from 'lucide-react'
import { useState } from 'react'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useSharePost } from '@/features/feed/api'
import { CAPTION_MAX } from '@/features/feed/feed-limits'
import { useMyListings } from '@/features/selling/api'
import { toApiError } from '@/lib/api/api-error'
import { errorMessage } from '@/lib/api/error-message'
import { formatNaira } from '@/lib/money/money'

/**
 * FE-FED-06: share one of your own active listings to the feed with a short caption. There are no price or
 * photo fields: the post shows the listing as it is (ruling R6-4).
 */
export function ShareSheet({ open, onClose, onShared }: { open: boolean; onClose: () => void; onShared: () => void }) {
  const { data, isPending } = useMyListings()
  const share = useSharePost()
  const active = data?.filter((l) => l.status === 'ACTIVE') ?? []
  const [listingId, setListingId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [errors, setErrors] = useState<{ listingId?: string; caption?: string; form?: string }>({})

  function reset() {
    setListingId(null)
    setCaption('')
    setErrors({})
    share.reset()
  }

  async function submit() {
    const next: typeof errors = {}
    if (!listingId) next.listingId = 'Choose a listing to share.'
    if (!caption.trim()) next.caption = 'Add a short caption.'
    setErrors(next)
    if (next.listingId || next.caption) return
    try {
      await share.mutateAsync({ listingId: listingId!, caption: caption.trim() })
      reset()
      onShared()
    } catch (error) {
      // Field refusals sit beside their field; anything else is one line under the form
      const fields = toApiError(error).fieldErrors
      setErrors(fields ?? { form: errorMessage(error, 'Your post wasn’t shared.') })
    }
  }

  const close = () => {
    reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Share a listing"
      footer={
        active.length > 0 && (
          <Button fullWidth isPending={share.isPending} onPress={() => void submit()}>
            Share to the feed
          </Button>
        )
      }
    >
      {isPending ? (
        <div aria-busy="true" aria-label="Loading your listings" className="h-40 animate-pulse rounded-card bg-cloud" />
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <PackageOpen aria-hidden className="size-8 text-action" />
          <p className="text-body text-ink">You need an active listing to share.</p>
          <ButtonLink to="/listings/new" onClick={close}>
            List an item
          </ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-compact text-muted">
            Posts show your listing’s photo, price and status as they are, so there’s nothing else to fill in.
          </p>
          <div className="flex flex-col gap-1">
            <RadioCards
              label="Which listing?"
              value={listingId}
              onChange={setListingId}
              options={active.map((l) => ({
                value: l.id,
                title: l.title,
                description: l.askingKobo !== null ? formatNaira(l.askingKobo) : 'Swap only',
              }))}
            />
            {errors.listingId && <p className="text-compact text-danger">{errors.listingId}</p>}
          </div>
          <TextAreaField
            label="Caption"
            hint={`What makes it worth a look? Up to ${CAPTION_MAX} characters.`}
            rows={3}
            maxLength={CAPTION_MAX}
            value={caption}
            error={errors.caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          {errors.form && <Banner tone="danger" title={errors.form} />}
        </div>
      )}
    </Sheet>
  )
}
