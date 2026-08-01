import type { RouteAlternative, SortMode } from '../types';
import { totalDurationMin, totalPriceIdr } from './totals';

export function rankRoutes(
  routes: RouteAlternative[],
  sort: SortMode,
): RouteAlternative[] {
  return [...routes].sort((a, b) => {
    const primary =
      sort === 'cheapest'
        ? totalPriceIdr(a) - totalPriceIdr(b)
        : totalDurationMin(a) - totalDurationMin(b);
    if (primary !== 0) return primary;
    return a.id.localeCompare(b.id);
  });
}
