import { copy } from '@/lib/copy/copy'
import type { PolicyDoc } from '@/features/help/content/types'

/** Plain-language summary for the pilot. The final terms replace it after legal review (PRD BR-04). */
export const termsDoc: PolicyDoc = {
  title: 'Terms',
  lead: 'A plain-language summary of the terms for the NextOwn pilot.',
  draft:
    'Pilot draft. The full terms are being prepared with our legal advisers and will replace this summary before launch. Where they differ, the full terms apply.',
  updated: 'October 2026',
  sections: [
    {
      id: 'who',
      title: 'Who can use NextOwn',
      paragraphs: [
        'You must be 18 or older and sign in with a mobile number you control. You agree to these terms and the privacy policy when you finish setting up your account.',
      ],
    },
    {
      id: 'role',
      title: 'What NextOwn does',
      paragraphs: [
        'NextOwn helps people nearby list items, make offers and record what they agree. The trade itself is between the two people.',
        copy.handoverNotice,
        copy.phoneBadgeExplainer,
      ],
    },
    {
      id: 'listings',
      title: 'Your listings and offers',
      list: [
        'You’re responsible for what you list: it must be yours to sell or swap, described honestly, and allowed by the community rules.',
        'An offer is a proposal. It becomes an agreement only when the other person accepts it.',
        'Accepting an offer reserves the items for that deal until it completes, is cancelled, or the reservation ends.',
      ],
    },
    {
      id: 'conduct',
      title: 'Conduct and safety',
      paragraphs: [
        'Follow the community rules. We may remove content, warn, or restrict accounts that break them, and you can ask for a review of a restriction.',
        copy.supportLimit,
      ],
      links: [{ to: '/community-rules', label: 'Community rules' }],
    },
    {
      id: 'account',
      title: 'Your account',
      paragraphs: [
        'Keep your phone and one-time codes to yourself. You can ask to delete your account from Settings; records of completed deals may be kept where the law requires.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes',
      paragraphs: ['We’ll tell you in the app before these terms change in a way that affects you.'],
    },
  ],
  related: [
    { to: '/privacy', label: 'Privacy' },
    { to: '/community-rules', label: 'Community rules' },
  ],
}
