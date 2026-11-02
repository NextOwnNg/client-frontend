import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from '@/lib/cx'

/** How far down, in screen heights, before the button is worth showing. */
const SCREENS_DOWN = 1.5

/** A floating way back up long lists. Sits above the bottom navigation on phones and the page's own bottom bars. */
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
    // Keyboard and screen reader users carry on from the top too, not from the button they left behind
    // (main isn't otherwise focusable, and a ring around the whole page would only confuse)
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
