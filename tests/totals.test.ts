import { describe, it, expect } from 'vitest';
import {
  totalPriceIdr,
  totalDurationMin,
  saveVsFlying,
} from '../src/lib/totals';
import type { FlightAlternative, RouteAlternative } from '../src/types';

const route = (prices: number[], durations: number[]): RouteAlternative => ({
  id: 'cheap-overland',
  label: 'Cheapest overland',
  milestones: prices.map((priceIdr, i) => ({
    id: `m${i}`,
    from: 'A',
    to: 'B',
    mode: 'Bus',
    legType: 'transit',
    durationMin: durations[i] ?? 0,
    priceIdr,
    estimate: false,
    crossBorder: false,
    snapshot: {
      type: 'static',
      image: '/snapshots/x.png',
      creator: '@x',
      url: 'https://example.com',
    },
    map: { lat: 0, lng: 0 },
  })),
});

const flight: FlightAlternative = {
  carrier: 'Lion Air',
  durationMin: 200,
  priceIdr: 2_100_000,
  source: 'Traveloka avg, Aug 2026',
};

describe('totals', () => {
  it('sums milestone prices into totalPriceIdr', () => {
    expect(totalPriceIdr(route([20_000, 500_000, 900_000], [60, 600, 480]))).toBe(
      1_420_000,
    );
  });

  it('sums milestone durations into totalDurationMin', () => {
    expect(totalDurationMin(route([1, 1], [60, 120]))).toBe(180);
  });

  it('computes saveVsFlying as flight price minus overland total', () => {
    expect(saveVsFlying(route([1_400_000], [2880]), flight)).toBe(700_000);
  });

  it('allows negative save when overland is more expensive', () => {
    expect(saveVsFlying(route([3_000_000], [1000]), flight)).toBe(-900_000);
  });
});
