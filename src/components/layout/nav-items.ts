import { CompassIcon, HandshakeIcon, NewspaperIcon, PlusIcon, UserCircleIcon, type Icon } from '@phosphor-icons/react'

type NavItem = { to: string; label: string; icon: Icon; end?: boolean }

/** Primary destinations (UX §3.1): five at most. Phosphor icons, so the bottom nav can use duotone and filled weights. */
export const mainNavItems: NavItem[] = [
  { to: '/explore', label: 'Explore', icon: CompassIcon },
  { to: '/feed', label: 'Feed', icon: NewspaperIcon },
  { to: '/listings/new', label: 'List', icon: PlusIcon },
  { to: '/offers', label: 'Offers', icon: HandshakeIcon },
  { to: '/me', label: 'Profile', icon: UserCircleIcon },
]
