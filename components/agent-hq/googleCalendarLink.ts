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

/** Local date only in Google Calendar URL format (YYYYMMDD) for all-day events. */
export function toGoogleCalendarDateOnly(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function buildGoogleCalendarUrl(opts: {
  title: string;
  details?: string;
  start: Date;
  durationMinutes?: number;
  /** All-day event (date-only; ignores durationMinutes). */
  allDay?: boolean;
  /** Google signed-in account slot in the browser (0 = first account). */
  accountIndex?: number;
  /** Max encoded details length — long URLs fail to open compose reliably. */
  maxDetailsLength?: number;
  /** Use render?action=TEMPLATE (needed for recur= on recurring events). */
  templateAction?: boolean;
}): string {
  const maxDetails = opts.maxDetailsLength ?? 600;
  const details = opts.details?.trim();
  const trimmedDetails =
    details && details.length > maxDetails ? `${details.slice(0, maxDetails - 1)}…` : details;
  const accountIndex = Math.max(0, Math.min(4, opts.accountIndex ?? 0));

  let dates: string;
  if (opts.allDay) {
    const day = new Date(opts.start.getFullYear(), opts.start.getMonth(), opts.start.getDate());
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    dates = `${toGoogleCalendarDateOnly(day)}/${toGoogleCalendarDateOnly(next)}`;
  } else {
    const duration = opts.durationMinutes ?? 30;
    const end = new Date(opts.start.getTime() + duration * 60_000);
    dates = `${toGoogleCalendarDate(opts.start)}/${toGoogleCalendarDate(end)}`;
  }

  const params = new URLSearchParams({
    text: opts.title,
    dates,
  });

  if (trimmedDetails) params.set('details', trimmedDetails);

  if (!opts.allDay && typeof window !== 'undefined') {
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
  allDay?: boolean;
}): string {
  const day = new Date(opts.start.getFullYear(), opts.start.getMonth(), opts.start.getDate());
  let startdt: string;
  let enddt: string;
  if (opts.allDay) {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    startdt = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    enddt = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
  } else {
    const duration = opts.durationMinutes ?? 30;
    const end = new Date(opts.start.getTime() + duration * 60_000);
    startdt = toOutlookLocalDatetime(opts.start);
    enddt = toOutlookLocalDatetime(end);
  }
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: opts.title,
    startdt,
    enddt,
  });
  if (opts.allDay) params.set('allday', 'true');
  if (opts.details?.trim()) params.set('body', opts.details.trim());
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildSingleEventIcs(opts: {
  title: string;
  details?: string;
  start: Date;
  durationMinutes?: number;
  allDay?: boolean;
  uid?: string;
}): string {
  const uid = opts.uid ?? `produc-open-loop-${Date.now()}@produc`;
  const description = (opts.details ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const summary = opts.title.replace(/,/g, '\\,');

  let dtStart: string;
  let dtEnd: string;
  if (opts.allDay) {
    const day = new Date(opts.start.getFullYear(), opts.start.getMonth(), opts.start.getDate());
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const ymd = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    dtStart = `DTSTART;VALUE=DATE:${ymd(day)}`;
    dtEnd = `DTEND;VALUE=DATE:${ymd(next)}`;
  } else {
    const duration = opts.durationMinutes ?? 30;
    const end = new Date(opts.start.getTime() + duration * 60_000);
    dtStart = `DTSTART:${toIcsLocalDatetime(opts.start)}`;
    dtEnd = `DTEND:${toIcsLocalDatetime(end)}`;
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Produc//Open Loop//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    dtStart,
    dtEnd,
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
