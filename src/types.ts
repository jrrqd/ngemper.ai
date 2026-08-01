export type CityId =
  | 'bogor'
  | 'jakarta'
  | 'bandung'
  | 'yogyakarta'
  | 'surabaya'
  | 'bekasi'
  | 'bangkok'
  | 'kuala-lumpur'
  | 'singapore';

export type City = {
  id: CityId;
  label: string;
  role: 'origin' | 'destination' | 'both';
};

export type LegType = 'feeder' | 'transfer' | 'transit';

export type Snapshot =
  | { type: 'embed'; provider: 'youtube' | 'tiktok'; url: string }
  | { type: 'static'; image: string; creator: string; url: string };

export type BorderPrep = {
  badge: 'Cross-border · passport required';
  checklist: string[];
};

export type TicketLink = {
  url: string;
  provider: string;
};

export type Milestone = {
  id: string;
  from: string;
  to: string;
  mode: string;
  legType: LegType;
  durationMin: number;
  priceIdr: number;
  estimate: boolean;
  crossBorder: boolean;
  borderPrep?: BorderPrep;
  /** Curated ticket URL; future affiliate seam (no ref IDs yet). */
  ticket?: TicketLink;
  snapshot: Snapshot;
  map: { lat: number; lng: number };
};

export type RouteAlternative = {
  id: string;
  label: string;
  milestones: Milestone[];
};

export type FlightAlternative = {
  carrier: string;
  durationMin: number;
  priceIdr: number;
  source: string;
};

export type Corridor = {
  id: string;
  origin: CityId;
  destination: CityId;
  flightAlternative: FlightAlternative;
  routes: RouteAlternative[];
};

export type FeederLeg = Milestone & {
  legType: 'feeder';
  estimate: true;
  origin: CityId;
  hub: 'jakarta';
};

export type SortMode = 'cheapest' | 'fastest';

export type Plan = {
  origin: CityId;
  destination: CityId;
  composed: boolean;
  flightAlternative: FlightAlternative;
  routes: RouteAlternative[];
};
