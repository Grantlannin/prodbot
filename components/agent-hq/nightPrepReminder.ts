import {
  buildNightPrepWebcalUrl,
  buildOutlookCalendarComposeUrl,
  type NightPrepCalendarTime,
} from '@/lib/night-prep-calendar';
import { getAppOrigin } from '@/lib/app-origin';
import { PRODUCTION_SITE_ORIGIN } from '@/lib/site';
import { buildGoogleCalendarUrl } from './googleCalendarLink';

export const NIGHT_PREP_TIME_KEY = 'agentHQ_nightPrepReminderTime';
export const NIGHT_PREP_DEEP_LINK_PARAM = 'nightprep';

export type NightPrepReminderTime = NightPrepCalendarTime;

export const DEFAULT_NIGHT_PREP_TIME: NightPrepReminderTime = {
  hour: 21,
  minute: 0,
};

export function timeToInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function nextOccurrence(hour: number, minute: number, now = Date.now()): Date {
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setHours(hour, minute, 0, 0);
  if (start.getTime() <= now) start.setDate(start.getDate() + 1);
  return start;
}

function nightPrepSiteUrl(): string {
  if (typeof window === 'undefined') return `${getAppOrigin(PRODUCTION_SITE_ORIGIN)}/?nightprep=1`;
  return `${window.location.origin}/?nightprep=1`;
}

function nightPrepEventDetails(): string {
  return `3 quick checks + tomorrow's tasks.\n\nOpen produc: ${nightPrepSiteUrl()}`;
}

/** Opens Google Calendar with a daily recurring night prep event (no download). */
export function openNightPrepGoogleCalendar(time: NightPrepReminderTime): void {
  const start = nextOccurrence(time.hour, time.minute);
  const base = buildGoogleCalendarUrl({
    title: 'Night prep',
    details: nightPrepEventDetails(),
    start,
    durationMinutes: 15,
    templateAction: true,
  });
  const url = `${base}&recur=${encodeURIComponent('RRULE:FREQ=DAILY')}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Opens Apple Calendar to subscribe — no file download (Safari / Mac / iPhone). */
export function openNightPrepAppleCalendar(time: NightPrepReminderTime): void {
  if (typeof window === 'undefined') return;
  const webcal = buildNightPrepWebcalUrl(window.location.origin, time);
  window.location.assign(webcal);
}

/** Opens Outlook on the web to create the event — set repeat to Daily when saving. */
export function openNightPrepOutlookCalendar(time: NightPrepReminderTime): void {
  if (typeof window === 'undefined') return;
  const url = buildOutlookCalendarComposeUrl(window.location.origin, time);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function readNightPrepDeepLink(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(NIGHT_PREP_DEEP_LINK_PARAM) === '1';
}

export function clearNightPrepDeepLinkParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(NIGHT_PREP_DEEP_LINK_PARAM);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
