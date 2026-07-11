import { formatDuration } from './chatLogic';
import type { EodReport } from './types';
import {
  buildEodReportText,
  formatReportDateLabel,
  reportCompleted,
  reportLearnings,
  reportPreviousDayContext,
  reportTomorrow,
} from './eodReports';

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvEscape).join(',');
}

export function totalInfractionCount(report: EodReport): number {
  return report.infractions.reduce((sum, inf) => sum + inf.count, 0);
}

export function infractionBreakdownText(report: EodReport): string {
  if (report.infractions.length === 0) return '';
  return report.infractions.map(inf => `${inf.label} ×${inf.count}`).join('; ');
}

export function doneTodayText(report: EodReport): string {
  if (!report.doneToday?.length) return '';
  return report.doneToday
    .map(item => (item.detail ? `${item.text} — ${item.detail}` : item.text))
    .join('; ');
}

export function sessionsBreakdownText(report: EodReport): string {
  if (!report.sessions.length) return '';
  return report.sessions.map(s => `${s.project} (${formatDuration(s.durationMs)})`).join('; ');
}

export const DAILY_SUMMARY_CSV_HEADERS = [
  'date',
  'total_work_ms',
  'total_work_minutes',
  'total_work_formatted',
  'completed',
  'previous_day_context',
  'tomorrow',
  'learnings',
  'infraction_total',
  'infraction_breakdown',
  'done_today_logged',
  'sessions_breakdown',
  'session_count',
  'total_break_ms',
  'report_created_at',
] as const;

export function reportToDailyCsvRow(report: EodReport): string {
  const workMinutes = Math.round(report.totalWorkMs / 60_000);
  return csvRow([
    report.date,
    report.totalWorkMs,
    workMinutes,
    formatDuration(report.totalWorkMs),
    reportCompleted(report),
    reportPreviousDayContext(report),
    reportTomorrow(report),
    reportLearnings(report),
    totalInfractionCount(report),
    infractionBreakdownText(report),
    doneTodayText(report),
    sessionsBreakdownText(report),
    report.sessionCount,
    report.totalBreakMs,
    new Date(report.createdAt).toISOString(),
  ]);
}

export function reportsToDailySummaryCsv(reports: EodReport[]): string {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [DAILY_SUMMARY_CSV_HEADERS.join(','), ...sorted.map(reportToDailyCsvRow)];
  return `\uFEFF${lines.join('\n')}`;
}

export const SESSIONS_CSV_HEADERS = ['date', 'task', 'duration_ms', 'duration_minutes', 'duration_formatted'] as const;

export function reportsToSessionsCsv(reports: EodReport[]): string {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [SESSIONS_CSV_HEADERS.join(',')];
  for (const report of sorted) {
    for (const session of report.sessions) {
      const minutes = Math.round(session.durationMs / 60_000);
      lines.push(
        csvRow([report.date, session.project, session.durationMs, minutes, formatDuration(session.durationMs)])
      );
    }
  }
  return `\uFEFF${lines.join('\n')}`;
}

export const INFRACTIONS_CSV_HEADERS = ['date', 'infraction_type', 'count'] as const;

export function reportsToInfractionsCsv(reports: EodReport[]): string {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [INFRACTIONS_CSV_HEADERS.join(',')];
  for (const report of sorted) {
    for (const inf of report.infractions) {
      lines.push(csvRow([report.date, inf.label, inf.count]));
    }
  }
  return `\uFEFF${lines.join('\n')}`;
}

export interface EodExportBundle {
  version: 1;
  exportedAt: string;
  reportCount: number;
  reports: EodReport[];
}

export function reportsToExportJson(reports: EodReport[]): string {
  const bundle: EodExportBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    reportCount: reports.length,
    reports: [...reports].sort((a, b) => a.date.localeCompare(b.date)),
  };
  return JSON.stringify(bundle, null, 2);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reportToWordSection(report: EodReport): string {
  const completed = escapeHtml(reportCompleted(report));
  const tomorrow = escapeHtml(reportTomorrow(report));
  const previousDayContext = escapeHtml(reportPreviousDayContext(report));
  const learnings = escapeHtml(reportLearnings(report));
  const infTotal = totalInfractionCount(report);
  const infLines =
    report.infractions.length > 0
      ? report.infractions
          .map(inf => `<li>${escapeHtml(inf.label)}${inf.count > 1 ? ` ×${inf.count}` : ''}</li>`)
          .join('')
      : '<li>None</li>';
  const sessionLines =
    report.sessions.length > 0
      ? report.sessions
          .map(
            s =>
              `<li>${escapeHtml(s.project)} — ${escapeHtml(formatDuration(s.durationMs))}</li>`
          )
          .join('')
      : '';
  const doneLines =
    report.doneToday?.length ?
      report.doneToday
        .map(
          item =>
            `<li>${escapeHtml(item.text)}${item.detail ? ` — ${escapeHtml(item.detail)}` : ''}</li>`
        )
        .join('')
    : '';

  return `
    <h2>${escapeHtml(formatReportDateLabel(report.date))}</h2>
    <p><strong>Total work time:</strong> ${escapeHtml(formatDuration(report.totalWorkMs))}</p>
    ${previousDayContext ? `<h3>Previous day's context (avoid paying clarity tax)</h3><p>${previousDayContext}</p>` : ''}
    <h3>What you got done today</h3>
    <p>${completed || '—'}</p>
    ${doneLines ? `<ul>${doneLines}</ul>` : ''}
    <h3>Tomorrow</h3>
    <p>${tomorrow || '—'}</p>
    <h3>Insights / learnings</h3>
    <p>${learnings || '—'}</p>
    <h3>Infractions (${infTotal} total)</h3>
    <ul>${infLines}</ul>
    ${sessionLines ? `<h3>Time by task</h3><ul>${sessionLines}</ul>` : ''}
  `;
}

export function reportsToPlainText(reports: EodReport[]): string {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map(r => buildEodReportText(r)).join('\n\n' + '═'.repeat(40) + '\n\n');
}

export function reportsToWordHtml(reports: EodReport[]): string {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const body = sorted.map(reportToWordSection).join('<hr />');
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Produc EOD Reports</title></head>
<body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.45;">
<h1>Produc — End of Day Reports</h1>
<p>Exported ${new Date().toLocaleString()}</p>
${body}
</body></html>`;
}

export function reportFilenameSuffix(report: EodReport): string {
  return report.date;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadDailySummaryCsv(reports: EodReport[]) {
  downloadTextFile('produc-eod-daily-summary.csv', reportsToDailySummaryCsv(reports), 'text/csv;charset=utf-8');
}

export function downloadSessionsCsv(reports: EodReport[]) {
  downloadTextFile('produc-eod-sessions.csv', reportsToSessionsCsv(reports), 'text/csv;charset=utf-8');
}

export function downloadInfractionsCsv(reports: EodReport[]) {
  downloadTextFile('produc-eod-infractions.csv', reportsToInfractionsCsv(reports), 'text/csv;charset=utf-8');
}

export function downloadReportsJson(reports: EodReport[]) {
  downloadTextFile('produc-eod-reports.json', reportsToExportJson(reports), 'application/json;charset=utf-8');
}

export function downloadReportsText(reports: EodReport[]) {
  const name = reports.length === 1 ? `produc-eod-${reportFilenameSuffix(reports[0])}.txt` : 'produc-eod-reports.txt';
  downloadTextFile(name, reportsToPlainText(reports), 'text/plain;charset=utf-8');
}

export function downloadReportsWord(reports: EodReport[]) {
  const name = reports.length === 1 ? `produc-eod-${reportFilenameSuffix(reports[0])}.doc` : 'produc-eod-reports.doc';
  downloadTextFile(name, reportsToWordHtml(reports), 'application/msword;charset=utf-8');
}
