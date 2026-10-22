import type { ItemCondition, ListingStatus, ListingSummary, PublicSeller, TradeMode } from '@/types/api'

/**
 * FICTIONAL sample data. People, listings and prices are invented for development and every listing
 * carries `sample: true`. Photos are openly licensed Wikimedia Commons images (public/mock/items/SOURCES.md).
 */

export const sellers: PublicSeller[] = [
  { id: 'u-tolu', displayName: 'Tolu A.', phoneConfirmed: true, reviewCount: 12, rating: 4.8, areaName: '[Pilot Area] Central' },
  { id: 'u-chidi', displayName: 'Chidi O.', phoneConfirmed: true, reviewCount: 3, rating: 4.7, areaName: '[Pilot Area] North' },
  { id: 'u-amaka', displayName: 'Amaka N.', phoneConfirmed: true, reviewCount: 0, areaName: '[Pilot Area] East' },
  { id: 'u-ibrahim', displayName: 'Ibrahim S.', phoneConfirmed: true, reviewCount: 1, rating: 5, areaName: '[Pilot Area] West' },
  { id: 'u-zainab', displayName: 'Zainab M.', phoneConfirmed: true, reviewCount: 27, rating: 4.6, areaName: '[Pilot Area] Central' },
]

const HOUR = 3_600_000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()
const fromNow = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString()
const naira = (amount: number) => amount * 100

type Seed = {
  slug: string
  title: string
  categoryId: string
  condition: ItemCondition
  defectSummary?: string
  modes: TradeMode[]
  askingNaira: number | null
  area: string
  status?: ListingStatus
  urgentHours?: number
  publishedHoursAgo: number
  photo: string
  alt: string
  width: number
  height: number
  sellerId: string
}

const seeds: Seed[] = [
  { slug: 'iphone-12-pro-128gb', title: 'iPhone 12 Pro · 128GB', categoryId: 'phones', condition: 'GOOD', defectSummary: 'Small scratch on frame', modes: ['CASH', 'SWAP'], askingNaira: 385_000, area: '[Pilot Area] Central', publishedHoursAgo: 3, photo: 'iphone-12-pro', alt: 'Silver iPhone 12 Pro held in hand, back view', width: 427, height: 800, sellerId: 'u-tolu' },
  { slug: 'macbook-air-m1-2020-gold', title: 'MacBook Air M1, 2020', categoryId: 'laptops', condition: 'LIKE_NEW', defectSummary: 'Battery 91%', modes: ['CASH', 'SWAP'], askingNaira: 610_000, area: '[Pilot Area] North', urgentHours: 30, publishedHoursAgo: 18, photo: 'macbook-air-m1', alt: 'Gold MacBook Air open on a desk', width: 800, height: 600, sellerId: 'u-chidi' },
  { slug: 'ps5-disc-edition', title: 'PS5 Disc Edition', categoryId: 'gaming', condition: 'FAIR', defectSummary: 'One controller, light scuffs', modes: ['SWAP'], askingNaira: null, area: '[Pilot Area] East', publishedHoursAgo: 26, photo: 'ps5', alt: 'PS5 console standing upright next to its controller', width: 664, height: 800, sellerId: 'u-amaka' },
  { slug: 'iphone-12-pro-max-256gb', title: 'iPhone 12 Pro Max · 256GB', categoryId: 'phones', condition: 'GOOD', defectSummary: 'Camera ring worn', modes: ['CASH'], askingNaira: 520_000, area: '[Pilot Area] West', publishedHoursAgo: 40, photo: 'iphone-12-pro-max', alt: 'Close-up of the iPhone 12 Pro camera module', width: 800, height: 450, sellerId: 'u-ibrahim' },
  { slug: 'nintendo-switch-docked', title: 'Nintendo Switch with dock', categoryId: 'gaming', condition: 'GOOD', defectSummary: 'Joy-Con slight drift', modes: ['CASH', 'SWAP'], askingNaira: 260_000, area: '[Pilot Area] Central', urgentHours: 14, publishedHoursAgo: 10, photo: 'nintendo-switch', alt: 'Nintendo Switch console in its dock with red and blue Joy-Cons', width: 800, height: 457, sellerId: 'u-zainab' },
  { slug: 'macbook-air-m1-space-grey', title: 'MacBook Air M1 · Space Grey', categoryId: 'laptops', condition: 'GOOD', defectSummary: 'Dent on bottom case', modes: ['CASH', 'SWAP'], askingNaira: 560_000, area: '[Pilot Area] East', publishedHoursAgo: 52, photo: 'macbook-m1-open', alt: 'Space grey MacBook open on a white surface', width: 800, height: 533, sellerId: 'u-tolu' },
  { slug: 'tecno-camon-cx', title: 'Tecno Camon CX', categoryId: 'phones', condition: 'FAIR', defectSummary: 'Cracked screen protector', modes: ['CASH'], askingNaira: 45_000, area: '[Pilot Area] North', publishedHoursAgo: 60, photo: 'tecno-camon-cx', alt: 'Tecno Camon CX phone held in hand, screen off', width: 600, height: 800, sellerId: 'u-chidi' },
  { slug: 'ipad-9th-gen-64gb', title: 'iPad 9th gen · 64GB', categoryId: 'laptops', condition: 'LIKE_NEW', modes: ['CASH', 'SWAP'], askingNaira: 230_000, area: '[Pilot Area] Central', publishedHoursAgo: 72, photo: 'ipad', alt: 'Three iPads side by side showing the Apple logo', width: 800, height: 600, sellerId: 'u-zainab' },
  { slug: 'ps4-slim-500gb', title: 'PS4 · 500GB', categoryId: 'gaming', condition: 'GOOD', defectSummary: 'No original box', modes: ['CASH', 'SWAP'], askingNaira: 210_000, area: '[Pilot Area] West', publishedHoursAgo: 80, photo: 'ps4', alt: 'Black PS4 console, angled view', width: 800, height: 548, sellerId: 'u-ibrahim' },
  { slug: 'xbox-series-x', title: 'Xbox Series X · 1TB', categoryId: 'gaming', condition: 'LIKE_NEW', modes: ['CASH'], askingNaira: 590_000, area: '[Pilot Area] North', status: 'RESERVED', publishedHoursAgo: 96, photo: 'xbox-series-x', alt: 'Xbox Series X standing on a wooden shelf', width: 600, height: 800, sellerId: 'u-chidi' },
  { slug: 'panasonic-microwave', title: 'Panasonic microwave, 20L', categoryId: 'home', condition: 'GOOD', defectSummary: 'Turntable clicks slightly', modes: ['CASH'], askingNaira: 65_000, area: '[Pilot Area] East', publishedHoursAgo: 30, photo: 'microwave', alt: 'White Panasonic microwave on a kitchen shelf', width: 800, height: 546, sellerId: 'u-amaka' },
  { slug: 'mixer-grinder', title: 'Table-top blender and grinder', categoryId: 'home', condition: 'LIKE_NEW', modes: ['CASH', 'SWAP'], askingNaira: 25_000, area: '[Pilot Area] Central', urgentHours: 60, publishedHoursAgo: 8, photo: 'blender', alt: 'Silver blender base with two jars', width: 602, height: 800, sellerId: 'u-tolu' },
  { slug: 'vintage-desk-fan', title: 'Vintage GE desk fan', categoryId: 'home', condition: 'FAIR', defectSummary: 'Cage has rust spots', modes: ['CASH', 'SWAP'], askingNaira: 30_000, area: '[Pilot Area] West', publishedHoursAgo: 120, photo: 'desk-fan', alt: 'Vintage metal desk fan with a round cage', width: 600, height: 800, sellerId: 'u-ibrahim' },
  { slug: 'dell-inspiron-1525', title: 'Dell Inspiron 1525', categoryId: 'laptops', condition: 'FAIR', defectSummary: 'Battery holds 40 minutes', modes: ['CASH'], askingNaira: 95_000, area: '[Pilot Area] North', publishedHoursAgo: 140, photo: 'dell-inspiron', alt: 'Silver Dell Inspiron laptop open, keyboard view', width: 790, height: 800, sellerId: 'u-chidi' },
  { slug: 'thinkpad-r51', title: 'IBM ThinkPad R51', categoryId: 'laptops', condition: 'FOR_PARTS', defectSummary: 'Powers on, no battery', modes: ['CASH', 'SWAP'], askingNaira: 40_000, area: '[Pilot Area] East', status: 'EXPIRED', publishedHoursAgo: 200, photo: 'thinkpad-r51', alt: 'Black ThinkPad laptop open with the screen on', width: 800, height: 743, sellerId: 'u-amaka' },
  { slug: 'samsung-galaxy-gt-i7500', title: 'Samsung Galaxy GT-i7500', categoryId: 'phones', condition: 'FOR_PARTS', defectSummary: 'Does not charge', modes: ['CASH', 'SWAP'], askingNaira: 15_000, area: '[Pilot Area] Central', publishedHoursAgo: 160, photo: 'samsung-galaxy', alt: 'Back of a black Samsung Galaxy phone', width: 599, height: 800, sellerId: 'u-zainab' },
]

export const listings: (ListingSummary & { sellerId: string })[] = seeds.map((s, i) => ({
  id: `l${i + 1}`,
  slug: s.slug,
  title: s.title,
  categoryId: s.categoryId,
  condition: s.condition,
  defectSummary: s.defectSummary,
  acceptedModes: s.modes,
  askingKobo: s.askingNaira === null ? null : naira(s.askingNaira),
  areaName: s.area,
  status: s.status ?? 'ACTIVE',
  urgencyEndsAt: s.urgentHours ? fromNow(s.urgentHours) : undefined,
  publishedAt: ago(s.publishedHoursAgo),
  cover: { url: `/mock/items/${s.photo}.jpg`, alt: s.alt, width: s.width, height: s.height },
  sample: true,
  sellerId: s.sellerId,
}))
