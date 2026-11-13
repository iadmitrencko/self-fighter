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
