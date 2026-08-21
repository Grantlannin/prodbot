'use client';

import styles from './gsd-worksheet.module.css';

export default function GsdWorksheetClient() {
  return (
    <div className={`${styles.toolbar} ${styles.noPrint}`}>
      <p className={styles.toolbarHint}>
        Print or Save as PDF — one page, fill by hand or digitally.
      </p>
      <button type="button" onClick={() => window.print()} className={styles.download}>
        Download / Print PDF
      </button>
    </div>
  );
}
