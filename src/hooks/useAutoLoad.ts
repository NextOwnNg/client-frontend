import { useEffect, useRef } from 'react'

/** Loads the next page when the end of a list scrolls near; a visible button covers everything else. */
export function useAutoLoad(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onVisible(), {
      rootMargin: '600px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible, enabled])
  return ref
}
