import { CompassIcon, HandshakeIcon, NewspaperIcon, PlusIcon, UserCircleIcon, type Icon } from '@phosphor-icons/react'

type NavItem = { to: string; label: string; icon: Icon; end?: boolean }

export const mainNavItems: NavItem[] = [
  { to: '/explore', label: 'Explore', icon: CompassIcon },
  { to: '/feed', label: 'Feed', icon: NewspaperIcon },
  { to: '/listings/new', label: 'List', icon: PlusIcon },
  { to: '/offers', label: 'Offers', icon: HandshakeIcon },
  { to: '/me', label: 'Profile', icon: UserCircleIcon },
]
