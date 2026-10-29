import type { PolicyDoc } from '@/features/help/content/types'

/** Plain-language privacy summary for the pilot, pending privacy counsel (PRD D-05). */
export const privacyDoc: PolicyDoc = {
  title: 'Privacy',
  lead: 'What we collect, what other people can see, and what you can change.',
  draft:
    'Pilot draft. Our full privacy policy is being reviewed by privacy counsel and will replace this summary before launch.',
  updated: 'October 2026',
  sections: [
    {
      id: 'collect',
      title: 'What we collect',
      list: [
        'Your mobile number, to sign you in and keep your account secure.',
        'Your display name, area, interests and profile photo, if you add one.',
        'Your listings, offers, deals, messages, comments, reviews and reports.',
        'Basic technical information, such as your device type and when you signed in, to keep the service working and safe.',
      ],
    },
    {
      id: 'visible',
      title: 'What other people see',
      list: [
        'Your display name, profile photo, area, when you joined, your reviews with their count, and your active listings.',
        'Never your phone number or an exact address. Listings show an area only.',
        'Meeting details in a deal are visible only to the two people in it.',
      ],
    },
    {
      id: 'why',
      title: 'Why we use it',
      paragraphs: [
        'To run your account and your trades, to keep people safe (reviewing reports and preventing abuse), and to send the messages you need about offers and handovers. Tips and news are sent only if you turn them on in Settings.',
      ],
    },
    {
      id: 'choices',
      title: 'Your choices',
      list: [
        'Edit your name, area, interests and photo in Settings.',
        'Turn tips and news on or off in Settings.',
        'Ask to delete your account from Settings.',
      ],
      links: [{ to: '/settings', label: 'Account settings' }],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      paragraphs: [
        'Retention periods are being confirmed with privacy counsel. Some records of completed deals and safety cases may need to be kept for legal reasons after an account is deleted.',
      ],
    },
  ],
  related: [
    { to: '/terms', label: 'Terms' },
    { to: '/support', label: 'Safety and help' },
  ],
}
