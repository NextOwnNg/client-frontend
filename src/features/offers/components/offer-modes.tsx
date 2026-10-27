import { ArrowLeftRight, Banknote, Coins } from 'lucide-react'
import { type ReactNode } from 'react'
import type { OfferMode } from '@/types/api'

export const modeIcons: Record<OfferMode, ReactNode> = {
  CASH: <Banknote aria-hidden className="size-5" />,
  SWAP: <ArrowLeftRight aria-hidden className="size-5" />,
  SWAP_PLUS_CASH: <Coins aria-hidden className="size-5" />,
}

export const modeTitles: Record<OfferMode, string> = {
  CASH: 'Cash offer',
  SWAP: 'Swap an item',
  SWAP_PLUS_CASH: 'Swap + cash',
}
