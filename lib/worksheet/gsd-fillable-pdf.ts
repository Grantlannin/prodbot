import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

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

function drawCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  color = INK
) {
  const w = font.widthOfTextAtSize(text, size);
  drawText(page, font, text, (PAGE_W - w) / 2, y, size, color);
}

function drawEmptyCheckBox(page: PDFPage, x: number, y: number, size: number) {
  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    borderWidth: 1.5,
    borderColor: INK,
    color: rgb(1, 1, 1),
  });
}

/** Blank printable PDF template — no answers, ready to print and fill by hand. */
export async function buildGsdWorksheetPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_H - MARGIN;

  drawCentered(page, fontBold, 'DAYWINNER BOT', y - 8, 10, ACCENT);
  y -= 30;
  drawCentered(page, fontBold, '7-Day Get Sh*t Done Challenge', y, 22, INK);
  y -= 18;
  drawCentered(page, font, 'printable worksheet', y, 11, MUTED);
  y -= 28;

  drawText(page, fontBold, 'NAME:', MARGIN, y, 8, MUTED);
  drawText(page, fontBold, 'START DATE:', MARGIN + 360, y, 8, MUTED);
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 300, y },
    thickness: 1.25,
    color: INK,
  });
  page.drawLine({
    start: { x: MARGIN + 360, y },
    end: { x: MARGIN + 540, y },
    thickness: 1.25,
    color: INK,
  });
  y -= 22;

  drawCentered(page, font, "What we're tracking: 4 metrics, phone hours.", y, 9, MUTED);
  y -= 16;

  const tableX = MARGIN;
  const tableTop = y;
  const tableW = PAGE_W - MARGIN * 2;
  const dayW = 40;
  const phoneW = 78;
  const checkW = (tableW - dayW - phoneW) / 4;
  const headerH = 58;
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
    ['Did i move forward &', 'make uncertain decisions', 'while i went?'],
    ['Did i screenshot my', 'social media time', 'on my phone? (Y/N)'],
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
    const size = i === 0 ? 9 : 8;
    const lineGap = 11;
    const blockH = (lines.length - 1) * lineGap;
    const startY = y - (headerH - blockH) / 2 - 2;
    lines.forEach((line, lineIdx) => {
      const textW = fontBold.widthOfTextAtSize(line, size);
      drawText(
        page,
        fontBold,
        line,
        headerCenters[i] - textW / 2,
        startY - lineIdx * lineGap,
        size,
        rgb(1, 1, 1)
      );
    });
  });
  y -= headerH;

  for (const day of DAYS) {
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

    for (let i = 0; i < 4; i++) {
      const boxSize = 16;
      const cx = colXs[i + 1] + checkW / 2 - boxSize / 2;
      const cy = rowBottom + (rowH - boxSize) / 2;
      drawEmptyCheckBox(page, cx, cy, boxSize);
    }

    page.drawLine({
      start: { x: colXs[5] + 10, y: rowBottom + 12 },
      end: { x: colXs[5] + phoneW - 10, y: rowBottom + 12 },
      thickness: 0.75,
      color: RULE,
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

  y -= 36;
  const scoreLabel = 'Final score';
  const scoreLabelSize = 14;
  const scoreLabelW = fontBold.widthOfTextAtSize(scoreLabel, scoreLabelSize);
  const scoreLabelX = (PAGE_W - scoreLabelW) / 2;
  drawText(page, fontBold, scoreLabel, scoreLabelX, y, scoreLabelSize, INK);

  // Align the "8" in "/ 28" under the "e" in "score"
  const beforeE = fontBold.widthOfTextAtSize('Final scor', scoreLabelSize);
  const eW = fontBold.widthOfTextAtSize('e', scoreLabelSize);
  const eCenterX = scoreLabelX + beforeE + eW / 2;

  y -= 32;
  const slash = '/ 28';
  const slashSize = 28;
  const eightW = fontBold.widthOfTextAtSize('8', slashSize);
  const slashW = fontBold.widthOfTextAtSize(slash, slashSize);
  const slashX = eCenterX - (slashW - eightW / 2);
  drawText(page, fontBold, slash, slashX, y, slashSize, INK);

  y -= 22;
  drawCentered(page, font, '(every box counts as 1 point)', y, 10, MUTED);
  y -= 24;
  drawCentered(
    page,
    fontBold,
    '"if you don\'t honestly track it, you can\'t honestly change it"',
    y,
    11,
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
