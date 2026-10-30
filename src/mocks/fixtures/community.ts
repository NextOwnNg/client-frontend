import type { AppNotification, SavedIds } from '@/types/api'

/**
 * FICTIONAL feed posts, comments, chats, saves and alerts for the sample member (Tolu A.), so every
 * Community state can be reviewed: live and reserved listings in the feed, a removed listing and a removed
 * post, a moderated comment and message, an unread question, and a saved listing that has since expired.
 */

export type StoredPost = {
  id: string
  authorId: string
  listingId: string
  caption: string
  createdAt: string
  removed?: boolean
}

export type StoredComment = {
  id: string
  postId: string
  authorId: string
  body: string
  removed: boolean
  createdAt: string
  /** Set on replies; always a top-level comment. Missing in feeds saved before threads. */
  parentId?: string
}

export type StoredConversation = {
  id: string
  listingId: string
  userIds: string[]
  /** Every offer between the two people on this listing, oldest first. */
  offerIds: string[]
  /** When each person last read the thread. */
  readAt: Record<string, string>
  createdAt: string
}

export type StoredMessage = {
  id: string
  conversationId: string
  clientId: string
  senderId: string
  body: string
  moderated: boolean
  createdAt: string
}

const HOUR = 3_600_000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()

const post = (id: string, authorId: string, listingId: string, hoursAgo: number, caption: string, removed = false) => ({
  id,
  authorId,
  listingId,
  caption,
  createdAt: ago(hoursAgo),
  removed: removed || undefined,
})

const comment = (
  id: string,
  postId: string,
  authorId: string,
  hoursAgo: number,
  body: string,
  { removed = false, parentId }: { removed?: boolean; parentId?: string } = {},
): StoredComment => ({
  id,
  postId,
  authorId,
  body,
  removed,
  createdAt: ago(hoursAgo),
  parentId,
})

export function seedFeed(): { posts: StoredPost[]; comments: StoredComment[] } {
  return {
    posts: [
      post(
        'p-switch',
        'u-zainab',
        'l5',
        2,
        'My kids moved on to football, so the Switch has to go. Dock and both Joy-Cons.',
      ),
      post('p-macbook', 'u-chidi', 'l2', 5, 'Upgraded for work. Battery still lasts a full day of lectures.'),
      post('p-ps5', 'u-amaka', 'l3', 8, 'Barely played. Would love a MacBook in a swap.'),
      post('p-xbox', 'u-chidi', 'l10', 12, 'Xbox Series X with two controllers. Weekend gaming sorted.'),
      post('p-iphone', 'u-tolu', 'l1', 20, 'Clean iPhone 12 Pro, always in a case. Open to swaps for a laptop.'),
      post(
        'p-promax',
        'u-ibrahim',
        'l4',
        26,
        'Big screen, big battery. Small scratch on the frame, shown in the photos.',
      ),
      post('p-removed-listing', 'u-chidi', 'l18', 30, 'Removed listing'),
      post('p-microwave', 'u-amaka', 'l11', 40, 'Moving house and can’t take the microwave. Works perfectly.'),
      post('p-fan', 'u-ibrahim', 'l13', 50, 'Old but gold. This fan has survived three NEPA seasons.'),
      post('p-galaxy', 'u-zainab', 'l16', 60, 'For the collectors: the first Samsung Android phone.'),
      post('p-blender', 'u-tolu', 'l12', 70, 'Makes pepper and smoothies. Swapping for anything kitchen.'),
      post('p-ipad-removed', 'u-zainab', 'l8', 80, 'Removed by moderators', true),
    ],
    comments: [
      comment('c-1', 'p-switch', 'u-amaka', 1.5, 'Does it come with both Joy-Cons and the charger?'),
      comment('c-2', 'p-switch', 'u-zainab', 1.2, 'Yes, both Joy-Cons, the grip and the original charger.', {
        parentId: 'c-1',
      }),
      comment('c-3', 'p-switch', 'u-ibrahim', 0.8, 'Removed', { removed: true }),
      comment('c-4', 'p-iphone', 'u-chidi', 10, 'Any scratches on the screen?'),
      comment('c-5', 'p-iphone', 'u-tolu', 9, 'None. It’s had a screen protector since day one.', {
        parentId: 'c-4',
      }),
      comment('c-6', 'p-ps5', 'u-zainab', 6, 'Which games are included?'),
    ],
  }
}

export function seedSaved(): Record<string, SavedIds> {
  return {
    // A live listing, an old phone, and a ThinkPad whose listing has since expired (FE-SAV-01)
    'u-tolu': { listings: ['l5', 'l16', 'l15'], posts: ['p-macbook', 'p-xbox'] },
  }
}

export function seedConversations(): { conversations: StoredConversation[]; messages: StoredMessage[] } {
  const message = (
    id: string,
    conversationId: string,
    senderId: string,
    hoursAgo: number,
    body: string,
    moderated = false,
  ): StoredMessage => ({
    id,
    conversationId,
    clientId: `seed-${id}`,
    senderId,
    body,
    moderated,
    createdAt: ago(hoursAgo),
  })

  return {
    conversations: [
      {
        id: 'm-xbox',
        listingId: 'l10',
        userIds: ['u-tolu', 'u-chidi'],
        offerIds: ['o-xbox-accepted'],
        readAt: { 'u-tolu': ago(5), 'u-chidi': ago(5) },
        createdAt: ago(50),
      },
      {
        id: 'm-macbook',
        listingId: 'l1',
        userIds: ['u-chidi', 'u-tolu'],
        offerIds: ['o-macbook-for-iphone'],
        readAt: { 'u-tolu': ago(5), 'u-chidi': ago(4) },
        createdAt: ago(5),
      },
    ],
    messages: [
      message('msg-x1', 'm-xbox', 'u-chidi', 28, 'Thanks Tolu. Both controllers are charged and in the box.'),
      message('msg-x2', 'm-xbox', 'u-tolu', 26, 'Great. I’ll check it powers on and reads a disc before we swap.'),
      message('msg-x3', 'm-xbox', 'u-chidi', 6, 'Removed', true),
      message('msg-m1', 'm-macbook', 'u-chidi', 4, 'Hi Tolu, is Face ID still working on the iPhone?'),
    ],
  }
}

type SeedNotification = AppNotification & { userId: string }

export function seedNotifications(): SeedNotification[] {
  const n = (
    id: string,
    kind: AppNotification['kind'],
    hoursAgo: number,
    title: string,
    link: string,
    body?: string,
    read = false,
  ): SeedNotification => ({ id, userId: 'u-tolu', kind, title, body, link, read, createdAt: ago(hoursAgo) })

  return [
    n('n-ps4', 'OFFER_COUNTERED', 4, 'Ibrahim S. countered your offer', '/offers/o-ps4-counter', 'PS4 · 500GB'),
    n(
      'n-macbook',
      'OFFER_RECEIVED',
      5,
      'Chidi O. made an offer',
      '/offers/o-macbook-for-iphone',
      'iPhone 12 Pro · 128GB',
    ),
    n(
      'n-comment',
      'COMMENT',
      10,
      'Chidi O. commented on your post',
      '/feed?post=p-iphone',
      'iPhone 12 Pro · 128GB',
      true,
    ),
    n(
      'n-xbox',
      'OFFER_ACCEPTED',
      30,
      'Chidi O. accepted your offer',
      '/offers/o-xbox-accepted',
      'Xbox Series X · 1TB',
      true,
    ),
    n(
      'n-ipad',
      'CONFIRMED',
      248,
      'Ibrahim S. confirmed the exchange',
      '/transactions/t-o-ipad-completed',
      'iPad · 32GB (older model)',
      true,
    ),
  ]
}
