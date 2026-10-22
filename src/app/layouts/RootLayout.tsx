import { RouterProvider as AriaRouterProvider } from '@heroui/react'
import { Outlet, ScrollRestoration, useHref, useNavigate } from 'react-router'

/** Lets HeroUI (React Aria) links navigate client-side through React Router. */
export function RootLayout() {
  const navigate = useNavigate()

  return (
    <AriaRouterProvider navigate={(to, options) => navigate(to, options)} useHref={useHref}>
      <Outlet />
      <ScrollRestoration />
    </AriaRouterProvider>
  )
}
