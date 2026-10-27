import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

/** Search that hands off to Explore. Suggestions live on Explore, keeping Home's first load light. */
export function HomeSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState('')

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        const q = text.trim()
        void navigate(q ? `/explore?${new URLSearchParams({ q })}` : '/explore')
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label="Search items"
        enterKeyHint="search"
        placeholder="Search phones, laptops…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="field-input pl-12"
      />
    </form>
  )
}
