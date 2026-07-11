/** Parse hours + minutes fields into milliseconds */
export function parseHoursMinutes(hours: number, minutes: number): number | null {
  if (hours < 0 || minutes < 0 || minutes >= 60) return null;
  if (hours === 0 && minutes === 0) return null;
  return (hours * 3600 + minutes * 60) * 1000;
}
export function parseTimeInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;

  if (t.includes(':')) {
    const parts = t.split(':').map(p => parseInt(p, 10));
    if (parts.some(n => isNaN(n) || n < 0)) return null;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    return null;
  }

  const num = parseFloat(t);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 60 * 1000);
}
