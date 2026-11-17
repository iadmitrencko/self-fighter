import { describe, expect, it } from 'vitest';
import { addDays, dayStreak, lastDays, localDate } from './calendar';

describe('the calendar of the player', () => {
  // §24.12: the day of a battle is the day where the player is.
  it('finds the date of an instant in a time zone', () => {
    expect(localDate('2026-10-30T22:30:00.000Z', 'UTC')).toBe('2026-10-30');
    expect(localDate('2026-10-30T22:30:00.000Z', 'Europe/Kyiv')).toBe('2026-10-31');
    expect(localDate(new Date('2026-07-01T03:00:00.000Z'), 'America/New_York')).toBe('2026-06-30');
  });

  it('counts days across months and years', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(lastDays('2026-11-02', 4)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  // §24.12: the days in a row with a battle; today does not end the run until it is over.
  it('counts the days in a row with a battle', () => {
    const days = ['2026-10-20', '2026-10-28', '2026-10-29', '2026-10-30'];

    expect(dayStreak(days, '2026-10-30')).toEqual({ days: 3, today: true });
    expect(dayStreak(days, '2026-10-31')).toEqual({ days: 3, today: false });
    expect(dayStreak(days, '2026-11-01')).toEqual({ days: 0, today: false });
    expect(dayStreak([], '2026-10-30')).toEqual({ days: 0, today: false });
  });
});
