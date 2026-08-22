import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type GsdWorksheetPdfInput = {
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
      phoneHours: string;
    }
  >;
};

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const CHECKS = [
  { key: 'teed' as const, label: 'Did I do the down flow & set up my #1 task?' },
  { key: 'tracked' as const, label: 'Do I have 2 hours of work tracked (minimum?)' },
  {
    key: 'uncertain' as const,
    label: 'Did i move forward & make uncertain decisions while i went',
  },
  {
    key: 'screenshot' as const,
    label: 'Did i screenshot my social media time on my phone (Y/N)',
  },
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

function drawCheckBox(
  page: PDFPage,
  fontBold: PDFFont,
  x: number,
  y: number,
  size: number,
  checked: boolean
) {
  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    borderWidth: 1.5,
    borderColor: checked ? ACCENT : INK,
    color: checked ? ACCENT : rgb(1, 1, 1),
  });
  if (checked) {
    const mark = 'X';
    const markSize = 11;
    const tw = fontBold.widthOfTextAtSize(mark, markSize);
    drawText(page, fontBold, mark, x + (size - tw) / 2, y + 3.5, markSize, rgb(1, 1, 1));
  }
}

/** Static printable PDF of the worksheet with current answers baked in. */
export async function buildGsdWorksheetPdf(data: GsdWorksheetPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_H - MARGIN;

  drawText(page, fontBold, 'DAYWINNER BOT', MARGIN, y - 10, 9, ACCENT);
  y -= 28;
  drawText(page, fontBold, '7-Day Get Sh*t Done Challenge', MARGIN, y, 22, INK);
  y -= 16;
  drawText(page, font, 'Printable checkbook — fill online, then download and print.', MARGIN, y, 9, MUTED);
  y -= 28;

  drawText(page, fontBold, 'NAME', MARGIN, y, 8, MUTED);
  drawText(page, fontBold, 'START DATE', MARGIN + 360, y, 8, MUTED);
  y -= 18;
  drawText(page, fontBold, data.name?.trim() || '________________________', MARGIN, y, 12, INK);
  drawText(
    page,
    font,
    data.startDate?.trim() || '____________',
    MARGIN + 360,
    y,
    12,
    INK
  );
  y -= 22;

  drawText(
    page,
    font,
    'The Simple Metrics We\'re Tracking Daily · 4 checks + Total Phone hours',
    MARGIN,
    y,
    8,
    MUTED
  );
  y -= 16;

  const tableX = MARGIN;
  const tableTop = y;
  const tableW = PAGE_W - MARGIN * 2;
  const dayW = 40;
  const phoneW = 78;
  const checkW = (tableW - dayW - phoneW) / 4;
  const headerH = 52;
  const rowH = 36;

  const colXs = [
    tableX,
    tableX + dayW,
    tableX + dayW + checkW,
    tableX + dayW + checkW * 2,
    tableX + dayW + checkW * 3,
    tableX + dayW + checkW * 4,
  ];

  page.drawRectangle({
    x: tableX,
    y: y - headerH,
    width: tableW,
    height: headerH,
    color: HEADER_BG,
  });

  const headerLines: string[][] = [
    ['Day'],
    ['Did I do the down flow', '& set up my #1 task?'],
    ['Do I have 2 hours of', 'work tracked', '(minimum?)'],
    ['Did i move forward &', 'make uncertain decisions', 'while i went'],
    ['Did i screenshot my', 'social media time', 'on my phone (Y/N)'],
    ['Total Phone', 'hours'],
  ];
  const headerCenters = [
    colXs[0] + dayW / 2,
    colXs[1] + checkW / 2,
    colXs[2] + checkW / 2,
    colXs[3] + checkW / 2,
    colXs[4] + checkW / 2,
    colXs[5] + phoneW / 2,
  ];
  headerLines.forEach((lines, i) => {
    const size = 6.5;
    lines.forEach((line, lineIdx) => {
      const textW = fontBold.widthOfTextAtSize(line, size);
      drawText(
        page,
        fontBold,
        line,
        headerCenters[i] - textW / 2,
        y - 16 - lineIdx * 10,
        size,
        rgb(1, 1, 1)
      );
    });
  });
  y -= headerH;

  let score = 0;

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
    const dayWText = fontBold.widthOfTextAtSize(dayLabel, 11);
    drawText(page, fontBold, dayLabel, colXs[0] + dayW / 2 - dayWText / 2, rowBottom + 13, 11, INK);

    CHECKS.forEach((check, i) => {
      const boxSize = 16;
      const cx = colXs[i + 1] + checkW / 2 - boxSize / 2;
      const cy = rowBottom + (rowH - boxSize) / 2;
      const on = row.checks[check.key];
      if (on) score += 1;
      drawCheckBox(page, fontBold, cx, cy, boxSize, on);
    });

    const phone = row.phoneHours?.trim() || '';
    if (phone) {
      const phoneSize = 10;
      const tw = font.widthOfTextAtSize(phone, phoneSize);
      drawText(
        page,
        font,
        phone,
        colXs[5] + phoneW / 2 - tw / 2,
        rowBottom + 13,
        phoneSize,
        INK
      );
    }

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
  drawText(page, fontBold, `Final score: ${score} / 28`, MARGIN, y, 12, INK);
  drawText(
    page,
    font,
    '4 checks x 7 days · Total Phone hours tracked separately · daywinner.bot/worksheet',
    MARGIN + 150,
    y,
    8,
    MUTED
  );
  y -= 18;
  drawText(
    page,
    fontBold,
    '"if you don\'t honestly track it, you can\'t honestly change it"',
    MARGIN,
    y,
    10,
    ACCENT
  );

  return pdfDoc.save();
}

export function worksheetPdfFilename() {
  return 'daywinner 7-day challenge worksheet.pdf';
}

/** Trigger a normal browser download into the Downloads folder. */
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
  }, 4000);
}
