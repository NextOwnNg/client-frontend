import { ChevronRight, FileClock } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import type { PolicyDoc, PolicyLink, PolicySection } from '@/features/help/content/types'
import { siteOrigin } from '@/lib/seo/origin'

const inlineLink =
  'inline-flex min-h-11 items-center gap-1 text-compact font-semibold text-action underline-offset-4 hover:underline'

/**
 * One layout for help and policy pages (Read mode): a readable measure, an "On this page" list that sits
 * beside the text from 1024px, and anchors that land below the sticky header.
 */
export function PolicyPage({ doc, path }: { doc: PolicyDoc; path: string }) {
  const { hash } = useLocation()

  // Arriving at `/community-rules#prohibited` scrolls to that section once it has rendered
  useEffect(() => {
    if (!hash) return
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView?.())
    return () => cancelAnimationFrame(frame)
  }, [hash])

  return (
    <article
      aria-labelledby="policy-title"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 desktop:grid desktop:grid-cols-[14rem_minmax(0,1fr)] desktop:items-start desktop:gap-12"
    >
      <Seo title={doc.title} description={doc.lead} canonical={`${siteOrigin()}${path}`} />
      <header className="flex flex-col gap-3 desktop:col-span-2">
        <h1 id="policy-title" className="text-h2 text-balance text-ink tablet:text-h1">
          {doc.title}
        </h1>
        <p className="max-w-prose text-body text-muted">{doc.lead}</p>
        {doc.draft && (
          <p className="flex max-w-prose items-start gap-2 rounded-control bg-highlight-tint px-3 py-2 text-compact text-ink">
            <FileClock aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {doc.draft}
              {doc.updated && <span className="text-muted"> Last updated {doc.updated}.</span>}
            </span>
          </p>
        )}
      </header>

      {doc.sections.length > 2 && (
        <nav aria-label="On this page" className="desktop:sticky desktop:top-24">
          <p className="text-caption font-semibold text-muted">On this page</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 desktop:flex-col">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-11 items-center text-compact text-ink underline-offset-4 hover:text-action hover:underline desktop:min-h-9"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex min-w-0 flex-col gap-10 desktop:col-start-2">
        {doc.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
        <RelatedLinks links={doc.related} />
      </div>
    </article>
  )
}

function Section({ section }: { section: PolicySection }) {
  const headingId = `${section.id}-title`
  return (
    <section id={section.id} aria-labelledby={headingId} className="flex max-w-prose scroll-mt-24 flex-col gap-3">
      <h2 id={headingId} className="text-h3 text-balance text-ink">
        {section.title}
      </h2>
      {section.paragraphs?.map((p) => (
        <p key={p} className="text-body text-ink">
          {p}
        </p>
      ))}
      {section.list && (
        <ul className="flex flex-col gap-2 pl-5 text-body text-ink [list-style:disc] marker:text-action">
          {section.list.map((item) => (
            <li key={item} className="pl-1">
              {item}
            </li>
          ))}
        </ul>
      )}
      {section.steps && (
        <ol className="flex flex-col gap-5">
          {section.steps.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              <span
                aria-hidden
                className="tabular flex size-8 items-center justify-center rounded-full bg-mint text-compact font-bold text-action"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1 pt-1">
                <h3 className="text-body font-semibold text-ink">{step.title}</h3>
                <p className="text-body text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {section.links && (
        <div className="flex flex-wrap gap-x-5">
          {section.links.map((link) => (
            <Link key={link.to} to={link.to} className={inlineLink}>
              {link.label}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function RelatedLinks({ links }: { links: PolicyLink[] }) {
  return (
    <nav aria-label="Related pages" className="flex max-w-prose flex-col gap-1 border-t border-border pt-5">
      <p className="text-caption font-semibold text-muted">Related</p>
      <ul className="flex flex-wrap gap-x-5">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={inlineLink}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
