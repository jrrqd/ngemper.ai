import type { CityId, Corridor, FeederLeg, Plan, RouteAlternative } from '../types';
import feedersJson from '../data/feeders.json';
import bogorBangkok from '../data/corridors/bogor-bangkok.json';
import jakartaBangkok from '../data/corridors/jakarta-bangkok.json';
import jakartaKl from '../data/corridors/jakarta-kuala-lumpur.json';
import jakartaSingapore from '../data/corridors/jakarta-singapore.json';

const corridors: Record<string, Corridor> = {
  'bogor-bangkok': bogorBangkok as Corridor,
  'jakarta-bangkok': jakartaBangkok as Corridor,
  'jakarta-kuala-lumpur': jakartaKl as Corridor,
  'jakarta-singapore': jakartaSingapore as Corridor,
};

const feeders = feedersJson as FeederLeg[];

function corridorId(origin: CityId, destination: CityId): string {
  return `${origin}-${destination}`;
}

function attachFeeder(
  feeder: FeederLeg,
  routes: RouteAlternative[],
): RouteAlternative[] {
  return routes.map((r) => ({
    ...r,
    id: r.id,
    milestones: [
      {
        ...feeder,
        id: `${feeder.origin}-jakarta-feeder`,
      },
      ...r.milestones,
    ],
  }));
}

export function composePlan(origin: CityId, destination: CityId): Plan {
  if (origin === destination) {
    throw new Error('Origin and destination must differ');
  }

  const seeded = corridors[corridorId(origin, destination)];
  if (seeded) {
    return {
      origin,
      destination,
      composed: false,
      flightAlternative: seeded.flightAlternative,
      routes: seeded.routes,
    };
  }

  if (origin === 'jakarta') {
    throw new Error(`No seeded corridor for jakarta → ${destination}`);
  }

  const feeder = feeders.find((f) => f.origin === origin);
  if (!feeder) {
    throw new Error(`No feeder for origin ${origin}`);
  }

  const hub = corridors[corridorId('jakarta', destination)];
  if (!hub) {
    throw new Error(`No hub corridor jakarta → ${destination}`);
  }

  return {
    origin,
    destination,
    composed: true,
    flightAlternative: hub.flightAlternative,
    routes: attachFeeder(feeder, hub.routes),
  };
}

export function listCorridors(): Corridor[] {
  return Object.values(corridors);
}
