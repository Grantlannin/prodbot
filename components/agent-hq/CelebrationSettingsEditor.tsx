'use client';

import type { CSSProperties } from 'react';
import { useUserProfile } from './hooks/UserProfileProvider';
import {
  CELEBRATION_MESSAGE_OPTIONS,
  formatCelebrationMessage,
  resolveCelebrationTemplate,
} from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface CelebrationSettingsEditorProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function CelebrationSettingsEditor({ onClose, compact }: CelebrationSettingsEditorProps) {
  const { profile, celebration, setCelebration } = useUserProfile();
  const selected = resolveCelebrationTemplate(celebration.messageTemplate);

  return (
    <div style={compact ? styles.compactRoot : styles.root}>
      <div style={styles.panelTitle}>Celebration message</div>

      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={celebration.enabled}
          onChange={e => setCelebration({ enabled: e.target.checked })}
        />
        <span>Celebration on (confetti + message)</span>
      </label>

      <div style={styles.fieldLabel}>Choose a message</div>
      <div style={styles.optionList} role="radiogroup" aria-label="Celebration message">
        {CELEBRATION_MESSAGE_OPTIONS.map((option, index) => {
          const checked = selected === option;
          const preview = formatCelebrationMessage(option, profile.displayName);
          return (
            <label
              key={option}
              style={{
                ...styles.optionRow,
                ...(checked ? styles.optionRowSelected : {}),
                ...(!celebration.enabled ? styles.optionRowDisabled : {}),
              }}
            >
              <input
                type="radio"
                name="celebration-message"
                checked={checked}
                disabled={!celebration.enabled}
                onChange={() => setCelebration({ messageTemplate: option })}
                style={styles.radio}
              />
              <span style={styles.optionText}>
                <span style={styles.optionIndex}>{index + 1}.</span> {preview}
              </span>
            </label>
          );
        })}
      </div>

      {onClose ? (
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.primaryBtn}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
  },
  compactRoot: {
    fontFamily: font,
    padding: 10,
    borderRadius: 10,
    background: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
    maxWidth: 280,
    width: '100%',
    boxSizing: 'border-box',
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#334155',
    marginBottom: 8,
    cursor: 'pointer',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 6,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 180,
    overflowY: 'auto',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    padding: '6px 7px',
    borderRadius: 7,
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
  },
  optionRowSelected: {
    borderColor: '#2563eb',
    background: '#eff6ff',
  },
  optionRowDisabled: {
    opacity: 0.45,
    cursor: 'default',
  },
  radio: {
    marginTop: 1,
    flexShrink: 0,
    transform: 'scale(0.9)',
  },
  optionText: {
    fontSize: 10,
    lineHeight: 1.35,
    color: '#0f172a',
    fontWeight: 600,
  },
  optionIndex: {
    color: '#64748b',
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: 7,
    background: '#0f172a',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    color: '#fff',
  },
};
