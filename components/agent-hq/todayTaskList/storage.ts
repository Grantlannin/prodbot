import { localDateKey } from '../eodReports';

export const TODAY_TASK_LIST_KEY = 'agentHQ_todayTaskList';
export const TODAY_LINE_DRAG_TYPE = 'application/x-daywinner-today-line';
export const PROJECT_TASK_DRAG_TYPE = 'application/x-daywinner-project-task';
export const TODAY_LINE_FILED_EVENT = 'agentHQ:todayLineFiled';

export interface TodayTaskLine {
  id: string;
  text: string;
  createdAt: number;
  /** Checked off in the misc list (kept until deleted / day rolls). */
  done?: boolean;
}

export interface TodayTaskListStore {
  dateKey: string;
  lines: TodayTaskLine[];
  updatedAt: number;
}

export function makeTodayLineId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function emptyTodayTaskList(now = Date.now()): TodayTaskListStore {
  return {
    dateKey: localDateKey(now),
    lines: [],
    updatedAt: now,
  };
}

/** Clean lines/shape without day-roll wipe — use for cloud sync so restores aren't emptied. */
export function sanitizeTodayTaskListStore(
  store: TodayTaskListStore | null | undefined,
  now = Date.now()
): TodayTaskListStore {
  const dateKey =
    typeof store?.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(store.dateKey)
      ? store.dateKey
      : localDateKey(now);
  const lines = (store?.lines ?? [])
    .filter(line => typeof line?.id === 'string' && typeof line?.text === 'string')
    .map(line => ({
      id: line.id,
      text: line.text,
      createdAt: typeof line.createdAt === 'number' ? line.createdAt : now,
      done: Boolean(line.done),
    }));
  return {
    dateKey,
    lines,
    updatedAt: typeof store?.updatedAt === 'number' ? store.updatedAt : now,
  };
}

export function normalizeTodayTaskList(
  store: TodayTaskListStore | null | undefined,
  now = Date.now()
): TodayTaskListStore {
  const today = localDateKey(now);
  const cleaned = sanitizeTodayTaskListStore(store, now);
  if (cleaned.dateKey !== today) {
    return emptyTodayTaskList(now);
  }
  return { ...cleaned, dateKey: today };
}

/** True when store has real misc lines for the local calendar day. */
export function hasMiscLinesForToday(
  store: TodayTaskListStore | null | undefined,
  now = Date.now()
): boolean {
  const today = localDateKey(now);
  if (!store || store.dateKey !== today) return false;
  return (store.lines ?? []).some(line => typeof line?.text === 'string' && line.text.trim().length > 0);
}

export type TodayLineDragPayload = {
  id: string;
  text: string;
};

export function parseTodayLineDragPayload(raw: string): TodayLineDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as TodayLineDragPayload;
    if (!parsed?.id || typeof parsed.text !== 'string') return null;
    const text = parsed.text.trim();
    if (!text) return null;
    return { id: parsed.id, text };
  } catch {
    return null;
  }
}

export function dispatchTodayLineFiled(lineId: string) {
  if (typeof window === 'undefined' || !lineId) return;
  window.dispatchEvent(new CustomEvent(TODAY_LINE_FILED_EVENT, { detail: { id: lineId } }));
}

export type ProjectTaskDragPayload = {
  text: string;
  projectId?: string;
  taskId?: string;
  subTaskId?: string;
};

export function parseProjectTaskDragPayload(raw: string): ProjectTaskDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as ProjectTaskDragPayload;
    if (typeof parsed?.text !== 'string') return null;
    const text = parsed.text.trim();
    if (!text) return null;
    return {
      text,
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : undefined,
      taskId: typeof parsed.taskId === 'string' ? parsed.taskId : undefined,
      subTaskId: typeof parsed.subTaskId === 'string' ? parsed.subTaskId : undefined,
    };
  } catch {
    return null;
  }
}

export function dataTransferHasType(types: DOMStringList | readonly string[], type: string): boolean {
  return Array.from(types as ArrayLike<string>).includes(type);
}
