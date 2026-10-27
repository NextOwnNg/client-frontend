import { zodResolver } from '@hookform/resolvers/zod'
import { SendHorizontal } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { MESSAGE_MAX } from '@/features/messages/message-limits'

const messageSchema = z.object({ body: z.string().trim().min(1).max(MESSAGE_MAX) })

type MessageForm = z.infer<typeof messageSchema>

/** Keyboard-resilient composer: it grows with the text and stays above the keyboard and bottom nav. */
export function MessageComposer({ onSend }: { onSend: (body: string) => void }) {
  const { register, handleSubmit, reset, watch } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { body: '' },
  })
  // Sending happens in the background (the bubble shows its progress), so the box clears at once
  const submit = handleSubmit(({ body }) => {
    onSend(body)
    reset()
  })
  const empty = !watch('body').trim()

  // Enter sends with a keyboard and mouse; on touch screens Enter is a new line and the button sends
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex items-end gap-2">
      <label htmlFor="message-body" className="sr-only">
        Message
      </label>
      <textarea
        id="message-body"
        rows={1}
        maxLength={MESSAGE_MAX}
        placeholder="Write a message"
        onKeyDown={onKeyDown}
        className="field-input field-sizing-content h-auto max-h-36 min-h-11 flex-1 resize-none py-2.5 leading-6"
        {...register('body')}
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={empty}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground transition-[transform,opacity] duration-120 ease-out active:scale-95 disabled:opacity-40"
      >
        <SendHorizontal aria-hidden className="size-5" />
      </button>
    </form>
  )
}
