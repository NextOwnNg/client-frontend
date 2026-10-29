import type { PolicyDoc } from '@/features/help/content/types'

/**
 * Community rules and the prohibited-items list (TRU-05). The list is a pilot draft until product and safety
 * confirm it (PRD D-02).
 */
export const communityRulesDoc: PolicyDoc = {
  title: 'Community rules',
  lead: 'What everyone on NextOwn agrees to, so trading with a stranger nearby stays honest and safe.',
  draft: 'Pilot draft. The prohibited-items list is being confirmed with our safety and legal advisers.',
  updated: 'October 2026',
  sections: [
    {
      id: 'honest',
      title: 'Be honest about what you list',
      list: [
        'Only list things you own and are free to sell or swap.',
        'Use photos of the actual item, not pictures from a shop or another listing.',
        'Describe the condition truthfully and list every defect and repair you know about.',
        'One listing per item. Don’t relist the same thing to push it up.',
      ],
    },
    {
      id: 'offers',
      title: 'Agree terms through offers',
      list: [
        'Make, counter and accept through offers, so the terms are recorded for both of you.',
        'Stick to what you accepted. If something changes, cancel through the deal and say why.',
        'Confirm your side only when the exchange has actually happened.',
      ],
    },
    {
      id: 'respect',
      title: 'Treat people with respect',
      list: [
        'No harassment, threats, hate or pressure.',
        'No spam, repeated posts or links to other selling sites.',
        'Don’t share anyone’s phone number, address or photos without their permission.',
        'One account per person.',
      ],
    },
    {
      id: 'prohibited',
      title: 'Prohibited items',
      paragraphs: ['These can’t be listed, offered or swapped on NextOwn:'],
      list: [
        'Weapons, ammunition, explosives and replicas that look real',
        'Drugs, prescription medicines and drug equipment',
        'Alcohol and tobacco products',
        'Stolen goods, or anything you don’t have the right to sell',
        'Counterfeits and copies of branded goods',
        'SIM cards, bank cards, accounts or identity documents',
        'Live animals',
        'Hazardous materials, and electrical items that have been recalled or are unsafe',
        'Adult content',
      ],
    },
    {
      id: 'enforcement',
      title: 'If the rules are broken',
      paragraphs: [
        'The safety team reviews reports. They can remove listings, posts and comments, warn an account, or restrict it so it can’t list, make offers or post.',
        'A restricted member keeps access to their own offers, deals and messages, and can ask for a review.',
      ],
      links: [
        { to: '/support#reporting', label: 'How reporting works' },
        { to: '/support#appeals', label: 'Asking for a review' },
      ],
    },
  ],
  related: [
    { to: '/support', label: 'Safety and help' },
    { to: '/terms', label: 'Terms' },
  ],
}
