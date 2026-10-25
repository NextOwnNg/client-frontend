import { useEffect, useState } from 'react'

/** Whole seconds left until `target` (epoch ms), ticking while above zero. */
export function useCountdown(target: number): number {
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.ceil((target - now) / 1000))
  const running = remaining > 0

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running, target])

  return remaining
}

/** `42` → `"0:42"` */
export const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
