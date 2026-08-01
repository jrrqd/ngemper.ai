import type { CityId, SortMode } from '../types';
import { destinations, origins } from '../data/cities';

export type ShareState = {
  origin: CityId;
  destination: CityId;
  route: string;
  sort: SortMode;
};

const originSet = new Set<string>(origins);
const destinationSet = new Set<string>(destinations);

export function buildShareUrl(state: ShareState, base = '/'): string {
  const params = new URLSearchParams({
    origin: state.origin,
    destination: state.destination,
    route: state.route,
    sort: state.sort,
  });
  return `${base}?${params.toString()}`;
}

export function parseShareUrl(params: URLSearchParams): ShareState | null {
  const origin = params.get('origin');
  const destination = params.get('destination');
  const route = params.get('route') ?? 'cheap-overland';
  const sortRaw = params.get('sort') ?? 'cheapest';

  if (!origin || !destination) return null;
  if (!originSet.has(origin) || !destinationSet.has(destination)) return null;
  if (sortRaw !== 'cheapest' && sortRaw !== 'fastest') return null;

  return {
    origin: origin as CityId,
    destination: destination as CityId,
    route,
    sort: sortRaw,
  };
}
