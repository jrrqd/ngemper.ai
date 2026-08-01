import type { Milestone } from '../types';

function coord(m: Milestone): string {
  return `${m.map.lat},${m.map.lng}`;
}

export function mapsEmbedUrl(
  milestones: Milestone[],
  apiKey: string,
): string | null {
  if (!apiKey || milestones.length === 0) return null;

  const origin = coord(milestones[0]);
  const destination = coord(milestones[milestones.length - 1]);
  const middle = milestones.slice(1, -1).map(coord);
  const params = new URLSearchParams({
    key: apiKey,
    origin,
    destination,
    mode: 'driving',
  });
  if (middle.length) {
    params.set('waypoints', middle.join('|'));
  }
  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}
