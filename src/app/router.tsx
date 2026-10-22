import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RootLayout } from '@/app/layouts/RootLayout'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { HomePage } from '@/pages/public/HomePage'

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/tokens',
        lazy: async () => ({ Component: (await import('@/pages/dev/TokensPage')).TokensPage }),
      },
      {
        path: 'dev/components',
        lazy: async () => ({ Component: (await import('@/pages/dev/ComponentsPage')).ComponentsPage }),
      },
    ]
  : []

/** Screens from later phases render a placeholder so the shell's navigation can be reviewed now. */
const upcoming: { path: string; title: string; phase: string }[] = [
  { path: 'explore', title: 'Explore', phase: 'Phase 1 (Discover)' },
  { path: 'feed', title: 'Feed', phase: 'Phase 6 (Community)' },
  { path: 'listings/new', title: 'List an item', phase: 'Phase 3 (Sell)' },
  { path: 'offers', title: 'Offers', phase: 'Phase 4 (Offer)' },
  { path: 'me', title: 'Profile', phase: 'Phase 2 (Join)' },
  { path: 'messages', title: 'Messages', phase: 'Phase 6 (Community)' },
  { path: 'notifications', title: 'Notifications', phase: 'Phase 6 (Community)' },
  { path: 'how-it-works', title: 'How it works', phase: 'Phase 7 (Trust and finish)' },
  { path: 'support', title: 'Safety and help', phase: 'Phase 7 (Trust and finish)' },
  { path: 'community-rules', title: 'Community rules', phase: 'Phase 7 (Trust and finish)' },
  { path: 'terms', title: 'Terms', phase: 'Phase 7 (Trust and finish)' },
  { path: 'privacy', title: 'Privacy', phase: 'Phase 7 (Trust and finish)' },
]

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, Component: HomePage },
          ...upcoming.map(({ path, title, phase }) => ({
            path,
            element: <ComingSoonPage title={title} phase={phase} />,
          })),
          ...devRoutes,
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)
