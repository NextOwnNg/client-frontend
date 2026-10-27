import { SendHorizontal } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { MESSAGE_MAX } from '@/features/messages/message-limits'

/** Keyboard-resilient composer: it grows with the text and stays above the keyboard and bottom nav. */
export function MessageComposer({ onSend }: { onSend: (body: string) => void }) {
  const [body, setBody] = useState('')
  const trimmed = body.trim()

  function submit() {
    if (!trimmed) return
    onSend(trimmed)
    setBody('')
  }

  // Enter sends with a keyboard and mouse; on touch screens Enter is a new line and the button sends
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-end gap-2"
    >
      <label htmlFor="message-body" className="sr-only">
        Message
      </label>
      <textarea
        id="message-body"
        rows={1}
        maxLength={MESSAGE_MAX}
        value={body}
        placeholder="Write a message"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        className="field-input [field-sizing:content] h-auto max-h-36 min-h-11 flex-1 resize-none py-2.5 leading-6"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!trimmed}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground transition-[transform,opacity] duration-120 ease-out active:scale-95 disabled:opacity-40"
      >
        <SendHorizontal aria-hidden className="size-5" />
      </button>
    </form>
  )
}
