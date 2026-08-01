import { describe, it, expect } from 'vitest';
import { rankRoutes } from '../src/lib/rankRoutes';
import type { RouteAlternative } from '../src/types';

function route(
  id: string,
  priceIdr: number,
  durationMin: number,
): RouteAlternative {
  return {
    id,
    label: id,
    milestones: [
      {
        id: `${id}-m0`,
        from: 'A',
        to: 'B',
        mode: 'Bus',
        legType: 'transit',
        durationMin,
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
      },
    ],
  };
}

describe('rankRoutes', () => {
  const routes = [
    route('faster-hybrid', 1_800_000, 36 * 60),
    route('cheap-overland', 1_400_000, 48 * 60),
    route('scenic', 1_600_000, 52 * 60),
  ];

  it('sorts cheapest by ascending totalPriceIdr', () => {
    const ranked = rankRoutes(routes, 'cheapest');
    expect(ranked.map((r) => r.id)).toEqual([
      'cheap-overland',
      'scenic',
      'faster-hybrid',
    ]);
  });

  it('sorts fastest by ascending totalDurationMin', () => {
    const ranked = rankRoutes(routes, 'fastest');
    expect(ranked.map((r) => r.id)).toEqual([
      'faster-hybrid',
      'cheap-overland',
      'scenic',
    ]);
  });

  it('stable-ties by id when totals match', () => {
    const tied = [
      route('scenic', 1_000_000, 100),
      route('cheap-overland', 1_000_000, 100),
    ];
    expect(rankRoutes(tied, 'cheapest').map((r) => r.id)).toEqual([
      'cheap-overland',
      'scenic',
    ]);
  });
});
