import { http, HttpResponse, type RequestHandler } from 'msw'
import { apiBaseUrl } from '@/lib/env'
import { authDb } from '@/mocks/db/auth'
import { feedDb } from '@/mocks/db/feed'
import { listingsDb } from '@/mocks/db/listings'
import { messagesDb } from '@/mocks/db/messages'
import { offersDb } from '@/mocks/db/offers'
import { toCase, trustDb } from '@/mocks/db/trust'
import { network } from '@/mocks/handlers/network'
import type {
  BlockedPerson,
  CaseReport,
  Me,
  ReportReason,
  ReportReceipt,
  ReportTarget,
  ReportTargetType,
} from '@/types/api'

const API = apiBaseUrl
const DESCRIPTION_MAX = 2000
const EVIDENCE_MAX = 4
const APPEAL_MIN = 20

const json = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ code, message, ...extra }, { status })
const notFound = (message: string) => json(404, 'NOT_FOUND', message)
const invalid = (field_errors: Record<string, string>) =>
  json(422, 'VALIDATION_ERROR', 'Check the highlighted details', { field_errors })

async function readMe(): Promise<{ me: Me } | { response: Response }> {
  const failure = await network()
  if (failure) return { response: failure }
  const me = authDb.current()
  return me ? { me } : { response: json(401, 'AUTH_REQUIRED', 'Sign in to continue') }
}

const body = async (request: Request) => ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const reasons: ReportReason[] = ['PROHIBITED', 'SCAM', 'MISLEADING', 'HARASSMENT', 'UNSAFE', 'SPAM', 'OTHER']
const reportable: ReportTargetType[] = ['listing', 'post', 'comment', 'conversation', 'offer', 'user']

const person = (id: string) => ({ id, displayName: authDb.seller(id).displayName })
const titleOf = (listingId: string) => listingsDb.byIdOrSlug(listingId)?.detail.title ?? 'a listing'

/**
 * What the reporter is pointing at, as they're allowed to see it. Removed things and other people's private
 * threads are "not found", so a report page never reveals more than the reporter already had.
 */
function resolveTarget(type: ReportTargetType, id: string, viewerId: string): ReportTarget | null {
  switch (type) {
    case 'listing': {
      const record = listingsDb.byIdOrSlug(id)
      if (!record || ['DRAFT', 'PENDING_REVIEW', 'REMOVED'].includes(record.detail.status)) return null
      return { type, id: record.detail.id, label: record.detail.title, author: person(record.ownerId) }
    }
    case 'post': {
      const post = feedDb.get(id)
      if (!post || feedDb.view(post).removed) return null
      return { type, id, label: `A post about “${titleOf(post.listingId)}”`, author: person(post.authorId) }
    }
    case 'comment': {
      const comment = feedDb.comment(id)
      const post = comment && feedDb.get(comment.postId)
      if (!comment || comment.removed || !post) return null
      return { type, id, label: `A comment on “${titleOf(post.listingId)}”`, author: person(comment.authorId) }
    }
    case 'conversation': {
      const conv = messagesDb.get(id, viewerId)
      if (!conv) return null
      const other = conv.userIds.find((u) => u !== viewerId)!
      return { type, id, label: `Messages about “${titleOf(conv.listingId)}”`, author: person(other) }
    }
    case 'offer': {
      const offer = offersDb.get(id, viewerId)
      if (!offer) return null
      const other = offer.offererId === viewerId ? offer.ownerId : offer.offererId
      return { type, id, label: `An offer on “${titleOf(offer.listingId)}”`, author: person(other) }
    }
    case 'user': {
      const profile = authDb.publicProfile(id)
      if (!profile) return null
      return { type, id, label: profile.displayName, author: { id, displayName: profile.displayName } }
    }
    default:
      return null
  }
}

export const trustHandlers: RequestHandler[] = [
  http.get(`${API}/reports/target/:type/:id`, async ({ params }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const type = String(params.type) as ReportTargetType
    const target = reportable.includes(type) ? resolveTarget(type, String(params.id), auth.me.id) : null
    return target ? HttpResponse.json<ReportTarget>(target) : notFound('There’s nothing to report here')
  }),

  /** TRU-03: one case per reporter and target while it's open; a repeat returns the same case. */
  http.post(`${API}/reports`, async ({ request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const input = await body(request)
    const type = String(input.targetType) as ReportTargetType
    const target = reportable.includes(type) ? resolveTarget(type, text(input.targetId), auth.me.id) : null
    if (!target) return notFound('There’s nothing to report here')
    if (target.author?.id === auth.me.id) return invalid({ target: 'You can’t report your own content.' })

    const reason = String(input.reason) as ReportReason
    const description = text(input.description)
    const evidenceIds = Array.isArray(input.evidenceIds) ? input.evidenceIds.map(String) : []
    const errors: Record<string, string> = {}
    if (!reasons.includes(reason)) errors.reason = 'Choose what’s wrong.'
    if (reason === 'OTHER' && description.length < 10)
      errors.description = 'Tell us what happened in a sentence or two.'
    if (description.length > DESCRIPTION_MAX) errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`
    if (evidenceIds.length > EVIDENCE_MAX) errors.evidenceIds = `Add up to ${EVIDENCE_MAX} photos.`
    if (Object.keys(errors).length) return invalid(errors)

    if (input.alsoBlock === true && target.author) trustDb.setBlocked(auth.me.id, target.author.id, true)
    const existing = trustDb.openReport(auth.me.id, type, target.id)
    if (existing) return HttpResponse.json<ReportReceipt>({ report: toCase(existing), duplicate: true })

    const report = trustDb.report({
      reporterId: auth.me.id,
      targetType: type,
      targetId: target.id,
      targetLabel: target.label,
      reason,
      description,
      evidenceIds,
    })
    return HttpResponse.json<ReportReceipt>({ report: toCase(report), duplicate: false }, { status: 201 })
  }),

  http.get(`${API}/me/reports`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json<CaseReport[]>(trustDb.reportsBy(auth.me.id))
  }),

  http.get(`${API}/me/blocks`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const people = trustDb.blockedBy(auth.me.id).map<BlockedPerson>((b) => {
      const { displayName, avatarUrl } = authDb.seller(b.blockedId)
      return { id: b.blockedId, displayName, ...(avatarUrl && { avatarUrl }), blockedAt: b.blockedAt }
    })
    return HttpResponse.json(people)
  }),

  ...(['put', 'delete'] as const).map((method) =>
    http[method](`${API}/me/blocks/:userId`, async ({ params }) => {
      const auth = await readMe()
      if ('response' in auth) return auth.response
      const userId = String(params.userId)
      if (userId === auth.me.id) return invalid({ userId: 'You can’t block yourself.' })
      if (method === 'put' && !authDb.publicProfile(userId)) return notFound('Person not found')
      trustDb.setBlocked(auth.me.id, userId, method === 'put')
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  /** Ruling R7-5: one open appeal at a time, only while restricted. */
  http.post(`${API}/me/appeal`, async ({ request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    if (!auth.me.restricted) return json(409, 'NOT_RESTRICTED', 'Your account isn’t restricted')
    const existing = trustDb.appealOf(auth.me.id)
    if (existing && existing.status !== 'DECIDED') {
      return json(409, 'APPEAL_EXISTS', 'You already asked for a review', { details: { appeal: existing } })
    }
    const message = text((await body(request)).message)
    if (message.length < APPEAL_MIN) return invalid({ message: 'Tell us a little more, in a sentence or two.' })
    if (message.length > DESCRIPTION_MAX) return invalid({ message: `Keep it under ${DESCRIPTION_MAX} characters.` })
    return HttpResponse.json(trustDb.appeal(auth.me.id, message), { status: 201 })
  }),
]
