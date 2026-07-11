'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { TaskContextLink } from './types';
import { isValidContextUrl, isBackgroundTabClick, normalizeContextUrl, openContextLink } from './googleDocLink';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const POPOVER_W = 260;

function LinkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname === '/' ? '' : u.pathname;
    const label = host + path;
    return label.length > 42 ? label.slice(0, 39) + '…' : label;
  } catch {
    return url.length > 42 ? url.slice(0, 39) + '…' : url;
  }
}

interface TaskContextLinksBoxProps {
  links: TaskContextLink[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddLink: (url: string, name: string) => void;
  onRemoveLink: (linkId: string) => void;
  onUpdateLinkName: (linkId: string, name: string) => void;
  compact?: boolean;
}

export default function TaskContextLinksBox({
  links,
  isOpen,
  onToggle,
  onClose,
  onAddLink,
  onRemoveLink,
  onUpdateLinkName,
  compact = false,
}: TaskContextLinksBoxProps) {
  const [draft, setDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editNameDraft, setEditNameDraft] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const repositionPopover = useCallback(() => {
    const btn = triggerRef.current;
    const pop = rootRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const popH = pop.offsetHeight;
    const margin = 8;
    const gap = 6;
    let left = r.right - POPOVER_W;
    left = Math.max(margin, Math.min(window.innerWidth - POPOVER_W - margin, left));
    const spaceBelow = window.innerHeight - r.bottom - gap - margin;
    const spaceAbove = r.top - gap - margin;
    let top =
      spaceBelow >= popH || spaceBelow >= spaceAbove
        ? r.bottom + gap
        : r.top - gap - popH;
    top = Math.max(margin, Math.min(window.innerHeight - popH - margin, top));
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (rootRef.current?.contains(t)) return;
      onCloseRef.current();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDraft('');
      setNameDraft('');
      setEditingLinkId(null);
      setEditNameDraft('');
      return;
    }
    setTimeout(() => addInputRef.current?.focus(), 0);
  }, [isOpen, links.length]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    repositionPopover();
  }, [isOpen, links.length, editingLinkId, repositionPopover]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => repositionPopover();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, repositionPopover]);

  const submit = () => {
    const url = normalizeContextUrl(draft);
    if (!isValidContextUrl(url)) return;
    onAddLink(url, nameDraft.trim());
    setDraft('');
    setNameDraft('');
    setTimeout(() => addInputRef.current?.focus(), 0);
  };

  const startEditName = (link: TaskContextLink) => {
    setEditingLinkId(link.id);
    setEditNameDraft(link.name?.trim() ?? '');
    setTimeout(() => {
      editNameRef.current?.focus();
      editNameRef.current?.select();
    }, 0);
  };

  const commitEditName = (linkId: string) => {
    onUpdateLinkName(linkId, editNameDraft.trim());
    setEditingLinkId(null);
    setEditNameDraft('');
  };

  const cancelEditName = () => {
    setEditingLinkId(null);
    setEditNameDraft('');
  };

  const launchLink = (url: string, e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (isBackgroundTabClick(e.nativeEvent)) return;
    e.preventDefault();
    openContextLink(url);
  };

  const count = links.length;
  const canSubmit = isValidContextUrl(draft);

  const popover = isOpen ? (
    <div
      ref={rootRef}
      style={{
        ...styles.popover,
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: POPOVER_W,
      }}
      role="dialog"
      aria-label="Task context links"
    >
      <div style={styles.popoverHeader}>
        <div style={styles.popoverHeaderRow}>
          <span>Context links</span>
          <button type="button" onClick={onClose} style={styles.popoverClose} aria-label="Close">
            ×
          </button>
        </div>
        {links.length > 0 && (
          <span style={styles.popoverHint}>⌘/Ctrl+click ↗ to stay here</span>
        )}
      </div>
      {links.length === 0 ? (
        <div style={styles.empty}>Paste links to docs, Notion, Drive, etc.</div>
      ) : (
        <ul style={styles.linkList}>
          {links.map(link => {
            const displayName = link.name?.trim();
            const urlLabel = linkLabel(link.url);
            const isEditingName = editingLinkId === link.id;
            return (
              <li key={link.id} style={styles.linkItem}>
                <div style={styles.linkBody}>
                  {isEditingName ? (
                    <input
                      ref={editNameRef}
                      type="text"
                      value={editNameDraft}
                      onChange={e => setEditNameDraft(e.target.value)}
                      onBlur={() => commitEditName(link.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitEditName(link.id);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEditName();
                        }
                      }}
                      placeholder="Name this link…"
                      style={styles.linkNameInput}
                      aria-label="Edit link name"
                    />
                  ) : displayName ? (
                    <button
                      type="button"
                      onClick={() => startEditName(link)}
                      style={styles.linkNameBtn}
                      title="Click to edit name"
                    >
                      {displayName}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditName(link)}
                      style={styles.linkNameAddBtn}
                      title="Add a name"
                    >
                      Add name…
                    </button>
                  )}
                  <div style={displayName || isEditingName ? styles.linkUrl : styles.linkUrlOnly} title={link.url}>
                    {urlLabel}
                  </div>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => launchLink(link.url, e)}
                  style={styles.linkLaunch}
                  title="Open in new tab (⌘/Ctrl+click to stay on dashboard · middle-click too)"
                  aria-label={`Open ${displayName || urlLabel} in new tab`}
                >
                  ↗
                </a>
                <button
                  type="button"
                  onClick={() => onRemoveLink(link.id)}
                  style={styles.linkRemove}
                  aria-label="Remove link"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        style={styles.addSection}
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <label style={styles.addFieldLabel} htmlFor="context-link-name">
          Name
        </label>
        <input
          ref={nameInputRef}
          id="context-link-name"
          type="text"
          value={nameDraft}
          onChange={e => setNameDraft(e.target.value)}
          placeholder="e.g. Design doc"
          style={styles.addInput}
        />
        <label style={styles.addFieldLabel} htmlFor="context-link-url">
          Link
        </label>
        <input
          ref={addInputRef}
          id="context-link-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Paste link…"
          style={styles.addInput}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.addBtn,
            ...(!canSubmit ? styles.addBtnDisabled : {}),
            alignSelf: 'flex-end',
            marginTop: 2,
          }}
        >
          Add
        </button>
      </form>
    </div>
  ) : null;

  return (
    <>
      <div style={compact ? styles.triggerWrapCompact : styles.triggerWrap}>
        {!compact ? <span style={styles.triggerLabel}>Links</span> : null}
        <button
          ref={triggerRef}
          type="button"
          onClick={onToggle}
          style={{
            ...(compact ? styles.triggerCompact : styles.trigger),
            ...(isOpen ? styles.triggerOpen : {}),
            ...(count > 0 ? styles.triggerHasLinks : {}),
          }}
          title={count > 0 ? `${count} context link${count === 1 ? '' : 's'}` : 'Context links'}
          aria-label="Context links"
          aria-expanded={isOpen}
        >
          {count > 0 ? count : <LinkIcon size={compact ? 11 : 13} />}
        </button>
      </div>
      {typeof document !== 'undefined' && popover ? createPortal(popover, document.body) : null}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  triggerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    gap: 2,
  },
  triggerWrapCompact: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  triggerLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: '#94a3b8',
    lineHeight: 1,
    letterSpacing: '0.02em',
    userSelect: 'none',
  },
  trigger: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#f8fafc',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  triggerCompact: {
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  triggerOpen: {
    borderColor: '#cbd5e1',
    background: '#e2e8f0',
    color: '#334155',
  },
  triggerHasLinks: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1d4ed8',
  },
  popover: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
    zIndex: 1000,
    fontFamily: font,
    overflow: 'hidden',
    maxHeight: 'min(420px, calc(100vh - 16px))',
    display: 'flex',
    flexDirection: 'column',
  },
  popoverHeader: {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  popoverHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  popoverClose: {
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 6,
    background: '#f1f5f9',
    color: '#64748b',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  },
  popoverHint: {
    fontSize: 10,
    fontWeight: 500,
    color: '#94a3b8',
  },
  empty: {
    padding: '10px 10px 4px',
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  linkList: {
    listStyle: 'none',
    margin: 0,
    padding: '6px 6px 0',
    maxHeight: 140,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 1,
    minHeight: 0,
  },
  linkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
  },
  linkBody: {
    flex: 1,
    minWidth: 0,
    padding: '6px 8px',
    border: '1px solid #f1f5f9',
    borderRadius: 6,
    background: '#fafafa',
  },
  linkNameBtn: {
    display: 'block',
    width: '100%',
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'transparent',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
    textAlign: 'left',
    cursor: 'text',
  },
  linkNameAddBtn: {
    display: 'block',
    width: '100%',
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'transparent',
    fontSize: 10,
    fontWeight: 500,
    fontFamily: font,
    color: '#94a3b8',
    lineHeight: 1.3,
    textAlign: 'left',
    cursor: 'text',
  },
  linkNameInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#0f172a',
    outline: 'none',
    background: '#fff',
    lineHeight: 1.3,
  },
  linkUrl: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: font,
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  },
  linkUrlOnly: {
    fontSize: 11,
    fontFamily: font,
    color: '#475569',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  },
  linkLaunch: {
    flexShrink: 0,
    width: 26,
    height: 26,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#334155',
    fontSize: 13,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    boxSizing: 'border-box',
  },
  linkRemove: {
    flexShrink: 0,
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: 1,
  },
  addSection: {
    padding: 8,
    borderTop: '1px solid #f1f5f9',
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
  },
  addFieldLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: '#94a3b8',
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '5px 8px',
    fontSize: 11,
    fontFamily: font,
    outline: 'none',
  },
  addBtn: {
    flexShrink: 0,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '5px 8px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  addBtnDisabled: {
    background: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
};
