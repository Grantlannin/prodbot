'use client';

import type { CSSProperties } from 'react';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Collapsed install help under “Add to Chrome” — intro + blocked-sites modal. */
export default function ExtensionInstallInstructions() {
  return (
    <details data-ext-instructions="" style={styles.details}>
      <style>{`
        [data-ext-instructions] > summary { list-style: none; }
        [data-ext-instructions] > summary::-webkit-details-marker { display: none; }
        [data-ext-instructions][open] > summary::after { content: ' ▲'; }
        [data-ext-instructions]:not([open]) > summary::after { content: ' ▼'; }
      `}</style>
      <summary style={styles.summary}>Instructions</summary>
      <div style={styles.body}>
        <p style={styles.stepLine}>
          <strong>Step 1</strong> — Click the link &amp; download the above extension
        </p>
        <img
          src="/marketing/chrome-extension-installed.png"
          alt="Chrome Extensions menu showing Daywinner bot installed"
          style={styles.screenshot}
        />
        <p style={styles.stepLine}>
          <strong>Step 2</strong> — Once you see the extension downloaded, refresh this Daywinner tab so it can
          connect. Then start a work session with soft lock and open a blocked site — if it blocks, it&apos;s
          working. You can then add additional sites to block on the bottom if you choose.
        </p>
      </div>
    </details>
  );
}

const styles: Record<string, CSSProperties> = {
  details: {
    fontFamily: font,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#f8fafc',
    overflow: 'hidden',
    marginTop: 2,
  },
  summary: {
    cursor: 'pointer',
    listStyle: 'none',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
    userSelect: 'none',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '0 12px 12px',
  },
  stepLine: {
    margin: 0,
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.5,
  },
  screenshot: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
};
