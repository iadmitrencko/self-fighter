// §24.10, §24.12: the days of the game go by the calendar of the player, dates written as
// 'YYYY-MM-DD'. The time zone comes from outside, as the time does.

const DAY_MS = 86_400_000;

// The date an instant falls on in a time zone of the IANA database, such as 'Europe/Kyiv'.
export function localDate(instant: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    new Date(instant),
  );
  const { year, month, day } = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${year}-${month}-${day}`;
}

// The date that many days later, or earlier for a negative number.
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// The last days up to today, the oldest first.
export function lastDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}

export interface DayStreak {
  // The days in a row with a battle.
  readonly days: number;
  // Whether today is one of them already.
  readonly today: boolean;
}

/**
 * §24.12: the days in a row with a battle. A day without a battle does not end the run until it is
 * over, so the run may end yesterday.
 */
export function dayStreak(days: readonly string[], today: string): DayStreak {
  const fought = new Set(days);
  const counted = fought.has(today);
  let day = counted ? today : addDays(today, -1);
  let count = 0;

  while (fought.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }

  return { days: count, today: counted };
}
