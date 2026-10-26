import type {
  CategoryField,
  ListingDetail,
  ListingImage,
  ListingInput,
  ListingStatus,
  OwnListing,
  PublicSeller,
  RuntimeConfig,
} from '@/types/api'

/**
 * The listing wizard's data rules, shared by the wizard, its preview and the mock API, so all three agree on
 * what "complete" means (PRD FE-LST-03) and the preview is built exactly like the public page (FE-LST-06).
 */

export type WizardStep = 'basics' | 'condition' | 'trade' | 'preview'

export const wizardSteps: { id: WizardStep; label: string }[] = [
  { id: 'basics', label: 'Photos and basics' },
  { id: 'condition', label: 'Condition' },
  { id: 'trade', label: 'Trade options' },
  { id: 'preview', label: 'Preview' },
]

export const UNKNOWN = 'unknown'

/** `48` → "48 hours", `168` → "7 days". */
export const quickSellLabel = (hours: number) =>
  hours >= 168 && hours % 24 === 0 ? `${hours / 24} days` : `${hours} hours`

export const emptyListingInput: ListingInput = {
  title: '',
  categoryId: null,
  categoryFields: {},
  description: '',
  photos: [],
  condition: null,
  defects: [],
  noDefects: false,
  repairs: '',
  accessories: '',
  ownershipConfirmed: false,
  modes: [],
  askingKobo: null,
  desiredSwap: '',
  openToOffers: false,
  areaId: null,
  quickSell: false,
  quickSellHours: null,
}

export type FieldErrors = Record<string, string>

const fieldSteps: Record<string, WizardStep> = {
  photos: 'basics',
  title: 'basics',
  categoryId: 'basics',
  description: 'basics',
  condition: 'condition',
  defects: 'condition',
  repairs: 'condition',
  accessories: 'condition',
  ownershipConfirmed: 'condition',
  modes: 'trade',
  askingKobo: 'trade',
  desiredSwap: 'trade',
  areaId: 'trade',
  quickSellHours: 'trade',
}

/** Which step a field (including `categoryFields.<id>`) lives on, so an error can link to it. */
export function stepOfField(field: string): WizardStep {
  if (field.startsWith('categoryFields.')) return 'basics'
  return fieldSteps[field] ?? 'basics'
}

function categoryFieldError(field: CategoryField, value: string | undefined): string | null {
  const answered = value !== undefined && value.trim() !== ''
  if (field.type === 'text') return null
  if (!answered) return field.allowUnknown ? 'Choose an option, or Not known.' : 'Choose an option.'
  if (field.type === 'percent' && value !== UNKNOWN) {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > 100) return 'Enter a percentage from 1 to 100, or choose Not known.'
  }
  return null
}

/** Every rule a listing must meet to publish. Keys are field names; values are messages for that field. */
export function validateListing(input: ListingInput, config: RuntimeConfig): FieldErrors {
  const errors: FieldErrors = {}
  const min = config.photoLimits.min
  const title = input.title.trim()

  if (input.photos.length < min) errors.photos = `Add at least ${min} photo of the actual item.`
  if (input.photos.length > config.photoLimits.max) errors.photos = `Use up to ${config.photoLimits.max} photos.`
  if (title.length < 4 || title.length > 80) errors.title = 'Enter a title of 4 to 80 characters.'
  const category = config.categories.find((c) => c.id === input.categoryId)
  if (!category) errors.categoryId = 'Choose a category.'
  for (const field of category?.fields ?? []) {
    const message = categoryFieldError(field, input.categoryFields[field.id])
    if (message) errors[`categoryFields.${field.id}`] = message
  }
  if (input.description.length > 1000) errors.description = 'Keep the description under 1,000 characters.'

  if (!input.condition) errors.condition = 'Choose the item’s condition.'
  if (!input.noDefects && input.defects.filter((d) => d.trim()).length === 0) {
    errors.defects = 'List the defects, or tick “No defects to disclose”.'
  }
  if (!input.repairs.trim()) errors.repairs = 'Describe any repairs, or write “None”.'
  else if (input.repairs.length > 500) errors.repairs = 'Keep this under 500 characters.'
  if (!input.accessories.trim()) errors.accessories = 'List what’s included, or write “None”.'
  if (!input.ownershipConfirmed) errors.ownershipConfirmed = 'Confirm the item is yours to sell or swap.'

  if (input.modes.length === 0) errors.modes = 'Choose how you want to trade.'
  if (input.modes.includes('CASH') && !(input.askingKobo && input.askingKobo > 0)) {
    errors.askingKobo = 'Enter an asking price above ₦0.'
  }
  if (input.modes.includes('SWAP') && !input.openToOffers && !input.desiredSwap.trim()) {
    errors.desiredSwap = 'Say what you’d like in a swap, or tick “Open to offers”.'
  }
  if (!config.areas.some((a) => a.id === input.areaId)) errors.areaId = 'Choose the area where you’ll meet.'
  if (input.quickSell && !config.quickSellOptionsHours.includes(input.quickSellHours ?? -1)) {
    errors.quickSellHours = 'Choose how long Quick Sell runs.'
  }
  return errors
}

export function validateStep(step: WizardStep, input: ListingInput, config: RuntimeConfig): FieldErrors {
  return Object.fromEntries(
    Object.entries(validateListing(input, config)).filter(([field]) => stepOfField(field) === step),
  )
}

/** The first step that still needs something, or `preview` when the listing is ready to publish. */
export function firstInvalidStep(input: ListingInput, config: RuntimeConfig): WizardStep {
  const fields = Object.keys(validateListing(input, config))
  return wizardSteps.find((s) => fields.some((f) => stepOfField(f) === s.id))?.id ?? 'preview'
}

/** `"none"`, `"None."` and the like mean no repairs or accessories. */
export const isNone = (text: string) => /^none\.?$/i.test(text.trim())

const placeholderCover: ListingImage = { url: '', alt: '', width: 4, height: 3 }

type DetailMeta = {
  id: string
  slug: string
  status: ListingStatus
  publishedAt: string
  urgencyEndsAt?: string
  seller: PublicSeller
  config: RuntimeConfig
  sample?: boolean
}

/** The public listing a wizard input becomes: used by the preview and by the mock API on publish. */
export function inputToDetail(input: ListingInput, meta: DetailMeta): ListingDetail {
  const category = meta.config.categories.find((c) => c.id === input.categoryId)
  const defects = input.noDefects ? [] : input.defects.map((d) => d.trim()).filter(Boolean)
  const images = input.photos.map(({ id: _id, ...image }) => image)
  const swap = input.modes.includes('SWAP')

  return {
    id: meta.id,
    slug: meta.slug,
    title: input.title.trim(),
    categoryId: input.categoryId ?? '',
    condition: input.condition ?? 'GOOD',
    defectSummary: defects[0],
    acceptedModes: input.modes,
    askingKobo: input.modes.includes('CASH') ? input.askingKobo : null,
    areaName: meta.config.areas.find((a) => a.id === input.areaId)?.name ?? meta.config.cityName,
    status: meta.status,
    urgencyEndsAt: meta.urgencyEndsAt,
    publishedAt: meta.publishedAt,
    cover: images[0] ?? placeholderCover,
    sample: meta.sample,
    images,
    description: input.description.trim(),
    defects,
    repairs: input.repairs.trim() && !isNone(input.repairs) ? input.repairs.trim() : undefined,
    accessories: input.accessories.trim() && !isNone(input.accessories) ? input.accessories.trim() : undefined,
    desiredSwap: swap ? input.desiredSwap.trim() || (input.openToOffers ? 'Open to offers' : undefined) : undefined,
    categoryFields: (category?.fields ?? [])
      .filter((f) => input.categoryFields[f.id]?.trim())
      .map((f) => {
        const value = input.categoryFields[f.id]!.trim()
        if (value === UNKNOWN) return { label: f.label, value: 'Not known' }
        return { label: f.label, value: f.type === 'percent' ? `${value}%` : value }
      }),
    seller: meta.seller,
  }
}

/** A published listing back into wizard input, for editing listings that predate the wizard (sample data). */
export function detailToInput(detail: ListingDetail, config: RuntimeConfig): ListingInput {
  const category = config.categories.find((c) => c.id === detail.categoryId)
  const categoryFields: Record<string, string> = {}
  for (const { label, value } of detail.categoryFields) {
    const field = category?.fields.find((f) => f.label === label)
    if (!field) continue
    categoryFields[field.id] =
      value === 'Not known' ? UNKNOWN : field.type === 'percent' ? value.replace('%', '') : value
  }
  const openToOffers = detail.desiredSwap === 'Open to offers'

  return {
    title: detail.title,
    categoryId: detail.categoryId,
    categoryFields,
    description: detail.description,
    photos: detail.images.map((image, i) => ({ ...image, id: `${detail.id}-p${i}` })),
    condition: detail.condition,
    defects: detail.defects,
    noDefects: detail.defects.length === 0,
    repairs: detail.repairs ?? 'None',
    accessories: detail.accessories ?? 'None',
    ownershipConfirmed: true,
    modes: detail.acceptedModes,
    askingKobo: detail.askingKobo,
    desiredSwap: openToOffers ? '' : (detail.desiredSwap ?? ''),
    openToOffers: openToOffers || (detail.acceptedModes.includes('SWAP') && !detail.desiredSwap),
    areaId: config.areas.find((a) => a.name === detail.areaName)?.id ?? null,
    // A running deadline stays on the listing; turning Quick Sell on here starts a new one
    quickSell: false,
    quickSellHours: null,
  }
}

/** An owner's listing without its server-managed fields: the wizard's input. */
export function ownToInput({
  id: _id,
  slug: _slug,
  status: _status,
  updatedAt: _updatedAt,
  publishedAt: _publishedAt,
  urgencyEndsAt: _urgencyEndsAt,
  ...input
}: OwnListing): ListingInput {
  return input
}

export type ListingTab = 'draft' | 'active' | 'reserved' | 'expired' | 'closed'

/** My listings tab for a status (FE-LST-08). Listings under review sit with Active, with their own badge. */
export function tabOf(status: ListingStatus): ListingTab {
  if (status === 'DRAFT') return 'draft'
  if (status === 'ACTIVE' || status === 'PENDING_REVIEW') return 'active'
  if (status === 'RESERVED') return 'reserved'
  if (status === 'EXPIRED') return 'expired'
  return 'closed'
}
