import { startOfLocalDayMs } from './infractions';
import { formatDuration, formatHoursWorked } from './chatLogic';
import type { DoneTodayItem, EodReport, Infraction, WorkSession } from './types';
import { sessionWorkMs } from './workTime';
import { readNightPrepPlan, formatNightPrepPlanSummary } from './nightPrep/storage';

export const EOD_REPORTS_KEY = 'agentHQ_eodReports';
const NIGHT_PREP_KEY = 'agentHQ_nightPrep';

export function localDateKey(ts = Date.now()): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatReportDateLabel(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface NightPrepSnapshot {
  tomorrow: string;
  previousDayContext: string;
}

function readNightPrepRaw(): { tomorrowTasks?: string; previousDayContext?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NIGHT_PREP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { tomorrowTasks?: string; previousDayContext?: string };
  } catch {
    return null;
  }
}

export function readNightPrepTomorrowTasks(): string | null {
  const plan = readNightPrepPlan();
  if (plan) return formatNightPrepPlanSummary(plan);
  const parsed = readNightPrepRaw();
  const text = parsed?.tomorrowTasks?.trim();
  return text || null;
}

export function readNightPrepForEod(): NightPrepSnapshot {
  const plan = readNightPrepPlan();
  if (plan) {
    return {
      tomorrow: formatNightPrepPlanSummary(plan),
      previousDayContext: '',
    };
  }
  const parsed = readNightPrepRaw();
  return {
    tomorrow: parsed?.tomorrowTasks?.trim() ?? '',
    previousDayContext: parsed?.previousDayContext?.trim() ?? '',
  };
}

export interface BuildEodReportParams {
  completed: string;
  tomorrow: string;
  previousDayContext: string;
  learnings: string;
  totalWorkMs: number;
  totalBreakMs: number;
  sessionCount: number;
  sessions: WorkSession[];
  infractions: Infraction[];
  doneToday: DoneTodayItem[];
  activeSession?: { project: string; elapsedMs: number } | null;
}

export function createEodReport(params: BuildEodReportParams, now = Date.now()): EodReport {
  const date = localDateKey(now);
  const t0 = startOfLocalDayMs(now);
  const infractionsToday = params.infractions.filter(i => startOfLocalDayMs(i.createdAt) === t0);

  const sessionRows = params.sessions.map(s => ({
    project: s.project,
    durationMs: sessionWorkMs(s),
  }));
  if (params.activeSession) {
    sessionRows.push({
      project: params.activeSession.project,
      durationMs: params.activeSession.elapsedMs,
    });
  }

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    date,
    createdAt: now,
    totalWorkMs: params.totalWorkMs,
    totalBreakMs: params.totalBreakMs,
    sessionCount: params.sessionCount,
    completed: params.completed,
    tomorrow: params.tomorrow,
    previousDayContext: params.previousDayContext,
    learnings: params.learnings,
    sessions: sessionRows,
    doneToday: params.doneToday.map(i => ({ text: i.text, detail: i.detail })),
    infractions: infractionsToday.reduce<{ label: string; count: number }[]>((acc, inf) => {
      const existing = acc.find(x => x.label === inf.label);
      if (existing) existing.count += 1;
      else acc.push({ label: inf.label, count: 1 });
      return acc;
    }, []),
  };
}

export function upsertEodReport(reports: EodReport[], report: EodReport): EodReport[] {
  const rest = reports.filter(r => r.date !== report.date);
  return [...rest, report].sort((a, b) => a.date.localeCompare(b.date));
}

export function reportsByDate(reports: EodReport[]): Map<string, EodReport> {
  return new Map(reports.map(r => [r.date, r]));
}

export function reportCompleted(r: EodReport): string {
  return r.completed ?? r.contextAnswer ?? '';
}

export function reportTomorrow(r: EodReport): string {
  return r.tomorrow ?? '';
}

export function reportLearnings(r: EodReport): string {
  return r.learnings ?? r.insightsAnswer ?? '';
}

export function reportPreviousDayContext(r: EodReport): string {
  return r.previousDayContext?.trim() ?? '';
}

export function buildEodReportPreview(params: BuildEodReportParams, now = Date.now()): EodReport {
  return createEodReport(params, now);
}

export function buildEodReportText(report: EodReport): string {
  const completed = reportCompleted(report);
  const learnings = reportLearnings(report);
  const infTotal = report.infractions.reduce((sum, inf) => sum + inf.count, 0);

  const lines: string[] = [
    'END OF DAY REPORT',
    formatReportDateLabel(report.date),
    '─────────────────',
    '',
    'TOTAL WORK TIME',
    formatHoursWorked(report.totalWorkMs),
    '',
    'WHAT YOU GOT DONE TODAY',
    completed || '—',
  ];

  if (report.doneToday?.length) {
    lines.push('', 'Logged wins:');
    for (const item of report.doneToday) {
      lines.push(`• ${item.text}${item.detail ? ` — ${item.detail}` : ''}`);
    }
  }

  const tomorrow = reportTomorrow(report);
  const previousDayContext = reportPreviousDayContext(report);

  if (previousDayContext) {
    lines.push('', "PREVIOUS DAY'S CONTEXT (avoid paying clarity tax)", previousDayContext);
  }

  lines.push('', 'TOMORROW', tomorrow || '—');
  lines.push('', 'INSIGHTS / LEARNINGS', learnings || '—');

  lines.push('', `INFRACTIONS (${infTotal} total)`);
  if (report.infractions.length > 0) {
    for (const inf of report.infractions) {
      lines.push(`• ${inf.label}${inf.count > 1 ? ` ×${inf.count}` : ''}`);
    }
  } else {
    lines.push('—');
  }

  if (report.sessions.length > 0) {
    lines.push('', 'Time by task (tracked):');
    for (const s of report.sessions) {
      lines.push(`• ${s.project} — ${formatDuration(s.durationMs)}`);
    }
  }

  return lines.join('\n');
}

/** Last 365 local days ending today (oldest first). */
export function last365DayKeys(now = Date.now()): string[] {
  const keys: string[] = [];
  const end = startOfLocalDayMs(now);
  for (let i = 364; i >= 0; i--) {
    keys.push(localDateKey(end - i * 86_400_000));
  }
  return keys;
}
