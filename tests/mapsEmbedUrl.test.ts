import { describe, it, expect } from 'vitest';
import { mapsEmbedUrl } from '../src/lib/mapsEmbedUrl';
import type { Milestone } from '../src/types';

const milestones: Milestone[] = [
  {
    id: 'a',
    from: 'A',
    to: 'B',
    mode: 'Bus',
    legType: 'transit',
    durationMin: 10,
    priceIdr: 1,
    estimate: false,
    crossBorder: false,
    snapshot: {
      type: 'static',
      image: '/x.png',
      creator: '@x',
      url: 'https://example.com',
    },
    map: { lat: -6.5, lng: 106.8 },
  },
  {
    id: 'b',
    from: 'B',
    to: 'C',
    mode: 'Bus',
    legType: 'transit',
    durationMin: 10,
    priceIdr: 1,
    estimate: false,
    crossBorder: false,
    snapshot: {
      type: 'static',
      image: '/x.png',
      creator: '@x',
      url: 'https://example.com',
    },
    map: { lat: 7.0, lng: 100.5 },
  },
  {
    id: 'c',
    from: 'C',
    to: 'D',
    mode: 'Train',
    legType: 'transit',
    durationMin: 10,
    priceIdr: 1,
    estimate: false,
    crossBorder: false,
    snapshot: {
      type: 'static',
      image: '/x.png',
      creator: '@x',
      url: 'https://example.com',
    },
    map: { lat: 13.7, lng: 100.5 },
  },
];

describe('mapsEmbedUrl', () => {
  it('returns null when key missing', () => {
    expect(mapsEmbedUrl(milestones, '')).toBeNull();
  });

  it('builds directions embed with origin destination waypoints', () => {
    const url = mapsEmbedUrl(milestones, 'TESTKEY');
    expect(url).toContain('https://www.google.com/maps/embed/v1/directions');
    expect(url).toContain('key=TESTKEY');
    expect(url).toContain('origin=-6.5%2C106.8');
    expect(url).toContain('destination=13.7%2C100.5');
    expect(url).toContain('waypoints=7%2C100.5');
  });
});
