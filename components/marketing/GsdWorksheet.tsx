'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DM_Sans, Fraunces } from 'next/font/google';
import styles from './gsd-worksheet.module.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-gsd-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-gsd-display',
});

const STORAGE_KEY = 'daywinner_gsd_worksheet_v1';
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
type Day = (typeof DAYS)[number];

const CHECKS = [
  {
    key: 'teed',
    label: 'Task teed up',
    prompt: 'Was tomorrow’s #1 money task set before you quit for the day?',
  },
  {
    key: 'tracked',
    label: '2 hrs tracked',
    prompt: 'Did you log at least 2 hours of real tracked work?',
  },
  {
    key: 'notes',
    label: 'Context / notes',
    prompt: 'Did you leave notes/context so tomorrow isn’t a cold start?',
  },
  {
    key: 'scary',
    label: 'Uncertain decision',
    prompt: 'Did you make one uncertain decision instead of delaying it?',
  },
] as const;

type CheckKey = (typeof CHECKS)[number]['key'];

type DayRow = {
  checks: Record<CheckKey, boolean>;
  phoneHours: string;
  note: string;
};

type WorksheetState = {
  name: string;
  startDate: string;
  days: Record<Day, DayRow>;
};

function emptyDay(): DayRow {
  return {
    checks: { teed: false, tracked: false, notes: false, scary: false },
    phoneHours: '',
    note: '',
  };
}

function emptyState(): WorksheetState {
  return {
    name: '',
    startDate: '',
    days: {
      1: emptyDay(),
      2: emptyDay(),
      3: emptyDay(),
      4: emptyDay(),
      5: emptyDay(),
      6: emptyDay(),
      7: emptyDay(),
    },
  };
}

function loadState(): WorksheetState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<WorksheetState>;
    const base = emptyState();
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
      days: DAYS.reduce(
        (acc, day) => {
          const row = parsed.days?.[day];
          acc[day] = {
            checks: {
              teed: Boolean(row?.checks?.teed),
              tracked: Boolean(row?.checks?.tracked),
              notes: Boolean(row?.checks?.notes),
              scary: Boolean(row?.checks?.scary),
            },
            phoneHours: typeof row?.phoneHours === 'string' ? row.phoneHours : '',
            note: typeof row?.note === 'string' ? row.note : '',
          };
          return acc;
        },
        { ...base.days }
      ),
    };
  } catch {
    return emptyState();
  }
}

export default function GsdWorksheet() {
  const [state, setState] = useState<WorksheetState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadOk, setDownloadOk] = useState<string | null>(null);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Warm the PDF module so Download can open the Save dialog on the same click.
  useEffect(() => {
    void import('@/lib/worksheet/gsd-fillable-pdf');
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [state, hydrated]);

  const score = useMemo(() => {
    let total = 0;
    for (const day of DAYS) {
      const checks = state.days[day].checks;
      for (const check of CHECKS) {
        if (checks[check.key]) total += 1;
      }
    }
    return total;
  }, [state.days]);

  const toggleCheck = useCallback((day: Day, key: CheckKey) => {
    setState(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          checks: {
            ...prev.days[day].checks,
            [key]: !prev.days[day].checks[key],
          },
        },
      },
    }));
  }, []);

  const setDayField = useCallback((day: Day, field: 'phoneHours' | 'note', value: string) => {
    setState(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          [field]: value,
        },
      },
    }));
  }, []);

  const resetSheet = useCallback(() => {
    if (!window.confirm('Clear this worksheet? Your saved progress will be wiped.')) return;
    setState(emptyState());
  }, []);

  const downloadPdf = useCallback(async () => {
    if (downloading) return;
    setDownloadError(null);
    setDownloadOk(null);

    try {
      // Cached after preload — stays inside the click gesture for the Save dialog.
      const { buildGsdFillablePdf, openPdfSaveDialog, finishPdfSave, worksheetPdfFilename } =
        await import('@/lib/worksheet/gsd-fillable-pdf');
      const filename = worksheetPdfFilename(state.name);
      const handle = await openPdfSaveDialog(filename);

      setDownloading(true);
      const bytes = await buildGsdFillablePdf({
        name: state.name,
        startDate: state.startDate,
        days: state.days,
      });
      const how = await finishPdfSave(bytes, filename, handle);
      setDownloadOk(
        how === 'picker'
          ? `Saved ${filename}. Open it in Preview or Adobe to click the boxes.`
          : `Saved ${filename} — check your Downloads folder (browser Print → Save as PDF does not appear there).`
      );
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
        return;
      }
      console.error('[worksheet] pdf download', err);
      setDownloadError(
        'Could not save the PDF. Use “Download fillable PDF” again, or allow downloads for this site.'
      );
    } finally {
      setDownloading(false);
    }
  }, [downloading, state]);

  return (
    <div className={`${styles.root} ${dmSans.variable} ${fraunces.variable}`}>
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <p className={styles.toolbarHint}>
          Fill here in the browser. To keep a file, use Download (not Print → Save as PDF — that
          won’t show in your download bar).
        </p>
        <div className={styles.toolbarActions}>
          <button type="button" onClick={resetSheet} className={styles.secondaryBtn}>
            Reset
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className={styles.secondaryBtn}
            title="Opens the system print dialog. Choose a printer, or Save as PDF from that dialog."
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => void downloadPdf()}
            className={styles.download}
            disabled={downloading}
          >
            {downloading ? 'Saving PDF…' : 'Download fillable PDF'}
          </button>
        </div>
      </div>
      {downloadError ? <p className={`${styles.downloadError} ${styles.noPrint}`}>{downloadError}</p> : null}
      {downloadOk ? <p className={`${styles.downloadOk} ${styles.noPrint}`}>{downloadOk}</p> : null}

      <article className={styles.sheet} aria-label="7-Day Get Shit Done Challenge worksheet">
        <header className={styles.header}>
          <div className={styles.brand}>Daywinner bot</div>
          <h1 className={styles.title}>7-Day Get Shit Done Challenge</h1>
          <p className={styles.subtitle}>
            Daily checkbook. Tap the boxes. Type your phone Screen Time from Settings. Mark it only
            if it actually happened.
          </p>
          <div className={styles.meta}>
            <label className={styles.field}>
              <span>Name</span>
              <input
                className={styles.metaInput}
                type="text"
                value={state.name}
                onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className={styles.field}>
              <span>Start date</span>
              <input
                className={styles.metaInput}
                type="date"
                value={state.startDate}
                onChange={e => setState(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </label>
          </div>
        </header>

        <section className={styles.legend} aria-label="What to check">
          {CHECKS.map(check => (
            <div key={check.key} className={styles.legendItem}>
              <strong>{check.label}</strong>
              <span>{check.prompt}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <strong>Phone hrs</strong>
            <span>
              Open Screen Time / Digital Wellbeing and type today’s total phone time (hours).
            </span>
          </div>
        </section>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.dayCol}>
                  Day
                </th>
                {CHECKS.map(check => (
                  <th key={check.key} scope="col">
                    {check.label}
                  </th>
                ))}
                <th scope="col" className={styles.phoneCol}>
                  Phone hrs
                </th>
                <th scope="col" className={styles.noteCol}>
                  Win / note
                </th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => {
                const row = state.days[day];
                return (
                  <tr key={day}>
                    <th scope="row">
                      <span className={styles.dayNum}>{day}</span>
                    </th>
                    {CHECKS.map(check => {
                      const on = row.checks[check.key];
                      return (
                        <td key={check.key}>
                          <button
                            type="button"
                            className={`${styles.checkBtn} ${on ? styles.checkBtnOn : ''}`}
                            aria-pressed={on}
                            aria-label={`Day ${day}: ${check.label}`}
                            onClick={() => toggleCheck(day, check.key)}
                          >
                            {on ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                    <td className={styles.phoneCell}>
                      <input
                        className={styles.cellInput}
                        type="text"
                        inputMode="decimal"
                        value={row.phoneHours}
                        onChange={e => setDayField(day, 'phoneHours', e.target.value)}
                        placeholder="0"
                        aria-label={`Day ${day} phone hours`}
                      />
                    </td>
                    <td className={styles.noteCell}>
                      <input
                        className={styles.cellInput}
                        type="text"
                        value={row.note}
                        onChange={e => setDayField(day, 'note', e.target.value)}
                        placeholder="Optional"
                        aria-label={`Day ${day} win or note`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <div className={styles.score}>
            <span>Final score</span>
            <span className={styles.scoreBoxes}>
              <span className={styles.scoreLive}>{score}</span>
              <span className={styles.scoreOf}>/ 28</span>
            </span>
            <span className={styles.scoreHint}>4 checks × 7 days · phone hrs tracked separately</span>
          </div>
          <p className={styles.closer}>
            Missed a box? Don’t rewrite history. Show up tomorrow and get the next one.
          </p>
          <p className={styles.url}>daywinner.bot/worksheet</p>
        </footer>
      </article>
    </div>
  );
}
