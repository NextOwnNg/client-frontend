import { copy } from '@/lib/copy/copy'
import type { PolicyDoc } from '@/features/help/content/types'

/** How a trade works, end to end, in the product's own terms (PRD §7). */
export const howItWorksDoc: PolicyDoc = {
  title: 'How it works',
  lead: copy.supportingLine,
  sections: [
    {
      id: 'steps',
      title: 'From listing to handover',
      steps: [
        {
          title: 'List what you own',
          body: 'Add photos of the actual item, its condition and any defects. Choose whether you’ll take cash, a swap, or both.',
        },
        {
          title: 'Get or make offers',
          body: 'Offer cash, offer an item, or offer an item and add cash. Every offer says who pays whom. The other person can accept, counter or decline.',
        },
        {
          title: 'Accept, and both items are reserved',
          body: copy.offerAccepted,
        },
        {
          title: 'Meet and inspect',
          body: 'Agree a public place and time in the deal. Inspect the items before anything changes hands.',
        },
        {
          title: 'Both confirm',
          body: 'Each of you confirms your side on the deal page. The exchange is complete only when both have confirmed.',
        },
        {
          title: 'Review each other',
          body: 'Once the exchange is complete, you can each leave one review. Reviews show their count, so one review reads as one review.',
        },
      ],
    },
    {
      id: 'payments',
      title: 'About payments',
      paragraphs: [copy.handoverNotice],
    },
    {
      id: 'phone-confirmed',
      title: 'What “Phone confirmed” means',
      paragraphs: [
        copy.phoneBadgeExplainer,
        'Everyone signs in with a one-time code sent to their phone. The number itself is never shown on profiles, listings or offers.',
      ],
    },
    {
      id: 'quick-sell',
      title: 'Quick Sell',
      paragraphs: [
        copy.quickSellNote,
        'When the deadline passes, the listing expires and the owner can renew, update or close it.',
      ],
    },
    {
      id: 'agreements',
      title: 'Where agreements are made',
      paragraphs: ['Only offers record agreed terms. Comments and messages are for questions: ' + copy.commentsNote],
    },
  ],
  related: [
    { to: '/support', label: 'Safety and help' },
    { to: '/community-rules', label: 'Community rules' },
  ],
}
