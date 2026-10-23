import { listingStatus } from '@/lib/copy/status'
import type { ListingStatus } from '@/types/api'

/** FE-LDT-04: "Reserved: this item is no longer accepting offers." */
export const unavailableMessage = (status: ListingStatus) => `${listingStatus(status).label}: this item is no longer accepting offers.`
