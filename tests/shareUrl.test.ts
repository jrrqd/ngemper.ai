import { describe, it, expect } from 'vitest';
import { buildShareUrl, parseShareUrl } from '../src/lib/shareUrl';

describe('shareUrl', () => {
  it('builds query with origin destination route sort', () => {
    const url = buildShareUrl({
      origin: 'bogor',
      destination: 'bangkok',
      route: 'cheap-overland',
      sort: 'cheapest',
    });
    expect(url).toContain('origin=bogor');
    expect(url).toContain('destination=bangkok');
    expect(url).toContain('route=cheap-overland');
    expect(url).toContain('sort=cheapest');
  });

  it('parses valid params', () => {
    const params = new URLSearchParams(
      'origin=bogor&destination=bangkok&route=cheap-overland&sort=fastest',
    );
    expect(parseShareUrl(params)).toEqual({
      origin: 'bogor',
      destination: 'bangkok',
      route: 'cheap-overland',
      sort: 'fastest',
    });
  });

  it('returns null for invalid city ids', () => {
    const params = new URLSearchParams('origin=paris&destination=bangkok');
    expect(parseShareUrl(params)).toBeNull();
  });
});
