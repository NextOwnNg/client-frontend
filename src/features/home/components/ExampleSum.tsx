import { OfferSum } from '@/components/domain/OfferSum'
import { payerSentence } from '@/components/domain/payer-sentence'

/** The signature, shown once as a worked example so a first-time visitor sees how a mixed trade reads. */
export function ExampleSum() {
  return (
    <figure className="flex flex-col gap-2">
      <OfferSum
        heading="Example: a swap with cash added"
        give={[
          { kind: 'item', title: 'Your iPhone 11 · 64GB' },
          { kind: 'cash', title: 'Cash from you', kobo: 120_000_00 },
        ]}
        receive={{ title: 'MacBook Air M1, 2020' }}
        sentence={payerSentence({ viewer: 'offerer', direction: 'OFFERER_PAYS_OWNER', kobo: 120_000_00 })}
        animateIn
        className="shadow-card"
      />
      <figcaption className="px-1 text-caption text-muted">
        Every offer is written out like this, so both people see who gives what.
      </figcaption>
    </figure>
  )
}
