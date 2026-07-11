import {
  buildNightPrepIcs,
  parseNightPrepCalendarTime,
} from '@/lib/night-prep-calendar';
import { requireActiveSubscription } from '@/lib/billing/require-subscription';

export async function GET(request: Request) {
  const access = await requireActiveSubscription();
  if (access.denied) return access.denied;

  const { searchParams } = new URL(request.url);
  const time = parseNightPrepCalendarTime(
    searchParams.get('hour'),
    searchParams.get('minute')
  );

  if (!time) {
    return new Response('Invalid hour or minute', { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const ics = buildNightPrepIcs(origin, time);

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
