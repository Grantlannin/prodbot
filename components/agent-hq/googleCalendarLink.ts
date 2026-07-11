function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Local date/time in Google Calendar URL format (YYYYMMDDTHHmmss). */
export function toGoogleCalendarDate(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export function buildGoogleCalendarUrl(opts: {
  title: string;
  details?: string;
  start: Date;
  durationMinutes?: number;
  /** Google signed-in account slot in the browser (0 = first account). */
  accountIndex?: number;
  /** Max encoded details length — long URLs fail to open compose reliably. */
  maxDetailsLength?: number;
  /** Use render?action=TEMPLATE (needed for recur= on recurring events). */
  templateAction?: boolean;
}): string {
  const duration = opts.durationMinutes ?? 30;
  const end = new Date(opts.start.getTime() + duration * 60_000);
  const maxDetails = opts.maxDetailsLength ?? 600;
  const details = opts.details?.trim();
  const trimmedDetails =
    details && details.length > maxDetails ? `${details.slice(0, maxDetails - 1)}…` : details;
  const accountIndex = Math.max(0, Math.min(4, opts.accountIndex ?? 0));

  const params = new URLSearchParams({
    text: opts.title,
    dates: `${toGoogleCalendarDate(opts.start)}/${toGoogleCalendarDate(end)}`,
  });

  if (trimmedDetails) params.set('details', trimmedDetails);

  if (typeof window !== 'undefined') {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) params.set('ctz', tz);
  }

  if (opts.templateAction) {
    params.set('action', 'TEMPLATE');
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  return `https://calendar.google.com/calendar/u/${accountIndex}/r/eventedit?${params.toString()}`;
}

export function buildGoogleCalendarHomeUrl(accountIndex = 0): string {
  const index = Math.max(0, Math.min(4, accountIndex));
  return `https://calendar.google.com/calendar/u/${index}/r`;
}

/** Navigate in the current tab (avoids extra tabs / account picker confusion). */
export function navigateToUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.location.assign(url);
}

/** Default reminder: 1 hour from now, rounded up to next 15 minutes. */
export function defaultReminderDate(): Date {
  const d = new Date(Date.now() + 60 * 60_000);
  const mins = d.getMinutes();
  const rounded = Math.ceil(mins / 15) * 15;
  d.setMinutes(rounded, 0, 0);
  if (rounded >= 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
  }
  return d;
}

export function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toOutlookLocalDatetime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function toIcsLocalDatetime(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

export function buildOutlookCalendarEventUrl(opts: {
  title: string;
  details?: string;
  start: Date;
  durationMinutes?: number;
}): string {
  const duration = opts.durationMinutes ?? 30;
  const end = new Date(opts.start.getTime() + duration * 60_000);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: opts.title,
    startdt: toOutlookLocalDatetime(opts.start),
    enddt: toOutlookLocalDatetime(end),
  });
  if (opts.details?.trim()) params.set('body', opts.details.trim());
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildSingleEventIcs(opts: {
  title: string;
  details?: string;
  start: Date;
  durationMinutes?: number;
  uid?: string;
}): string {
  const duration = opts.durationMinutes ?? 30;
  const end = new Date(opts.start.getTime() + duration * 60_000);
  const uid = opts.uid ?? `produc-open-loop-${Date.now()}@produc`;
  const description = (opts.details ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const summary = opts.title.replace(/,/g, '\\,');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Produc//Open Loop//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${toIcsLocalDatetime(opts.start)}`,
    `DTEND:${toIcsLocalDatetime(end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function buildMultiEventIcs(
  events: Array<{
    title: string;
    details?: string;
    start: Date;
    durationMinutes?: number;
    uid?: string;
  }>
): string {
  const vevents = events.map(opts => {
    const duration = opts.durationMinutes ?? 30;
    const end = new Date(opts.start.getTime() + duration * 60_000);
    const uid = opts.uid ?? `produc-event-${Date.now()}-${Math.random().toString(36).slice(2)}@produc`;
    const description = (opts.details ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
    const summary = opts.title.replace(/,/g, '\\,');
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${toIcsLocalDatetime(opts.start)}`,
      `DTEND:${toIcsLocalDatetime(end)}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Produc//Build My Day//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcsFile(ics: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
