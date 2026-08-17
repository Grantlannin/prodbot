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
        <p style={styles.note}>
          Note: When you download the extension, Chrome will pop up a message that says the extension can
          &quot;read and change all your data on all websites&quot;. A sketchy sounding phrase that made me go
          &quot;wtf?&quot; when i saw it as someone who doesn&apos;t want to give any data to anyone. I am still
          to this day unsure why Chrome used that specific ambiguous wording. In normal language: what this
          sentence means is that you&apos;re giving the extension permission to block specific pages of your
          choosing (like any normal blocker), and because you can block any site you want, Chrome calls this
          &quot;can change data on all sites&quot;. When you hit a blocked site, Daywinner logs that as an
          &quot;infraction&quot; and keeps score for you on your dashboard. The extension does not care about any
          history — it just blocks the sites you choose &amp; counts up the infractions (if there are any) in
          your dashboard.
        </p>
        <img
          src="/marketing/chrome-extension-installed.png"
          alt="Chrome Extensions menu showing Daywinner bot installed"
          style={styles.screenshot}
        />
        <p style={styles.stepLine}>
          <strong>Step 2</strong> — Once you see the extension downloaded, refresh this Daywinner tab so it can
          connect. Then start a work session with soft lock and open a blocked site — if it blocks, it&apos;s
          working.
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
  note: {
    margin: 0,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.45,
  },
  screenshot: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
};
