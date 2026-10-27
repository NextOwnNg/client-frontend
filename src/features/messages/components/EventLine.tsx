import { Handshake } from 'lucide-react'
import { Link } from 'react-router'
import type { ChatMessage } from '@/types/api'

/** A line from NextOwn in the thread, such as "Offer accepted. The deal has started." */
export function EventLine({ message }: { message: ChatMessage }) {
  return (
    <p className="mx-auto flex max-w-md items-start gap-2 rounded-control bg-mint px-3 py-2 text-compact text-ink">
      <Handshake aria-hidden className="mt-0.5 size-4 shrink-0 text-action" />
      <span>
        {message.body}{' '}
        {message.link && (
          <Link
            to={message.link}
            className="font-semibold whitespace-nowrap text-action underline-offset-4 hover:underline"
          >
            View the deal
          </Link>
        )}
      </span>
    </p>
  )
}
