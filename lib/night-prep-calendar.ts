export interface NightPrepCalendarTime {
  hour: number;
  minute: number;
}

function padIcs(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseNightPrepCalendarTime(
  hourRaw: string | null,
  minuteRaw: string | null
): NightPrepCalendarTime | null {
  const hour = parseInt(hourRaw ?? '', 10);
  const minute = parseInt(minuteRaw ?? '', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function nextNightPrepOccurrence(hour: number, minute: number, now = Date.now()): Date {
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setHours(hour, minute, 0, 0);
  if (start.getTime() <= now) start.setDate(start.getDate() + 1);
  return start;
}

export function buildNightPrepSiteUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/?nightprep=1`;
}

export function buildNightPrepEventDetails(origin: string): string {
  const siteUrl = buildNightPrepSiteUrl(origin);
  return `3 quick checks + tomorrow's tasks.\\n\\nOpen produc: ${siteUrl}`;
}

/** Daily night prep .ics — used by API feed and optional file download. */
export function buildNightPrepIcs(origin: string, time: NightPrepCalendarTime, now = Date.now()): string {
  const start = nextNightPrepOccurrence(time.hour, time.minute, now);
  const dtstart = `${start.getFullYear()}${padIcs(start.getMonth() + 1)}${padIcs(start.getDate())}T${padIcs(time.hour)}${padIcs(time.minute)}00`;
  const siteUrl = buildNightPrepSiteUrl(origin);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Produc//Night Prep//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'NAME:Night prep',
    'X-WR-CALNAME:Night prep',
    'BEGIN:VEVENT',
    'UID:produc-night-prep@produc',
    `DTSTART:${dtstart}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Night prep',
    `DESCRIPTION:${buildNightPrepEventDetails(origin)}`,
    `URL:${siteUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildNightPrepCalendarFeedUrl(origin: string, time: NightPrepCalendarTime): string {
  const params = new URLSearchParams({
    hour: String(time.hour),
    minute: String(time.minute),
  });
  return `${origin.replace(/\/$/, '')}/api/night-prep/calendar?${params}`;
}

/** webcal:// opens Apple Calendar to subscribe — no file download. */
export function buildNightPrepWebcalUrl(origin: string, time: NightPrepCalendarTime): string {
  const https = buildNightPrepCalendarFeedUrl(origin, time);
  return https.replace(/^https:\/\//i, 'webcal://').replace(/^http:\/\//i, 'webcal://');
}

function toOutlookLocalDatetime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** Outlook web compose — user sets daily repeat when saving. */
export function buildOutlookCalendarComposeUrl(
  origin: string,
  time: NightPrepCalendarTime,
  now = Date.now()
): string {
  const start = nextNightPrepOccurrence(time.hour, time.minute, now);
  const end = new Date(start.getTime() + 15 * 60_000);
  const siteUrl = buildNightPrepSiteUrl(origin);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: 'Night prep',
    body: `3 quick checks + tomorrow's tasks.\n\nOpen produc: ${siteUrl}`,
    startdt: toOutlookLocalDatetime(start),
    enddt: toOutlookLocalDatetime(end),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
