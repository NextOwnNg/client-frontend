import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { useCreateItem } from '@/features/offers/api'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import { errorMessage } from '@/lib/api/error-message'
import { conditionHelp, conditionLabel } from '@/lib/copy/labels'
import { useFormDraft } from '@/stores/drafts'
import type { ItemCondition, MediaRef, OfferItemInput, RuntimeConfig, SwapItem } from '@/types/api'

export const offerOnlyNote = 'Only the person you’re offering to can see this item.'

const emptyItem: OfferItemInput = {
  title: '',
  condition: null,
  defects: [],
  noDefects: false,
  repairs: '',
  photos: [],
  ownershipConfirmed: false,
}

/** What the other person needs to judge the item; photo minimums come from the pilot's config. */
const offerItemSchema = (minPhotos: number) =>
  z
    .object({
      title: z.string().trim().min(1, 'Say what the item is.'),
      condition: z.custom<ItemCondition | null>((value) => value !== null, 'Choose the condition.'),
      defects: z.array(z.string()),
      noDefects: z.boolean(),
      repairs: z.string().trim().min(1, 'Describe any repairs, or write “None”.'),
      photos: z.array(z.custom<MediaRef>()).min(minPhotos, 'Add at least one photo of the item.'),
      ownershipConfirmed: z.boolean().refine(Boolean, 'Confirm the item is yours to trade.'),
    })
    .superRefine((item, ctx) => {
      if (!item.noDefects && !item.defects.some((d) => d.trim())) {
        ctx.addIssue({
          code: 'custom',
          path: ['defects'],
          message: 'List any defects, or tick “No defects to disclose”.',
        })
      }
    })

/**
 * "Add an item" inside a swap offer (FE-OFF-03, UX-16): the facts the other person needs to judge it,
 * kept private to the negotiation. Not a form element, because it sits inside the composer's form.
 */
export function OfferItemForm({
  userId,
  config,
  onCreated,
  onCancel,
}: {
  userId: string | null
  config: RuntimeConfig
  onCreated: (item: SwapItem) => void
  onCancel?: () => void
}) {
  const [draft, saveDraft, clearDraft] = useFormDraft<OfferItemInput>(`offer-item:${userId}`, emptyItem)
  const schema = useMemo(() => offerItemSchema(config.photoLimits.min), [config.photoLimits.min])
  const { control, handleSubmit, setError, watch, formState } = useForm<OfferItemInput>({
    resolver: zodResolver(schema),
    defaultValues: draft,
  })
  const [uploading, setUploading] = useState(false)
  const create = useCreateItem()
  const title = watch('title')
  const noDefects = watch('noDefects')
  const failure = formState.errors.root?.message

  // The item is a draft as it's typed, so leaving the composer loses nothing
  useEffect(() => {
    const subscription = watch((values) => saveDraft(values as OfferItemInput))
    return () => subscription.unsubscribe()
  }, [watch, saveDraft])

  // Not a <form>: this sits inside the composer's form, so Use this item submits only this part
  const submit = handleSubmit(async (input) => {
    try {
      const item = await create.mutateAsync(input)
      clearDraft()
      onCreated(item)
    } catch (error) {
      setError('root', { message: errorMessage(error, 'We couldn’t add the item.') })
    }
  })

  return (
    <div role="group" aria-labelledby="new-item-heading" className="flex flex-col gap-6 border-t border-border pt-6">
      <div className="flex flex-col gap-2">
        <h3 id="new-item-heading" className="text-h3 text-ink">
          Add an item
        </h3>
        <p className="flex items-start gap-2 text-compact text-muted">
          <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
          {offerOnlyNote}
        </p>
      </div>

      <Controller
        control={control}
        name="photos"
        render={({ field, fieldState }) => (
          <PhotoUploader
            value={field.value}
            onChange={field.onChange}
            limits={config.photoLimits}
            itemName={title.trim() || 'your item'}
            error={fieldState.error?.message}
            onBusyChange={setUploading}
          />
        )}
      />
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label="Title"
            hint="Brand, model and size, e.g. “Galaxy S21 · 128GB”."
            maxLength={80}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="condition"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1">
            <RadioCards<ItemCondition>
              label="Condition"
              columns={2}
              options={(Object.keys(conditionHelp) as ItemCondition[]).map((value) => ({
                value,
                title: conditionLabel(value),
                description: conditionHelp[value],
              }))}
              value={field.value}
              onChange={field.onChange}
            />
            {fieldState.error && <p className="text-compact text-danger">{fieldState.error.message}</p>}
          </div>
        )}
      />
      <Controller
        control={control}
        name="defects"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            {!noDefects && (
              <TextAreaField
                label="Defects"
                hint="One per line: scratches, dents, faults, missing parts."
                rows={3}
                value={field.value.join('\n')}
                onChange={(e) => field.onChange(e.target.value.split('\n'))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
            <Controller
              control={control}
              name="noDefects"
              // Ticking it settles the defects question, so that error is checked again
              rules={{ deps: ['defects'] }}
              render={({ field: none }) => (
                <Checkbox checked={none.value} onChange={none.onChange}>
                  No defects to disclose
                </Checkbox>
              )}
            />
            {noDefects && fieldState.error && <p className="text-compact text-danger">{fieldState.error.message}</p>}
          </div>
        )}
      />
      <Controller
        control={control}
        name="repairs"
        render={({ field, fieldState }) => (
          <TextAreaField
            label="Repairs"
            hint="Anything replaced or fixed. Write “None” if it has never been repaired."
            rows={2}
            maxLength={500}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="ownershipConfirmed"
        render={({ field, fieldState }) => (
          <Checkbox checked={field.value} onChange={field.onChange} error={fieldState.error?.message}>
            This item belongs to me, and I’m free to swap it
          </Checkbox>
        )}
      />

      {failure && <Banner tone="danger" title={failure} />}
      <div className="flex flex-col gap-2 tablet:flex-row">
        <Button
          variant="secondary"
          isPending={formState.isSubmitting}
          isDisabled={uploading}
          onPress={() => void submit()}
          className="tablet:px-6"
        >
          Use this item
        </Button>
        {onCancel && (
          <Button variant="tertiary" onPress={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {uploading && <p className="text-compact text-muted">Wait for your photos to finish uploading.</p>}
    </div>
  )
}
