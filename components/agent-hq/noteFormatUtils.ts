function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const BLOCK_TAGS = new Set([
  'DIV',
  'P',
  'LI',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TR',
  'SECTION',
  'ARTICLE',
  'BLOCKQUOTE',
  'PRE',
]);

const ALLOWED_TAGS = new Set(['DIV', 'P', 'BR', 'STRONG', 'B', 'SPAN', 'FONT']);

export const NOTE_FONT_SIZE_MIN = 8;
export const NOTE_FONT_SIZE_MAX = 24;
/** Menu presets (every 2). Typing still accepts any integer 8–24. */
export const NOTE_FONT_SIZES: readonly number[] = Array.from(
  { length: (NOTE_FONT_SIZE_MAX - NOTE_FONT_SIZE_MIN) / 2 + 1 },
  (_, i) => NOTE_FONT_SIZE_MIN + i * 2
);
export type NoteFontSize = number;

/** Any integer size in 8–24 (odds allowed when typed). */
export function clampNoteFontSize(n: number): NoteFontSize {
  if (!Number.isFinite(n)) return 14;
  return Math.min(NOTE_FONT_SIZE_MAX, Math.max(NOTE_FONT_SIZE_MIN, Math.round(n)));
}

/** UI size and CSS px are 1:1. */
export function noteSizeToCssPx(size: NoteFontSize): number {
  return clampNoteFontSize(size);
}

export function cssPxToNoteSize(px: number): NoteFontSize {
  return clampNoteFontSize(px);
}

export function nearestNoteFontSize(px: number): NoteFontSize {
  return clampNoteFontSize(px);
}

/** Plain / legacy markdown-ish lines → editor HTML. */
export function noteTextToEditableHtml(text: string): string {
  if (!text) return '<div><br></div>';

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => {
      const bold = line.match(/^\*\*(.+)\*\*$/);
      if (bold) return `<div><strong>${escapeHtml(bold[1])}</strong></div>`;
      return `<div>${escapeHtml(line) || '<br>'}</div>`;
    })
    .join('');
}

function looksLikeHtml(stored: string): boolean {
  return /<[a-z][\s\S]*>/i.test(stored);
}

function parseFontSizePx(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  // Keyword sizes from execCommand are unreliable — ignore (do not map 8→24).
  if (
    trimmed === 'xxx-large' ||
    trimmed === '-webkit-xxx-large' ||
    trimmed === 'xx-large' ||
    trimmed === 'x-large' ||
    trimmed === 'large' ||
    trimmed === 'medium' ||
    trimmed === 'small' ||
    trimmed === 'x-small' ||
    trimmed === 'xx-small'
  ) {
    return null;
  }
  const m = trimmed.match(/^(\d+(?:\.\d+)?)px$/);
  if (!m) return null;
  return clampNoteFontSize(Number(m[1]));
}

function sanitizeElement(el: Element): Node | null {
  const tag = el.tagName.toUpperCase();

  if (tag === 'BR') {
    return document.createElement('br');
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const frag = document.createDocumentFragment();
    Array.from(el.childNodes).forEach(child => {
      const cleaned = sanitizeNode(child);
      if (cleaned) frag.appendChild(cleaned);
    });
    return frag.childNodes.length ? frag : null;
  }

  let out: HTMLElement;
  if (tag === 'STRONG' || tag === 'B') {
    out = document.createElement('strong');
    // Keep font-size on bold so size-after-bold (and bold-after-size) survives sanitize.
    const boldSize = parseFontSizePx((el as HTMLElement).style?.fontSize);
    if (boldSize) out.style.fontSize = `${boldSize}px`;
  } else if (tag === 'SPAN' || tag === 'FONT') {
    const size =
      parseFontSizePx((el as HTMLElement).style?.fontSize) ??
      (() => {
        // legacy <font size="1-7">
        const raw = el.getAttribute('size');
        if (!raw) return null;
        // Avoid mapping huge legacy <font size="7"> onto our max size.
        const map: Record<string, number> = {
          '1': 8,
          '2': 10,
          '3': 12,
          '4': 14,
          '5': 16,
          '6': 18,
          '7': 20,
        };
        return map[raw] ?? null;
      })();
    if (size) {
      out = document.createElement('span');
      out.style.fontSize = `${size}px`;
    } else {
      // Span with no allowed style — unwrap children
      const frag = document.createDocumentFragment();
      Array.from(el.childNodes).forEach(child => {
        const cleaned = sanitizeNode(child);
        if (cleaned) frag.appendChild(cleaned);
      });
      return frag.childNodes.length ? frag : null;
    }
  } else {
    out = document.createElement('div');
  }

  Array.from(el.childNodes).forEach(child => {
    const cleaned = sanitizeNode(child);
    if (cleaned) out.appendChild(cleaned);
  });

  if (out.tagName === 'DIV' && out.childNodes.length === 0) {
    out.appendChild(document.createElement('br'));
  }

  return out;
}

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? '');
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return sanitizeElement(node as Element);
  }
  return null;
}

/** Strip to safe note HTML (div/br/strong/span font-size only). */
export function sanitizeNoteHtml(html: string): string {
  if (typeof document === 'undefined') return html;
  const template = document.createElement('div');
  template.innerHTML = html;
  const out = document.createElement('div');
  Array.from(template.childNodes).forEach(child => {
    const cleaned = sanitizeNode(child);
    if (!cleaned) return;
    if (cleaned.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      out.appendChild(cleaned);
    } else {
      out.appendChild(cleaned);
    }
  });
  if (!out.innerHTML.trim()) return '<div><br></div>';
  return out.innerHTML;
}

export const NOTE_TABS_MAX = 5;
const NOTE_TABS_MARKER = '@@DWNOTEABS@@';

export type NoteTab = { id: string; title: string; body: string };
export type NoteTabsState = { tabs: NoteTab[]; activeId: string };

function newNoteTabId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createNoteTab(index: number, body = ''): NoteTab {
  return { id: newNoteTabId(), title: String(index), body };
}

/** Parse stored notes (plain / HTML / multi-tab envelope) into up to 5 tabs. */
export function parseNoteTabs(stored: string | undefined | null): NoteTabsState {
  const raw = stored ?? '';
  if (raw.startsWith(NOTE_TABS_MARKER)) {
    try {
      const parsed = JSON.parse(raw.slice(NOTE_TABS_MARKER.length)) as {
        v?: number;
        tabs?: Array<{ id?: string; title?: string; body?: string }>;
        activeId?: string;
      };
      if (parsed?.v === 1 && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        const tabs = parsed.tabs.slice(0, NOTE_TABS_MAX).map((t, i) => ({
          id: typeof t.id === 'string' && t.id ? t.id : newNoteTabId(),
          title:
            typeof t.title === 'string' && t.title.trim()
              ? t.title.trim().slice(0, 24)
              : String(i + 1),
          body: typeof t.body === 'string' ? t.body : '',
        }));
        const activeId = tabs.some(t => t.id === parsed.activeId) ? parsed.activeId! : tabs[0]!.id;
        return { tabs, activeId };
      }
    } catch {
      /* fall through to single-tab */
    }
  }
  const tab = createNoteTab(1, raw);
  return { tabs: [tab], activeId: tab.id };
}

export function storedNoteToEditableHtml(stored: string): string {
  if (!stored.trim()) return '<div><br></div>';
  // Multitab envelopes contain HTML inside JSON — never sanitize the whole envelope.
  if (stored.startsWith(NOTE_TABS_MARKER)) {
    const { tabs, activeId } = parseNoteTabs(stored);
    const body = tabs.find(t => t.id === activeId)?.body ?? tabs[0]?.body ?? '';
    return storedNoteToEditableHtml(body);
  }
  if (looksLikeHtml(stored)) return sanitizeNoteHtml(stored);
  return noteTextToEditableHtml(stored);
}

/** Serialize tabs. Single-tab notes stay plain/HTML for backward compatibility. */
export function serializeNoteTabs(state: NoteTabsState): string {
  const tabs = state.tabs.slice(0, NOTE_TABS_MAX);
  if (tabs.length === 0) return '';
  if (tabs.length === 1) return tabs[0]!.body;
  const activeId = tabs.some(t => t.id === state.activeId) ? state.activeId : tabs[0]!.id;
  return (
    NOTE_TABS_MARKER +
    JSON.stringify({
      v: 1,
      tabs,
      activeId,
    })
  );
}

export function isNoteBodyEmpty(body: string): boolean {
  if (!body.trim()) return true;
  return !body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

export function isStoredNoteEmpty(stored: string): boolean {
  return parseNoteTabs(stored).tabs.every(t => isNoteBodyEmpty(t.body));
}

/** Persist editor HTML string as sanitized note body. */
export function htmlStringToStoredNote(html: string): string {
  const cleaned = sanitizeNoteHtml(html);
  if (isNoteBodyEmpty(cleaned)) return '';
  return cleaned;
}

/** Persist editor DOM as sanitized HTML (keeps bold + font sizes + line breaks). */
export function editableHtmlToStoredNote(root: HTMLElement): string {
  return htmlStringToStoredNote(root.innerHTML);
}

/** @deprecated Prefer editableHtmlToStoredNote — kept for plain-text extraction. */
export function editableHtmlToNoteText(root: HTMLElement): string {
  if (root.children.length === 0) {
    return (root.textContent ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'BR') return '\n';
    if (tag === 'STRONG' || tag === 'B') {
      const inner = Array.from(el.childNodes).map(walk).join('');
      const trimmed = inner.trim();
      if (!trimmed) return inner;
      if (!inner.includes('\n')) return `**${trimmed}**`;
      return inner;
    }
    const inner = Array.from(el.childNodes).map(walk).join('');
    if (BLOCK_TAGS.has(tag)) {
      if (!inner) return '\n';
      return inner.endsWith('\n') ? inner : `${inner}\n`;
    }
    return inner;
  }

  let text = Array.from(root.childNodes).map(walk).join('');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return text.replace(/\n$/, '');
}
