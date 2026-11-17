// Dates in the local time of the browser: «29 жовтня о 19:42».
const dateTime = new Intl.DateTimeFormat('uk', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateTime = new Intl.DateTimeFormat('uk', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// «12 листопада 2026 р.»
const date = new Intl.DateTimeFormat('uk', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(instant: string): string {
  return date.format(new Date(instant));
}

export function formatDateTime(instant: string): string {
  return dateTime.format(new Date(instant));
}

export function formatShortDateTime(instant: string): string {
  return shortDateTime.format(new Date(instant));
}

// 18:24 or 1:02:03, as a stopwatch shows it.
export function formatDuration(milliseconds: number): string {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

// §24.10: a date of the calendar of the player, 'YYYY-MM-DD', at noon so no zone moves it to another day.
const noonOf = (day: string) => new Date(`${day}T12:00:00.000Z`);
const weekday = new Intl.DateTimeFormat('uk', { weekday: 'short', timeZone: 'UTC' });
const day = new Intl.DateTimeFormat('uk', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// «Пн», under a column of the chart of the last days.
export function formatWeekday(date: string): string {
  const name = weekday.format(noonOf(date));

  return name.charAt(0).toUpperCase() + name.slice(1);
}

// «понеділок, 16 листопада»
export function formatDay(date: string): string {
  return day.format(noonOf(date));
}

// Whole numbers with their thousands apart: «1 250».
const count = new Intl.NumberFormat('uk', { maximumFractionDigits: 0 });

export function formatCount(value: number): string {
  return count.format(value);
}
