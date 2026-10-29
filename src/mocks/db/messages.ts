import { authDb } from '@/mocks/db/auth'
import { listingsDb, toSummary } from '@/mocks/db/listings'
import { currentVersion, offersDb, type StoredOffer } from '@/mocks/db/offers'
import { transactionsDb } from '@/mocks/db/transactions'
import { mockTrust, trustDb } from '@/mocks/db/trust'
import { seedConversations, type StoredConversation, type StoredMessage } from '@/mocks/fixtures/community'
import type { ChatMessage, Conversation, ConversationDetail } from '@/types/api'

/**
 * The mock API's chats (MSG-01). FICTIONAL. One conversation per listing and pair of people, opened from an
 * offer or a deal (ruling R6-5). Offer cards and the "deal started" line are built from the offers and deals
 * each time a thread is read, so they always carry the offer's current status (ruling R6-6).
 */

const STORAGE_KEY = 'nextown-mock-messages'
const persistent = import.meta.env.MODE !== 'test'

let conversations: StoredConversation[] = []
let messages: StoredMessage[] = []
let counter = 0

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations, messages }))
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function seed() {
  const seeded = seedConversations()
  conversations = seeded.conversations
  messages = seeded.messages
}

function load() {
  seed()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { conversations: StoredConversation[]; messages: StoredMessage[] }
    conversations = saved.conversations
    messages = saved.messages
  } catch {
    // Corrupted entry: start from the seeded chats
  }
}
load()

const byTime = (a: { createdAt: string }, b: { createdAt: string }) => Date.parse(a.createdAt) - Date.parse(b.createdAt)

function offersOf(conv: StoredConversation, viewerId: string): StoredOffer[] {
  return conv.offerIds.flatMap((id) => {
    const offer = offersDb.get(id, viewerId)
    return offer ? [offer] : []
  })
}

function thread(conv: StoredConversation, viewerId: string): ChatMessage[] {
  const text: ChatMessage[] = messages
    .filter((m) => m.conversationId === conv.id)
    .map((m) => ({
      id: m.id,
      clientId: m.clientId,
      senderId: m.senderId,
      kind: 'text',
      body: m.moderated ? '' : m.body,
      moderated: m.moderated || undefined,
      createdAt: m.createdAt,
    }))

  const listingTitle = listingsDb.byIdOrSlug(conv.listingId)?.detail.title ?? 'Listing'
  const cards = offersOf(conv, viewerId).flatMap((offer) => {
    const latest = currentVersion(offer)
    const versions: ChatMessage[] = offer.versions.map(({ id, number, authorId, createdAt, ...terms }) => ({
      id: `card-${id}`,
      clientId: `card-${id}`,
      senderId: authorId,
      kind: 'offer',
      body: '',
      offer: {
        offerId: offer.id,
        versionNumber: number,
        authorId,
        terms,
        listingTitle,
        itemTitle: terms.offeredItemId ? (offersDb.item(terms.offeredItemId)?.item.title ?? null) : null,
        offerStatus: offer.status,
        current: id === latest.id,
      },
      createdAt,
    }))
    const tx = offer.transactionId ? transactionsDb.get(offer.transactionId, viewerId) : undefined
    if (tx) {
      versions.push({
        id: `event-${tx.id}`,
        clientId: `event-${tx.id}`,
        senderId: '',
        kind: 'event',
        body: 'Offer accepted. The deal has started.',
        link: `/transactions/${tx.id}`,
        createdAt: tx.createdAt,
      })
    }
    return versions
  })

  return [...cards, ...text].sort(byTime)
}

function summary(conv: StoredConversation, viewerId: string): Conversation {
  const all = thread(conv, viewerId)
  const offer = offersOf(conv, viewerId).at(-1)!
  const listing = listingsDb.byIdOrSlug(conv.listingId)!.detail
  const last = all.at(-1)
  const readAt = Date.parse(conv.readAt[viewerId] ?? '1970-01-01T00:00:00Z')
  const otherId = conv.userIds.find((id) => id !== viewerId)!
  return {
    id: conv.id,
    listing: toSummary(listing),
    other: authDb.seller(otherId),
    viewerRole: offer.offererId === viewerId ? 'offerer' : 'owner',
    offerId: offer.id,
    offerStatus: offer.status,
    transactionId: offer.transactionId,
    transactionStatus: offer.transactionId ? transactionsDb.statusOf(offer.transactionId) : undefined,
    blocked: trustDb.isBlocked(viewerId, otherId) ? 'by-me' : trustDb.isBlocked(otherId, viewerId) ? 'by-them' : 'none',
    lastMessage: last && {
      body: last.kind === 'offer' ? `Offer · version ${last.offer!.versionNumber}` : last.moderated ? '' : last.body,
      senderId: last.senderId,
      createdAt: last.createdAt,
      kind: last.kind,
    },
    unreadCount: all.filter((m) => m.kind === 'text' && m.senderId === otherId && Date.parse(m.createdAt) > readAt)
      .length,
    updatedAt: last?.createdAt ?? conv.createdAt,
  }
}

export const messagesDb = {
  forUser(userId: string): Conversation[] {
    return conversations
      .filter((c) => c.userIds.includes(userId))
      .map((c) => summary(c, userId))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  },

  get(id: string, userId: string) {
    const conv = conversations.find((c) => c.id === id)
    return conv?.userIds.includes(userId) ? conv : undefined
  },

  detail(conv: StoredConversation, userId: string): ConversationDetail {
    return { ...summary(conv, userId), messages: thread(conv, userId) }
  },

  /** The conversation for this offer's listing and people, created on first use. */
  open(offer: StoredOffer): StoredConversation {
    const pair = [offer.offererId, offer.ownerId]
    let conv = conversations.find((c) => c.listingId === offer.listingId && pair.every((id) => c.userIds.includes(id)))
    if (!conv) {
      conv = {
        id: newId('m'),
        listingId: offer.listingId,
        userIds: pair,
        offerIds: [],
        readAt: {},
        createdAt: new Date().toISOString(),
      }
      conversations.push(conv)
    }
    if (!conv.offerIds.includes(offer.id)) conv.offerIds.push(offer.id)
    save()
    return conv
  },

  /** Stores the message once per client id (FE-MSG-02): a retry returns the first copy. */
  send(conv: StoredConversation, senderId: string, clientId: string, body: string) {
    const existing = messages.find((m) => m.conversationId === conv.id && m.clientId === clientId)
    if (existing) return existing
    const message: StoredMessage = {
      id: newId('msg'),
      conversationId: conv.id,
      clientId,
      senderId,
      body,
      moderated: false,
      createdAt: new Date().toISOString(),
    }
    messages.push(message)
    conv.readAt[senderId] = message.createdAt
    save()
    return message
  },

  markRead(conv: StoredConversation, userId: string) {
    conv.readAt[userId] = new Date().toISOString()
    save()
  },

  unread(userId: string) {
    return messagesDb.forUser(userId).reduce((sum, c) => sum + c.unreadCount, 0)
  },
}

/** The dev toolbar's target: the given conversation, or the member's newest one. */
function target(id?: string) {
  const me = authDb.current()?.id
  if (!me) return undefined
  if (id) return messagesDb.get(id, me)
  const newest = messagesDb.forUser(me)[0]
  return newest && messagesDb.get(newest.id, me)
}

const replies = [
  'Sounds good. Is the battery still holding a full day?',
  'I can do Saturday afternoon if that works for you.',
  'Thanks! I’ll bring the charger along.',
]

/** Controls for the dev toolbar and tests. Each one acts as the other person, or as a moderator. */
export const mockMessages = {
  otherPartyReplies(id?: string, body?: string) {
    const conv = target(id)
    const me = authDb.current()?.id
    if (!conv || !me) return false
    const other = conv.userIds.find((u) => u !== me)!
    const text = body ?? replies[messages.filter((m) => m.conversationId === conv.id).length % replies.length]!
    messagesDb.send(conv, other, newId('client'), text)
    return true
  },
  moderateLastFromOther(id?: string) {
    const conv = target(id)
    const me = authDb.current()?.id
    const last = conv && [...messages].reverse().find((m) => m.conversationId === conv.id && m.senderId !== me)
    if (!last) return false
    last.moderated = true
    save()
    return true
  },
  /** Toggles the other person blocking the member. */
  toggleBlockedByOther(id?: string) {
    const conv = target(id)
    const me = authDb.current()?.id
    if (!conv || !me) return false
    mockTrust.toggleBlockedBy(
      conv.userIds.find((u) => u !== me)!,
      me,
    )
    return true
  },
  reset() {
    seed()
  },
}
