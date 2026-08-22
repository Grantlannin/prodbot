import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type GsdFillablePdfInput = {
  name: string;
  startDate: string;
  days: Record<
    1 | 2 | 3 | 4 | 5 | 6 | 7,
    {
      checks: {
        teed: boolean;
        tracked: boolean;
        uncertain: boolean;
        screenshot: boolean;
      };
    }
  >;
};

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const CHECKS = [
  { key: 'teed' as const, label: 'Task teed up' },
  { key: 'tracked' as const, label: '2 hrs tracked' },
  { key: 'uncertain' as const, label: 'Uncertain decisions' },
  { key: 'screenshot' as const, label: 'Social screenshot' },
];

const PAGE_W = 792; // letter landscape
const PAGE_H = 612;
const MARGIN = 36;
const INK = rgb(0.04, 0.07, 0.13);
const MUTED = rgb(0.28, 0.33, 0.41);
const ACCENT = rgb(0.02, 0.47, 0.34);
const RULE = rgb(0.8, 0.84, 0.88);
const HEADER_BG = rgb(0.04, 0.07, 0.13);

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color = INK
) {
  page.drawText(text, { x, y, size, font, color });
}

/**
 * Build a fillable (AcroForm) PDF — checkboxes work in Adobe Reader / Preview.
 * Browser preview support varies.
 */
export async function buildGsdFillablePdf(data: GsdFillablePdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_H - MARGIN;

  drawText(page, fontBold, 'DAYWINNER BOT', MARGIN, y - 10, 9, ACCENT);
  y -= 28;
  drawText(page, fontBold, '7-Day Get Shit Done Challenge', MARGIN, y, 22, INK);
  y -= 16;
  drawText(
    page,
    font,
    'Four boxes a day. Click boxes in any PDF app that supports forms (Adobe, Preview, etc.).',
    MARGIN,
    y,
    9,
    MUTED
  );
  y -= 28;

  drawText(page, fontBold, 'NAME', MARGIN, y, 8, MUTED);
  drawText(page, fontBold, 'START DATE', MARGIN + 360, y, 8, MUTED);
  y -= 4;

  const nameField = form.createTextField('name');
  nameField.setText(data.name || '');
  nameField.addToPage(page, {
    x: MARGIN,
    y: y - 22,
    width: 330,
    height: 22,
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: rgb(1, 1, 1),
    textColor: INK,
    font: fontBold,
  });
  nameField.setFontSize(11);

  const dateField = form.createTextField('startDate');
  dateField.setText(data.startDate || '');
  dateField.addToPage(page, {
    x: MARGIN + 360,
    y: y - 22,
    width: 180,
    height: 22,
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: rgb(1, 1, 1),
    textColor: INK,
    font,
  });
  dateField.setFontSize(11);
  y -= 40;

  drawText(
    page,
    font,
    'Task teed up (wind-down) · 2 hrs tracked · Moved forward / uncertain decisions · Screenshot social media time (Y/N)',
    MARGIN,
    y,
    8,
    MUTED
  );
  y -= 18;

  const tableX = MARGIN;
  const tableTop = y;
  const tableW = PAGE_W - MARGIN * 2;
  const dayW = 56;
  const checkW = (tableW - dayW) / 4;
  const headerH = 28;
  const rowH = 40;

  const colXs = [
    tableX,
    tableX + dayW,
    tableX + dayW + checkW,
    tableX + dayW + checkW * 2,
    tableX + dayW + checkW * 3,
  ];

  page.drawRectangle({
    x: tableX,
    y: y - headerH,
    width: tableW,
    height: headerH,
    color: HEADER_BG,
  });

  const headers = ['Day', ...CHECKS.map(c => c.label)];
  const headerCenters = [
    colXs[0] + dayW / 2,
    colXs[1] + checkW / 2,
    colXs[2] + checkW / 2,
    colXs[3] + checkW / 2,
    colXs[4] + checkW / 2,
  ];
  headers.forEach((label, i) => {
    const size = i === 0 ? 9 : 8;
    const textW = fontBold.widthOfTextAtSize(label, size);
    drawText(
      page,
      fontBold,
      label,
      headerCenters[i] - textW / 2,
      y - 18,
      size,
      rgb(1, 1, 1)
    );
  });
  y -= headerH;

  for (const day of DAYS) {
    const row = data.days[day];
    const rowBottom = y - rowH;

    page.drawRectangle({
      x: tableX,
      y: rowBottom,
      width: tableW,
      height: rowH,
      borderColor: RULE,
      borderWidth: 0.75,
      color: day % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
    });

    for (let i = 1; i < colXs.length; i++) {
      page.drawLine({
        start: { x: colXs[i], y: rowBottom },
        end: { x: colXs[i], y: y },
        thickness: 0.5,
        color: RULE,
      });
    }

    const dayLabel = String(day);
    const dayWText = fontBold.widthOfTextAtSize(dayLabel, 12);
    drawText(page, fontBold, dayLabel, colXs[0] + dayW / 2 - dayWText / 2, rowBottom + 14, 12, INK);

    CHECKS.forEach((check, i) => {
      const boxSize = 18;
      const cx = colXs[i + 1] + checkW / 2 - boxSize / 2;
      const cy = rowBottom + (rowH - boxSize) / 2;
      const field = form.createCheckBox(`day${day}.${check.key}`);
      if (row.checks[check.key]) field.check();
      field.addToPage(page, {
        x: cx,
        y: cy,
        width: boxSize,
        height: boxSize,
        borderWidth: 1.5,
        borderColor: INK,
        backgroundColor: rgb(1, 1, 1),
      });
    });

    y = rowBottom;
  }

  page.drawRectangle({
    x: tableX,
    y: y,
    width: tableW,
    height: tableTop - y,
    borderColor: INK,
    borderWidth: 1.5,
  });

  y -= 28;
  drawText(page, fontBold, 'Final score: ____ / 28', MARGIN, y, 12, INK);
  drawText(page, font, '4 checks x 7 days · daywinner.bot/worksheet', MARGIN + 160, y, 8, MUTED);
  y -= 16;
  drawText(
    page,
    font,
    'Tip: Open this PDF in Adobe Acrobat, Preview, or another form-capable reader to click the boxes.',
    MARGIN,
    y,
    8,
    MUTED
  );

  form.updateFieldAppearances(font);
  return pdfDoc.save();
}

export function worksheetPdfFilename(name: string, stamp = new Date().toISOString().slice(0, 10)) {
  const who = name.trim().replace(/[^\w\-]+/g, '_').slice(0, 40);
  return who ? `daywinner-gsd-worksheet-${who}-${stamp}.pdf` : `daywinner-gsd-worksheet-${stamp}.pdf`;
}

type PdfSaveHandle = {
  createWritable: () => Promise<{
    write: (data: BufferSource) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

/** Call this first from a click handler so Chrome/Edge keep the user-gesture for the Save dialog. */
export async function openPdfSaveDialog(filename: string): Promise<PdfSaveHandle | null> {
  const w = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<PdfSaveHandle>;
  };

  if (typeof w.showSaveFilePicker !== 'function') return null;

  try {
    return await w.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'PDF',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
      throw err;
    }
    return null;
  }
}

export async function finishPdfSave(
  bytes: Uint8Array,
  filename: string,
  handle: PdfSaveHandle | null
): Promise<'picker' | 'download'> {
  const copy = new Uint8Array(bytes);
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(copy);
    await writable.close();
    return 'picker';
  }
  downloadBytes(copy, filename);
  return 'download';
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 2000);
}
