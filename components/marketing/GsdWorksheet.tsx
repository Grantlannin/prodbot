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

const STORAGE_KEY = 'daywinner_gsd_worksheet_v2';
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
type Day = (typeof DAYS)[number];

const CHECKS = [
  {
    key: 'teed',
    label: 'Did I do the down flow & set up my #1 task?',
  },
  {
    key: 'tracked',
    label: 'Do I have 2 hours of work tracked (minimum?)',
  },
  {
    key: 'uncertain',
    label: 'Did i move forward & make uncertain decisions',
  },
  {
    key: 'screenshot',
    label: 'Did i screenshot my social media time on my phone (Y/N)',
  },
] as const;

const PHONE_LABEL = 'Total Phone hours';

type CheckKey = (typeof CHECKS)[number]['key'];

type DayRow = {
  checks: Record<CheckKey, boolean>;
  phoneHours: string;
};

type WorksheetState = {
  name: string;
  startDate: string;
  days: Record<Day, DayRow>;
};

function emptyDay(): DayRow {
  return {
    checks: { teed: false, tracked: false, uncertain: false, screenshot: false },
    phoneHours: '',
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
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('daywinner_gsd_worksheet_v1');
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as {
      name?: string;
      startDate?: string;
      days?: Record<
        Day,
        {
          checks?: Partial<Record<CheckKey | 'notes' | 'scary', boolean>>;
        }
      >;
    };
    const base = emptyState();
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
      days: DAYS.reduce(
        (acc, day) => {
          const row = parsed.days?.[day] as
            | {
                checks?: Partial<Record<CheckKey | 'notes' | 'scary', boolean>>;
                phoneHours?: string;
              }
            | undefined;
          acc[day] = {
            checks: {
              teed: Boolean(row?.checks?.teed),
              tracked: Boolean(row?.checks?.tracked),
              uncertain: Boolean(row?.checks?.uncertain ?? row?.checks?.scary),
              screenshot: Boolean(row?.checks?.screenshot),
            },
            phoneHours: typeof row?.phoneHours === 'string' ? row.phoneHours : '',
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

  const setPhoneHours = useCallback((day: Day, value: string) => {
    setState(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          phoneHours: value,
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
            Four boxes a day, plus phone hours. Tap only if it actually happened.
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
          <h2 className={styles.legendTitle}>The Simple Metrics We&apos;re Tracking Daily</h2>
          <div className={styles.legendGrid}>
            {CHECKS.map(check => (
              <div key={check.key} className={styles.legendItem}>
                {check.label}
              </div>
            ))}
            <div className={styles.legendItem}>{PHONE_LABEL}</div>
          </div>
          <p className={styles.legendQuote}>
            &ldquo;if you don&apos;t honestly track it, you can&apos;t honestly change it&rdquo;
          </p>
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
                  {PHONE_LABEL}
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
                        onChange={e => setPhoneHours(day, e.target.value)}
                        placeholder="0"
                        aria-label={`Day ${day} phone hours`}
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
            <span className={styles.scoreHint}>4 checks × 7 days · Total Phone hours tracked separately</span>
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
