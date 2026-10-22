import type { Transition, Variants } from 'framer-motion'

/** Brand motion (Brand §5): fast 120ms, standard 200ms, slow 320ms, ease-out. Every animated component uses these. */
export const durations = { fast: 0.12, standard: 0.2, slow: 0.32 } as const

export const easeOut = [0.16, 1, 0.3, 1] as const

export const transitions = {
  fast: { duration: durations.fast, ease: easeOut },
  standard: { duration: durations.standard, ease: easeOut },
  slow: { duration: durations.slow, ease: easeOut },
} satisfies Record<string, Transition>

export const springs = {
  /** Bottom sheets: settles quickly with no visible bounce. */
  sheet: { type: 'spring', stiffness: 420, damping: 40 },
  /** Press feedback and small toggles. */
  press: { type: 'spring', stiffness: 600, damping: 35 },
  /** Sliding indicators (nav, tabs). */
  indicator: { type: 'spring', stiffness: 500, damping: 40 },
} satisfies Record<string, Transition>

export const variants = {
  fadeRise: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: transitions.standard },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.standard },
  },
} satisfies Record<string, Variants>

/** Wizard and composer steps slide 16px in the direction of travel. */
export function stepSlide(direction: 1 | -1): Variants {
  return {
    enter: { opacity: 0, x: 16 * direction },
    center: { opacity: 1, x: 0, transition: transitions.standard },
    exit: { opacity: 0, x: -16 * direction, transition: transitions.fast },
  }
}

/** Tactile press for cards and custom buttons. */
export const pressable = { whileTap: { scale: 0.98 }, transition: springs.press } as const
