import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daywinner bot — paused',
  robots: { index: false, follow: false },
};

export default function PausedPage() {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#64748b',
          }}
        >
          Daywinner bot
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Temporarily unavailable
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#475569' }}>
          We&apos;re pausing the project for now. Check back soon.
        </p>
      </div>
    </div>
  );
}
