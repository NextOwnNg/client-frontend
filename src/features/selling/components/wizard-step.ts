import { type FieldErrors } from '@/features/selling/listing-input'
import type { ListingInput, RuntimeConfig } from '@/types/api'

export type StepProps = {
  input: ListingInput
  change: (changes: Partial<ListingInput>) => void
  errors: FieldErrors
  config: RuntimeConfig
}
