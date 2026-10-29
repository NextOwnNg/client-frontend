import { http, HttpResponse, type RequestHandler } from 'msw'
import { toPayload, validateTerms } from '@/features/offers/offer-terms'
import { apiBaseUrl } from '@/lib/env'
import { authDb } from '@/mocks/db/auth'
import { listingsDb } from '@/mocks/db/listings'
import { currentVersion, offersDb, turnOf, type StoredOffer } from '@/mocks/db/offers'
import { trustDb } from '@/mocks/db/trust'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { network } from '@/mocks/handlers/network'
import type { Me, NewOffer, OfferItemInput, OfferTerms } from '@/types/api'

const API = apiBaseUrl

const json = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ code, message, ...extra }, { status })
const authRequired = () => json(401, 'AUTH_REQUIRED', 'Sign in to continue')
const notFound = () => json(404, 'NOT_FOUND', 'Offer not found')
const forbidden = (message = 'This action isn’t available.') => json(403, 'FORBIDDEN', message)
/** Either person blocked the other: offers between them stop, whoever blocked (QA-18, OFF-05). */
const blocked = () => json(403, 'BLOCKED', 'You can’t make or answer offers with this person.')
const invalid = (field_errors: Record<string, string>) =>
  json(422, 'VALIDATION_ERROR', 'Check the highlighted details', { field_errors })

const keyOf = (request: Request) => request.headers.get('Idempotency-Key')

const termsFrom = (body: Partial<OfferTerms>): OfferTerms => ({
  mode: body.mode ?? 'CASH',
  offeredItemId: body.offeredItemId ?? null,
  cashKobo: Number.isInteger(body.cashKobo) ? body.cashKobo! : -1,
  cashDirection: body.cashDirection ?? 'NONE',
  note: typeof body.note === 'string' ? body.note : '',
})

/**
 * Runs a write once per idempotency key: a repeat returns the current state of what the first one made.
 * With the dev toolbar's "saves then fails", the change is kept but the answer is lost (QA-21).
 */
function once(request: Request, me: Me, write: () => Response | { offer: StoredOffer; status?: number }): Response {
  const key = keyOf(request)
  const replay = offersDb.replay(key, me.id)
  if (replay) {
    const offer = offersDb.get(replay.offerId, me.id)!
    return HttpResponse.json(offersDb.view(offer, me.id), { status: replay.status })
  }
  const result = write()
  if (result instanceof Response) return result
  const status = result.status ?? 200
  offersDb.remember(key, { userId: me.id, offerId: result.offer.id, status })
  if (offersDb.takeFailAfterSave()) return json(503, 'SERVER_ERROR', 'Simulated failure after saving')
  return HttpResponse.json(offersDb.view(result.offer, me.id), { status })
}

/** The participant's offer, still open, or the response to send instead (PRD §7.5 order of checks). */
function openOffer(id: string, me: Me): { offer: StoredOffer } | { response: Response } {
  const offer = offersDb.get(id, me.id)
  if (!offer) return { response: notFound() }
  if (offer.status === 'EXPIRED') return { response: json(410, 'OFFER_EXPIRED', 'This offer has expired') }
  if (offer.status === 'CLOSED_UNAVAILABLE') {
    return { response: json(409, 'ITEM_UNAVAILABLE', offer.closedReason ?? 'This item is no longer available') }
  }
  if (offer.status !== 'PENDING') return { response: json(409, 'INVALID_STATE', 'This offer is closed') }
  return { offer }
}

/** The offered item must be the offerer's own and free to trade. */
function itemProblem(terms: OfferTerms, offererId: string): string | null {
  if (!terms.offeredItemId) return null
  const found = offersDb.item(terms.offeredItemId)
  if (!found || found.ownerId !== offererId) return 'Choose one of your own items.'
  if (!found.item.available)
    return `${found.item.title} is ${found.item.unavailableReason?.toLowerCase() ?? 'not available'}.`
  return null
}

async function readMe() {
  const failure = await network()
  if (failure) return { response: failure }
  const me = authDb.current()
  return me ? { me } : { response: authRequired() }
}

export const offersHandlers: RequestHandler[] = [
  http.get(`${API}/offers`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(offersDb.forUser(auth.me.id))
  }),

  http.get(`${API}/offers/:id`, async ({ params }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    // Someone else's offer is "not found", so its existence isn't revealed (QA-16)
    const offer = offersDb.get(String(params.id), auth.me.id)
    if (!offer) return notFound()
    const body = offersDb.view(offer, auth.me.id)
    offersDb.markRead(offer, auth.me.id)
    return HttpResponse.json(body)
  }),

  http.post(`${API}/offers`, async ({ request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const { me } = auth
    const body = (await request.json()) as Partial<NewOffer>

    return once(request, me, () => {
      if (me.restricted) return forbidden('Your account can’t make offers right now.')
      const listing = listingsDb.byIdOrSlug(String(body.listingId))
      if (!listing || ['DRAFT', 'PENDING_REVIEW'].includes(listing.detail.status)) {
        return json(404, 'NOT_FOUND', 'Listing not found')
      }
      if (listing.ownerId === me.id) return forbidden('You can’t make an offer on your own listing.')
      if (trustDb.between(me.id, listing.ownerId)) return blocked()
      if (listing.detail.status !== 'ACTIVE') return json(409, 'ITEM_UNAVAILABLE', 'This item is no longer available')

      const existing = offersDb.openOfferOn(listing.detail.id, me.id)
      if (existing) {
        return json(409, 'OFFER_EXISTS', 'You already have an open offer on this item', {
          details: { offerId: existing.id },
        })
      }
      const terms = termsFrom(body)
      const errors = validateTerms(terms, listing.detail.acceptedModes)
      const problem = errors.offeredItemId ? null : itemProblem(terms, me.id)
      if (problem) errors.offeredItemId = problem
      if (Object.keys(errors).length) return invalid(errors)

      return { offer: offersDb.create(listing.detail.id, me.id, listing.ownerId, toPayload(terms)), status: 201 }
    })
  }),

  http.post(`${API}/offers/:id/counter`, async ({ params, request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const { me } = auth
    const body = (await request.json()) as Partial<OfferTerms> & { expectedVersionId?: string }

    return once(request, me, () => {
      const result = openOffer(String(params.id), me)
      if ('response' in result) return result.response
      const { offer } = result
      if (turnOf(offer) !== me.id) return forbidden('It’s the other person’s turn to decide.')
      if (trustDb.between(offer.offererId, offer.ownerId)) return blocked()
      const latest = currentVersion(offer)
      if (body.expectedVersionId !== latest.id) {
        return json(409, 'STALE_OFFER_VERSION', 'The offer has changed')
      }

      const terms = termsFrom(body)
      const listing = listingsDb.byIdOrSlug(offer.listingId)!.detail
      const errors = validateTerms(terms, listing.acceptedModes)
      // A counter adjusts cash and wording; the item and a cash offer's kind stay as they are (ruling R4-3)
      if (terms.offeredItemId !== latest.offeredItemId) {
        errors.offeredItemId = 'A counteroffer keeps the same item. Make a new offer to offer something else.'
      }
      if ((terms.mode === 'CASH') !== (latest.mode === 'CASH')) {
        errors.mode = 'A counteroffer keeps the same kind of offer.'
      }
      if (Object.keys(errors).length) return invalid(errors)

      offersDb.counter(offer, me.id, toPayload(terms))
      return { offer }
    })
  }),

  http.post(`${API}/offers/:id/accept`, async ({ params, request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const { me } = auth
    const body = (await request.json()) as { expectedVersionId?: string }

    return once(request, me, () => {
      const result = openOffer(String(params.id), me)
      if ('response' in result) return result.response
      const { offer } = result
      if (turnOf(offer) !== me.id) return forbidden('It’s the other person’s turn to decide.')
      if (trustDb.between(offer.offererId, offer.ownerId)) return blocked()
      if (body.expectedVersionId !== currentVersion(offer).id) {
        return json(409, 'STALE_OFFER_VERSION', 'The offer has changed')
      }
      const problem = itemProblem(currentVersion(offer), offer.offererId)
      if (problem) return json(409, 'ITEM_UNAVAILABLE', problem)

      offersDb.accept(offer)
      return { offer }
    })
  }),

  ...(['decline', 'withdraw'] as const).map((action) =>
    http.post(`${API}/offers/:id/${action}`, async ({ params, request }) => {
      const auth = await readMe()
      if ('response' in auth) return auth.response
      const { me } = auth

      return once(request, me, () => {
        const result = openOffer(String(params.id), me)
        if ('response' in result) return result.response
        const { offer } = result
        // The owner declines and the offerer withdraws, whoever's turn it is (ruling R4-2)
        const allowed = action === 'decline' ? offer.ownerId === me.id : offer.offererId === me.id
        if (!allowed) return forbidden()
        offersDb.end(offer, action === 'decline' ? 'REJECTED' : 'WITHDRAWN')
        return { offer }
      })
    }),
  ),

  http.get(`${API}/me/items`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(offersDb.itemsOf(auth.me.id))
  }),

  http.post(`${API}/me/items`, async ({ request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const input = (await request.json()) as OfferItemInput

    const errors: Record<string, string> = {}
    if (!input.title?.trim()) errors.title = 'Add a title.'
    if (!input.condition) errors.condition = 'Choose the condition.'
    if ((input.photos?.length ?? 0) < runtimeConfig.photoLimits.min) errors.photos = 'Add at least one photo.'
    if (!input.noDefects && !input.defects?.some((d) => d.trim())) {
      errors.defects = 'List any defects, or tick “No defects to disclose”.'
    }
    if (!input.ownershipConfirmed) errors.ownershipConfirmed = 'Confirm the item is yours to trade.'
    if (Object.keys(errors).length) return invalid(errors)

    return HttpResponse.json(offersDb.createItem(auth.me.id, input), { status: 201 })
  }),
]
