/** Listing review, from the seller's side. Kind and plain: a listing needs changes, it isn't "rejected". */
export const reviewCopy = {
  changesNeeded: 'Changes needed',
  resubmitted: 'Resubmitted. We’re checking it again.',
  messageLabel: 'Message from NextOwn',
  editAndResubmit: 'Edit and resubmit',
  resubmit: 'Resubmit for review',
  wizardHint: 'Make your changes, then resubmit. We’ll check it again, usually within a few hours.',
  banner: (n: number) =>
    n === 1 ? '1 listing needs changes before it can go live.' : `${n} listings need changes before they can go live.`,
  bannerLink: (n: number) => (n === 1 ? 'See it' : 'See them'),
  resubmittedTitle: 'Thanks, we’ll check it again',
  resubmittedBody:
    'We’ll let you know once it’s been reviewed, usually within a few hours. You can still edit or close it.',
} as const
