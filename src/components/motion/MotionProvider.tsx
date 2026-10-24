import { LazyMotion, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'
import { transitions } from '@/lib/motion/presets'

const loadMotionFeatures = () => import('@/lib/motion/features').then((mod) => mod.default)

/**
 * Wrap a Framer Motion component in this. Framer lives only in the chunks that use it (shell and first-load
 * motion is CSS), its features load after first paint, and reducedMotion="user" turns transform and
 * layout animations into instant changes when the OS asks.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={transitions.standard}>
      <LazyMotion features={loadMotionFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  )
}
