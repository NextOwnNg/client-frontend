import { Button } from '@heroui/react'
import { EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { useCreateItem } from '@/features/offers/api'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import type { FieldErrors } from '@/features/selling/listing-input'
import { isApiError } from '@/lib/api/api-error'
import { conditionHelp, conditionLabel } from '@/lib/copy/labels'
import { useFormDraft } from '@/stores/drafts'
import type { ItemCondition, OfferItemInput, RuntimeConfig, SwapItem } from '@/types/api'

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

function validate(input: OfferItemInput, config: RuntimeConfig): FieldErrors {
  const errors: FieldErrors = {}
  if (input.photos.length < config.photoLimits.min) errors.photos = 'Add at least one photo of the item.'
  if (!input.title.trim()) errors.title = 'Say what the item is.'
  if (!input.condition) errors.condition = 'Choose the condition.'
  if (!input.noDefects && !input.defects.some((d) => d.trim())) {
    errors.defects = 'List any defects, or tick “No defects to disclose”.'
  }
  if (!input.repairs.trim()) errors.repairs = 'Describe any repairs, or write “None”.'
  if (!input.ownershipConfirmed) errors.ownershipConfirmed = 'Confirm the item is yours to trade.'
  return errors
}

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
  const [input, setInput, clear] = useFormDraft<OfferItemInput>(`offer-item:${userId}`, emptyItem)
  const [shown, setShown] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const create = useCreateItem()
  const errors = shown ? validate(input, config) : {}
  const change = (changes: Partial<OfferItemInput>) => setInput({ ...input, ...changes })

  async function submit() {
    setFailure(null)
    if (Object.keys(validate(input, config)).length) return setShown(true)
    try {
      const item = await create.mutateAsync(input)
      clear()
      onCreated(item)
    } catch (error) {
      setFailure(
        isApiError(error) && error.code === 'VALIDATION_ERROR'
          ? 'Some details are missing. Check the highlighted fields.'
          : 'We couldn’t add the item. Check your connection and try again.',
      )
    }
  }

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

      <PhotoUploader
        value={input.photos}
        onChange={(photos) => change({ photos })}
        limits={config.photoLimits}
        itemName={input.title.trim() || 'your item'}
        error={errors.photos}
        onBusyChange={setUploading}
      />
      <TextField
        label="Title"
        hint="Brand, model and size, e.g. “Galaxy S21 · 128GB”."
        value={input.title}
        maxLength={80}
        onChange={(e) => change({ title: e.target.value })}
        error={errors.title}
      />
      <div className="flex flex-col gap-1">
        <RadioCards<ItemCondition>
          label="Condition"
          columns={2}
          options={(Object.keys(conditionHelp) as ItemCondition[]).map((value) => ({
            value,
            title: conditionLabel(value),
            description: conditionHelp[value],
          }))}
          value={input.condition}
          onChange={(condition) => change({ condition })}
        />
        {errors.condition && <p className="text-compact text-danger">{errors.condition}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {!input.noDefects && (
          <TextAreaField
            label="Defects"
            hint="One per line: scratches, dents, faults, missing parts."
            rows={3}
            value={input.defects.join('\n')}
            onChange={(e) => change({ defects: e.target.value.split('\n') })}
            error={errors.defects}
          />
        )}
        <Checkbox checked={input.noDefects} onChange={(noDefects) => change({ noDefects })}>
          No defects to disclose
        </Checkbox>
        {input.noDefects && errors.defects && <p className="text-compact text-danger">{errors.defects}</p>}
      </div>
      <TextAreaField
        label="Repairs"
        hint="Anything replaced or fixed. Write “None” if it has never been repaired."
        rows={2}
        maxLength={500}
        value={input.repairs}
        onChange={(e) => change({ repairs: e.target.value })}
        error={errors.repairs}
      />
      <Checkbox
        checked={input.ownershipConfirmed}
        onChange={(ownershipConfirmed) => change({ ownershipConfirmed })}
        error={errors.ownershipConfirmed}
      >
        This item belongs to me, and I’m free to swap it
      </Checkbox>

      {failure && <Banner tone="danger" title={failure} />}
      <div className="flex flex-col gap-2 tablet:flex-row">
        <Button
          variant="secondary"
          isPending={create.isPending}
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
