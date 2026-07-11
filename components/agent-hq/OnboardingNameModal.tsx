'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ONBOARDING_NAME_PROMPT } from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface OnboardingNameModalProps {
  open: boolean;
  onSubmit: (name: string) => void;
}

export default function OnboardingNameModal({ open, onSubmit }: OnboardingNameModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return createPortal(
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div style={styles.card}>
        <h2 id="onboard-title" style={styles.title}>
          Welcome
        </h2>
        <p style={styles.prompt}>{ONBOARDING_NAME_PROMPT}</p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Your name…"
          style={styles.input}
          autoComplete="nickname"
        />
        <button type="button" onClick={submit} disabled={!name.trim()} style={styles.btn}>
          Continue
        </button>
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
  },
  card: {
    maxWidth: 440,
    width: '100%',
    padding: '32px 28px',
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
    fontFamily: font,
  },
  title: {
    margin: '0 0 12px',
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
  },
  prompt: {
    margin: '0 0 20px',
    fontSize: 15,
    lineHeight: 1.5,
    color: '#475569',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    fontSize: 16,
    fontFamily: font,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    outline: 'none',
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderRadius: 10,
    background: '#0f172a',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
};
