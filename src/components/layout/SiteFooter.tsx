import { Clock, Mail, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BrandIcon, brandNames } from '@/components/brand/BrandIcon'
import { Logo } from '@/components/brand/Logo'
import { useRuntimeConfig } from '@/features/config/api'
import { copy } from '@/lib/copy/copy'
import { cx } from '@/lib/cx'

const columns: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Trade',
    links: [
      { to: '/explore', label: 'Explore items' },
      { to: '/feed', label: 'Feed' },
      { to: '/listings/new', label: 'List an item' },
    ],
  },
  {
    title: 'Help',
    links: [
      { to: '/how-it-works', label: 'How it works' },
      { to: '/support', label: 'Safety and help' },
      { to: '/community-rules', label: 'Community rules' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms' },
      { to: '/privacy', label: 'Privacy' },
    ],
  },
]

const link =
  'inline-flex min-h-11 items-center text-compact text-muted underline-offset-4 pointer-fine:hover:text-ink pointer-fine:hover:underline desktop:min-h-9'

function Column({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <nav aria-label={title} className={cx('flex flex-col gap-1', className)}>
      <h2 className="text-caption font-semibold text-ink">{title}</h2>
      {children}
    </nav>
  )
}

/**
 * The full footer: what to do, where to get help, how to reach support and the official channels. Contacts and
 * channels come from runtime config (PRD §3.2); a part that isn't set simply isn't shown.
 */
export function SiteFooter() {
  const { data: config } = useRuntimeConfig()
  const support = config?.support
  const social = config?.social ?? []
  const hasContact = Boolean(support?.email || support?.phone || support?.whatsapp)

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-content grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 tablet:grid-cols-3 tablet:px-6 desktop:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.3fr)]">
        <div className="col-span-2 flex flex-col gap-3 tablet:col-span-3 desktop:col-span-1">
          <Logo height={24} />
          <p className="max-w-xs text-compact text-muted">{copy.brandLine}</p>
          {social.length > 0 && (
            <ul aria-label="NextOwn on social media" className="-ml-2.5 flex gap-1">
              {social.map((channel) => (
                <li key={channel.network}>
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${brandNames[channel.network]}: ${channel.handle} (opens in a new tab)`}
                    className="flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-120 pointer-fine:hover:bg-mint pointer-fine:hover:text-action"
                  >
                    <BrandIcon name={channel.network} className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {columns.map((column) => (
          <Column key={column.title} title={column.title}>
            <ul className="flex flex-col">
              {column.links.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={link}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>
        ))}

        {/* Full width on phones, so the email address fits on one line */}
        <Column title="Contact support" className="col-span-2 tablet:col-span-1">
          <ul className="flex flex-col">
            {support?.email && (
              <li>
                <a href={`mailto:${support.email}`} className={`${link} gap-2`}>
                  <Mail aria-hidden className="size-4 shrink-0" />
                  {support.email}
                </a>
              </li>
            )}
            {support?.whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${support.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link} gap-2`}
                >
                  <BrandIcon name="whatsapp" className="size-4 shrink-0" />
                  WhatsApp us
                </a>
              </li>
            )}
            {support?.phone && (
              <li>
                <a href={`tel:${support.phone.replace(/\s/g, '')}`} className={`${link} tabular gap-2`}>
                  <Phone aria-hidden className="size-4 shrink-0" />
                  {support.phone}
                </a>
              </li>
            )}
            {support?.hours && (
              <li className="flex items-start gap-2 py-1 text-compact text-muted">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                {support.hours}
              </li>
            )}
          </ul>
          <p className="mt-1 text-caption text-muted">
            {hasContact
              ? 'For a problem with a listing, chat or deal, use Report there: it gets a case reference.'
              : 'To reach support, use Report on the listing, chat or deal: it gets a case reference.'}
          </p>
        </Column>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-content px-4 py-4 text-caption text-muted tablet:px-6">
          © {new Date().getFullYear()} NextOwn. Pilot in {config?.cityName ?? 'the pilot city'}.
        </p>
      </div>
    </footer>
  )
}
