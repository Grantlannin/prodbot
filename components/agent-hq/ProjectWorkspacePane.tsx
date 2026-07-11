'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ProjectFileRef, ProjectPiece, ProjectWorkspace } from './types';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function byUpdatedDesc(a: ProjectWorkspace, b: ProjectWorkspace) {
  return b.updatedAt - a.updatedAt;
}

function touch(p: ProjectWorkspace): ProjectWorkspace {
  return { ...p, updatedAt: Date.now() };
}

export default function ProjectWorkspacePane() {
  const [projects, setProjects] = useLocalStorage<ProjectWorkspace[]>('agentHQ_projectWorkspaces', []);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('agentHQ_activeProjectId', null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKickoff, setNewProjectKickoff] = useState('');
  const [newPieceLabel, setNewPieceLabel] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const sorted = useMemo(() => [...projects].sort(byUpdatedDesc), [projects]);
  const active = useMemo(() => sorted.find(p => p.id === activeProjectId) ?? null, [sorted, activeProjectId]);

  function createProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const existing = projects.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setActiveProjectId(existing.id);
      setNewProjectName('');
      setNewProjectKickoff('');
      return;
    }
    const now = Date.now();
    const p: ProjectWorkspace = {
      id: makeId(),
      name,
      createdAt: now,
      updatedAt: now,
      kickoffNote: newProjectKickoff.trim(),
      stateNow: '',
      justCompleted: '',
      nextUp: '',
      linksNote: '',
      notes: '',
      pieces: [],
      tasks: [],
      links: [],
      files: [],
    };
    setProjects(prev => [p, ...prev]);
    setActiveProjectId(p.id);
    setNewProjectName('');
    setNewProjectKickoff('');
  }

  function updateActive(updater: (p: ProjectWorkspace) => ProjectWorkspace) {
    if (!active) return;
    setProjects(prev => prev.map(p => (p.id === active.id ? touch(updater(p)) : p)));
  }

  function deleteProject(id: string) {
    if (!confirm('Delete this project workspace?')) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  }

  function addPiece() {
    const label = newPieceLabel.trim();
    if (!label || !active) return;
    const piece: ProjectPiece = {
      id: makeId(),
      label,
      context: '',
      linksNote: '',
      files: [],
      createdAt: Date.now(),
    };
    updateActive(p => ({ ...p, pieces: [...(p.pieces ?? []), piece] }));
    setNewPieceLabel('');
  }

  async function uploadFileToPiece(pieceId: string, file: File) {
    if (!active) return;
    setUploadingFile(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const objectPath = `${active.id}/pieces/${pieceId}/${Date.now()}-${safeName}`;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.storage.from('agenthq-project-files').upload(objectPath, file, {
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('agenthq-project-files').getPublicUrl(objectPath);
      const ref: ProjectFileRef = {
        id: makeId(),
        name: file.name,
        path: objectPath,
        url: data.publicUrl,
        size: file.size,
        uploadedAt: Date.now(),
      };
      updateActive(p => ({
        ...p,
        pieces: (p.pieces ?? []).map(x => (x.id === pieceId ? { ...x, files: [...x.files, ref] } : x)),
      }));
    } catch (err) {
      console.error('[project-file-upload]', err);
      alert('File upload failed. Make sure Supabase bucket "agenthq-project-files" exists and upload policies allow this user.');
    } finally {
      setUploadingFile(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>Projects</div>
        <input
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createProject()}
          placeholder="Project name…"
          style={styles.input}
        />
        <textarea
          value={newProjectKickoff}
          onChange={e => setNewProjectKickoff(e.target.value)}
          placeholder="Where is this currently at and what do I need to do?"
          style={styles.kickoffInput}
        />
        <button type="button" onClick={createProject} style={styles.btn}>
          Add project
        </button>
        <div style={styles.projectList}>
          {sorted.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveProjectId(p.id)}
              style={{ ...styles.projectItem, ...(activeProjectId === p.id ? styles.projectItemActive : {}) }}
              title={p.name}
            >
              {p.name}
            </button>
          ))}
          {sorted.length === 0 && <div style={styles.empty}>No projects yet.</div>}
        </div>
      </div>

      <div style={styles.main}>
        {!active ? (
          <div style={styles.emptyMain}>Create or select a project.</div>
        ) : (
          <>
            <div style={styles.mainHeaderRow}>
              <div style={styles.mainTitle}>{active.name}</div>
              <button type="button" onClick={() => deleteProject(active.id)} style={styles.deleteBtn}>
                Delete
              </button>
            </div>

            <Field label="Where is this currently at and what do I need to do?">
              <textarea
                value={active.kickoffNote ?? ''}
                onChange={e => updateActive(p => ({ ...p, kickoffNote: e.target.value }))}
                placeholder="High-level current status + immediate direction…"
                style={styles.textarea}
              />
            </Field>

            <Field label="Project pieces">
              <div style={styles.row}>
                <input
                  value={newPieceLabel}
                  onChange={e => setNewPieceLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPiece()}
                  placeholder="Piece label (e.g. ads)"
                  style={styles.input}
                />
                <button type="button" onClick={addPiece} style={styles.btn}>
                  Add piece
                </button>
              </div>
              <div style={styles.piecesList}>
                {(active.pieces ?? []).map(piece => (
                  <div key={piece.id} style={styles.pieceCard}>
                    <div style={styles.pieceHeaderRow}>
                      <input
                        value={piece.label}
                        onChange={e =>
                          updateActive(p => ({
                            ...p,
                            pieces: (p.pieces ?? []).map(x => (x.id === piece.id ? { ...x, label: e.target.value } : x)),
                          }))
                        }
                        placeholder="Piece label"
                        style={styles.pieceLabelInput}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateActive(p => ({
                            ...p,
                            pieces: (p.pieces ?? []).filter(x => x.id !== piece.id),
                          }))
                        }
                        style={styles.deletePieceBtn}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={styles.pieceBody}>
                      <div style={styles.pieceSection}>
                        <div style={styles.pieceLabel}>Notes</div>
                        <textarea
                          value={piece.context}
                          onChange={e =>
                            updateActive(p => ({
                              ...p,
                              pieces: (p.pieces ?? []).map(x => (x.id === piece.id ? { ...x, context: e.target.value } : x)),
                            }))
                          }
                          placeholder="Add your context…"
                          style={styles.textarea}
                        />
                      </div>
                      <div style={styles.pieceSection}>
                        <div style={styles.pieceLabel}>Relevant files</div>
                        <div style={styles.row}>
                          <input
                            type="file"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) void uploadFileToPiece(piece.id, f);
                              e.currentTarget.value = '';
                            }}
                            disabled={uploadingFile}
                          />
                          <span style={styles.small}>{uploadingFile ? 'Uploading…' : 'Relevant files'}</span>
                        </div>
                        <div style={styles.stack}>
                          {[...(piece.files ?? [])]
                            .sort((a, b) => b.uploadedAt - a.uploadedAt)
                            .map(f => (
                              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" style={styles.link}>
                                {f.name}
                              </a>
                            ))}
                        </div>
                      </div>
                      <div style={styles.pieceSection}>
                        <div style={styles.pieceLabel}>Relevant links</div>
                        <textarea
                          value={piece.linksNote}
                          onChange={e =>
                            updateActive(p => ({
                              ...p,
                              pieces: (p.pieces ?? []).map(x => (x.id === piece.id ? { ...x, linksNote: e.target.value } : x)),
                            }))
                          }
                          placeholder="Paste links here and they autosave…"
                          style={styles.textarea}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(active.pieces ?? []).length === 0 ? <div style={styles.empty}>No pieces yet.</div> : null}
              </div>
            </Field>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={styles.field}>
      <div style={styles.label}>{label}</div>
      {children}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { display: 'flex', minHeight: 'min(44vh, 420px)', height: '100%' },
  sidebar: { width: 220, borderRight: '1px solid #e2e8f0', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  sidebarHeader: { fontSize: 12, color: '#64748b', fontWeight: 600, fontFamily: font },
  projectList: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 80 },
  projectItem: {
    textAlign: 'left',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    color: '#334155',
    fontSize: 12,
    fontFamily: font,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectItemActive: { background: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: 600 },
  main: { flex: 1, minWidth: 0, padding: 10, overflowY: 'auto' },
  mainHeaderRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  mainTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: font, flex: 1, minWidth: 0 },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: font,
  },
  field: { marginBottom: 10 },
  label: { fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, fontFamily: font },
  textarea: {
    width: '100%',
    minHeight: 70,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '8px 10px',
    fontFamily: font,
    fontSize: 13,
    lineHeight: 1.4,
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
  },
  row: { display: 'flex', gap: 6, alignItems: 'center' },
  input: {
    width: '100%',
    minWidth: 0,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '7px 8px',
    fontFamily: font,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  kickoffInput: {
    width: '100%',
    minHeight: 74,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '7px 8px',
    fontFamily: font,
    fontSize: 12,
    lineHeight: 1.4,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  btn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    flexShrink: 0,
  },
  stack: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 },
  piecesList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
  pieceCard: { border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' },
  pieceHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  pieceLabelInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '6px 8px',
    fontFamily: font,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  deletePieceBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    textDecoration: 'underline',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: font,
    padding: 0,
    flexShrink: 0,
  },
  pieceBody: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  pieceSection: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#fcfdff',
    padding: '8px 10px',
  },
  pieceLabel: { fontSize: 11, color: '#64748b', fontWeight: 600, fontFamily: font },
  link: {
    fontSize: 12,
    color: '#1d4ed8',
    fontFamily: font,
    textDecoration: 'underline',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  small: { fontSize: 11, color: '#94a3b8', fontFamily: font },
  empty: { color: '#94a3b8', fontSize: 12, fontFamily: font, padding: '8px 0' },
  emptyMain: { color: '#64748b', fontSize: 13, fontFamily: font, padding: 12 },
};
