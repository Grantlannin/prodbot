'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatReportDateLabel,
  last365DayKeys,
  localDateKey,
  reportCompleted,
  reportLearnings,
  reportPreviousDayContext,
  reportTomorrow,
} from './eodReports';
import {
  downloadDailySummaryCsv,
  downloadReportsJson,
  downloadReportsText,
  downloadReportsWord,
  totalInfractionCount,
} from './eodExport';
import { useEodReports } from './hooks/useEodReports';
import { formatDuration } from './chatLogic';
import type { EodReport } from './types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function weekdayIndex(dateKey: string): number {
  const d = new Date(dateKey + 'T12:00:00');
  return (d.getDay() + 6) % 7;
}

function shortDateLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function EodReportsCalendar() {
  const { reports, byDate } = useEodReports();
  const [open, setOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const dayKeys = useMemo(() => last365DayKeys(), []);
  const todayKey = localDateKey();
  const reportCount = useMemo(() => dayKeys.filter(k => byDate.has(k)).length, [dayKeys, byDate]);

  const previewDate = pinnedDate ?? hoveredDate;
  const previewReport = previewDate ? byDate.get(previewDate) ?? null : null;

  const weeks = useMemo(() => {
    const cols: string[][] = [];
    let current: string[] = [];

    for (let i = 0; i < dayKeys.length; i++) {
      const key = dayKeys[i];
      if (i === 0) {
        const pad = weekdayIndex(key);
        for (let p = 0; p < pad; p++) current.push('');
      }
      current.push(key);
      if (current.length === 7) {
        cols.push(current);
        current = [];
      }
    }
    if (current.length > 0) {
      while (current.length < 7) current.push('');
      cols.push(current);
    }
    return cols;
  }, [dayKeys]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setHoveredDate(null);
      setPinnedDate(null);
    }, 220);
  }, [clearCloseTimer]);

  const handleOpen = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHoveredDate(null);
        setPinnedDate(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  return (
    <div
      ref={wrapRef}
      style={styles.anchor}
      onMouseEnter={handleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        style={styles.iconBtn}
        aria-label={`EOD reports — ${reportCount} saved in the last year`}
        aria-expanded={open}
        onClick={() => {
          setOpen(v => !v);
          if (open) {
            setHoveredDate(null);
            setPinnedDate(null);
          }
        }}
      >
        <EodIcon filled={reportCount > 0} />
        {reportCount > 0 ? <span style={styles.badge}>{reportCount > 99 ? '99+' : reportCount}</span> : null}
      </button>

      {open ? (
        <div style={styles.popover} onMouseEnter={clearCloseTimer} onMouseLeave={scheduleClose}>
          <div style={styles.popoverHeader}>
            <span style={styles.popoverTitle}>EOD reports</span>
            <span style={styles.popoverMeta}>{reportCount} day{reportCount === 1 ? '' : 's'}</span>
          </div>

          {reportCount > 0 ? (
            <div style={styles.exportRow}>
              <button type="button" style={styles.exportBtn} onClick={() => downloadReportsText(reports)}>
                All · Text
              </button>
              <button type="button" style={styles.exportBtn} onClick={() => downloadReportsWord(reports)}>
                All · Word
              </button>
              <button type="button" style={styles.exportBtn} onClick={() => downloadDailySummaryCsv(reports)}>
                All · CSV
              </button>
              <button type="button" style={styles.exportBtn} onClick={() => downloadReportsJson(reports)}>
                All · JSON
              </button>
            </div>
          ) : null}

          <div
            style={styles.gridScroll}
            onMouseLeave={() => {
              if (!pinnedDate) setHoveredDate(null);
            }}
          >
            <div style={styles.grid}>
              <div style={styles.weekdayCol}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <span key={i} style={styles.weekdayLabel}>
                    {label}
                  </span>
                ))}
              </div>
              <div style={styles.weekCols}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={styles.weekCol}>
                    {week.map((dateKey, di) => {
                      if (!dateKey) {
                        return <span key={di} style={styles.emptyCell} />;
                      }
                      const hasReport = byDate.has(dateKey);
                      const isToday = dateKey === todayKey;
                      const isPreview = dateKey === previewDate;
                      const title = shortDateLabel(dateKey);

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          title={hasReport ? `${title} — preview report` : title}
                          disabled={!hasReport}
                          onMouseEnter={() => {
                            if (hasReport) setHoveredDate(dateKey);
                          }}
                          onClick={() => {
                            if (!hasReport) return;
                            setPinnedDate(prev => (prev === dateKey ? null : dateKey));
                            setHoveredDate(dateKey);
                          }}
                          style={{
                            ...styles.dayCell,
                            ...(hasReport ? styles.dayCellFilled : styles.dayCellEmpty),
                            ...(isToday ? styles.dayCellToday : null),
                            ...(isPreview ? styles.dayCellPreview : null),
                            cursor: hasReport ? 'pointer' : 'default',
                          }}
                          aria-label={hasReport ? `EOD report for ${title}` : title}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {previewReport && previewDate ? (
            <EodReportPreview
              report={previewReport}
              pinned={pinnedDate === previewDate}
              onUnpin={() => setPinnedDate(null)}
            />
          ) : (
            <p style={styles.hint}>Hover a purple day to preview. Click to pin that day&apos;s report.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EodReportPreview({
  report,
  pinned,
  onUnpin,
}: {
  report: EodReport;
  pinned: boolean;
  onUnpin: () => void;
}) {
  const completed = reportCompleted(report);
  const learnings = reportLearnings(report);
  const tomorrow = reportTomorrow(report);
  const previousDayContext = reportPreviousDayContext(report);
  const infTotal = totalInfractionCount(report);
  const exportSet = [report];

  return (
    <div style={styles.preview}>
      <div style={styles.previewHeader}>
        <div>
          <div style={styles.previewDate}>{formatReportDateLabel(report.date)}</div>
          {pinned ? <span style={styles.pinnedTag}>Pinned</span> : null}
        </div>
        {pinned ? (
          <button type="button" onClick={onUnpin} style={styles.closeBtn} aria-label="Unpin report">
            ×
          </button>
        ) : null}
      </div>

      <div style={styles.previewBody}>
        <PreviewSection label="Total work time" value={formatDuration(report.totalWorkMs)} />
        <PreviewSection label="Previous day's context (avoid paying clarity tax)" value={previousDayContext} />
        <PreviewSection label="What you got done today" value={completed} />
        {report.doneToday?.length ? (
          <PreviewSection
            label="Logged wins"
            value={report.doneToday
              .map(item => (item.detail ? `${item.text} — ${item.detail}` : item.text))
              .join('\n')}
          />
        ) : null}
        <PreviewSection label="Tomorrow" value={tomorrow} />
        <PreviewSection label="Insights / learnings" value={learnings} />
        <PreviewSection
          label={`Infractions (${infTotal})`}
          value={
            report.infractions.length > 0
              ? report.infractions
                  .map(inf => `${inf.label}${inf.count > 1 ? ` ×${inf.count}` : ''}`)
                  .join('\n')
              : 'None'
          }
        />
        {report.sessions.length > 0 ? (
          <PreviewSection
            label="Time by task"
            value={report.sessions.map(s => `${s.project} — ${formatDuration(s.durationMs)}`).join('\n')}
          />
        ) : null}
      </div>

      <div style={styles.exportRow}>
        <button type="button" style={styles.exportBtn} onClick={() => downloadReportsText(exportSet)}>
          Text
        </button>
        <button type="button" style={styles.exportBtn} onClick={() => downloadReportsWord(exportSet)}>
          Word
        </button>
        <button type="button" style={styles.exportBtn} onClick={() => downloadDailySummaryCsv(exportSet)}>
          CSV
        </button>
        <button type="button" style={styles.exportBtn} onClick={() => downloadReportsJson(exportSet)}>
          JSON
        </button>
      </div>
    </div>
  );
}

function PreviewSection({ label, value }: { label: string; value: string }) {
  const text = value.trim() || '—';
  return (
    <div style={styles.previewSection}>
      <div style={styles.previewLabel}>{label}</div>
      <div style={styles.previewValue}>{text}</div>
    </div>
  );
}

function EodIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5h13" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1.5v2M11 1.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {[0, 1, 2].map(row =>
        [0, 1, 2, 3].map(col => (
          <circle
            key={`${row}-${col}`}
            cx={3.5 + col * 2.5}
            cy={7.5 + row * 2.2}
            r="0.65"
            fill={filled && (row + col) % 3 === 0 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="0.6"
          />
        ))
      )}
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  anchor: {
    position: 'relative',
    flexShrink: 0,
    fontFamily: font,
  },
  iconBtn: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#6366f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    padding: '0 3px',
    borderRadius: 7,
    background: '#6366f1',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: '14px',
    textAlign: 'center',
  },
  popover: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    zIndex: 50,
    width: 360,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'min(70vh, 520px)',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflow: 'hidden',
  },
  popoverHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0,
  },
  popoverTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
  },
  popoverMeta: {
    fontSize: 10,
    color: '#94a3b8',
  },
  exportRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    flexShrink: 0,
  },
  exportBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#f8fafc',
    color: '#475569',
    fontSize: 9,
    fontWeight: 600,
    fontFamily: font,
    padding: '4px 7px',
    cursor: 'pointer',
  },
  gridScroll: {
    overflowX: 'auto',
    paddingBottom: 2,
    flexShrink: 0,
  },
  grid: {
    display: 'flex',
    gap: 4,
    minWidth: 'min-content',
  },
  weekdayCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  weekdayLabel: {
    width: 9,
    height: 9,
    fontSize: 7,
    color: '#94a3b8',
    lineHeight: '9px',
    textAlign: 'center',
  },
  weekCols: {
    display: 'flex',
    gap: 2,
  },
  weekCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  emptyCell: {
    width: 9,
    height: 9,
  },
  dayCell: {
    width: 9,
    height: 9,
    borderRadius: 2,
    border: 'none',
    padding: 0,
  },
  dayCellEmpty: {
    background: '#e2e8f0',
  },
  dayCellFilled: {
    background: '#6366f1',
  },
  dayCellToday: {
    boxShadow: 'inset 0 0 0 1px #0f172a',
  },
  dayCellPreview: {
    boxShadow: 'inset 0 0 0 2px #0f172a',
    transform: 'scale(1.15)',
  },
  hint: {
    margin: 0,
    fontSize: 10,
    color: '#94a3b8',
    flexShrink: 0,
  },
  preview: {
    paddingTop: 6,
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
    flex: 1,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    flexShrink: 0,
  },
  previewDate: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  pinnedTag: {
    display: 'inline-block',
    marginTop: 2,
    fontSize: 9,
    fontWeight: 600,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
  previewBody: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
    maxHeight: 220,
    paddingRight: 2,
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  previewValue: {
    fontSize: 11,
    color: '#0f172a',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
  },
};
