import { http, HttpResponse, type RequestHandler } from 'msw'
import { emptyListingInput, ownToInput, validateListing } from '@/features/selling/listing-input'
import { apiBaseUrl } from '@/lib/env'
import { authDb } from '@/mocks/db/auth'
import { listingsDb } from '@/mocks/db/listings'
import { mediaDb } from '@/mocks/db/media'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { network } from '@/mocks/handlers/network'
import type { ListingInput, MediaRef, OwnListing } from '@/types/api'

const API = apiBaseUrl
const HOUR = 3_600_000
const MAX_BYTES = 10 * 1024 * 1024
const FORMATS = ['image/jpeg', 'image/png', 'image/webp']
/** Listings that hold the item's one active public slot (LST-10). */
const LIVE = ['ACTIVE', 'PENDING_REVIEW', 'RESERVED']

const json = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ code, message, ...extra }, { status })
const authRequired = () => json(401, 'AUTH_REQUIRED', 'Sign in to continue')
const notFound = () => json(404, 'NOT_FOUND', 'Listing not found')

/** Only the wizard's own fields are accepted from the client; status, slug and dates are the server's. */
function pickInput(body: Partial<ListingInput>): Partial<ListingInput> {
  return Object.fromEntries(Object.entries(body).filter(([key]) => key in emptyListingInput))
}

const deadline = (hours: number | null | undefined) =>
  hours ? new Date(Date.now() + hours * HOUR).toISOString() : null

/** The signed-in owner's listing, or the response to send instead. */
function ownListing(id: string): { listing: OwnListing } | { response: Response } {
  const me = authDb.current()
  if (!me) return { response: authRequired() }
  const owner = listingsDb.ownerOf(id)
  if (!owner) return { response: notFound() }
  if (owner !== me.id) return { response: json(403, 'FORBIDDEN', 'This action isn’t available.') }
  return { listing: listingsDb.own(id)! }
}

export const sellingHandlers: RequestHandler[] = [
  http.post(`${API}/media`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure
    if (!authDb.current()) return authRequired()

    const form = await request.formData()
    const file = form.get('file')
    // Checked by shape: in tests the file comes from another realm, so `instanceof Blob` can't be trusted
    if (!file || typeof file === 'string') return json(422, 'VALIDATION_ERROR', 'Attach a photo')
    if (!FORMATS.includes(file.type)) return json(415, 'UNSUPPORTED_FORMAT', 'Use JPG, PNG or WebP')
    if (file.size > MAX_BYTES) return json(413, 'FILE_TOO_LARGE', 'Photos can be up to 10 MB')

    const id = `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    await mediaDb.put(id, file)
    const media: MediaRef = {
      id,
      url: `${API}/media/${id}`,
      alt: typeof form.get('alt') === 'string' ? (form.get('alt') as string) : 'Photo of the item',
      width: Number(form.get('width')) || 1600,
      height: Number(form.get('height')) || 1200,
    }
    return HttpResponse.json(media, { status: 201 })
  }),

  http.get(`${API}/media/:id`, async ({ params }) => {
    const blob = await mediaDb.get(String(params.id))
    if (!blob) return new HttpResponse(null, { status: 404 })
    return new HttpResponse(blob, { headers: { 'Content-Type': blob.type, 'Cache-Control': 'private, max-age=3600' } })
  }),

  http.get(`${API}/me/listings`, async () => {
    const failure = await network()
    if (failure) return failure
    const me = authDb.current()
    return me ? HttpResponse.json<OwnListing[]>(listingsDb.ownedBy(me.id)) : authRequired()
  }),

  http.get(`${API}/me/listings/:id`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure
    const result = ownListing(String(params.id))
    // Someone else's listing is "not found" here, so its existence isn't revealed (QA-16)
    if ('response' in result) return result.response.status === 403 ? notFound() : result.response
    return HttpResponse.json(result.listing)
  }),

  http.post(`${API}/listings`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure
    const me = authDb.current()
    if (!me) return authRequired()

    const body = pickInput((await request.json()) as Partial<ListingInput>)
    const listing = listingsDb.create(me.id, { ...emptyListingInput, areaId: me.areaId, ...body })
    return HttpResponse.json(listing, { status: 201 })
  }),

  http.patch(`${API}/listings/:id`, async ({ params, request }) => {
    const failure = await network()
    if (failure) return failure
    const result = ownListing(String(params.id))
    if ('response' in result) return result.response
    const { listing } = result
    if (['CLOSED', 'COMPLETED', 'REMOVED'].includes(listing.status)) {
      return json(409, 'INVALID_STATE', 'This listing can no longer be edited')
    }

    const before = ownToInput(listing)
    const input = { ...before, ...pickInput((await request.json()) as Partial<ListingInput>) }
    if (listing.status === 'DRAFT') return HttpResponse.json(listingsDb.update(listing.id, input))

    // Published listings must stay complete
    const errors = validateListing(input, runtimeConfig)
    if (Object.keys(errors).length) {
      return json(422, 'VALIDATION_ERROR', 'Check the highlighted fields', { field_errors: errors })
    }
    const quickSellChanged = input.quickSell !== before.quickSell || input.quickSellHours !== before.quickSellHours
    return HttpResponse.json(
      listingsDb.update(
        listing.id,
        input,
        quickSellChanged ? { urgencyEndsAt: input.quickSell ? deadline(input.quickSellHours) : null } : {},
      ),
    )
  }),

  http.delete(`${API}/listings/:id`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure
    const result = ownListing(String(params.id))
    if ('response' in result) return result.response
    if (result.listing.status !== 'DRAFT') return json(409, 'INVALID_STATE', 'Only drafts can be discarded')
    listingsDb.remove(result.listing.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/listings/:id/publish`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure
    const result = ownListing(String(params.id))
    if ('response' in result) return result.response
    const { listing } = result
    if (listing.status !== 'DRAFT') return json(409, 'INVALID_STATE', 'This listing is already published')

    const input = ownToInput(listing)
    const errors = validateListing(input, runtimeConfig)
    if (Object.keys(errors).length) {
      return json(422, 'VALIDATION_ERROR', 'Some details are missing', { field_errors: errors })
    }

    const key = (l: Pick<OwnListing, 'title' | 'categoryId'>) => `${l.categoryId}:${l.title.trim().toLowerCase()}`
    const duplicate = listingsDb
      .ownedBy(authDb.current()!.id)
      .find((l) => l.id !== listing.id && LIVE.includes(l.status) && key(l) === key(listing))
    if (duplicate) {
      return json(409, 'DUPLICATE_ITEM', 'You already have this item listed', {
        details: { existingSlug: duplicate.slug, existingId: duplicate.id },
      })
    }

    const published = listingsDb.update(listing.id, input, {
      status: listingsDb.goesLive() ? 'ACTIVE' : 'PENDING_REVIEW',
      publishedAt: new Date().toISOString(),
      slug: listingsDb.newSlug(input.title, listing.id),
      urgencyEndsAt: input.quickSell ? deadline(input.quickSellHours) : null,
    })
    return HttpResponse.json(published)
  }),

  http.post(`${API}/listings/:id/close`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure
    const result = ownListing(String(params.id))
    if ('response' in result) return result.response
    const { listing } = result
    if (!['ACTIVE', 'PENDING_REVIEW', 'EXPIRED'].includes(listing.status)) {
      return json(409, 'INVALID_STATE', 'This listing can’t be closed now')
    }
    return HttpResponse.json(listingsDb.update(listing.id, ownToInput(listing), { status: 'CLOSED' }))
  }),

  http.post(`${API}/listings/:id/renew`, async ({ params, request }) => {
    const failure = await network()
    if (failure) return failure
    const result = ownListing(String(params.id))
    if ('response' in result) return result.response
    const { listing } = result
    if (listing.status !== 'EXPIRED') return json(409, 'INVALID_STATE', 'Only expired listings can be renewed')

    const { quickSellHours = null } = (await request.json()) as { quickSellHours?: number | null }
    if (quickSellHours !== null && !runtimeConfig.quickSellOptionsHours.includes(quickSellHours)) {
      return json(422, 'VALIDATION_ERROR', 'Choose a Quick Sell length', {
        field_errors: { quickSellHours: 'Choose how long Quick Sell runs.' },
      })
    }
    const input = { ...ownToInput(listing), quickSell: quickSellHours !== null, quickSellHours }
    return HttpResponse.json(
      listingsDb.update(listing.id, input, { status: 'ACTIVE', urgencyEndsAt: deadline(quickSellHours) }),
    )
  }),
]
