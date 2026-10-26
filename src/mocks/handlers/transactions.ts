import { http, HttpResponse, type RequestHandler } from 'msw'
import { apiBaseUrl } from '@/lib/env'
import { authDb } from '@/mocks/db/auth'
import { transactionsDb, type StoredTransaction } from '@/mocks/db/transactions'
import { network } from '@/mocks/handlers/network'
import type { CancelReason, ConfirmCheck, DisputeCategory, Me } from '@/types/api'

const API = apiBaseUrl
const json = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ code, message, ...extra }, { status })
const invalidState = (message: string) => json(409, 'INVALID_STATE', message)
const invalid = (field_errors: Record<string, string>) =>
  json(422, 'VALIDATION_ERROR', 'Check the highlighted details', { field_errors })

const reasons: CancelReason[] = ['CHANGED_MIND', 'CANT_MEET', 'ITEM_PROBLEM', 'OTHER']
const categories: DisputeCategory[] = ['CONDITION', 'NO_SHOW', 'PAYMENT', 'UNSAFE', 'OTHER']

async function readMe() {
  const failure = await network()
  if (failure) return { response: failure }
  const me = authDb.current()
  return me ? { me } : { response: json(401, 'AUTH_REQUIRED', 'Sign in to continue') }
}

/** Once per idempotency key, as in the offers mock; "saves then fails" loses the answer after saving. */
function once(request: Request, me: Me, id: string, write: (tx: StoredTransaction) => Response | void): Response {
  const key = request.headers.get('Idempotency-Key')
  const replay = transactionsDb.replay(key, me.id)
  const tx = transactionsDb.get(id, me.id)
  // Someone else's deal is "not found", so its existence isn't revealed (QA-16)
  if (!tx) return json(404, 'NOT_FOUND', 'Transaction not found')
  if (replay) return HttpResponse.json(transactionsDb.view(tx, me.id), { status: replay.status })
  const result = write(tx)
  if (result instanceof Response) return result
  transactionsDb.remember(key, { userId: me.id, transactionId: tx.id, status: 200 })
  if (transactionsDb.takeFailAfterSave()) return json(503, 'SERVER_ERROR', 'Simulated failure after saving')
  return HttpResponse.json(transactionsDb.view(tx, me.id))
}

const awaiting = (tx: StoredTransaction) =>
  tx.status === 'AWAITING_HANDOVER' ? null : invalidState('This deal is no longer open')

/** A write on an open deal, by one of its two people. */
function action(
  method: 'post' | 'put' | 'delete',
  path: string,
  write: (tx: StoredTransaction, me: Me, body: Record<string, unknown>) => Response | void,
) {
  return http[method](`${API}/transactions/:id${path}`, async ({ params, request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const body =
      method === 'delete' ? {} : (((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>)
    return once(request, auth.me, String(params.id), (tx) => write(tx, auth.me, body))
  })
}

export const transactionsHandlers: RequestHandler[] = [
  http.get(`${API}/transactions`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(transactionsDb.forUser(auth.me.id))
  }),

  http.get(`${API}/transactions/:id`, async ({ params }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const tx = transactionsDb.get(String(params.id), auth.me.id)
    return tx ? HttpResponse.json(transactionsDb.view(tx, auth.me.id)) : json(404, 'NOT_FOUND', 'Transaction not found')
  }),

  http.get(`${API}/me/reviews`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(transactionsDb.reviewsOf(auth.me.id))
  }),

  action('put', '/meeting', (tx, me, body) => {
    const problem = awaiting(tx)
    if (problem) return problem
    const place = typeof body.place === 'string' ? body.place.trim() : ''
    const time = typeof body.time === 'string' ? body.time : ''
    const errors: Record<string, string> = {}
    if (!place) errors.place = 'Say where you’ll meet.'
    if (!time || Number.isNaN(Date.parse(time))) errors.time = 'Choose a date and time.'
    else if (Date.parse(time) < Date.now()) errors.time = 'Choose a time in the future.'
    if (Object.keys(errors).length) return invalid(errors)
    transactionsDb.proposeMeeting(tx, me.id, {
      place,
      time,
      note: typeof body.note === 'string' ? body.note.trim() : '',
    })
  }),

  action('post', '/meeting/agree', (tx, me) => {
    const problem = awaiting(tx)
    if (problem) return problem
    if (!tx.meeting) return invalidState('There’s no meeting to agree to')
    transactionsDb.agreeMeeting(tx, me.id)
  }),

  action('post', '/confirm', (tx, me, body) => {
    const problem = awaiting(tx)
    if (problem) return problem
    const role = me.id === tx.offererId ? 'offerer' : 'owner'
    if (tx.confirmations[role]) return invalidState('You’ve already confirmed your side')
    const given = Array.isArray(body.checks) ? (body.checks as ConfirmCheck[]) : []
    const missing = transactionsDb.requiredChecks(tx, me.id).filter((c) => !given.includes(c))
    if (missing.length) return invalid(Object.fromEntries(missing.map((c) => [c, 'Tick this to confirm.'])))
    transactionsDb.confirm(tx, me.id)
  }),

  action('post', '/cancellation', (tx, me, body) => {
    const problem = awaiting(tx)
    if (problem) return problem
    // Once someone says the exchange happened, only support can unwind it (ruling R5-3)
    if (tx.confirmations.offerer || tx.confirmations.owner) {
      return invalidState('Someone has already confirmed. Report a problem instead.')
    }
    if (tx.cancellation) return invalidState('A cancellation is already waiting for an answer')
    if (!reasons.includes(body.reason as CancelReason)) return invalid({ reason: 'Choose a reason.' })
    transactionsDb.requestCancel(tx, me.id, body.reason as CancelReason, typeof body.note === 'string' ? body.note : '')
  }),

  action('post', '/cancellation/accept', (tx, me) => {
    const problem = awaiting(tx)
    if (problem) return problem
    if (!tx.cancellation || tx.cancellation.requestedBy === me.id)
      return invalidState('There’s no request for you to answer')
    transactionsDb.acceptCancel(tx)
  }),

  action('post', '/cancellation/decline', (tx, me) => {
    if (!tx.cancellation || tx.cancellation.requestedBy === me.id)
      return invalidState('There’s no request for you to answer')
    transactionsDb.clearCancel(tx)
  }),

  action('delete', '/cancellation', (tx, me) => {
    if (!tx.cancellation || tx.cancellation.requestedBy !== me.id) return invalidState('You haven’t asked to cancel')
    transactionsDb.clearCancel(tx)
  }),

  action('post', '/dispute', (tx, me, body) => {
    if (!['AWAITING_HANDOVER', 'COMPLETED', 'EXPIRED'].includes(tx.status)) {
      return invalidState(
        tx.status === 'DISPUTED' ? 'This deal is already under review' : 'This deal can’t be reported',
      )
    }
    const errors: Record<string, string> = {}
    if (!categories.includes(body.category as DisputeCategory)) errors.category = 'Choose what went wrong.'
    if (typeof body.description !== 'string' || body.description.trim().length < 10) {
      errors.description = 'Describe what happened in a sentence or two.'
    }
    if (Object.keys(errors).length) return invalid(errors)
    transactionsDb.dispute(tx, me.id, body.category as DisputeCategory)
  }),

  action('post', '/review', (tx, me, body) => {
    if (tx.status !== 'COMPLETED') {
      return json(403, 'REVIEW_NOT_ELIGIBLE', 'Reviews are available after both people confirm the exchange.')
    }
    if (tx.reviews.some((r) => r.authorId === me.id))
      return json(409, 'ALREADY_REVIEWED', 'You’ve already reviewed this exchange')
    const rating = Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return invalid({ rating: 'Choose from 1 to 5 stars.' })
    const note = typeof body.note === 'string' ? body.note : ''
    if (note.length > 500) return invalid({ note: 'Keep the note under 500 characters.' })
    transactionsDb.review(tx, me.id, rating, note)
  }),
]
