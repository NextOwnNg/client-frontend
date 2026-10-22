import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Brand breakpoints (Brand §5). */
export const breakpoints = {
  tablet: '(min-width: 768px)',
  desktop: '(min-width: 1024px)',
} as const
