import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { PackageOpen } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useSharePost } from '@/features/feed/api'
import { CAPTION_MAX } from '@/features/feed/feed-limits'
import { useMyListings } from '@/features/selling/api'
import { errorMessage, fieldErrorsOf } from '@/lib/api/error-message'
import { formatNaira } from '@/lib/money/money'

const shareSchema = z.object({
  listingId: z.string().min(1, 'Choose a listing to share.'),
  caption: z
    .string()
    .trim()
    .min(1, 'Add a short caption.')
    .max(CAPTION_MAX, `Keep it under ${CAPTION_MAX} characters.`),
})

type ShareForm = z.infer<typeof shareSchema>

const empty: ShareForm = { listingId: '', caption: '' }

/**
 * FE-FED-06: share one of your own active listings to the feed with a short caption. There are no price or
 * photo fields: the post shows the listing as it is (ruling R6-4).
 */
export function ShareSheet({ open, onClose, onShared }: { open: boolean; onClose: () => void; onShared: () => void }) {
  const { data, isPending } = useMyListings()
  const share = useSharePost()
  const active = data?.filter((l) => l.status === 'ACTIVE') ?? []
  const { control, handleSubmit, reset, setError, formState } = useForm<ShareForm>({
    resolver: zodResolver(shareSchema),
    defaultValues: empty,
  })
  const { errors } = formState

  const submit = handleSubmit(async (values) => {
    try {
      await share.mutateAsync(values)
      reset(empty)
      onShared()
    } catch (error) {
      // Field refusals sit beside their field; anything else is one line under the form
      const fields = fieldErrorsOf(error)
      if (!fields) return setError('root', { message: errorMessage(error, 'Your post wasn’t shared.') })
      for (const [name, message] of Object.entries(fields)) {
        if (name === 'listingId' || name === 'caption') setError(name, { message })
        else setError('root', { message })
      }
    }
  })

  const close = () => {
    reset(empty)
    share.reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Share a listing"
      footer={
        active.length > 0 && (
          <Button fullWidth isPending={formState.isSubmitting} onPress={() => void submit()}>
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
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <p className="text-compact text-muted">
            Posts show your listing’s photo, price and status as they are, so there’s nothing else to fill in.
          </p>
          <Controller
            control={control}
            name="listingId"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <RadioCards
                  label="Which listing?"
                  value={field.value || null}
                  onChange={field.onChange}
                  options={active.map((l) => ({
                    value: l.id,
                    title: l.title,
                    description: l.askingKobo !== null ? formatNaira(l.askingKobo) : 'Swap only',
                  }))}
                />
                {fieldState.error && <p className="text-compact text-danger">{fieldState.error.message}</p>}
              </div>
            )}
          />
          <Controller
            control={control}
            name="caption"
            render={({ field, fieldState }) => (
              <TextAreaField
                label="Caption"
                hint={`What makes it worth a look? Up to ${CAPTION_MAX} characters.`}
                rows={3}
                maxLength={CAPTION_MAX}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          {errors.root && <Banner tone="danger" title={errors.root.message ?? ''} />}
        </form>
      )}
    </Sheet>
  )
}
