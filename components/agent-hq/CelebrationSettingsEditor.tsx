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
    padding: 14,
    borderRadius: 10,
    background: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
    maxWidth: 340,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 10,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#334155',
    marginBottom: 10,
    cursor: 'pointer',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 8,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 260,
    overflowY: 'auto',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 9px',
    borderRadius: 8,
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
    marginTop: 2,
    flexShrink: 0,
  },
  optionText: {
    fontSize: 11,
    lineHeight: 1.4,
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
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    padding: '7px 12px',
    border: 'none',
    borderRadius: 8,
    background: '#0f172a',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    color: '#fff',
  },
};
