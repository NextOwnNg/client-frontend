import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { HelmetProvider } from 'react-helmet-async'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { transitions } from '@/lib/motion/presets'

export function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        {/* reducedMotion="user" turns transform and layout animations into instant changes when the OS asks */}
        <MotionConfig reducedMotion="user" transition={transitions.standard}>
          <RouterProvider router={router} />
        </MotionConfig>
      </QueryClientProvider>
    </HelmetProvider>
  )
}
