import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

type Gesture = {
  from: number
  over: number
  startX: number
  startY: number
  active: boolean
  timer: number
}

const MOUSE_SLOP = 4
const TOUCH_SLOP = 8

/**
 * Drag to reorder a grid of items marked with `data-sort-index`. A mouse drags as soon as it moves; touch
 * waits for a long-press first, so an ordinary swipe still scrolls the page. The photo menu is the keyboard
 * and screen-reader path.
 */
export function useSortable({
  onMove,
  longPressMs = 350,
}: {
  onMove: (from: number, to: number) => void
  longPressMs?: number
}) {
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const onMoveRef = useRef(onMove)
  useEffect(() => {
    onMoveRef.current = onMove
  }, [onMove])

  const listeners = useRef({
    blockScroll: (e: TouchEvent) => e.preventDefault(),
    swallowClick: (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
    },
    move: (e: PointerEvent) => {
      const g = gesture.current
      if (!g) return
      if (!g.active) {
        const distance = Math.hypot(e.clientX - g.startX, e.clientY - g.startY)
        if (e.pointerType === 'mouse' && distance > MOUSE_SLOP) activate()
        // Moving before the long-press fires is a scroll, not a drag
        else if (e.pointerType !== 'mouse' && distance > TOUCH_SLOP) stop()
        return
      }
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-sort-index]')
      const over = target ? Number(target.dataset.sortIndex) : g.over
      if (over !== g.over) {
        g.over = over
        setDrag({ from: g.from, over })
      }
    },
    end: () => {
      const g = gesture.current
      if (g?.active) {
        if (g.over !== g.from) onMoveRef.current(g.from, g.over)
        // The release would otherwise click whatever is under the finger
        window.addEventListener('click', listeners.current.swallowClick, { capture: true, once: true })
        setTimeout(() => window.removeEventListener('click', listeners.current.swallowClick, { capture: true }), 0)
      }
      stop()
    },
  })

  function activate() {
    const g = gesture.current
    if (!g) return
    g.active = true
    setDrag({ from: g.from, over: g.from })
    navigator.vibrate?.(15)
    document.addEventListener('touchmove', listeners.current.blockScroll, { passive: false })
  }

  function stop() {
    const g = gesture.current
    if (g) clearTimeout(g.timer)
    gesture.current = null
    setDrag(null)
    window.removeEventListener('pointermove', listeners.current.move)
    window.removeEventListener('pointerup', listeners.current.end)
    window.removeEventListener('pointercancel', listeners.current.end)
    document.removeEventListener('touchmove', listeners.current.blockScroll)
  }

  useEffect(() => () => stop(), [])

  function onPointerDown(e: ReactPointerEvent<HTMLElement>, index: number) {
    if (e.button !== 0 || (e.target as Element).closest('button, a, input')) return
    const g: Gesture = { from: index, over: index, startX: e.clientX, startY: e.clientY, active: false, timer: 0 }
    gesture.current = g
    if (e.pointerType !== 'mouse') g.timer = window.setTimeout(activate, longPressMs)
    window.addEventListener('pointermove', listeners.current.move)
    window.addEventListener('pointerup', listeners.current.end)
    window.addEventListener('pointercancel', listeners.current.end)
  }

  return { drag, onPointerDown }
}
