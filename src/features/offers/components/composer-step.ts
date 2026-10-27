import { type OfferDraft } from '@/features/offers/use-offer-draft'
import type { FieldErrors } from '@/features/selling/listing-input'
import type { ListingDetail } from '@/types/api'

export type StepProps = {
  listing: ListingDetail
  draft: OfferDraft
  change: (changes: Partial<OfferDraft>) => void
  errors: FieldErrors
}

export const stepHeading = 'text-h3 text-ink'
