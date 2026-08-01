import type { Milestone } from '../types';

/** Ordered city stops for a route stream: first `from`, then each leg `to`. */
export function hubsFromMilestones(milestones: Milestone[]): string[] {
  if (milestones.length === 0) return [];
  const hubs = [milestones[0].from];
  for (const m of milestones) {
    hubs.push(m.to);
  }
  return hubs;
}
