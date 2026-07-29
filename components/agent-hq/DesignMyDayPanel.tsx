'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import DailyStructureCalendar from './DailyStructureCalendar';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useProjects } from './hooks/ProjectsProvider';
import { localDateKey } from './eodReports';
import { listWorkProjectGroups, type ListedWorkTask, type WorkProjectGroup } from './quickstartTask';
import type { CaptureNote } from './types';
import {
  noteKind,
  noteListLabel,
  OPEN_LOOPS_SECTION_LABEL,
  DECISIONS_SECTION_LABEL,
} from './openLoopsUi';
import {
  DAILY_STRUCTURE_KEY,
  DAY_TIMELINE_START,
  OPEN_LOOP_POINT_DURATION_MINUTES,
  formatMinutesLabel,
  getTodayPlan,
  makeDayBlockId,
  minutesToTimeInput,
  parseTimeInput,
  parseTimeRangeInput,
  sortBlocks,
  upsertTodayPlan,
  type DailyStructureStore,
  type DayBlock,
} from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const OPEN_LOOPS_KEY = 'agentHQ_openLoops';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const BLOCK_COLORS: Record<DayBlock['kind'], { bg: string; border: string; text: string }> = {
  work: { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  commitment: { bg: '#f1f5f9', border: '#94a3b8', text: '#334155' },
  open_loop: { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
};

function formatDurationLabel(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/** Snaps "now" to the nearest 15 minutes, clamped to the Design my day window (4am–12pm). */
function defaultWorkStart(): number {
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const snapped = Math.round(minutesNow / 15) * 15;
  return Math.max(4 * 60, Math.min(11 * 60, snapped));
}

function taskOptionKey(task: ListedWorkTask): string {
  return `${task.projectId}:${task.taskId}:${task.subTaskId ?? ''}`;
}

function flattenTaskOptions(groups: WorkProjectGroup[]): ListedWorkTask[] {
  const out: ListedWorkTask[] = [];
  for (const group of groups) {
    for (const partGroup of group.parts) {
      out.push(partGroup.part);
      out.push(...partGroup.subTasks);
    }
  }
  return out;
}

function makeWorkBlock(task: ListedWorkTask, startMinutes: number, durationMinutes: number): DayBlock {
  return {
    id: makeDayBlockId(),
    title: task.taskText,
    startMinutes,
    durationMinutes,
    kind: 'work',
    projectId: task.projectId,
    taskId: task.taskId,
    subTaskId: task.subTaskId,
  };
}

function makeCommitmentBlock(title: string, startMinutes: number, durationMinutes: number): DayBlock {
  return {
    id: makeDayBlockId(),
    title,
    startMinutes,
    durationMinutes,
    kind: 'commitment',
  };
}

function makeLoopBlock(note: CaptureNote, startMinutes: number): DayBlock {
  return {
    id: makeDayBlockId(),
    title: noteListLabel(note, []),
    startMinutes,
    durationMinutes: OPEN_LOOP_POINT_DURATION_MINUTES,
    kind: 'open_loop',
    openLoopId: note.id,
  };
}

type AddTab = 'task' | 'commitment' | 'loop';

// ─────────────────────────────────────────────────────────
// Shared pickers
// ─────────────────────────────────────────────────────────

function TaskPicker({
  groups,
  value,
  onChange,
}: {
  groups: WorkProjectGroup[];
  value: string;
  onChange: (key: string) => void;
}) {
  if (groups.length === 0) {
    return <p style={styles.emptyHint}>Add a project task first to schedule work.</p>;
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={styles.select}>
      <option value="">Choose a task…</option>
      {groups.map(group => (
        <optgroup key={group.projectId} label={group.projectName}>
          {group.parts.flatMap(partGroup => [
            <option key={taskOptionKey(partGroup.part)} value={taskOptionKey(partGroup.part)}>
              {partGroup.part.taskText}
            </option>,
            ...partGroup.subTasks.map(sub => (
              <option key={taskOptionKey(sub)} value={taskOptionKey(sub)}>
                {`↳ ${sub.taskText}`}
              </option>
            )),
          ])}
        </optgroup>
      ))}
    </select>
  );
}

function LoopPicker({
  notes,
  value,
  onChange,
}: {
  notes: CaptureNote[];
  value: string;
  onChange: (id: string) => void;
}) {
  const loops = notes.filter(n => noteKind(n) === 'open_loop');
  const decisions = notes.filter(n => noteKind(n) === 'decision');

  if (notes.length === 0) {
    return <p style={styles.emptyHint}>No open loops or decisions captured yet.</p>;
  }

  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={styles.select}>
      <option value="">Choose an open loop or decision…</option>
      {loops.length > 0 ? (
        <optgroup label={OPEN_LOOPS_SECTION_LABEL}>
          {loops.map(n => (
            <option key={n.id} value={n.id}>
              {noteListLabel(n, [])}
            </option>
          ))}
        </optgroup>
      ) : null}
      {decisions.length > 0 ? (
        <optgroup label={DECISIONS_SECTION_LABEL}>
          {decisions.map(n => (
            <option key={n.id} value={n.id}>
              {noteListLabel(n, [])}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

// ─────────────────────────────────────────────────────────
// Add forms (shared by the panel tabs and the guided modal)
// ─────────────────────────────────────────────────────────

function TaskAddForm({
  groups,
  onAdd,
  submitLabel = 'Add task block',
}: {
  groups: WorkProjectGroup[];
  onAdd: (task: ListedWorkTask, startMinutes: number, durationMinutes: number) => void;
  submitLabel?: string;
}) {
  const [taskKey, setTaskKey] = useState('');
  const [time, setTime] = useState(() => minutesToTimeInput(defaultWorkStart()));
  const [duration, setDuration] = useState(30);
  const options = useMemo(() => flattenTaskOptions(groups), [groups]);
  const selected = options.find(t => taskOptionKey(t) === taskKey) ?? null;

  const submit = () => {
    if (!selected) return;
    const startMinutes = parseTimeInput(time) ?? defaultWorkStart();
    onAdd(selected, startMinutes, duration);
    setTaskKey('');
  };

  return (
    <div style={styles.form}>
      <label style={styles.fieldLabel}>Task</label>
      <TaskPicker groups={groups} value={taskKey} onChange={setTaskKey} />

      <div style={styles.fieldRow}>
        <div style={styles.fieldCol}>
          <label style={styles.fieldLabel}>Start time</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={styles.timeInput}
          />
        </div>
        <div style={styles.fieldCol}>
          <label style={styles.fieldLabel}>Duration</label>
          <select
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            style={styles.select}
          >
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>
                {formatDurationLabel(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={submit}
        style={{ ...styles.primaryBtn, ...(!selected ? styles.btnDisabled : {}) }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function CommitmentAddForm({
  onAdd,
  submitLabel = 'Add commitment',
}: {
  onAdd: (title: string, startMinutes: number, durationMinutes: number) => void;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => minutesToTimeInput(defaultWorkStart()));
  const [end, setEnd] = useState(() => minutesToTimeInput(defaultWorkStart() + 60));
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give this commitment a name.');
      return;
    }
    const range = parseTimeRangeInput(`${start}-${end}`);
    if (!range) {
      setError('Check the start and end time.');
      return;
    }
    setError('');
    onAdd(trimmed, range.startMinutes, range.durationMinutes);
    setTitle('');
  };

  return (
    <div style={styles.form}>
      <label style={styles.fieldLabel}>Commitment name</label>
      <input
        type="text"
        value={title}
        onChange={e => {
          setTitle(e.target.value);
          setError('');
        }}
        placeholder="e.g. Team standup"
        style={styles.textInput}
      />

      <div style={styles.fieldRow}>
        <div style={styles.fieldCol}>
          <label style={styles.fieldLabel}>Start</label>
          <input
            type="time"
            value={start}
            onChange={e => setStart(e.target.value)}
            style={styles.timeInput}
          />
        </div>
        <div style={styles.fieldCol}>
          <label style={styles.fieldLabel}>End</label>
          <input
            type="time"
            value={end}
            onChange={e => setEnd(e.target.value)}
            style={styles.timeInput}
          />
        </div>
      </div>

      {error ? <p style={styles.errorText}>{error}</p> : null}

      <button type="button" onClick={submit} style={styles.primaryBtn}>
        {submitLabel}
      </button>
    </div>
  );
}

function LoopAddForm({
  notes,
  onAdd,
  submitLabel = 'Add to day',
}: {
  notes: CaptureNote[];
  onAdd: (note: CaptureNote, startMinutes: number) => void;
  submitLabel?: string;
}) {
  const [noteId, setNoteId] = useState('');
  const [time, setTime] = useState(() => minutesToTimeInput(defaultWorkStart()));
  const selected = notes.find(n => n.id === noteId) ?? null;

  const submit = () => {
    if (!selected) return;
    const startMinutes = parseTimeInput(time) ?? defaultWorkStart();
    onAdd(selected, startMinutes);
    setNoteId('');
  };

  return (
    <div style={styles.form}>
      <label style={styles.fieldLabel}>Open loop / decision</label>
      <LoopPicker notes={notes} value={noteId} onChange={setNoteId} />

      <label style={styles.fieldLabel}>Time</label>
      <input type="time" value={time} onChange={e => setTime(e.target.value)} style={styles.timeInput} />

      <button
        type="button"
        disabled={!selected}
        onClick={submit}
        style={{ ...styles.primaryBtn, ...(!selected ? styles.btnDisabled : {}) }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Legend + small display bits
// ─────────────────────────────────────────────────────────

function Legend() {
  const items: { kind: DayBlock['kind']; label: string }[] = [
    { kind: 'work', label: 'Work' },
    { kind: 'commitment', label: 'Commitment' },
    { kind: 'open_loop', label: 'Open loop / decision' },
  ];
  return (
    <div style={styles.legend}>
      {items.map(item => {
        const colors = BLOCK_COLORS[item.kind];
        return (
          <div key={item.kind} style={styles.legendItem}>
            <span
              style={{ ...styles.legendSwatch, background: colors.bg, borderColor: colors.border }}
            />
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

function DraftList({ blocks, onRemove }: { blocks: DayBlock[]; onRemove: (id: string) => void }) {
  if (blocks.length === 0) return null;
  return (
    <div style={styles.draftList}>
      {blocks.map(block => {
        const colors = BLOCK_COLORS[block.kind];
        return (
          <div key={block.id} style={styles.draftRow}>
            <span
              style={{ ...styles.draftSwatch, background: colors.bg, borderColor: colors.border }}
            />
            <span style={styles.draftTime}>{formatMinutesLabel(block.startMinutes)}</span>
            <span style={styles.draftTitle}>{block.title}</span>
            <button
              type="button"
              onClick={() => onRemove(block.id)}
              style={styles.draftRemoveBtn}
              aria-label={`Remove ${block.title}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Guided "Design my day" modal
// ─────────────────────────────────────────────────────────

type GuidedStep = 'important' | 'commitments' | 'loops' | 'done';

const GUIDED_STEPS: { id: GuidedStep; label: string }[] = [
  { id: 'important', label: 'Most important' },
  { id: 'commitments', label: 'Commitments' },
  { id: 'loops', label: 'Open loops' },
  { id: 'done', label: 'Review' },
];

function DesignMyDayGuidedModal({
  workGroups,
  openLoops,
  existingBlocks,
  onClose,
  onSave,
}: {
  workGroups: WorkProjectGroup[];
  openLoops: CaptureNote[];
  existingBlocks: DayBlock[];
  onClose: () => void;
  onSave: (draftBlocks: DayBlock[]) => void;
}) {
  const [step, setStep] = useState<GuidedStep>('important');
  const [draftBlocks, setDraftBlocks] = useState<DayBlock[]>([]);

  const addDraft = (block: DayBlock) => {
    setDraftBlocks(prev => sortBlocks([...prev, block]));
  };

  const removeDraft = (id: string) => {
    setDraftBlocks(prev => prev.filter(b => b.id !== id));
  };

  const previewBlocks = useMemo(
    () => sortBlocks([...existingBlocks, ...draftBlocks]),
    [existingBlocks, draftBlocks]
  );

  const stepIndex = GUIDED_STEPS.findIndex(s => s.id === step);
  const commitmentDrafts = draftBlocks.filter(b => b.kind === 'commitment');
  const loopDrafts = draftBlocks.filter(b => b.kind === 'open_loop');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modalShell} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <header style={styles.modalHeader}>
          <span style={styles.modalTitle}>Design my day</span>
          <button type="button" onClick={onClose} style={styles.modalCloseBtn} aria-label="Close">
            ×
          </button>
        </header>

        <div style={styles.stepRow}>
          {GUIDED_STEPS.map((s, index) => (
            <div
              key={s.id}
              style={{
                ...styles.stepPill,
                ...(index === stepIndex ? styles.stepPillActive : {}),
                ...(index < stepIndex ? styles.stepPillDone : {}),
              }}
            >
              {index + 1}. {s.label}
            </div>
          ))}
        </div>

        <div style={styles.modalBody}>
          {step === 'important' ? (
            <div style={styles.stepSection}>
              <p style={styles.stepPrompt}>
                What&apos;s the most important thing you could work on today? Pick the task, when
                you&apos;ll start, and how long you&apos;ll block off.
              </p>
              <TaskAddForm
                groups={workGroups}
                submitLabel="Add work block & continue"
                onAdd={(task, start, duration) => {
                  addDraft(makeWorkBlock(task, start, duration));
                  setStep('commitments');
                }}
              />
              <div style={styles.stepActionsRow}>
                <button type="button" onClick={() => setStep('commitments')} style={styles.linkBtn}>
                  Skip this step
                </button>
              </div>
            </div>
          ) : null}

          {step === 'commitments' ? (
            <div style={styles.stepSection}>
              <p style={styles.stepPrompt}>
                Add any fixed commitments already on your calendar — meetings, appointments,
                anything with a set time.
              </p>
              <CommitmentAddForm
                submitLabel="Add commitment"
                onAdd={(title, start, duration) => addDraft(makeCommitmentBlock(title, start, duration))}
              />
              <DraftList blocks={commitmentDrafts} onRemove={removeDraft} />
              <div style={styles.stepActionsRow}>
                <button type="button" onClick={() => setStep('loops')} style={styles.secondaryBtn}>
                  Skip
                </button>
                <button type="button" onClick={() => setStep('loops')} style={styles.primaryBtn}>
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 'loops' ? (
            <div style={styles.stepSection}>
              <p style={styles.stepPrompt}>
                Anything weighing on you — an open loop or decision — worth putting a time on today?
              </p>
              <LoopAddForm
                notes={openLoops}
                submitLabel="Add to day"
                onAdd={(note, start) => addDraft(makeLoopBlock(note, start))}
              />
              <DraftList blocks={loopDrafts} onRemove={removeDraft} />
              <div style={styles.stepActionsRow}>
                <button type="button" onClick={() => setStep('done')} style={styles.secondaryBtn}>
                  Skip
                </button>
                <button type="button" onClick={() => setStep('done')} style={styles.primaryBtn}>
                  Finish
                </button>
              </div>
            </div>
          ) : null}

          {step === 'done' ? (
            <div style={styles.stepSection}>
              <p style={styles.stepPrompt}>
                Here&apos;s today&apos;s plan. Save it to add these blocks to your calendar.
              </p>
              {previewBlocks.length === 0 ? (
                <p style={styles.emptyHint}>No blocks yet — go back and add something.</p>
              ) : (
                <div style={styles.previewList}>
                  {previewBlocks.map(block => {
                    const colors = BLOCK_COLORS[block.kind];
                    return (
                      <div key={block.id} style={styles.previewRow}>
                        <span
                          style={{
                            ...styles.previewSwatch,
                            background: colors.bg,
                            borderColor: colors.border,
                          }}
                        />
                        <span style={styles.previewTime}>{formatMinutesLabel(block.startMinutes)}</span>
                        <span style={styles.previewTitle}>{block.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={styles.stepActionsRow}>
                <button type="button" onClick={() => setStep('important')} style={styles.secondaryBtn}>
                  Back to start
                </button>
                <button
                  type="button"
                  disabled={draftBlocks.length === 0}
                  onClick={() => onSave(draftBlocks)}
                  style={{
                    ...styles.primaryBtn,
                    ...(draftBlocks.length === 0 ? styles.btnDisabled : {}),
                  }}
                >
                  Save day plan
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────

export default function DesignMyDayPanel() {
  const [store, setStore] = useLocalStorage<DailyStructureStore>(DAILY_STRUCTURE_KEY, {});
  const [openLoops] = useLocalStorage<CaptureNote[]>(OPEN_LOOPS_KEY, []);
  const { projects } = useProjects();

  const todayKey = localDateKey();
  const plan = useMemo(() => getTodayPlan(store, todayKey), [store, todayKey]);
  const blocks = useMemo(() => plan?.blocks ?? [], [plan]);
  const workGroups = useMemo(() => listWorkProjectGroups(projects), [projects]);

  const [tab, setTab] = useState<AddTab>('task');
  const [guidedOpen, setGuidedOpen] = useState(false);

  const persistBlocks = (next: DayBlock[]) => {
    setStore(prev => upsertTodayPlan(prev, next, todayKey));
  };

  const addBlock = (block: DayBlock) => {
    persistBlocks(sortBlocks([...blocks, block]));
  };

  const removeBlock = (id: string) => {
    persistBlocks(blocks.filter(b => b.id !== id));
  };

  const tabs: { id: AddTab; label: string }[] = [
    { id: 'task', label: 'Task' },
    { id: 'commitment', label: 'Commitment' },
    { id: 'loop', label: 'Open loop / decision' },
  ];

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <div style={styles.leadSubtitle}>
          Block time for work, commitments, and open loops.
        </div>
        <button type="button" onClick={() => setGuidedOpen(true)} style={styles.designBtn}>
          Design my day
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.calendarCell}>
          <DailyStructureCalendar
            blocks={blocks}
            interactive
            compact
            title=""
            timelineStartMinutes={4 * 60}
            timelineEndMinutes={24 * 60}
            noScroll
            pxPerMin={0.4}
            onBlocksChange={persistBlocks}
            onRemoveBlock={removeBlock}
          />
          <Legend />
        </div>

        <div style={styles.addCell}>
          <div style={styles.tabRow}>
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'task' ? (
            <TaskAddForm
              groups={workGroups}
              onAdd={(task, start, duration) => addBlock(makeWorkBlock(task, start, duration))}
            />
          ) : null}
          {tab === 'commitment' ? (
            <CommitmentAddForm
              onAdd={(title, start, duration) => addBlock(makeCommitmentBlock(title, start, duration))}
            />
          ) : null}
          {tab === 'loop' ? (
            <LoopAddForm notes={openLoops} onAdd={(note, start) => addBlock(makeLoopBlock(note, start))} />
          ) : null}
        </div>
      </div>

      {guidedOpen ? (
        <DesignMyDayGuidedModal
          workGroups={workGroups}
          openLoops={openLoops}
          existingBlocks={blocks}
          onClose={() => setGuidedOpen(false)}
          onSave={draftBlocks => {
            persistBlocks(sortBlocks([...blocks, ...draftBlocks]));
            setGuidedOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toolbarLead: {
    minWidth: 0,
  },
  leadTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  leadSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 1.45,
  },
  designBtn: {
    flexShrink: 0,
    border: 'none',
    borderRadius: 9,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#0f172a',
    color: '#f8fafc',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.35)',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  },
  calendarCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
    maxWidth: 360,
    width: '100%',
  },
  addCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
    maxWidth: 360,
    width: '100%',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  tabRow: {
    display: 'flex',
    gap: 2,
    background: '#eef2f6',
    borderRadius: 9,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    borderRadius: 7,
    padding: '7px 8px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tabBtnActive: {
    background: '#fff',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'lowercase',
  },
  fieldRow: {
    display: 'flex',
    gap: 8,
  },
  fieldCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
  },
  textInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    outline: 'none',
  },
  timeInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    outline: 'none',
  },
  errorText: {
    margin: 0,
    fontSize: 11,
    color: '#dc2626',
    lineHeight: 1.4,
  },
  emptyHint: {
    margin: 0,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.45,
    fontStyle: 'italic',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#0f172a',
    color: '#f8fafc',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.35)',
  },
  secondaryBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#fff',
    color: '#334155',
    cursor: 'pointer',
  },
  linkBtn: {
    border: 'none',
    background: 'none',
    padding: 0,
    margin: 0,
    font: 'inherit',
    fontSize: 11,
    color: '#94a3b8',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(148, 163, 184, 0.45)',
    textUnderlineOffset: 2,
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#64748b',
    fontWeight: 500,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    border: '1px solid',
    flexShrink: 0,
  },
  draftList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 2,
  },
  draftRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '6px 8px',
  },
  draftSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    border: '1px solid',
    flexShrink: 0,
  },
  draftTime: {
    fontSize: 11,
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
  draftTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  draftRemoveBtn: {
    flexShrink: 0,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    fontFamily: font,
  },

  // Guided modal
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100000,
    fontFamily: font,
  },
  modalShell: {
    width: '100%',
    maxWidth: 460,
    maxHeight: 'min(680px, 88vh)',
    background: '#fff',
    borderRadius: 18,
    border: '1px solid #d1d5db',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#475569',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
  },
  stepRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '10px 16px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    background: '#f8fafc',
  },
  stepPill: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    background: '#eef2f6',
    borderRadius: 999,
    padding: '4px 9px',
    whiteSpace: 'nowrap',
  },
  stepPillActive: {
    background: '#0f172a',
    color: '#f8fafc',
  },
  stepPillDone: {
    background: '#dbeafe',
    color: '#1e3a8a',
  },
  modalBody: {
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  stepSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stepPrompt: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#334155',
  },
  stepActionsRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  previewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 280,
    overflowY: 'auto',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '7px 9px',
  },
  previewSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    border: '1px solid',
    flexShrink: 0,
  },
  previewTime: {
    fontSize: 11,
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    width: 62,
  },
  previewTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
