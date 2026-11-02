import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from '@/lib/cx'

/** Scroll depth, in viewport heights, at which the button appears. */
const SCREENS_DOWN = 1.5

/** Floating Back to top button for long lists; sits above the bottom navigation on phones. */
export function BackToTop() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let frame = 0
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setShown(window.scrollY > window.innerHeight * SCREENS_DOWN))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', check)
    }
  }, [])

  const toTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    // Move focus too, so keyboard and screen reader users continue from the top
    const main = document.getElementById('main')
    if (!main) return
    main.tabIndex = -1
    main.classList.add('outline-none')
    main.focus({ preventScroll: true })
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      aria-hidden={!shown}
      inert={!shown}
      onClick={toTop}
      className={cx(
        'fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 inline-flex size-12 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-ink shadow-overlay tablet:right-6 desktop:right-8 desktop:bottom-8 print:hidden',
        'transition-[opacity,transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-cloud focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none active:scale-95',
        shown ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
      )}
    >
      <ArrowUp aria-hidden className="size-5" />
    </button>
  )
}
