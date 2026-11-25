import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { openNotification } from '@/features/notifications/api'
import { ownListingKeys } from '@/features/selling/api'
import type { AppNotification } from '@/types/api'

const alert = (link: string): AppNotification => ({
  id: 'n1',
  kind: 'LISTING_CHANGES_NEEDED',
  title: 'Xbox Series S needs a few changes',
  link,
  read: true,
  createdAt: '2026-11-26T09:00:00Z',
})

describe('openNotification', () => {
  it.each(['/listings/l1/edit', '/me/listings?tab=active'])(
    'refreshes the seller’s own listings before opening %s',
    (link) => {
      const queryClient = new QueryClient()
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

      openNotification(queryClient, alert(link))

      expect(invalidate).toHaveBeenCalledWith({ queryKey: ownListingKeys.all })
    },
  )
})
