import { describe, expect, it } from 'vitest';
import { addHoursToWall, utcToZonedWallTime, zonedWallTimeToUtc } from './datetime';

describe('zonedWallTimeToUtc', () => {
  it('interprets the wall time in the given zone (Zürich, summer = UTC+2)', () => {
    expect(zonedWallTimeToUtc('2026-05-23T10:00', 'Europe/Zurich').toISOString()).toBe(
      '2026-05-23T08:00:00.000Z',
    );
  });

  it('handles the winter offset (Zürich, CET = UTC+1)', () => {
    expect(zonedWallTimeToUtc('2026-01-15T10:00', 'Europe/Zurich').toISOString()).toBe(
      '2026-01-15T09:00:00.000Z',
    );
  });

  it('is identity for UTC', () => {
    expect(zonedWallTimeToUtc('2026-05-23T10:00', 'UTC').toISOString()).toBe(
      '2026-05-23T10:00:00.000Z',
    );
  });
});

describe('utcToZonedWallTime', () => {
  it('renders the instant as wall time in the zone', () => {
    expect(utcToZonedWallTime('2026-05-23T08:00:00.000Z', 'Europe/Zurich')).toBe(
      '2026-05-23T10:00',
    );
  });

  it('round-trips with zonedWallTimeToUtc', () => {
    const wall = '2026-07-04T18:30';
    const iso = zonedWallTimeToUtc(wall, 'Europe/Zurich').toISOString();
    expect(utcToZonedWallTime(iso, 'Europe/Zurich')).toBe(wall);
  });
});

describe('addHoursToWall', () => {
  it('adds hours within the same day', () => {
    expect(addHoursToWall('2026-05-23T19:00', 2)).toBe('2026-05-23T21:00');
  });

  it('rolls over to the next day', () => {
    expect(addHoursToWall('2026-05-23T23:30', 2)).toBe('2026-05-24T01:30');
  });
});
