import { LayoutGrid, Search, X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { useListingSuggestions } from '@/features/listings/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cx } from '@/lib/cx'
import type { ListingSuggestion } from '@/types/api'

type SearchBoxProps = {
  defaultValue?: string
  onSearch: (q: string) => void
  onCategory: (categoryId: string) => void
  className?: string
}

/**
 * Keyword search with suggestions (PRD FE-EXP-01), built on the WAI-ARIA combobox pattern: arrows move
 * through suggestions, Enter picks the highlighted one or searches the typed text, Escape closes.
 * Hand-rolled rather than React Aria's ComboBox to keep a phone's first Explore load inside budget.
 */
export function SearchBox({ defaultValue = '', onSearch, onCategory, className }: SearchBoxProps) {
  const id = useId()
  const listId = `${id}-suggestions`
  const [text, setText] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const term = useDebouncedValue(text, 200)
  const { data: suggestions = [] } = useListingSuggestions(term)
  const showList = open && text.trim().length >= 2 && suggestions.length > 0

  function choose(suggestion: ListingSuggestion) {
    setOpen(false)
    setActive(-1)
    if (suggestion.kind === 'category') {
      setText('')
      onCategory(suggestion.categoryId)
    } else {
      setText(suggestion.label)
      onSearch(suggestion.label)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp' && showList) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault()
      setOpen(false)
      setActive(-1)
    } else if (e.key === 'Enter' && showList && active >= 0) {
      e.preventDefault()
      const picked = suggestions[active]
      if (picked) choose(picked)
    }
  }

  const optionId = (i: number) => `${id}-option-${i}`

  return (
    <form
      role="search"
      className={cx('relative', className)}
      onSubmit={(e) => {
        e.preventDefault()
        setOpen(false)
        onSearch(text.trim())
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        role="combobox"
        aria-label="Search items"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Search phones, laptops…"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="field-input pr-12 pl-12 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('')
            onSearch('')
          }}
          className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X aria-hidden className="size-5" />
        </button>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-control border border-border bg-surface py-1 shadow-overlay"
      >
        {suggestions.map((s, i) => (
          // Combobox pattern: keyboard selection happens on the input (aria-activedescendant), not on options
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={`${s.kind}:${s.label}`}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            onClick={() => choose(s)}
            // mousedown keeps focus in the input, so blur doesn't close the list before the click lands
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            className={cx(
              'flex min-h-11 cursor-pointer items-center gap-3 px-4 text-body text-ink',
              i === active && 'bg-mint',
            )}
          >
            {s.kind === 'category' ? (
              <>
                <LayoutGrid aria-hidden className="size-4 shrink-0 text-action" />
                <span className="truncate">{s.label}</span>
                <span className="ml-auto text-caption text-muted">Category</span>
              </>
            ) : (
              <>
                <Search aria-hidden className="size-4 shrink-0 text-muted" />
                <span className="truncate">{s.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </form>
  )
}
