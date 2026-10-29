import type { Area, Category, RuntimeConfig } from '@/types/api'

/**
 * MOCK categories (decision R-4): placeholders until the pilot categories are confirmed.
 * Swap this file for the confirmed list; components read categories from /config only.
 */
export const categories: Category[] = [
  {
    id: 'phones',
    name: 'Phones',
    fields: [
      {
        id: 'storage',
        label: 'Storage',
        type: 'select',
        options: ['64GB', '128GB', '256GB', '512GB'],
        allowUnknown: true,
      },
      { id: 'battery', label: 'Battery health', type: 'percent', allowUnknown: true },
      { id: 'accessories', label: 'Included accessories', type: 'text' },
    ],
  },
  {
    id: 'laptops',
    name: 'Laptops & tablets',
    fields: [
      {
        id: 'storage',
        label: 'Storage',
        type: 'select',
        options: ['128GB', '256GB', '512GB', '1TB'],
        allowUnknown: true,
      },
      { id: 'ram', label: 'Memory (RAM)', type: 'select', options: ['4GB', '8GB', '16GB', '32GB'], allowUnknown: true },
      { id: 'battery', label: 'Battery health', type: 'percent', allowUnknown: true },
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    fields: [
      { id: 'controllers', label: 'Controllers included', type: 'select', options: ['0', '1', '2', '3+'] },
      { id: 'accessories', label: 'Included games and accessories', type: 'text' },
    ],
  },
  {
    id: 'home',
    name: 'Home & appliances',
    fields: [{ id: 'power', label: 'Power and plug type', type: 'text', allowUnknown: true }],
  },
]

/** Placeholder areas: the launch city and its areas are not chosen yet (PRD D-01). */
export const areas: Area[] = [
  { id: 'central', name: '[Pilot Area] Central', cityId: 'pilot' },
  { id: 'north', name: '[Pilot Area] North', cityId: 'pilot' },
  { id: 'east', name: '[Pilot Area] East', cityId: 'pilot' },
  { id: 'west', name: '[Pilot Area] West', cityId: 'pilot' },
]

export const runtimeConfig: RuntimeConfig = {
  cityName: '[Pilot City]',
  areas,
  categories,
  offerLifetimeHours: 72,
  quickSellOptionsHours: [24, 48, 72, 168],
  reservationDays: 7,
  photoLimits: { min: 1, max: 8 },
  // MOCK contacts and channels: clearly fictional until operations confirms them (PRD D-06). The email uses the
  // reserved .example domain and the links go to example.com, so nothing reaches a real inbox or account.
  support: {
    email: 'support@nextown.example',
    phone: '+234 000 000 0000',
    whatsapp: '2340000000000',
    hours: 'Mon to Sat, 9am to 6pm WAT',
  },
  social: [
    { network: 'instagram', handle: '@nextown', url: 'https://example.com/nextown/instagram' },
    { network: 'x', handle: '@nextown', url: 'https://example.com/nextown/x' },
    { network: 'tiktok', handle: '@nextown', url: 'https://example.com/nextown/tiktok' },
    { network: 'facebook', handle: 'NextOwn', url: 'https://example.com/nextown/facebook' },
  ],
}
