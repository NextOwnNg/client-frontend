import { RouterProvider as AriaRouterProvider } from '@heroui/react'
import { Outlet, ScrollRestoration, useHref, useNavigate } from 'react-router'
import { SessionSync } from '@/features/account/SessionSync'

/** Lets HeroUI (React Aria) links navigate client-side through React Router, and keeps the session in sync. */
export function RootLayout() {
  const navigate = useNavigate()

  return (
    <AriaRouterProvider navigate={(to, options) => navigate(to, options)} useHref={useHref}>
      <SessionSync />
      <Outlet />
      <ScrollRestoration />
    </AriaRouterProvider>
  )
}
