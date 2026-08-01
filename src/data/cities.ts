import type { City, CityId } from '../types';

export const cities: City[] = [
  { id: 'bogor', label: 'Bogor', role: 'origin' },
  { id: 'jakarta', label: 'Jakarta', role: 'both' },
  { id: 'bandung', label: 'Bandung', role: 'origin' },
  { id: 'yogyakarta', label: 'Yogyakarta', role: 'origin' },
  { id: 'surabaya', label: 'Surabaya', role: 'origin' },
  { id: 'bekasi', label: 'Bekasi', role: 'origin' },
  { id: 'bangkok', label: 'Bangkok', role: 'destination' },
  { id: 'kuala-lumpur', label: 'Kuala Lumpur', role: 'destination' },
  { id: 'singapore', label: 'Singapore', role: 'destination' },
];

export const origins: CityId[] = [
  'bogor',
  'jakarta',
  'bandung',
  'yogyakarta',
  'surabaya',
  'bekasi',
];

export const destinations: CityId[] = [
  'bangkok',
  'kuala-lumpur',
  'singapore',
];

export function cityLabel(id: CityId): string {
  return cities.find((c) => c.id === id)?.label ?? id;
}
