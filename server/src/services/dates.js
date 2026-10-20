// All railway times are IST. Dates are handled as "YYYY-MM-DD" strings so no
// timezone library is needed.
export const isDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function istDateTime(dateStr, dayOffset, hhmm) {
  return new Date(`${addDays(dateStr, dayOffset)}T${hhmm}:00+05:30`);
}

export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function istHour(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600 * 1000).getUTCHours();
}
