import { Checkbox } from '@/components/ui/Checkbox'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { UNKNOWN, type FieldErrors } from '@/features/selling/listing-input'
import type { Category, ListingInput } from '@/types/api'
import type { StepProps } from '@/features/selling/components/wizard-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'

/** The chosen category's own details (FE-LST-09). Fields come only from config, so swapping it needs no code. */
export function CategoryFields({
  category,
  input,
  change,
  errors,
}: {
  category: Category
  input: ListingInput
  change: StepProps['change']
  errors: FieldErrors
}) {
  const set = (id: string, value: string) => change({ categoryFields: { ...input.categoryFields, [id]: value } })

  return (
    <fieldset className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4">
      <legend className="px-1 text-compact font-semibold text-ink">{category.name} details</legend>
      {category.fields.map((field) => {
        const value = input.categoryFields[field.id] ?? ''
        const error = errors[`categoryFields.${field.id}`]
        if (field.type === 'select') {
          return (
            <FieldAnchor key={field.id} name={`categoryFields.${field.id}`}>
              <SelectField
                label={field.label}
                options={[
                  ...(field.options ?? []).map((o) => ({ value: o, label: o })),
                  ...(field.allowUnknown ? [{ value: UNKNOWN, label: 'Not known' }] : []),
                ]}
                value={value}
                onChange={(e) => set(field.id, e.target.value)}
                error={error}
              />
            </FieldAnchor>
          )
        }
        if (field.type === 'percent') {
          const unknown = value === UNKNOWN
          return (
            <FieldAnchor key={field.id} name={`categoryFields.${field.id}`} className="flex flex-col gap-1">
              {!unknown && (
                <TextField
                  label={field.label}
                  hint="Usually under Settings › Battery. A number from 1 to 100."
                  inputMode="numeric"
                  maxLength={3}
                  value={value}
                  onChange={(e) => set(field.id, e.target.value.replace(/\D/g, ''))}
                  error={error}
                  className="tabular"
                />
              )}
              {field.allowUnknown && (
                <Checkbox checked={unknown} onChange={(on) => set(field.id, on ? UNKNOWN : '')}>
                  {unknown ? `${field.label}: not known` : 'Not known'}
                </Checkbox>
              )}
            </FieldAnchor>
          )
        }
        return (
          <FieldAnchor key={field.id} name={`categoryFields.${field.id}`}>
            <TextField
              label={`${field.label} (optional)`}
              value={value}
              onChange={(e) => set(field.id, e.target.value)}
              error={error}
            />
          </FieldAnchor>
        )
      })}
    </fieldset>
  )
}
