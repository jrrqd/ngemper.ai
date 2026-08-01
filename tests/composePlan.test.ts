import { describe, it, expect } from 'vitest';
import { composePlan } from '../src/lib/composePlan';
import bogorBangkok from '../src/data/corridors/bogor-bangkok.json';
import jakartaKl from '../src/data/corridors/jakarta-kuala-lumpur.json';
import feeders from '../src/data/feeders.json';
import type { Corridor, FeederLeg, Milestone } from '../src/types';

const corridors = {
  'bogor-bangkok': bogorBangkok,
  'jakarta-kuala-lumpur': jakartaKl,
} as unknown as Record<string, Corridor>;

describe('composePlan', () => {
  it('returns seeded Bogor→Bangkok with composed=false', () => {
    const plan = composePlan('bogor', 'bangkok');
    expect(plan.composed).toBe(false);
    expect(plan.origin).toBe('bogor');
    expect(plan.destination).toBe('bangkok');
    expect(plan.routes.length).toBeGreaterThanOrEqual(2);
    expect(plan.flightAlternative.priceIdr).toBeGreaterThan(0);
  });

  it('returns seeded Jakarta→KL with composed=false and ≥2 routes', () => {
    const plan = composePlan('jakarta', 'kuala-lumpur');
    expect(plan.composed).toBe(false);
    expect(plan.routes.length).toBeGreaterThanOrEqual(2);
  });

  it('composes Bandung→Bangkok with feeder prepended and estimate=true', () => {
    const plan = composePlan('bandung', 'bangkok');
    expect(plan.composed).toBe(true);
    for (const route of plan.routes) {
      const first = route.milestones[0];
      expect(first.legType).toBe('feeder');
      expect(first.estimate).toBe(true);
      expect(first.from.toLowerCase()).toContain('bandung');
    }
  });

  it('throws when origin equals destination', () => {
    expect(() => composePlan('jakarta', 'jakarta')).toThrow();
  });
});

describe('corridor invariants', () => {
  function assertMilestones(milestones: Milestone[]) {
    for (const m of milestones) {
      if (m.crossBorder) {
        expect(m.borderPrep).toBeDefined();
        expect(m.borderPrep?.badge).toBe('Cross-border · passport required');
        expect(m.borderPrep?.checklist.length).toBeGreaterThanOrEqual(2);
      }
      if (m.legType === 'transfer' || m.legType === 'feeder') {
        expect(m.estimate).toBe(true);
      }
    }
  }

  it('every crossBorder milestone has borderPrep; transfers/feeders are estimates', () => {
    for (const corridor of Object.values(corridors)) {
      for (const route of corridor.routes) {
        assertMilestones(route.milestones as Milestone[]);
      }
    }
    for (const feeder of feeders as FeederLeg[]) {
      assertMilestones([feeder]);
    }
  });
});
