import { describe, it, expect } from 'vitest';
import { formatIdr, formatDuration } from '../src/lib/format';

describe('format', () => {
  it('formats IDR with Rp prefix', () => {
    expect(formatIdr(1_400_000)).toMatch(/Rp/);
    expect(formatIdr(1_400_000)).toContain('1');
  });

  it('formats duration as hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(45)).toBe('45m');
  });
});
