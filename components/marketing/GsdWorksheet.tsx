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
    label: 'Did i move forward & make uncertain decisions while i went?',
  },
  {
    key: 'screenshot',
    label: 'Did i screenshot my social media time on my phone? (Y/N)',
  },
] as const;

const PHONE_LABEL = 'Total Phone hours';
const WORK_LABEL = 'Total tracked work hours';
const TRACKING_SUMMARY = 'What we\'re tracking: 4 metrics, phone + work hours.';

type CheckKey = (typeof CHECKS)[number]['key'];

type DayRow = {
  checks: Record<CheckKey, boolean>;
  phoneHours: string;
  workHours: string;
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
    workHours: '',
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
                workHours?: string;
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
            workHours: typeof row?.workHours === 'string' ? row.workHours : '',
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

  const setHourField = useCallback((day: Day, field: 'phoneHours' | 'workHours', value: string) => {
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

  const downloadPdf = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const { buildGsdWorksheetPdf, downloadBytes, worksheetPdfFilename } = await import(
        '@/lib/worksheet/gsd-fillable-pdf'
      );
      const filename = worksheetPdfFilename();
      // Always a blank printable template — never bake in on-page answers.
      const bytes = await buildGsdWorksheetPdf();
      downloadBytes(bytes, filename);
    } catch (err) {
      console.error('[worksheet] pdf download', err);
      setDownloadError('Could not download the PDF. Try again, or allow downloads for this site.');
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  return (
    <div className={`${styles.root} ${dmSans.variable} ${fraunces.variable}`}>
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <p className={styles.toolbarHint}>Fill online here, or download a blank PDF to print.</p>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            onClick={() => void downloadPdf()}
            className={styles.download}
            disabled={downloading}
          >
            {downloading ? 'Downloading…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {downloadError ? <p className={`${styles.downloadError} ${styles.noPrint}`}>{downloadError}</p> : null}

      <article className={styles.sheet} aria-label="7-Day Get Sh*t Done Challenge worksheet">
        <header className={styles.header}>
          <div className={styles.brand}>Daywinner bot</div>
          <h1 className={styles.title}>7-Day Get Sh*t Done Challenge</h1>
          <p className={styles.subtitle}>
            Four boxes a day, plus phone and work hours. Tap only if it actually happened.
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
          <h2 className={styles.legendTitle}>{TRACKING_SUMMARY}</h2>
          <div className={styles.legendGrid}>
            {CHECKS.map(check => (
              <div key={check.key} className={styles.legendItem}>
                {check.label}
              </div>
            ))}
            <div className={styles.legendItem}>{PHONE_LABEL}</div>
            <div className={styles.legendItem}>{WORK_LABEL}</div>
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
                <th scope="col" className={styles.hoursCol}>
                  {PHONE_LABEL}
                </th>
                <th scope="col" className={styles.hoursCol}>
                  {WORK_LABEL}
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
                    <td className={styles.hoursCell}>
                      <input
                        className={styles.cellInput}
                        type="text"
                        inputMode="decimal"
                        value={row.phoneHours}
                        onChange={e => setHourField(day, 'phoneHours', e.target.value)}
                        placeholder="0"
                        aria-label={`Day ${day} phone hours`}
                      />
                    </td>
                    <td className={styles.hoursCell}>
                      <input
                        className={styles.cellInput}
                        type="text"
                        inputMode="decimal"
                        value={row.workHours}
                        onChange={e => setHourField(day, 'workHours', e.target.value)}
                        placeholder="0"
                        aria-label={`Day ${day} tracked work hours`}
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
            <span className={styles.scoreHint}>
              4 checks × 7 days · phone + work hours tracked separately
            </span>
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
