import { DM_Sans, Fraunces } from 'next/font/google';
import GsdWorksheetClient from './GsdWorksheetClient';
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

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

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
    label: 'Scary decision',
    prompt: 'Did you make one uncertain / scary call instead of delaying it?',
  },
] as const;

export default function GsdWorksheet() {
  return (
    <div className={`${styles.root} ${dmSans.variable} ${fraunces.variable}`}>
      <GsdWorksheetClient />

      <article className={styles.sheet} aria-label="7-Day Get Shit Done Challenge worksheet">
        <header className={styles.header}>
          <div className={styles.brand}>Daywinner bot</div>
          <h1 className={styles.title}>7-Day Get Shit Done Challenge</h1>
          <p className={styles.subtitle}>
            Daily checkbook. Four boxes. No excuses. Mark it only if it actually happened.
          </p>
          <div className={styles.meta}>
            <label className={styles.field}>
              <span>Name</span>
              <span className={styles.line} />
            </label>
            <label className={styles.field}>
              <span>Start date</span>
              <span className={styles.line} />
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
                <th scope="col" className={styles.noteCol}>
                  Win / note
                </th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <th scope="row">
                    <span className={styles.dayNum}>{day}</span>
                  </th>
                  {CHECKS.map(check => (
                    <td key={check.key}>
                      <span className={styles.box} aria-hidden />
                      <span className={styles.srOnly}>
                        Day {day}: {check.label}
                      </span>
                    </td>
                  ))}
                  <td className={styles.noteCell}>
                    <span className={styles.noteLine} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <div className={styles.score}>
            <span>Final score</span>
            <span className={styles.scoreBoxes}>
              <span className={`${styles.line} ${styles.lineShort}`} />
              <span className={styles.scoreOf}>/ 28</span>
            </span>
            <span className={styles.scoreHint}>4 checks × 7 days</span>
          </div>
          <p className={styles.closer}>
            Missed a box? Don’t rewrite history. Show up tomorrow and get the next one.
          </p>
          <p className={styles.url}>daywinner.bot</p>
        </footer>
      </article>
    </div>
  );
}
