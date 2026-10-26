import type { StoredTransaction } from '@/mocks/db/transactions'
import { listings } from '@/mocks/fixtures/listings'
import { runtimeConfig } from '@/mocks/fixtures/config'
import type { SnapshotItem } from '@/types/api'

/**
 * FICTIONAL deals for the sample member: the reserved Xbox awaiting handover, and an older iPad purchase
 * that both people confirmed, which Tolu hasn't reviewed yet.
 */

const HOUR = 3_600_000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()

function snapshot(listingId: string): SnapshotItem {
  const l = listings.find((x) => x.id === listingId)!
  return {
    title: l.title,
    condition: l.condition,
    defects: l.defects,
    repairs: l.repairs,
    photos: l.images,
    listingSlug: l.slug,
  }
}

export function seedTransactions(): StoredTransaction[] {
  const xboxAccepted = ago(30)
  return [
    {
      id: 't-o-xbox-accepted',
      offerId: 'o-xbox-accepted',
      offererId: 'u-tolu',
      ownerId: 'u-chidi',
      listingId: 'l10',
      offeredItemId: null,
      status: 'AWAITING_HANDOVER',
      agreement: {
        mode: 'CASH',
        listingItem: snapshot('l10'),
        offeredItem: null,
        cashKobo: 57_000_000,
        cashDirection: 'OFFERER_PAYS_OWNER',
        versionNumber: 3,
        acceptedAt: xboxAccepted,
      },
      meeting: null,
      confirmations: { offerer: null, owner: null },
      reservationExpiresAt: new Date(
        Date.parse(xboxAccepted) + runtimeConfig.reservationDays * 24 * HOUR,
      ).toISOString(),
      reviews: [],
      createdAt: xboxAccepted,
      updatedAt: xboxAccepted,
    },
    {
      id: 't-o-ipad-completed',
      offerId: 'o-ipad-completed',
      offererId: 'u-tolu',
      ownerId: 'u-ibrahim',
      listingId: 'l17',
      offeredItemId: null,
      status: 'COMPLETED',
      agreement: {
        mode: 'CASH',
        listingItem: snapshot('l17'),
        offeredItem: null,
        cashKobo: 8_500_000,
        cashDirection: 'OFFERER_PAYS_OWNER',
        versionNumber: 1,
        acceptedAt: ago(290),
      },
      meeting: {
        place: 'West bus park, ticket office',
        time: ago(250),
        note: '',
        proposedBy: 'u-ibrahim',
        agreedBy: ['u-ibrahim', 'u-tolu'],
      },
      confirmations: { offerer: ago(249), owner: ago(248) },
      reservationExpiresAt: new Date(Date.parse(ago(290)) + runtimeConfig.reservationDays * 24 * HOUR).toISOString(),
      completedAt: ago(248),
      reviews: [
        {
          rating: 5,
          note: 'Paid exactly as agreed and was on time. Easy meetup.',
          authorId: 'u-ibrahim',
          subjectId: 'u-tolu',
          createdAt: ago(240),
        },
      ],
      createdAt: ago(290),
      updatedAt: ago(240),
    },
  ]
}
