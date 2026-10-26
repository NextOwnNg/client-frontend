import type { StoredItem, StoredOffer, StoredVersion } from '@/mocks/db/offers'
import type { OfferTerms } from '@/types/api'

/**
 * FICTIONAL negotiations for the sample member (Tolu A.), so every inbox tab and thread state can be reviewed:
 * a swap + cash where Tolu would pay, a counter waiting on Tolu, an offer waiting on someone else, a
 * reserved deal awaiting handover and a declined offer.
 */

const HOUR = 3_600_000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()
const naira = (n: number) => n * 100

const cash = (amount: number, note = ''): OfferTerms => ({
  mode: 'CASH',
  offeredItemId: null,
  cashKobo: naira(amount),
  cashDirection: 'OFFERER_PAYS_OWNER',
  note,
})

function versions(...list: [authorId: string, hoursAgo: number, terms: OfferTerms][]): StoredVersion[] {
  return list.map(([authorId, hoursAgo, terms], i) => ({
    ...terms,
    id: `v-seed-${authorId}-${hoursAgo}-${i}`,
    number: i + 1,
    authorId,
    createdAt: ago(hoursAgo),
  }))
}

function offer(
  fields: Omit<StoredOffer, 'createdAt' | 'updatedAt' | 'expiresAt' | 'unreadFor'> & {
    unreadFor?: string[]
    expiresInHours?: number
  },
): StoredOffer {
  const { expiresInHours = 48, unreadFor = [], ...rest } = fields
  return {
    ...rest,
    createdAt: fields.versions[0]!.createdAt,
    updatedAt: fields.versions.at(-1)!.createdAt,
    expiresAt: new Date(Date.now() + expiresInHours * HOUR).toISOString(),
    unreadFor,
  }
}

export function seedOffers(): { offers: StoredOffer[]; items: StoredItem[] } {
  return {
    items: [],
    offers: [
      // Received: Chidi's MacBook for Tolu's iPhone, and Chidi asks Tolu to add cash (QA-03 direction)
      offer({
        id: 'o-macbook-for-iphone',
        listingId: 'l1',
        offererId: 'u-chidi',
        ownerId: 'u-tolu',
        status: 'PENDING',
        expiresInHours: 30,
        versions: versions([
          'u-chidi',
          5,
          {
            mode: 'SWAP_PLUS_CASH',
            offeredItemId: 'l2',
            cashKobo: naira(200_000),
            cashDirection: 'OWNER_PAYS_OFFERER',
            note: 'The MacBook is worth more, so I’d need ₦200,000 on top. Happy to meet in Central.',
          },
        ]),
      }),
      // Received and unread: Amaka's listed PS5 plus cash for Tolu's MacBook
      offer({
        id: 'o-ps5-for-macbook',
        listingId: 'l6',
        offererId: 'u-amaka',
        ownerId: 'u-tolu',
        status: 'PENDING',
        expiresInHours: 66,
        unreadFor: ['u-tolu'],
        versions: versions([
          'u-amaka',
          2,
          {
            mode: 'SWAP_PLUS_CASH',
            offeredItemId: 'l3',
            cashKobo: naira(150_000),
            cashDirection: 'OFFERER_PAYS_OWNER',
            note: '',
          },
        ]),
      }),
      // Sent, and Ibrahim has countered: Tolu's turn
      offer({
        id: 'o-ps4-counter',
        listingId: 'l9',
        offererId: 'u-tolu',
        ownerId: 'u-ibrahim',
        status: 'PENDING',
        expiresInHours: 20,
        unreadFor: ['u-tolu'],
        versions: versions(
          ['u-tolu', 26, cash(170_000, 'Can collect this weekend.')],
          ['u-ibrahim', 4, cash(195_000, 'It comes with two controllers. ₦195,000 and it’s yours.')],
        ),
      }),
      // Sent and waiting on Zainab
      offer({
        id: 'o-switch-waiting',
        listingId: 'l5',
        offererId: 'u-tolu',
        ownerId: 'u-zainab',
        status: 'PENDING',
        expiresInHours: 52,
        versions: versions(['u-tolu', 20, cash(230_000)]),
      }),
      // Accepted: the reserved Xbox is awaiting handover
      offer({
        id: 'o-xbox-accepted',
        listingId: 'l10',
        offererId: 'u-tolu',
        ownerId: 'u-chidi',
        status: 'ACCEPTED',
        transactionId: 't-o-xbox-accepted',
        versions: versions(
          ['u-tolu', 50, cash(560_000)],
          ['u-chidi', 40, cash(575_000)],
          ['u-tolu', 30, cash(570_000)],
        ),
      }),
      // Accepted long ago and completed: the iPad deal both people confirmed
      offer({
        id: 'o-ipad-completed',
        listingId: 'l17',
        offererId: 'u-tolu',
        ownerId: 'u-ibrahim',
        status: 'ACCEPTED',
        transactionId: 't-o-ipad-completed',
        versions: versions(['u-tolu', 290, cash(85_000, 'Can pick up at the bus park.')]),
      }),
      // Closed: declined
      offer({
        id: 'o-tecno-declined',
        listingId: 'l7',
        offererId: 'u-tolu',
        ownerId: 'u-chidi',
        status: 'REJECTED',
        versions: versions(['u-tolu', 70, cash(30_000)]),
      }),
    ],
  }
}
