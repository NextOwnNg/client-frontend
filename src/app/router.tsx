import { createBrowserRouter, type RouteObject } from 'react-router'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { RootLayout } from '@/app/layouts/RootLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { HomePage } from '@/pages/public/HomePage'

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/tokens',
        lazy: async () => ({ Component: (await import('@/pages/dev/TokensPage')).TokensPage }),
      },
    ]
  : []

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    children: [
      {
        Component: PublicLayout,
        children: [{ index: true, Component: HomePage }, ...devRoutes],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)
