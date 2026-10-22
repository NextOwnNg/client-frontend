import { Button, Chip } from '@heroui/react'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { Seo } from '@/components/seo/Seo'

/** Dev-only reference for the brand tokens (route /dev/tokens, excluded from production builds). */

const colours = [
  { name: 'Ink', token: 'ink', hex: '#142D32', className: 'bg-ink' },
  { name: 'Exchange Teal', token: 'action', hex: '#0B6159', className: 'bg-action' },
  { name: 'Teal Hover', token: 'action-hover', hex: '#084B46', className: 'bg-action-hover' },
  { name: 'Warm Gold', token: 'highlight', hex: '#F9BB55', className: 'bg-highlight' },
  { name: 'Cloud', token: 'cloud', hex: '#F7F9F7', className: 'bg-cloud' },
  { name: 'Paper', token: 'paper', hex: '#FFFFFF', className: 'bg-paper' },
  { name: 'Mint Mist', token: 'mint', hex: '#E8F4EF', className: 'bg-mint' },
  { name: 'Slate', token: 'slate', hex: '#486067', className: 'bg-slate' },
  { name: 'Border', token: 'border', hex: '#D6E2DE', className: 'bg-border' },
  { name: 'Success', token: 'success', hex: '#147D52', className: 'bg-success' },
  { name: 'Warning', token: 'warning', hex: '#9A5900', className: 'bg-warning' },
  { name: 'Danger', token: 'danger', hex: '#B42318', className: 'bg-danger' },
  { name: 'Information', token: 'info', hex: '#2453A6', className: 'bg-info' },
]

const typeScale = [
  { name: 'Display', className: 'text-display font-display', sample: 'Find your next thing.' },
  { name: 'H1', className: 'text-h1 font-display', sample: 'Find your next thing.' },
  { name: 'H2', className: 'text-h2 font-display', sample: 'Offer accepted' },
  { name: 'H3', className: 'text-h3 font-display', sample: 'Condition and defects' },
  { name: 'Body', className: 'text-body', sample: 'Add clear photos of your item and show any defects.' },
  { name: 'Body medium', className: 'text-body font-medium', sample: 'You pay ₦50,000 directly to the other person.' },
  { name: 'Compact', className: 'text-compact', sample: 'Good · [Pilot Area] · Open to swap' },
  { name: 'Caption', className: 'text-caption', sample: 'Ends Fri 24 Oct, 6:00 pm WAT' },
  { name: 'Price', className: 'text-price tabular', sample: '₦285,000' },
]

const radii = [
  { name: 'sm · 8', className: 'rounded-lg' },
  { name: 'control · 12', className: 'rounded-control' },
  { name: 'card · 16', className: 'rounded-card' },
  { name: 'feature · 24', className: 'rounded-feature' },
]

export function TokensPage() {
  return (
    <div className="flex flex-col gap-12">
      <Seo title="Design tokens" noindex />
      <h1 className="text-h1 text-ink">Design tokens</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">Logo</h2>
        <div className="grid gap-4 tablet:grid-cols-3">
          <div className="flex h-32 items-center justify-center rounded-card border border-border bg-surface">
            <Logo height={40} />
          </div>
          <div className="flex h-32 items-center justify-center rounded-card bg-ink">
            <Logo variant="reverse" height={40} />
          </div>
          <div className="flex h-32 items-center justify-center rounded-card border border-border bg-surface">
            <Logo variant="mono" height={40} />
          </div>
        </div>
        <div className="flex items-end gap-6">
          <LogoMark size={64} />
          <LogoMark size={32} />
          <LogoMark size={20} />
          <span className="flex size-16 items-center justify-center rounded-feature bg-ink">
            <LogoMark variant="reverse" size={46} label="" />
          </span>
          <LogoMark variant="mono" size={32} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">Colour</h2>
        <ul className="grid grid-cols-2 gap-4 tablet:grid-cols-3 desktop:grid-cols-4">
          {colours.map((c) => (
            <li key={c.token} className="overflow-hidden rounded-card border border-border bg-surface">
              <div className={`h-16 ${c.className}`} />
              <div className="p-3">
                <p className="text-compact font-semibold text-ink">{c.name}</p>
                <p className="text-caption text-muted tabular">
                  {c.token} · {c.hex}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">Typography</h2>
        <ul className="flex flex-col gap-3">
          {typeScale.map((t) => (
            <li key={t.name} className="flex flex-col gap-1 border-b border-border pb-3">
              <span className="text-caption text-muted">{t.name}</span>
              <span className={`text-ink ${t.className}`}>{t.sample}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">Actions and status</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Make an offer</Button>
          <Button variant="secondary">Counter</Button>
          <Button variant="tertiary">Review terms</Button>
          <Button variant="danger">Close listing</Button>
          <Button variant="primary" isDisabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip>Available</Chip>
          <Chip color="warning">Reserved</Chip>
          <Chip color="success">Completed</Chip>
          <Chip color="danger">Removed</Chip>
          <span className="rounded-full bg-highlight px-3 py-1 text-caption text-highlight-foreground">
            Quick Sell · Ends in 18h
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">Radius and elevation</h2>
        <div className="flex flex-wrap gap-4">
          {radii.map((r) => (
            <div
              key={r.name}
              className={`flex h-24 w-32 items-end border border-border bg-surface p-3 shadow-card ${r.className}`}
            >
              <span className="text-caption text-muted">{r.name}</span>
            </div>
          ))}
          <div className="flex h-24 w-32 items-end rounded-card bg-surface p-3 shadow-overlay">
            <span className="text-caption text-muted">overlay shadow</span>
          </div>
        </div>
      </section>
    </div>
  )
}
