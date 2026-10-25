import { createBrowserRouter, type RouteObject } from 'react-router'
import { RedirectIfAuthed, RequireAuth } from '@/app/guards'
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
type Upcoming = { path: string; title: string; phase: string }

const upcomingPublic: Upcoming[] = [
  { path: 'feed', title: 'Feed', phase: 'Phase 6 (Community)' },
  { path: 'how-it-works', title: 'How it works', phase: 'Phase 7 (Trust and finish)' },
  { path: 'support', title: 'Safety and help', phase: 'Phase 7 (Trust and finish)' },
  { path: 'community-rules', title: 'Community rules', phase: 'Phase 7 (Trust and finish)' },
  { path: 'terms', title: 'Terms', phase: 'Phase 7 (Trust and finish)' },
  { path: 'privacy', title: 'Privacy', phase: 'Phase 7 (Trust and finish)' },
]

/** Member-only placeholders sit behind sign-in already, so the redirects can be reviewed now (PRD §6.3). */
const upcomingMember: Upcoming[] = [
  { path: 'transactions', title: 'Transactions', phase: 'Phase 5 (Exchange)' },
  { path: 'me/reviews', title: 'Reviews', phase: 'Phase 5 (Exchange)' },
  { path: 'messages', title: 'Messages', phase: 'Phase 6 (Community)' },
  { path: 'notifications', title: 'Notifications', phase: 'Phase 6 (Community)' },
  { path: 'saved', title: 'Saved', phase: 'Phase 6 (Community)' },
  { path: 'report/:type/:id', title: 'Report', phase: 'Phase 7 (Trust and finish)' },
]

const placeholder = ({ path, title, phase }: Upcoming): RouteObject => ({
  path,
  element: <ComingSoonPage title={title} phase={phase} />,
})

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, Component: HomePage },
          // Public routes after Home load as their own chunks, keeping the entry chunk inside budget (PRD §12)
          {
            path: 'explore',
            lazy: async () => ({ Component: (await import('@/pages/public/ExplorePage')).ExplorePage }),
          },
          {
            path: 'listings/:slug',
            lazy: async () => ({ Component: (await import('@/pages/public/ListingDetailPage')).ListingDetailPage }),
          },
          {
            path: 'users/:id',
            lazy: async () => ({ Component: (await import('@/pages/public/ProfilePage')).ProfilePage }),
          },
          ...upcomingPublic.map(placeholder),
          {
            Component: RequireAuth,
            children: [
              { path: 'me', lazy: async () => ({ Component: (await import('@/pages/member/MePage')).MePage }) },
              {
                path: 'me/listings',
                lazy: async () => ({ Component: (await import('@/pages/member/MyListingsPage')).MyListingsPage }),
              },
              {
                path: 'listings/new',
                lazy: async () => ({ Component: (await import('@/pages/member/ListingWizardPage')).ListingWizardPage }),
              },
              {
                path: 'listings/:id/edit',
                lazy: async () => ({ Component: (await import('@/pages/member/ListingWizardPage')).ListingWizardPage }),
              },
              {
                path: 'settings',
                lazy: async () => ({ Component: (await import('@/pages/member/SettingsPage')).SettingsPage }),
              },
              {
                path: 'offers',
                lazy: async () => ({ Component: (await import('@/pages/member/OffersPage')).OffersLayout }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/member/OffersPage')).OffersIndex }),
                  },
                  {
                    path: ':id',
                    lazy: async () => ({ Component: (await import('@/pages/member/OfferThreadPage')).OfferThreadPage }),
                  },
                ],
              },
              {
                path: 'offers/new',
                lazy: async () => ({ Component: (await import('@/pages/member/OfferComposerPage')).OfferComposerPage }),
              },
              ...upcomingMember.map(placeholder),
            ],
          },
          ...devRoutes,
        ],
      },
      {
        // Sign-in and first-time setup: a focused layout, loaded only when someone signs in
        lazy: async () => ({ Component: (await import('@/app/layouts/AuthLayout')).AuthLayout }),
        children: [
          {
            Component: RedirectIfAuthed,
            children: [
              { path: 'login', lazy: async () => ({ Component: (await import('@/pages/auth/LoginPage')).LoginPage }) },
            ],
          },
          { path: 'verify', lazy: async () => ({ Component: (await import('@/pages/auth/VerifyPage')).VerifyPage }) },
          {
            element: <RequireAuth allowNew />,
            children: [
              {
                path: 'onboarding',
                lazy: async () => ({ Component: (await import('@/pages/auth/OnboardingPage')).OnboardingPage }),
              },
            ],
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)
