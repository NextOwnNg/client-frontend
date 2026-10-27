import type { OfferFields } from '@/features/offers/use-offer-draft'
import type { FieldErrors } from '@/features/selling/listing-input'
import type { ListingDetail } from '@/types/api'

export type StepProps = {
  listing: ListingDetail
  draft: OfferFields
  change: (changes: Partial<OfferFields>) => void
  errors: FieldErrors
}

export const stepHeading = 'text-h3 text-ink'
