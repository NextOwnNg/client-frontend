import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import type { StepProps } from '@/features/selling/components/wizard-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'
import { CategoryFields } from '@/features/selling/components/CategoryFields'

export function BasicsStep({
  input,
  change,
  errors,
  config,
  onUploadingChange,
}: StepProps & { onUploadingChange: (busy: boolean) => void }) {
  const category = config.categories.find((c) => c.id === input.categoryId)

  return (
    <div className="flex flex-col gap-8">
      <FieldAnchor name="photos">
        <PhotoUploader
          value={input.photos}
          onChange={(photos) => change({ photos })}
          limits={config.photoLimits}
          itemName={input.title}
          error={errors.photos}
          onBusyChange={onUploadingChange}
        />
      </FieldAnchor>
      <FieldAnchor name="title">
        <TextField
          label="Title"
          hint="Say what it is, with the model and size, like “iPhone 12 Pro · 128GB”."
          maxLength={80}
          value={input.title}
          onChange={(e) => change({ title: e.target.value })}
          error={errors.title}
        />
      </FieldAnchor>
      <FieldAnchor name="categoryId">
        <RadioCards
          label="Category"
          columns={2}
          options={config.categories.map((c) => ({ value: c.id, title: c.name }))}
          value={input.categoryId}
          onChange={(categoryId) => change({ categoryId })}
        />
        {errors.categoryId && <p className="mt-1 text-compact text-danger">{errors.categoryId}</p>}
      </FieldAnchor>
      {category && <CategoryFields category={category} input={input} change={change} errors={errors} />}
      <FieldAnchor name="description">
        <TextAreaField
          label="Description (optional)"
          hint="How you used it, why you’re selling, anything a buyer should know."
          maxLength={1000}
          value={input.description}
          onChange={(e) => change({ description: e.target.value })}
          error={errors.description}
        />
      </FieldAnchor>
    </div>
  )
}
