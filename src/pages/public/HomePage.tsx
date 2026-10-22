import { Button } from '@heroui/react'
import { Seo } from '@/components/seo/Seo'

export function HomePage() {
  return (
    <>
      <Seo description="Sell what you no longer need, swap for something better, or add cash to make the exchange work." />

      <section className="flex max-w-2xl flex-col gap-4 py-12">
        <h1 className="text-h1 text-ink desktop:text-display">Find your next thing.</h1>
        <p className="text-body text-muted">
          Sell what you no longer need, swap for something better, or add cash to make the exchange work.
        </p>
        <div className="flex flex-col gap-3 tablet:flex-row">
          <Button variant="primary">Explore items</Button>
          <Button variant="secondary">List an item</Button>
        </div>
      </section>
    </>
  )
}
