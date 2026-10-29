import { copy } from '@/lib/copy/copy'
import type { PolicyDoc } from '@/features/help/content/types'

/** The safety guide (FE-TRU-05): meeting, paying, spotting scams, reporting, blocking and appeals. */
export const supportDoc: PolicyDoc = {
  title: 'Safety and help',
  lead: 'How to meet, inspect and exchange safely, and what to do when something goes wrong.',
  sections: [
    {
      id: 'meeting',
      title: 'Meeting safely',
      paragraphs: [
        'Agree the place and time in the deal, so you both have the same record. Meeting details stay private to the two of you.',
      ],
      list: [
        'Meet in a busy public place in daylight, like a mall entrance or a bank forecourt.',
        'Bring someone with you if you can, and tell a friend where you’re going.',
        'Don’t invite someone you haven’t met to your home, and don’t go to theirs.',
        'If anything feels wrong, leave. You can cancel or report from the deal page afterwards.',
      ],
    },
    {
      id: 'inspecting',
      title: 'Inspecting the item',
      paragraphs: [
        'Check the item matches the listing and the agreed offer before anything changes hands. The deal page keeps the agreed terms exactly as they were accepted, defects included.',
      ],
      list: [
        'Switch it on. Test the camera, ports, buttons, charging and anything listed as working.',
        'Compare serial numbers, IMEI or model numbers with what you were told.',
        'For phones, make sure the previous owner has signed out of their accounts.',
        'Take your time. Someone honest won’t rush you.',
      ],
    },
    {
      id: 'paying',
      title: 'Paying',
      paragraphs: [
        copy.handoverNotice,
        'Pay or transfer only once you have inspected the item and are standing with it. Never pay a “deposit” or “delivery fee” before meeting.',
        'NextOwn never asks for your PIN, password or a one-time code, and never asks you to pay through a link in a message.',
      ],
    },
    {
      id: 'scams',
      title: 'Spotting a scam',
      list: [
        'A price far below everything else, with pressure to decide today.',
        'Asking to move the chat to another app before you’ve met.',
        'Asking for payment first, or sending a screenshot of a “payment” instead of money you can see in your account.',
        'Refusing to meet, or changing the meeting place at the last minute to somewhere quiet.',
        'Asking for your one-time code “to confirm the deal”.',
      ],
    },
    {
      id: 'reporting',
      title: 'Reporting a problem',
      paragraphs: [
        'Use Report on the listing, post, comment, profile or conversation. For a deal, use Report a problem on the deal page: it pauses confirming and reviews for both of you while support looks into it.',
        'Each report gets a case reference. My reports shows its status. We don’t tell anyone who reported them.',
        copy.supportLimit,
      ],
      links: [{ to: '/me/reports', label: 'My reports' }],
    },
    {
      id: 'blocking',
      title: 'Blocking someone',
      paragraphs: [
        'Block a person from their profile or from a conversation. Neither of you can message the other or make new offers to each other, and you won’t see their posts or comments. They aren’t told.',
        'Offers, deals and messages you already have stay readable for both of you. You can unblock people in Settings.',
      ],
    },
    {
      id: 'appeals',
      title: 'Restricted accounts and appeals',
      paragraphs: [
        'If your account is restricted, you can’t list, make offers or post until it’s resolved. Your offers, deals and messages stay available, and you can still report problems.',
        'If you think it’s a mistake, ask for a review. A person from the safety team looks at it again, and you get a case reference.',
      ],
      links: [{ to: '/appeal', label: 'Ask for a review' }],
    },
    {
      id: 'emergencies',
      title: 'In an emergency',
      paragraphs: [
        'If you’re in danger, contact local emergency services first. Then tell us what happened through Report, so the safety team can act on the account.',
      ],
    },
  ],
  related: [
    { to: '/how-it-works', label: 'How it works' },
    { to: '/community-rules', label: 'Community rules' },
    { to: '/terms', label: 'Terms' },
    { to: '/privacy', label: 'Privacy' },
  ],
}
