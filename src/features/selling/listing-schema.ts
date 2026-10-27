import { z } from 'zod'
import { emptyListingInput, stepOfField, validateListing, type WizardStep } from '@/features/selling/listing-input'
import { addFieldIssues } from '@/lib/forms/form-errors'
import type { ListingInput, RuntimeConfig } from '@/types/api'

/** The fields a step asks for; Next checks only these (the preview checks everything). */
export const fieldsOfStep = (step: WizardStep) =>
  (Object.keys(emptyListingInput) as (keyof ListingInput)[]).filter((field) => stepOfField(field) === step)

/** `validateListing` as a form schema, so the wizard checks the same rules the server does. */
export const listingSchema = (config: RuntimeConfig) =>
  z.custom<ListingInput>().superRefine((input, ctx) => addFieldIssues(ctx, validateListing(input, config)))
