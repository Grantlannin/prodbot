'use client';

import type { CSSProperties } from 'react';
import type { ProjectProgress } from './projectProgress';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface ProjectProgressBarProps {
  progress: ProjectProgress;
  compact?: boolean;
}

export default function ProjectProgressBar({ progress, compact = false }: ProjectProgressBarProps) {
  if (progress.total === 0) return null;

  const complete = progress.percent >= 100;

  if (compact) {
    return (
      <div style={compactStyles.wrap}>
        <div style={compactStyles.track}>
          <div
            style={{
              ...compactStyles.fill,
              width: `${progress.percent}%`,
              ...(complete ? compactStyles.fillComplete : {}),
            }}
          />
        </div>
        <span style={compactStyles.percent}>{progress.percent}%</span>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${progress.percent}%`,
            ...(complete ? styles.fillComplete : {}),
          }}
        />
      </div>
      <div style={styles.meta}>
        <span style={styles.label}>{complete ? 'Complete' : 'Progress'}</span>
        <span style={styles.percent}>{progress.percent}%</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    marginBottom: 10,
  },
  track: {
    height: 10,
    borderRadius: 999,
    background: '#e2e8f0',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.08)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
    boxShadow: '0 0 12px rgba(59,130,246,0.75), 0 0 24px rgba(37,99,235,0.45)',
    transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
  },
  fillComplete: {
    boxShadow: '0 0 16px rgba(59,130,246,0.95), 0 0 32px rgba(37,99,235,0.65), 0 0 48px rgba(96,165,250,0.35)',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    fontFamily: font,
    fontSize: 11,
    fontWeight: 600,
  },
  label: {
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  percent: {
    color: '#2563eb',
    fontVariantNumeric: 'tabular-nums',
  },
};

const compactStyles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  track: {
    flex: 1,
    minWidth: 0,
    height: 6,
    borderRadius: 999,
    background: '#e2e8f0',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.08)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
    boxShadow: '0 0 8px rgba(59,130,246,0.55)',
    transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
  },
  fillComplete: {
    boxShadow: '0 0 12px rgba(59,130,246,0.85), 0 0 20px rgba(37,99,235,0.5)',
  },
  percent: {
    flexShrink: 0,
    fontFamily: font,
    fontSize: 11,
    fontWeight: 600,
    color: '#2563eb',
    fontVariantNumeric: 'tabular-nums',
  },
};
