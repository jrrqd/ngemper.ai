import type { FlightAlternative, RouteAlternative } from '../types';

export function totalPriceIdr(route: RouteAlternative): number {
  return route.milestones.reduce((sum, m) => sum + m.priceIdr, 0);
}

export function totalDurationMin(route: RouteAlternative): number {
  return route.milestones.reduce((sum, m) => sum + m.durationMin, 0);
}

export function saveVsFlying(
  route: RouteAlternative,
  flight: FlightAlternative,
): number {
  return flight.priceIdr - totalPriceIdr(route);
}
