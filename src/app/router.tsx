import { createBrowserRouter, type RouteObject } from 'react-router'
import { RedirectIfAuthed, RequireAuth } from '@/app/guards'
import { AppLayout } from '@/app/layouts/AppLayout'
import type { AuthHandle } from '@/app/layouts/auth-handle'
import { RootLayout } from '@/app/layouts/RootLayout'
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

/** Help and policy pages: public, each its own small chunk (PRD §6.1). */
const helpPages: { path: string; load: () => Promise<{ Component: React.ComponentType }> }[] = [
  { path: 'support', load: async () => ({ Component: (await import('@/pages/public/SupportPage')).SupportPage }) },
  {
    path: 'how-it-works',
    load: async () => ({ Component: (await import('@/pages/public/HowItWorksPage')).HowItWorksPage }),
  },
  {
    path: 'community-rules',
    load: async () => ({ Component: (await import('@/pages/public/CommunityRulesPage')).CommunityRulesPage }),
  },
  { path: 'terms', load: async () => ({ Component: (await import('@/pages/public/TermsPage')).TermsPage }) },
  { path: 'privacy', load: async () => ({ Component: (await import('@/pages/public/PrivacyPage')).PrivacyPage }) },
]

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
          { path: 'feed', lazy: async () => ({ Component: (await import('@/pages/public/FeedPage')).FeedPage }) },
          ...helpPages.map(({ path, load }) => ({ path, lazy: load })),
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
                path: 'transactions',
                lazy: async () => ({ Component: (await import('@/pages/member/TransactionsPage')).TransactionsPage }),
              },
              {
                path: 'transactions/:id/review',
                lazy: async () => ({ Component: (await import('@/pages/member/ReviewPage')).ReviewPage }),
              },
              {
                path: 'me/reviews',
                lazy: async () => ({ Component: (await import('@/pages/member/MyReviewsPage')).MyReviewsPage }),
              },
              {
                path: 'transactions/:id',
                lazy: async () => ({ Component: (await import('@/pages/member/TransactionPage')).TransactionPage }),
              },
              {
                path: 'offers/new',
                lazy: async () => ({ Component: (await import('@/pages/member/OfferComposerPage')).OfferComposerPage }),
              },
              {
                path: 'messages',
                lazy: async () => ({ Component: (await import('@/pages/member/MessagesPage')).MessagesLayout }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/member/MessagesIndexPage')).MessagesIndex }),
                  },
                  {
                    path: ':id',
                    lazy: async () => ({
                      Component: (await import('@/pages/member/ConversationPage')).ConversationPage,
                    }),
                  },
                ],
              },
              {
                path: 'notifications',
                lazy: async () => ({ Component: (await import('@/pages/member/NotificationsPage')).NotificationsPage }),
              },
              {
                path: 'saved',
                lazy: async () => ({ Component: (await import('@/pages/member/SavedPage')).SavedPage }),
              },
              {
                path: 'me/reports',
                lazy: async () => ({ Component: (await import('@/pages/member/MyReportsPage')).MyReportsPage }),
              },
              {
                path: 'appeal',
                lazy: async () => ({ Component: (await import('@/pages/member/AppealPage')).AppealPage }),
              },
              {
                path: 'report/:type/:id',
                lazy: async () => ({ Component: (await import('@/pages/member/ReportPage')).ReportPage }),
              },
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
              {
                path: 'login',
                handle: { showcase: 'always' } satisfies AuthHandle,
                lazy: async () => ({ Component: (await import('@/pages/auth/LoginPage')).LoginPage }),
              },
            ],
          },
          {
            path: 'verify',
            handle: { showcase: 'desktop' } satisfies AuthHandle,
            lazy: async () => ({ Component: (await import('@/pages/auth/VerifyPage')).VerifyPage }),
          },
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
