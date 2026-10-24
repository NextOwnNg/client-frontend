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
}
