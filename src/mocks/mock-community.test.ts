import { beforeEach, describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockFeed } from '@/mocks/db/feed'
import { mockListings } from '@/mocks/db/listings'
import { mockMessages } from '@/mocks/db/messages'
import { mockOffers } from '@/mocks/db/offers'
import type {
  AppNotification,
  ChatMessage,
  ConversationDetail,
  FeedComment,
  FeedPost,
  ListingSummary,
  NotificationCounts,
  Paginated,
  SavedIds,
} from '@/types/api'

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('Expected the request to fail')
    },
    (e: unknown) => {
      if (!isApiError(e)) throw e
      return e
    },
  )

const get = async <T>(path: string) => (await apiClient.get<T>(path)).data
const feedPage = (cursor?: string) => get<Paginated<FeedPost>>(`/feed${cursor ? `?cursor=${cursor}` : ''}`)

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('mock feed API', () => {
  it('pages newest first without repeating a post', async () => {
    const first = await feedPage()
    const second = await feedPage(first.nextCursor!)
    const ids = [...first.items, ...second.items].map((p) => p.id)

    expect(first.items[0]!.id).toBe('p-switch')
    expect(new Set(ids).size).toBe(ids.length)
    expect(second.nextCursor).not.toBeNull()
  })

  it('joins each post with its listing as it is now (FE-FED-01)', async () => {
    mockListings.expire('l2')
    const posts = (await feedPage()).items

    expect(posts.find((p) => p.id === 'p-macbook')!.listing!.status).toBe('EXPIRED')
    expect(posts.find((p) => p.id === 'p-xbox')!.listing!.status).toBe('RESERVED')
  })

  it('removes the post with its listing, and keeps no caption (ruling R6-2)', async () => {
    const all = [...(await feedPage()).items, ...(await feedPage('5')).items, ...(await feedPage('10')).items]
    const gone = all.filter((p) => p.removed)

    expect(gone.map((p) => p.id).sort()).toEqual(['p-ipad-removed', 'p-removed-listing'])
    expect(gone.every((p) => p.listing === null && p.caption === '')).toBe(true)
  })

  it('shares only the member’s own active listing, once (FE-FED-06)', async () => {
    const theirs = await fail(apiClient.post('/feed', { listingId: 'l2', caption: 'Not mine' }))
    expect(theirs.status).toBe(422)

    const twice = await fail(apiClient.post('/feed', { listingId: 'l1', caption: 'Again' }))
    expect(twice.code).toBe('ALREADY_SHARED')

    const created = (await apiClient.post<FeedPost>('/feed', { listingId: 'l6', caption: 'Space Grey, like new' })).data
    expect(created.listing!.id).toBe('l6')
    expect((await feedPage()).items[0]!.id).toBe(created.id)
  })

  it('lists comments newest first, without the text of removed ones', async () => {
    const comments = await get<FeedComment[]>('/feed/p-switch/comments')

    expect(comments.map((c) => c.id)).toEqual(['c-3', 'c-2', 'c-1'])
    expect(comments[0]).toMatchObject({ removed: true, body: '' })
  })

  it('adds a comment, notifies the author, and throttles bursts', async () => {
    const comment = (await apiClient.post<FeedComment>('/feed/p-switch/comments', { body: 'Still available?' })).data
    expect((await get<FeedComment[]>('/feed/p-switch/comments'))[0]!.id).toBe(comment.id)

    mockAuth.signInAs('u-zainab')
    expect((await get<AppNotification[]>('/notifications'))[0]).toMatchObject({
      kind: 'COMMENT',
      title: 'Tolu A. commented on your post',
    })

    mockFeed.rateLimitNextComment()
    const limited = await fail(apiClient.post('/feed/p-switch/comments', { body: 'Hello' }))
    expect(limited.status).toBe(429)
  })

  it('asks guests to sign in before commenting', async () => {
    mockAuth.reset()
    const error = await fail(apiClient.post('/feed/p-switch/comments', { body: 'Hi' }))
    expect(error.status).toBe(401)
  })
})

describe('mock saved API', () => {
  it('saves idempotently and unsaves', async () => {
    await apiClient.put('/saved/listing/l2')
    await apiClient.put('/saved/listing/l2')
    expect((await get<SavedIds>('/saved/ids')).listings.filter((id) => id === 'l2')).toHaveLength(1)

    await apiClient.delete('/saved/listing/l2')
    expect((await get<SavedIds>('/saved/ids')).listings).not.toContain('l2')
  })

  it('returns saved listings in their true state (FE-SAV-01)', async () => {
    const saved = await get<ListingSummary[]>('/saved/listings')

    expect(saved.find((l) => l.id === 'l15')!.status).toBe('EXPIRED')
    expect(saved.find((l) => l.id === 'l5')!.status).toBe('ACTIVE')
  })

  it('returns saved posts with their live listing', async () => {
    const posts = await get<FeedPost[]>('/saved/posts')
    expect(posts.map((p) => p.id)).toEqual(['p-macbook', 'p-xbox'])
    expect(posts[1]!.listing!.status).toBe('RESERVED')
  })
})

describe('mock messages API', () => {
  const open = async (body: object) => (await apiClient.post<{ id: string }>('/conversations', body)).data.id
  const thread = (id: string) => get<ConversationDetail>(`/conversations/${id}`)

  it('opens one conversation per listing and pair, from an offer or a deal (ruling R6-5)', async () => {
    const fromOffer = await open({ offerId: 'o-xbox-accepted' })
    const fromDeal = await open({ transactionId: 't-o-xbox-accepted' })
    expect(fromOffer).toBe('m-xbox')
    expect(fromDeal).toBe('m-xbox')

    const fresh = await open({ offerId: 'o-ps4-counter' })
    expect(fresh).not.toBe('m-xbox')
    expect(await open({ offerId: 'o-ps4-counter' })).toBe(fresh)
  })

  it('hides other people’s conversations', async () => {
    mockAuth.signInAs('u-zainab')
    expect((await fail(thread('m-xbox'))).status).toBe(404)
  })

  it('stores a retried message once (FE-MSG-02)', async () => {
    const send = () =>
      apiClient.post<ChatMessage>('/conversations/m-xbox/messages', { clientId: 'client-1', body: 'See you at 3' })
    const first = (await send()).data
    const again = (await send()).data

    expect(again.id).toBe(first.id)
    expect((await thread('m-xbox')).messages.filter((m) => m.clientId === 'client-1')).toHaveLength(1)
  })

  it('shows each offer version as a card with the offer’s current status (ruling R6-6)', async () => {
    const { messages } = await thread('m-xbox')
    const cards = messages.filter((m) => m.kind === 'offer')

    expect(cards.map((c) => c.offer!.versionNumber)).toEqual([1, 2, 3])
    expect(cards.every((c) => c.offer!.offerStatus === 'ACCEPTED')).toBe(true)
    expect(cards.map((c) => c.offer!.current)).toEqual([false, false, true])
    expect(messages.find((m) => m.kind === 'event')!.link).toBe('/transactions/t-o-xbox-accepted')
  })

  it('adds a card when an offer is countered', async () => {
    expect((await thread('m-macbook')).messages.filter((m) => m.kind === 'offer')).toHaveLength(1)

    // Acting as Chidi, the toolbar control has Tolu counter
    mockAuth.signInAs('u-chidi')
    mockOffers.otherPartyCounters('o-macbook-for-iphone')
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    const cards = (await thread('m-macbook')).messages.filter((m) => m.kind === 'offer')
    expect(cards).toHaveLength(2)
    expect(cards[1]!.offer).toMatchObject({ authorId: 'u-tolu', current: true, versionNumber: 2 })
    expect(cards[0]!.offer!.current).toBe(false)
  })

  it('hides moderated text and refuses sends once blocked (FE-MSG-06)', async () => {
    const moderated = (await thread('m-xbox')).messages.find((m) => m.moderated)!
    expect(moderated.body).toBe('')

    mockMessages.toggleBlockedByOther('m-xbox')
    expect((await thread('m-xbox')).blocked).toBe('by-them')
    const refused = await fail(
      apiClient.post('/conversations/m-xbox/messages', { clientId: 'client-2', body: 'Hello?' }),
    )
    expect(refused.status).toBe(403)
  })

  it('counts unread messages until the thread is read', async () => {
    expect((await get<NotificationCounts>('/notifications/counts')).messages).toBe(1)
    await apiClient.post('/conversations/m-macbook/read')
    expect((await get<NotificationCounts>('/notifications/counts')).messages).toBe(0)
  })
})

describe('mock notifications API', () => {
  it('tells the other person when someone acts on an offer (MSG-03)', async () => {
    mockAuth.signInAs('u-zainab')
    await apiClient.post('/offers/o-switch-waiting/decline', {}, { headers: idempotencyHeaders('decline-switch') })

    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    expect((await get<AppNotification[]>('/notifications'))[0]).toMatchObject({
      kind: 'OFFER_DECLINED',
      title: 'Zainab M. declined your offer',
      link: '/offers/o-switch-waiting',
      read: false,
    })
  })

  it('marks one or all as read', async () => {
    const unread = async () => (await get<NotificationCounts>('/notifications/counts')).notifications
    expect(await unread()).toBe(2)

    await apiClient.post('/notifications/n-ps4/read')
    expect(await unread()).toBe(1)

    await apiClient.post('/notifications/read-all')
    expect(await unread()).toBe(0)
  })
})
