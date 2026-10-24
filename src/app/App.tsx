import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'

/** Framer Motion is scoped to the components that need it (components/motion/MotionProvider). */
export function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </HelmetProvider>
  )
}
