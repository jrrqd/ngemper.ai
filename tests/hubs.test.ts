import { describe, expect, it } from 'vitest';
import { hubsFromMilestones } from '../src/lib/hubs';
import type { Milestone } from '../src/types';

function leg(from: string, to: string): Milestone {
  return {
    id: `${from}-${to}`,
    from,
    to,
    mode: 'bus',
    legType: 'transit',
    durationMin: 60,
    priceIdr: 0,
    estimate: false,
    crossBorder: false,
    snapshot: { type: 'static', image: '/x.png', creator: '@t', url: '#' },
    map: { lat: 0, lng: 0 },
  };
}

describe('hubsFromMilestones', () => {
  it('returns empty for no milestones', () => {
    expect(hubsFromMilestones([])).toEqual([]);
  });

  it('lists every city stop along the path', () => {
    expect(
      hubsFromMilestones([
        leg('Bogor', 'Jakarta'),
        leg('Jakarta', 'Hat Yai'),
        leg('Hat Yai', 'Bangkok'),
      ]),
    ).toEqual(['Bogor', 'Jakarta', 'Hat Yai', 'Bangkok']);
  });
});
