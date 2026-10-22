import { Compass, Handshake, Newspaper, Plus, UserRound, type LucideIcon } from 'lucide-react'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

/** Primary destinations (UX §3.1): five at most. */
export const mainNavItems: NavItem[] = [
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/listings/new', label: 'List', icon: Plus },
  { to: '/offers', label: 'Offers', icon: Handshake },
  { to: '/me', label: 'Profile', icon: UserRound },
]
