'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useUserProfile } from './hooks/UserProfileProvider';
import { welcomeLabel } from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function WelcomeBackHeader() {
  const { profile, setDisplayName } = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(profile.displayName);
  }, [profile.displayName, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    setDisplayName(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={styles.row}>
        <span style={styles.prefix}>Welcome back,</span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') {
              setDraft(profile.displayName);
              setEditing(false);
            }
          }}
          onBlur={save}
          style={styles.input}
          aria-label="Your name"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={styles.button}
      title="Click to edit your name"
    >
      {welcomeLabel(profile.displayName)}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  button: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 700,
    fontFamily: font,
    textAlign: 'left',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  prefix: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 700,
    fontFamily: font,
  },
  input: {
    border: 'none',
    borderBottom: '2px solid #3b82f6',
    outline: 'none',
    background: 'transparent',
    fontFamily: font,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    padding: '0 2px 2px',
    minWidth: 80,
    maxWidth: 200,
  },
};
