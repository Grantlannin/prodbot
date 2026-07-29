'use client';

import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from './hooks/useLocalStorage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const COURSE_URL = 'https://simpleproductivitysystem.com/';
const HIDE_COURSE_BTN_KEY = 'agentHQ_hideGetCourseButton';

interface GetCourseModalProps {
  variant?: 'default' | 'nav';
}

export default function GetCourseModal({ variant = 'default' }: GetCourseModalProps) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useLocalStorage(HIDE_COURSE_BTN_KEY, false);

  if (hidden) return null;

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div style={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
            <div
              style={styles.panel}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="get-course-title"
            >
              <div style={styles.panelHeader}>
                <h3 id="get-course-title" style={styles.panelTitle}>
                  Get the course
                </h3>
                <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                  ×
                </button>
              </div>

              <p style={styles.body}>
                This bot was created based on a very specific workflow/system. If you&apos;re using the bot, you will
                100% want to snag it (39 modules). It will show you how to generate/manage your own energy (so you stop
                being too tired to do anything), set up your environment in a way that protects your focus, and shows
                you how to preps your tasks/work so you can <em>actually</em> get stuff done. Once you understand that
                system, and you pair it with this bot, you will have the tools/mental models to be more productive than
                99% of the human population.
              </p>

              <a href={COURSE_URL} target="_blank" rel="noopener noreferrer" style={styles.cta}>
                Get the course →
              </a>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div style={styles.triggerWrap}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={variant === 'nav' ? styles.navTriggerBtn : styles.triggerBtn}
        >
          get the course
        </button>
        <button type="button" onClick={() => setHidden(true)} style={styles.hideBtn}>
          hide button
        </button>
      </div>
      {modal}
    </>
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
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 16,
  },
  panel: {
    width: '100%',
    maxWidth: 440,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
    padding: 18,
    fontFamily: font,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    fontFamily: font,
  },
  body: {
    margin: '0 0 16px',
    fontSize: 14,
    lineHeight: 1.55,
    color: '#334155',
  },
  cta: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
    textDecoration: 'none',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#0f172a',
    color: '#f8fafc',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.35)',
  },
};
