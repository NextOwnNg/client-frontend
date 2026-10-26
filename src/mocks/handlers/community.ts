import { http, HttpResponse, type RequestHandler } from 'msw'
import { CAPTION_MAX, COMMENT_MAX } from '@/features/feed/feed-limits'
import { MESSAGE_MAX } from '@/features/messages/message-limits'
import { apiBaseUrl } from '@/lib/env'
import { authDb } from '@/mocks/db/auth'
import { feedDb } from '@/mocks/db/feed'
import { listingsDb, toSummary } from '@/mocks/db/listings'
import { messagesDb } from '@/mocks/db/messages'
import { notificationsDb } from '@/mocks/db/notifications'
import { offersDb } from '@/mocks/db/offers'
import { savedDb } from '@/mocks/db/saved'
import { transactionsDb } from '@/mocks/db/transactions'
import { network } from '@/mocks/handlers/network'
import type { FeedComment, FeedPost, ListingSummary, NotificationCounts, Paginated, SavedKind } from '@/types/api'

const API = apiBaseUrl
const FEED_PAGE = 5

const json = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ code, message, ...extra }, { status })
const notFound = (message: string) => json(404, 'NOT_FOUND', message)
const invalid = (field_errors: Record<string, string>) =>
  json(422, 'VALIDATION_ERROR', 'Check the highlighted details', { field_errors })

async function readMe() {
  const failure = await network()
  if (failure) return { response: failure }
  const me = authDb.current()
  return me ? { me } : { response: json(401, 'AUTH_REQUIRED', 'Sign in to continue') }
}

const body = async (request: Request) => ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Saved listings keep only what's safe once a listing is removed (as on the listing page). */
function savedListing(id: string): ListingSummary[] {
  const detail = listingsDb.byIdOrSlug(id)?.detail
  if (!detail || detail.status === 'DRAFT') return []
  const summary = toSummary(detail)
  if (summary.status !== 'REMOVED') return [summary]
  return [
    {
      ...summary,
      title: 'Listing removed',
      defectSummary: undefined,
      askingKobo: null,
      cover: { url: '', alt: '', width: 1, height: 1 },
    },
  ]
}

const feedHandlers: RequestHandler[] = [
  http.get(`${API}/feed`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure
    const cursor = Number(new URL(request.url).searchParams.get('cursor') ?? 0)
    return HttpResponse.json<Paginated<FeedPost>>(feedDb.page(Number.isFinite(cursor) ? cursor : 0, FEED_PAGE))
  }),

  http.get(`${API}/feed/:id`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure
    const post = feedDb.get(String(params.id))
    return post ? HttpResponse.json(feedDb.view(post)) : notFound('Post not found')
  }),

  http.post(`${API}/feed`, async ({ request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    if (auth.me.restricted) return json(403, 'ACCOUNT_RESTRICTED', 'Your account can’t post right now')
    const input = await body(request)
    const listingId = text(input.listingId)
    const caption = text(input.caption)
    const record = listingsDb.byIdOrSlug(listingId)
    // Only the owner's own active listing can be shared (FE-FED-06)
    if (!record || record.ownerId !== auth.me.id || record.detail.status !== 'ACTIVE') {
      return invalid({ listingId: 'Choose one of your active listings.' })
    }
    if (!caption) return invalid({ caption: 'Add a short caption.' })
    if (caption.length > CAPTION_MAX) return invalid({ caption: `Keep it under ${CAPTION_MAX} characters.` })
    if (feedDb.postFor(record.detail.id)) return json(409, 'ALREADY_SHARED', 'You’ve already shared this listing')
    return HttpResponse.json(feedDb.create(auth.me.id, record.detail.id, caption), { status: 201 })
  }),

  http.get(`${API}/feed/:id/comments`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure
    if (!feedDb.get(String(params.id))) return notFound('Post not found')
    return HttpResponse.json<FeedComment[]>(feedDb.comments(String(params.id)))
  }),

  http.post(`${API}/feed/:id/comments`, async ({ params, request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    if (auth.me.restricted) return json(403, 'ACCOUNT_RESTRICTED', 'Your account can’t comment right now')
    const post = feedDb.get(String(params.id))
    if (!post || feedDb.view(post).removed) return notFound('Post not found')
    if (feedDb.takeRateLimit()) {
      return json(429, 'RATE_LIMITED', 'Too many comments', { retry_after_seconds: 60 })
    }
    const comment = text((await body(request)).body)
    if (!comment) return invalid({ body: 'Write a comment first.' })
    if (comment.length > COMMENT_MAX) return invalid({ body: `Keep it under ${COMMENT_MAX} characters.` })
    return HttpResponse.json(feedDb.addComment(post, auth.me.id, comment), { status: 201 })
  }),
]

const kinds: SavedKind[] = ['listing', 'post']

const savedHandlers: RequestHandler[] = [
  http.get(`${API}/saved/ids`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(savedDb.ids(auth.me.id))
  }),

  http.get(`${API}/saved/listings`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(savedDb.ids(auth.me.id).listings.flatMap(savedListing))
  }),

  http.get(`${API}/saved/posts`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(feedDb.views(savedDb.ids(auth.me.id).posts))
  }),

  ...(['put', 'delete'] as const).map((method) =>
    http[method](`${API}/saved/:kind/:id`, async ({ params }) => {
      const auth = await readMe()
      if ('response' in auth) return auth.response
      const kind = String(params.kind) as SavedKind
      const id = String(params.id)
      if (!kinds.includes(kind)) return notFound('Nothing to save')
      const exists = kind === 'listing' ? Boolean(listingsDb.byIdOrSlug(id)) : Boolean(feedDb.get(id))
      if (method === 'put' && !exists) return notFound('Nothing to save')
      savedDb.set(auth.me.id, kind, id, method === 'put')
      return HttpResponse.json(savedDb.ids(auth.me.id))
    }),
  ),
]

const messageHandlers: RequestHandler[] = [
  http.get(`${API}/conversations`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(messagesDb.forUser(auth.me.id))
  }),

  /** Finds or starts the conversation for an offer or a deal (ruling R6-5). */
  http.post(`${API}/conversations`, async ({ request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const input = await body(request)
    const offerId = text(input.offerId) || transactionsDb.get(text(input.transactionId), auth.me.id)?.offerId
    const offer = offerId ? offersDb.get(offerId, auth.me.id) : undefined
    if (!offer) return notFound('Nothing to message about')
    return HttpResponse.json({ id: messagesDb.open(offer).id })
  }),

  http.get(`${API}/conversations/:id`, async ({ params }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    // Someone else's conversation is "not found", so its existence isn't revealed
    const conv = messagesDb.get(String(params.id), auth.me.id)
    return conv ? HttpResponse.json(messagesDb.detail(conv, auth.me.id)) : notFound('Conversation not found')
  }),

  http.post(`${API}/conversations/:id/messages`, async ({ params, request }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const conv = messagesDb.get(String(params.id), auth.me.id)
    if (!conv) return notFound('Conversation not found')
    if (conv.blockedBy) return json(403, 'BLOCKED', 'You can’t send messages in this conversation')
    const input = await body(request)
    const clientId = text(input.clientId)
    const message = text(input.body)
    if (!clientId) return invalid({ clientId: 'Missing client message id.' })
    if (!message) return invalid({ body: 'Write a message first.' })
    if (message.length > MESSAGE_MAX) return invalid({ body: `Keep it under ${MESSAGE_MAX} characters.` })
    const stored = messagesDb.send(conv, auth.me.id, clientId, message)
    return HttpResponse.json(
      messagesDb.detail(conv, auth.me.id).messages.find((m) => m.id === stored.id),
      { status: 201 },
    )
  }),

  http.post(`${API}/conversations/:id/read`, async ({ params }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    const conv = messagesDb.get(String(params.id), auth.me.id)
    if (!conv) return notFound('Conversation not found')
    messagesDb.markRead(conv, auth.me.id)
    return new HttpResponse(null, { status: 204 })
  }),
]

const notificationHandlers: RequestHandler[] = [
  http.get(`${API}/notifications`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json(notificationsDb.forUser(auth.me.id))
  }),

  http.get(`${API}/notifications/counts`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return HttpResponse.json<NotificationCounts>({
      notifications: notificationsDb.unread(auth.me.id),
      messages: messagesDb.unread(auth.me.id),
    })
  }),

  http.post(`${API}/notifications/read-all`, async () => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    notificationsDb.readAll(auth.me.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/notifications/:id/read`, async ({ params }) => {
    const auth = await readMe()
    if ('response' in auth) return auth.response
    return notificationsDb.markRead(auth.me.id, String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : notFound('Notification not found')
  }),
]

export const communityHandlers: RequestHandler[] = [
  ...feedHandlers,
  ...savedHandlers,
  ...messageHandlers,
  ...notificationHandlers,
]
