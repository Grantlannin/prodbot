'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useLocalStorage } from './hooks/useLocalStorage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const HIDE_COURSE_BTN_KEY = 'agentHQ_hideGetCourseButton';

interface GetCourseModalProps {
  variant?: 'default' | 'nav';
}

/** Nav entry to /course — unlocked members open the course; others see the upsell on that page. */
export default function GetCourseModal({ variant = 'default' }: GetCourseModalProps) {
  const [hidden, setHidden] = useLocalStorage(HIDE_COURSE_BTN_KEY, false);
  const [hasCourse, setHasCourse] = useState(false);

  useEffect(() => {
    void fetch('/api/billing/status')
      .then(async res => {
        const data = (await res.json()) as { courseAccess?: boolean };
        if (res.ok && data.courseAccess) setHasCourse(true);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  if (hidden) return null;

  return (
    <div style={styles.triggerWrap}>
      <Link
        href="/course"
        style={variant === 'nav' ? styles.navTriggerBtn : styles.triggerBtn}
      >
        {hasCourse ? 'Course' : 'get the course'}
      </Link>
      <button type="button" onClick={() => setHidden(true)} style={styles.hideBtn}>
        hide button
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  triggerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  hideBtn: {
    border: 'none',
    background: 'transparent',
    padding: '2px 4px',
    fontSize: 10,
    fontWeight: 500,
    fontFamily: font,
    color: '#94a3b8',
    cursor: 'pointer',
    lineHeight: 1.2,
  },
  triggerBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: font,
    color: '#f8fafc',
    background: '#0f172a',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.35)',
  },
  navTriggerBtn: {
    border: 'none',
    borderRadius: 999,
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: font,
    letterSpacing: '-0.01em',
    color: '#f8fafc',
    background: '#0f172a',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
  },
};
