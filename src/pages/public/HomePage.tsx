import { Seo } from '@/components/seo/Seo'
import { useAreaSheet } from '@/components/layout/use-area-sheet'
import { useRuntimeConfig } from '@/features/config/api'
import {
  CategoryShortcuts,
  ExampleSum,
  HeroActions,
  HomeSearch,
  HowItWorks,
  TradeRoutes,
} from '@/features/home/components/HomeSections'
import { RecentListings } from '@/features/listings/components/RecentListings'
import { copy } from '@/lib/copy/copy'
import { siteOrigin } from '@/lib/seo/origin'
import { useUiStore } from '@/stores/ui'

/** UX-01 Home: the promise, a search, the ways to trade, one worked example, and what's listed nearby. */
export function HomePage() {
  const { data: config } = useRuntimeConfig()
  const areaIds = useUiStore((s) => s.areaIds)
  const setAreaIds = useUiStore((s) => s.setAreaIds)
  const areaSheet = useAreaSheet()

  return (
    <>
      <Seo description={copy.supportingLine} canonical={`${siteOrigin()}/`} />

      <div className="flex flex-col gap-10 desktop:gap-14">
        <section className="grid gap-6 desktop:grid-cols-[minmax(0,1fr)_26rem] desktop:items-center desktop:gap-16 desktop:py-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-h2 text-ink tablet:text-h1 desktop:text-display">{copy.hero}</h1>
              <p className="max-w-xl text-body text-muted">{copy.supportingLine}</p>
            </div>
            <HomeSearch />
            <TradeRoutes />
            <HeroActions />
          </div>
          <ExampleSum />
        </section>

        <RecentListings
          areaIds={areaIds}
          config={config}
          onChooseArea={areaSheet.open}
          onPreloadArea={areaSheet.preload}
          onAllAreas={() => setAreaIds([])}
        />

        {config && config.categories.length > 0 && <CategoryShortcuts categories={config.categories} />}

        <HowItWorks />
      </div>
      {areaSheet.sheet}
    </>
  )
}
