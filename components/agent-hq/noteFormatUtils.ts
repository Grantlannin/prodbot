function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function noteTextToEditableHtml(text: string): string {
  if (!text) return '<div><br></div>';

  return text
    .split('\n')
    .map(line => {
      const bold = line.match(/^\*\*(.+)\*\*$/);
      if (bold) return `<div><strong>${escapeHtml(bold[1])}</strong></div>`;
      return `<div>${escapeHtml(line) || '<br>'}</div>`;
    })
    .join('');
}

export function editableHtmlToNoteText(root: HTMLElement): string {
  const lines: string[] = [];

  if (root.children.length === 0) {
    return root.textContent ?? '';
  }

  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const text = child.textContent ?? '';
    const strong = child.querySelector('strong, b');
    const isBoldOnly =
      strong &&
      text.trim() === (strong.textContent ?? '').trim() &&
      child.textContent === strong.textContent;

    if (isBoldOnly && text.trim()) {
      lines.push(`**${text.trim()}**`);
    } else {
      lines.push(text);
    }
  }

  return lines.join('\n');
}
