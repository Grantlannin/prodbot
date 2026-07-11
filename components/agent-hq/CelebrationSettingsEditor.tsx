'use client';

import type { CSSProperties } from 'react';
import { useUserProfile } from './hooks/UserProfileProvider';
import { formatCelebrationMessage } from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface CelebrationSettingsEditorProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function CelebrationSettingsEditor({ onClose, compact }: CelebrationSettingsEditorProps) {
  const { profile, celebration, setCelebration, resetCelebrationTemplate } = useUserProfile();
  const preview = formatCelebrationMessage(celebration.messageTemplate, profile.displayName);

  return (
    <div style={compact ? styles.compactRoot : styles.root}>
      <div style={styles.panelTitle}>Celebration message</div>

      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={celebration.enabled}
          onChange={e => setCelebration({ enabled: e.target.checked })}
        />
        <span>Celebration on (confetti)</span>
      </label>

      <label style={{ ...styles.checkRow, opacity: celebration.enabled ? 1 : 0.45 }}>
        <input
          type="checkbox"
          checked={celebration.showMessage}
          disabled={!celebration.enabled}
          onChange={e => setCelebration({ showMessage: e.target.checked })}
        />
        <span>Show message overlay</span>
      </label>

      <label style={styles.fieldLabel}>
        Celebration text
        <span style={styles.hint}> Use {'{name}'} for your name</span>
      </label>
      <textarea
        value={celebration.messageTemplate}
        disabled={!celebration.enabled}
        onChange={e => setCelebration({ messageTemplate: e.target.value })}
        rows={compact ? 3 : 4}
        style={styles.textarea}
      />

      <div style={styles.previewLabel}>Preview</div>
      <div style={styles.preview}>{preview}</div>

      <div style={styles.actions}>
        <button type="button" onClick={() => resetCelebrationTemplate()} style={styles.secondaryBtn}>
          Reset default
        </button>
        {onClose && (
          <button type="button" onClick={onClose} style={styles.primaryBtn}>
            Done
          </button>
        )}
      </div>
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
    maxWidth: 320,
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
    marginBottom: 8,
    cursor: 'pointer',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 6,
  },
  hint: {
    fontWeight: 400,
    color: '#94a3b8',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 8,
    fontSize: 12,
    fontFamily: font,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    resize: 'vertical',
    lineHeight: 1.4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  preview: {
    fontSize: 11,
    lineHeight: 1.35,
    color: '#475569',
    background: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    maxHeight: 64,
    overflow: 'auto',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    padding: '7px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#f8fafc',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    color: '#475569',
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
