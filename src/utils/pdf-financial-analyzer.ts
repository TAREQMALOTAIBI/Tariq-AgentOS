import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFParse } from 'pdf-parse';
import { createWorker, type Worker } from 'tesseract.js';

export interface PdfRowCell {
  text: string;
  x: number;
}

export interface PdfVisualRow {
  page: number;
  y: number;
  cells: PdfRowCell[];
  lineText: string;
}

export interface ExtractedPdfContent {
  text: string;
  pages: number;
  pagesScanned: number;
  totalChars: number;
  pagesWithSubstantialText: number;
  isLikelyScanned: boolean;
  hasPuaEncoding?: boolean;
  usedOcr?: boolean;
  rows: PdfVisualRow[];
  sampleExcerpt: string;
}

export interface MatchedFinancialLineItem {
  key: string;
  labelAr: string;
  rawLabel: string;
  currentValue?: number;
  previousValue?: number;
  page: number;
}

export interface ParsedFinancialDocument {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  pagesScanned: number;
  totalChars: number;
  isLikelyScanned: boolean;
  rawText: string;
  sampleExcerpt: string;
  isFinancialStatement: boolean;
  isInvoice: boolean;
  companyName: string;
  period: string;
  currentYearLabel?: string;
  previousYearLabel?: string;
  currency: string;
  unitMultiplier: number;
  unitLabel: string;

  // Income Statement (Current & Comparative Previous)
  revenue?: number;
  prevRevenue?: number;
  costOfRevenue?: number;
  prevCostOfRevenue?: number;
  grossProfit?: number;
  prevGrossProfit?: number;
  operatingExpenses?: number;
  operatingProfit?: number;
  prevOperatingProfit?: number;
  netProfit?: number;
  prevNetProfit?: number;
  zakatAndTax?: number;

  // Balance Sheet
  totalAssets?: number;
  prevTotalAssets?: number;
  currentAssets?: number;
  prevCurrentAssets?: number;
  cashAndEquivalents?: number;
  prevCashAndEquivalents?: number;
  totalLiabilities?: number;
  prevTotalLiabilities?: number;
  currentLiabilities?: number;
  prevCurrentLiabilities?: number;
  totalEquity?: number;
  prevTotalEquity?: number;

  // Cash Flow
  operatingCashFlow?: number;
  prevOperatingCashFlow?: number;

  // All matched lines & raw numeric table rows for transparency
  matchedLineItems: MatchedFinancialLineItem[];
  extraNumericRows: Array<{ label: string; values: number[]; page: number }>;

  // Invoice specific
  invoiceNumber?: string;
  vatAmount?: number;
  merchantName?: string;
}

export interface FinancialRatios {
  grossMarginPct?: number;
  operatingMarginPct?: number;
  netMarginPct?: number;
  currentRatio?: number;
  debtToEquity?: number;
  debtToAssetsPct?: number;
  roePct?: number;
  roaPct?: number;
  revenueGrowthPct?: number;
  netProfitGrowthPct?: number;
}

/**
 * Normalizes Arabic text extracted from PDFs:
 * - NFKC converts Presentation Forms (\uFE70-\uFEFF, \uFB50-\uFDFF) to standard Arabic
 * - Strips tatweel & diacritics
 * - Collapses artificially spaced-out Arabic letters (e.g. "ا ل إ ي ر ا د ا ت" -> "الإيرادات")
 * - Repairs visually reversed RTL Arabic chunks if detected
 */
export function normalizePdfArabicText(input: string): string {
  if (!input) return '';

  // 1. Canonical NFKC normalization converts Arabic Presentation Forms into standard letters
  let text = input.normalize('NFKC');

  // 2. Remove tatweel and diacritics / zero-width chars
  text = text
    .replace(/[\u0640\u064B-\u065F\u0670\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');

  // 3. Repair spaced-out Arabic words like "ا ل ر ب ح" -> "الربح" (3+ single Arabic chars separated by space)
  text = text.replace(
    /(?:^|(?<=\s))([\u0621-\u064A](?:\s+[\u0621-\u064A]){2,})(?=\s|$)/g,
    (match) => match.replace(/\s+/g, '')
  );

  return text;
}

/**
 * Detects if Arabic runs in a document are stored in reversed visual LTR order
 * and reverses Arabic runs when needed.
 */
function repairReversedArabicIfNeeded(text: string): string {
  const reversedMarkers = [
    'ةكرش',
    'ةيلاملا',
    'مئاوقلا',
    'تاداريإ',
    'حبرلا',
    'يفاص',
    'لوصألا',
    'موصخلا',
    'قوقح',
    'تاعيبملا',
    'لامجإ',
    'ةنسلل',
    'دقنلا',
    'تاجاتنتسا',
    'بساحم',
    'نايب',
  ];
  const forwardMarkers = [
    'شركة',
    'المالية',
    'القوائم',
    'إيرادات',
    'الإيرادات',
    'الربح',
    'صافي',
    'الأصول',
    'الخصوم',
    'حقوق',
    'المبيعات',
    'إجمالي',
    'للسنة',
    'النقد',
    'الالتزامات',
    'بيان',
  ];

  let revHits = 0;
  let fwdHits = 0;
  for (const w of reversedMarkers) {
    if (text.includes(w)) revHits++;
  }
  for (const w of forwardMarkers) {
    if (text.includes(w)) fwdHits++;
  }

  if (revHits > fwdHits && revHits >= 2) {
    // Reverse contiguous Arabic word/character runs while preserving numbers and Latin words
    return text.replace(/[\u0621-\u064A\s]{3,}/g, (segment) => {
      const trimmed = segment.trim();
      if (!/[\u0621-\u064A]/.test(trimmed)) return segment;
      const leading = segment.match(/^\s*/)?.[0] || '';
      const trailing = segment.match(/\s*$/)?.[0] || '';
      const reversed = trimmed.split('').reverse().join('');
      return leading + reversed + trailing;
    });
  }

  return text;
}

/**
 * Normalizes Arabic letters for flexible matching (unifies Alef/Taa Marbuta/Yaa)
 */
function normalizeForMatch(str: string): string {
  return str
    .normalize('NFKC')
    .replace(/[\u0640\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

let cachedOcrWorkerPromise: Promise<Worker> | null = null;

async function getCachedOcrWorker(): Promise<Worker> {
  if (!cachedOcrWorkerPromise) {
    fs.mkdirSync('/tmp/tessdata', { recursive: true });
    cachedOcrWorkerPromise = createWorker(['ara', 'eng'], 1, {
      cachePath: '/tmp/tessdata',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
    }).catch((err) => {
      cachedOcrWorkerPromise = null;
      throw err;
    });
  }
  return cachedOcrWorkerPromise;
}

export function stripPuaGlyphs(text: string): string {
  return text
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function cleanOcrText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/Cunent/gi, 'Current')
    .replace(/Liabilitles/gi, 'Liabilities')
    .replace(/Totai/gi, 'Total')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function runFastOcrOnCandidatePages(
  buffer: Buffer,
  pageNumbers: number[],
  totalPages: number
): Promise<{ rows: PdfVisualRow[]; text: string; pagesOcred: number } | null> {
  const uniquePages = Array.from(new Set(pageNumbers.filter((p) => p >= 1 && p <= totalPages))).slice(0, 6);
  if (uniquePages.length === 0) return null;

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const startMs = Date.now();

    const screenshotResult = await Promise.race([
      parser.getScreenshot({ partial: uniquePages, scale: 1.8, imageBuffer: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Screenshot timeout')), 7000)),
    ]);

    const worker = await Promise.race([
      getCachedOcrWorker(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('OCR worker init timeout')), 12000)),
    ]);

    const ocrRows: PdfVisualRow[] = [];
    const ocrTexts: string[] = [];

    for (const pageShot of screenshotResult.pages || []) {
      if (Date.now() - startMs > 18000) break;
      if (!pageShot?.data || pageShot.data.length === 0) continue;

      const res = await worker.recognize(Buffer.from(pageShot.data));
      const cleanedPageText = cleanOcrText(res?.data?.text || '');
      if (!cleanedPageText) continue;

      ocrTexts.push(cleanedPageText);
      const lines = cleanedPageText.split('\n');
      lines.forEach((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return;
        ocrRows.push({
          page: pageShot.pageNumber,
          y: 800 - idx * 14,
          cells: [{ text: line, x: 50 }],
          lineText: line,
        });
      });
    }

    if (ocrRows.length === 0) return null;
    return {
      rows: ocrRows,
      text: ocrTexts.join('\n'),
      pagesOcred: ocrTexts.length,
    };
  } catch (err) {
    console.warn('OCR fallback error:', err);
    return null;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

/**
 * Extracts coordinate-aware visual rows and normalized text from a PDF Buffer using pdfjs-dist,
 * with automatic fast Tesseract OCR fallback when PDF uses Private-Use-Area fonts or scanned images.
 */
export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  maxPages: number = 35
): Promise<ExtractedPdfContent> {
  let doc: any = null;
  try {
    const uint8 = new Uint8Array(buffer);
    const cMapUrl = path.join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/');
    const standardFontDataUrl = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');

    const loadingTask = pdfjs.getDocument({
      data: uint8,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      verbosity: 0,
      useSystemFonts: true,
    } as any);

    doc = await Promise.race([
      loadingTask.promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('PDF load timeout')), 4500)),
    ]);

    const numPages: number = doc.numPages || 1;
    const limitPages = Math.min(numPages, maxPages);
    const allRows: PdfVisualRow[] = [];
    const pageTexts: string[] = [];
    const pageStats: Array<{ page: number; puaChars: number; readableChars: number; tableHintScore: number }> = [];
    let pagesWithSubstantialText = 0;
    let totalPuaChars = 0;
    let totalReadableChars = 0;
    const startMs = Date.now();

    for (let pageNum = 1; pageNum <= limitPages; pageNum++) {
      if (Date.now() - startMs > 5500) break;

      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent({
        disableNormalization: false,
      });

      const items = (textContent.items || []).filter(
        (it: any) => typeof it?.str === 'string' && it.str.length > 0
      );

      // Group items into visual rows by Y coordinate (within 3.5pt)
      const rawRowGroups: Array<{ y: number; items: Array<{ x: number; w: number; str: string }> }> = [];
      for (const item of items) {
        const tm = item.transform || [1, 0, 0, 1, 0, 0];
        const x = Number(tm[4]) || 0;
        const y = Number(tm[5]) || 0;
        const w = Number(item.width) || 0;
        const str = item.str as string;

        let targetGroup = rawRowGroups.find((g) => Math.abs(g.y - y) <= 3.5);
        if (!targetGroup) {
          targetGroup = { y, items: [] };
          rawRowGroups.push(targetGroup);
        }
        targetGroup.items.push({ x, w, str });
      }

      rawRowGroups.sort((a, b) => b.y - a.y);

      const pageLines: string[] = [];
      for (const grp of rawRowGroups) {
        grp.items.sort((a, b) => a.x - b.x);

        const cells: PdfRowCell[] = [];
        let curCellText = '';
        let curCellX = grp.items[0]?.x ?? 0;
        let prevEnd = grp.items[0]?.x ?? 0;

        for (let i = 0; i < grp.items.length; i++) {
          const it = grp.items[i];
          const gap = it.x - prevEnd;
          if (i > 0 && gap > 8) {
            const cleanCell = normalizePdfArabicText(curCellText).trim();
            if (cleanCell) {
              cells.push({ text: cleanCell, x: curCellX });
            }
            curCellText = it.str;
            curCellX = it.x;
          } else {
            if (i > 0 && gap > 1.5 && !curCellText.endsWith(' ') && !it.str.startsWith(' ')) {
              curCellText += ' ';
            }
            curCellText += it.str;
          }
          prevEnd = it.x + it.w;
        }
        const lastClean = normalizePdfArabicText(curCellText).trim();
        if (lastClean) {
          cells.push({ text: lastClean, x: curCellX });
        }

        if (cells.length > 0) {
          const lineText = cells.map((c) => c.text).join(' | ');
          allRows.push({
            page: pageNum,
            y: grp.y,
            cells,
            lineText,
          });
          pageLines.push(lineText);
        }
      }

      const pageCombined = pageLines.join('\n');
      const puaMatches = pageCombined.match(/[\uE000-\uF8FF]/g) || [];
      const readableStr = stripPuaGlyphs(pageCombined).replace(/[\s|().,\-\/\\:]/g, '');
      const tableCommaHints = (pageCombined.match(/[,،][\uE000-\uF8FF\d٠-٩]{3}/g) || []).length;
      const parenHints = (pageCombined.match(/\([\uE000-\uF8FF\d٠-٩,]+\)/g) || []).length;

      totalPuaChars += puaMatches.length;
      totalReadableChars += readableStr.length;
      pageStats.push({
        page: pageNum,
        puaChars: puaMatches.length,
        readableChars: readableStr.length,
        tableHintScore: tableCommaHints * 2 + parenHints,
      });

      pageTexts.push(pageCombined);
      if (readableStr.length > 80) {
        pagesWithSubstantialText++;
      }
    }

    await doc.destroy().catch(() => {});
    doc = null;

    let combinedText = pageTexts.join('\n');
    combinedText = repairReversedArabicIfNeeded(combinedText);

    if (combinedText !== pageTexts.join('\n')) {
      for (const row of allRows) {
        for (const cell of row.cells) {
          cell.text = repairReversedArabicIfNeeded(cell.text);
        }
        row.lineText = row.cells.map((c) => c.text).join(' | ');
      }
    }

    const hasPuaEncoding = totalPuaChars >= 25 && totalPuaChars > totalReadableChars * 0.2;
    const isLikelyScanned =
      !hasPuaEncoding &&
      (totalReadableChars < 280 || (numPages >= 4 && pagesWithSubstantialText <= 1 && totalReadableChars < 800));

    // If PDF uses Private-Use-Area font glyphs (\uE0xx) OR is scanned images, run fast targeted OCR!
    if (hasPuaEncoding || isLikelyScanned) {
      const scoredPages = [...pageStats]
        .filter((s) => s.page >= 2)
        .map((s) => ({
          ...s,
          priorityScore:
            s.tableHintScore +
            (s.page >= 2 && s.page <= 10 && s.tableHintScore > 0 ? 25 : 0),
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore || b.puaChars - a.puaChars);

      const topFinancialPages = scoredPages.slice(0, 5).map((s) => s.page).sort((a, b) => a - b);
      const fallbackPages = [1, 3, 4, 5, 6, 7].filter((p) => p <= numPages);
      const candidatePages =
        topFinancialPages.length >= 2 && scoredPages[0].tableHintScore > 0
          ? [1, ...topFinancialPages]
          : fallbackPages;

      const ocrResult = await runFastOcrOnCandidatePages(buffer, candidatePages, numPages);
      if (ocrResult && ocrResult.rows.length > 0) {
        const cleanReadableTotal = ocrResult.text.replace(/\s+/g, '').length;
        const cleanLines = ocrResult.text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 3);

        return {
          text: ocrResult.text,
          pages: numPages,
          pagesScanned: ocrResult.pagesOcred,
          totalChars: cleanReadableTotal,
          pagesWithSubstantialText: ocrResult.pagesOcred,
          isLikelyScanned: cleanReadableTotal < 150,
          hasPuaEncoding,
          usedOcr: true,
          rows: ocrResult.rows,
          sampleExcerpt: cleanLines.slice(0, 12).join('\n'),
        };
      }
    }

    // Clean any residual PUA characters so raw [E0A6] boxes never leak to the UI
    const sanitizedText = stripPuaGlyphs(combinedText);
    const nonEmptyLines = sanitizedText
      .split('\n')
      .map((l) => l.replace(/^[|\s]+|[|\s]+$/g, '').trim())
      .filter((l) => l.length > 4 && /[a-zA-Z\u0621-\u064A]/.test(l));

    return {
      text: sanitizedText,
      pages: numPages,
      pagesScanned: pageTexts.length,
      totalChars: totalReadableChars,
      pagesWithSubstantialText,
      isLikelyScanned: isLikelyScanned || hasPuaEncoding,
      hasPuaEncoding,
      usedOcr: false,
      rows: allRows.map((r) => ({
        ...r,
        lineText: stripPuaGlyphs(r.lineText),
        cells: r.cells.map((c) => ({ ...c, text: stripPuaGlyphs(c.text) })).filter((c) => c.text.length > 0),
      })),
      sampleExcerpt: nonEmptyLines.slice(0, 10).join('\n'),
    };
  } catch (err) {
    console.warn('PDF extraction error (falling back gracefully):', err);
    return {
      text: '',
      pages: 1,
      pagesScanned: 0,
      totalChars: 0,
      pagesWithSubstantialText: 0,
      isLikelyScanned: true,
      rows: [],
      sampleExcerpt: '',
    };
  } finally {
    if (doc && typeof doc.destroy === 'function') {
      await doc.destroy().catch(() => {});
    }
  }
}

/**
 * Converts a string token (Arabic or English digits, commas, parentheses for negative) into a number
 */
function parseNumericToken(token: string): number | undefined {
  if (!token) return undefined;
  let cleaned = token
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/٬/g, ',')
    .replace(/٫/g, '.')
    .replace(/\s+/g, '')
    .trim();

  // Check negative in parentheses: (123,456) or (123.45)
  let isNegative = false;
  if (/^\(.*\)$/.test(cleaned)) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith('-') || cleaned.endsWith('-')) {
    isNegative = true;
    cleaned = cleaned.replace(/-/g, '');
  }

  // Strip commas
  cleaned = cleaned.replace(/,/g, '');

  // Must look like a clean number
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;

  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;
  return isNegative ? -num : num;
}

/**
 * Extracts financial numbers from a visual row while filtering out note references and standalone years
 */
function extractAmountsFromRow(
  row: PdfVisualRow,
  labelCellIdx: number,
  currentYearX?: number,
  previousYearX?: number,
  singleCellCurrentFirst?: boolean
): { current?: number; previous?: number; allValues: number[] } {
  const candidates: Array<{ value: number; x: number; raw: string; hasCommaOrParen: boolean }> = [];
  const numRegex = /\(?\s*-?\s*[٠-٩\d]{1,3}(?:[,،٬][٠-٩\d]{3})*(?:[.\٫][٠-٩\d]+)?\s*-?\s*\)?|\(?\s*-?\s*[٠-٩\d]+(?:[.\٫][٠-٩\d]+)?\s*-?\s*\)?/g;

  const collectFromText = (text: string, baseX: number, useCharOffset: boolean) => {
    let m: RegExpExecArray | null;
    numRegex.lastIndex = 0;
    while ((m = numRegex.exec(text)) !== null) {
      const rawMatch = m[0];
      const val = parseNumericToken(rawMatch);
      if (val === undefined) continue;

      const trimmed = rawMatch.trim();
      const hasCommaOrParen = /[,،٬()]/.test(trimmed);

      // Skip standalone calendar years (2018-2030) unless it has commas/decimals
      if (!hasCommaOrParen && Number.isInteger(val) && val >= 2018 && val <= 2030) {
        continue;
      }
      // Skip 1435-1455 Hijri years
      if (!hasCommaOrParen && Number.isInteger(val) && val >= 1435 && val <= 1455) {
        continue;
      }

      candidates.push({
        value: val,
        x: useCharOffset ? baseX + m.index * 5 : baseX,
        raw: trimmed,
        hasCommaOrParen,
      });
    }
  };

  for (let i = 0; i < row.cells.length; i++) {
    if (i === labelCellIdx) continue;
    const cell = row.cells[i];
    collectFromText(cell.text, cell.x, false);
  }

  // Also check inside the label cell itself if separate cells didn't yield amounts
  if (candidates.length === 0 && labelCellIdx >= 0 && row.cells[labelCellIdx]) {
    const labelCell = row.cells[labelCellIdx];
    collectFromText(labelCell.text, labelCell.x, true);
  }

  if (candidates.length === 0) {
    return { allValues: [] };
  }

  // Filter out likely "Note / إيضاح" reference integers (1..60 without commas/parens) when larger figures exist
  const hasLargeValues = candidates.some((c) => Math.abs(c.value) >= 100 || c.hasCommaOrParen);
  const filtered = hasLargeValues
    ? candidates.filter(
        (c) => c.hasCommaOrParen || Math.abs(c.value) >= 65 || !Number.isInteger(c.value)
      )
    : candidates;

  const finalCandidates = filtered.length > 0 ? filtered : candidates;
  const allValues = finalCandidates.map((c) => c.value);

  if (finalCandidates.length === 1) {
    return { current: finalCandidates[0].value, allValues };
  }

  // If we know the X-positions of Current Year and Previous Year from the table header, match by closest X!
  if (currentYearX !== undefined && previousYearX !== undefined && Math.abs(currentYearX - previousYearX) > 20) {
    let bestCur = finalCandidates[0];
    let bestPrev = finalCandidates[1];
    let minCurDist = Infinity;
    let minPrevDist = Infinity;

    for (const c of finalCandidates) {
      const dCur = Math.abs(c.x - currentYearX);
      const dPrev = Math.abs(c.x - previousYearX);
      if (dCur < minCurDist) {
        minCurDist = dCur;
        bestCur = c;
      }
      if (dPrev < minPrevDist) {
        minPrevDist = dPrev;
        bestPrev = c;
      }
    }

    if (bestCur !== bestPrev) {
      return {
        current: bestCur.value,
        previous: bestPrev.value,
        allValues,
      };
    }
  }

  // Single-cell rows (e.g. from OCR): use detected header year string order if available
  if (singleCellCurrentFirst !== undefined && row.cells.length === 1) {
    return singleCellCurrentFirst
      ? {
          current: finalCandidates[0].value,
          previous: finalCandidates[1].value,
          allValues,
        }
      : {
          current: finalCandidates[1].value,
          previous: finalCandidates[0].value,
          allValues,
        };
  }

  // Otherwise use RTL vs LTR table geometry:
  // If label cell is to the RIGHT of the numbers (RTL Arabic table), the rightmost number (closest to label) is Current Period, leftmost is Previous Period!
  const labelX = row.cells[labelCellIdx]?.x ?? 0;
  const numbersMostlyLeftOfLabel = finalCandidates.every((c) => c.x < labelX);

  const sortedByX = [...finalCandidates].sort((a, b) => a.x - b.x);
  if (numbersMostlyLeftOfLabel) {
    // RTL: rightmost number is Current, second-to-rightmost is Previous
    return {
      current: sortedByX[sortedByX.length - 1].value,
      previous: sortedByX[sortedByX.length - 2]?.value,
      allValues,
    };
  } else {
    // LTR: leftmost number is Current, next is Previous
    return {
      current: sortedByX[0].value,
      previous: sortedByX[1]?.value,
      allValues,
    };
  }
}

interface MetricDefinition {
  key: string;
  labelAr: string;
  patterns: string[];
  excludePatterns?: string[];
}

const FINANCIAL_METRICS_SCHEMA: MetricDefinition[] = [
  {
    key: 'revenue',
    labelAr: 'إجمالي الإيرادات / المبيعات',
    patterns: [
      'اجمالي الايرادات',
      'صافي الايرادات',
      'الايرادات',
      'ايرادات النشاط',
      'ايرادات العقود',
      'صافي المبيعات',
      'المبيعات',
      'اجمالي دخل العمليات',
      'دخل العمولات الخاصه',
      'revenues',
      'revenue',
      'net sales',
      'total revenue',
      'sales',
    ],
    excludePatterns: ['تكلفه', 'cost of', 'نمو', 'مقارنه', 'متوسط', 'نسبه'],
  },
  {
    key: 'costOfRevenue',
    labelAr: 'تكلفة الإيرادات / المبيعات',
    patterns: [
      'تكلفه الايرادات',
      'تكاليف الايرادات',
      'تكلفه المبيعات',
      'التكاليف المباشره',
      'cost of revenue',
      'cost of sales',
    ],
  },
  {
    key: 'grossProfit',
    labelAr: 'إجمالي / مجمل الربح',
    patterns: [
      'اجمالي الربح',
      'مجمل الربح',
      'اجمالي الدخل',
      'مجمل الدخل',
      'gross profit',
      'gross income',
    ],
    excludePatterns: ['الشامل', 'comprehensive', 'مصاريف', 'توزيع'],
  },
  {
    key: 'operatingExpenses',
    labelAr: 'المصاريف التشغيلية والعمومية',
    patterns: [
      'المصاريف التشغيليه',
      'المصروفات التشغيليه',
      'مصاريف عموميه واداريه',
      'مصروفات عموميه واداريه',
      'operating expenses',
      'general and administrative',
    ],
  },
  {
    key: 'operatingProfit',
    labelAr: 'الربح التشغيلي (EBIT)',
    patterns: [
      'الربح التشغيلي',
      'ربح العمليات',
      'الربح من العمليات',
      'دخل العمليات',
      'الدخل التشغيلي',
      'الارباح التشغيليه',
      'operating profit',
      'operating income',
      'profit from operations',
    ],
  },
  {
    key: 'zakatAndTax',
    labelAr: 'الزكاة وضريبة الدخل',
    patterns: ['الزكاه', 'مخصص الزكاه', 'الزكاه وضريبه الدخل', 'zakat', 'zakat and income tax'],
  },
  {
    key: 'netProfit',
    labelAr: 'صافي الربح / الدخل للفترة',
    patterns: [
      'صافي الربح للفتره',
      'صافي ربح الفتره',
      'صافي ربح السنه',
      'صافي الدخل للفتره',
      'صافي الدخل للسنه',
      'صافي الربح العائد',
      'صافي الربح',
      'صافي الدخل',
      'ربح الفتره',
      'ربح السنه',
      'صافي (الخساره) الربح',
      'صافي الخساره',
      'net profit for the period',
      'net profit for the year',
      'profit for the period',
      'profit for the year',
      'net profit',
      'net income',
    ],
    excludePatterns: ['قبل', 'before', 'الشامل', 'comprehensive', 'معدل', 'تشغيلي'],
  },
  {
    key: 'totalAssets',
    labelAr: 'إجمالي الأصول (الموجودات)',
    patterns: [
      'اجمالي الاصول',
      'مجموع الاصول',
      'اجمالي الموجودات',
      'مجموع الموجودات',
      'total assets',
    ],
    excludePatterns: ['غير المتداوله', 'المتداوله', 'non-current', 'current'],
  },
  {
    key: 'currentAssets',
    labelAr: 'إجمالي الأصول المتداولة',
    patterns: [
      'اجمالي الاصول المتداوله',
      'مجموع الاصول المتداوله',
      'الاصول المتداوله',
      'اجمالي الموجودات المتداوله',
      'الموجودات المتداوله',
      'total current assets',
      'current assets',
    ],
    excludePatterns: ['غير', 'non-current'],
  },
  {
    key: 'cashAndEquivalents',
    labelAr: 'النقد وما في حكمه',
    patterns: [
      'النقد وما في حكمه',
      'النقديه وما في حكمها',
      'نقد وما في حكمه',
      'النقد لدي البنوك',
      'ارصده لدي البنوك',
      'cash and cash equivalents',
      'cash and bank balances',
    ],
  },
  {
    key: 'totalLiabilities',
    labelAr: 'إجمالي الالتزامات (الخصوم)',
    patterns: [
      'اجمالي الالتزامات',
      'مجموع الالتزامات',
      'اجمالي المطلوبات',
      'مجموع المطلوبات',
      'اجمالي الخصوم',
      'total liabilities',
    ],
    excludePatterns: ['وحقوق', 'and equity', 'غير المتداوله', 'المتداوله', 'non-current', 'current'],
  },
  {
    key: 'currentLiabilities',
    labelAr: 'إجمالي الالتزامات المتداولة',
    patterns: [
      'اجمالي الالتزامات المتداوله',
      'مجموع الالتزامات المتداوله',
      'الالتزامات المتداوله',
      'اجمالي المطلوبات المتداوله',
      'المطلوبات المتداوله',
      'total current liabilities',
      'current liabilities',
    ],
    excludePatterns: ['غير', 'non-current'],
  },
  {
    key: 'totalEquity',
    labelAr: 'إجمالي حقوق الملكية / المساهمين',
    patterns: [
      'اجمالي حقوق الملكيه',
      'مجموع حقوق الملكيه',
      'اجمالي حقوق المساهمين',
      'مجموع حقوق المساهمين',
      'صافي حقوق الملكيه',
      'حقوق المساهمين',
      'حقوق الملكيه',
      'total equity',
      'total shareholders equity',
      "total shareholders' equity",
    ],
    excludePatterns: ['غير المسيطره', 'non-controlling', 'والالتزامات', 'and liabilities'],
  },
  {
    key: 'operatingCashFlow',
    labelAr: 'التدفق النقدي التشغيلي',
    patterns: [
      'صافي النقد الناتج من الانشطه التشغيليه',
      'صافي النقد المستخدم في الانشطه التشغيليه',
      'صافي التدفقات النقديه من الانشطه التشغيليه',
      'صافي النقد من الانشطه التشغيليه',
      'التدفقات النقديه من الانشطه التشغيليه',
      'net cash generated from operating activities',
      'net cash from operating activities',
    ],
  },
];

/**
 * Intelligently parses financial statement data or invoices from ExtractedPdfContent (or raw string)
 */
export function parseFinancialDocumentText(
  extractedOrText: ExtractedPdfContent | string,
  fileName: string,
  fileSizeBytes: number = 0,
  pageCountFallback: number = 1
): ParsedFinancialDocument {
  const extracted: ExtractedPdfContent =
    typeof extractedOrText === 'string'
      ? {
          text: normalizePdfArabicText(extractedOrText),
          pages: pageCountFallback,
          pagesScanned: pageCountFallback,
          totalChars: extractedOrText.replace(/\s+/g, '').length,
          pagesWithSubstantialText: 1,
          isLikelyScanned: extractedOrText.trim().length < 150,
          rows: normalizePdfArabicText(extractedOrText)
            .split('\n')
            .filter((l) => l.trim().length > 0)
            .map((line, idx) => ({
              page: 1,
              y: 800 - idx * 14,
              cells: [{ text: line.trim(), x: 50 }],
              lineText: line.trim(),
            })),
          sampleExcerpt: extractedOrText.slice(0, 600),
        }
      : extractedOrText;

  const rawText = extracted.text;
  const normalizedAll = normalizeForMatch(rawText);

  const isFinancialStatement =
    /قوائم\s*مالي|المركز\s*المالي|قائمة\s*الدخل|الربح\s*أو\s*الخسارة|الأرباح\s*والخسائر|الميزانية\s*العمومية|التدفقات\s*النقدية|تداول|financial\s*statement|balance\s*sheet|income\s*statement|financial\s*position|tadawul/i.test(
      rawText
    ) ||
    fileName.includes('قوائم') ||
    fileName.includes('مالي') ||
    fileName.includes('تداول');

  const isInvoice =
    /فاتورة|ضريبية|فاتورة\s*ضريبية|مورد|tax\s*invoice|receipt|invoice/i.test(rawText) &&
    !isFinancialStatement;

  // Unit Multiplier detection
  const isMillions =
    /بملايين\s*الريال|بالملايين|مليون\s*ريال|in\s*millions/i.test(rawText);
  const isThousands =
    !isMillions &&
    /بالآلاف|بآلاف\s*الريال|ألف\s*ريال|in\s*thousands|\(000\)/i.test(rawText);

  const unitMultiplier = isMillions ? 1_000_000 : isThousands ? 1000 : 1;
  const unitLabel = isMillions
    ? 'مليون ريال سعودي (الأرقام مضروبة × 1,000,000)'
    : isThousands
    ? 'ألف ريال سعودي (الأرقام مضروبة × 1,000)'
    : 'ريال سعودي';

  // Company Name Detection (excluding auditor firm names)
  const auditorStopWords = /كي بي ام جي|kpmg|pwc|برايس|إرنست|ernst|ديلويت|deloitte|بكر|مراجع|محاسبون قانونيون/i;
  let companyName = '';
  const candidateLines = extracted.rows.slice(0, 80);
  for (const row of candidateLines) {
    const line = row.lineText;
    if (auditorStopWords.test(line)) continue;
    const m = line.match(
      /(?:شركة|مجموعة|بنك|مصرف|مؤسسة)\s+([^\n\r|]{3,48})/i
    );
    if (m && m[0]) {
      const cleaned = m[0].replace(/\(.*?\)/g, '').trim();
      if (cleaned.length >= 6 && !/القوائم\s*المالية|المساهمة\s*العامة\s*فقط/.test(cleaned)) {
        companyName = cleaned;
        break;
      }
    }
    const enM = line.match(
      /([A-Za-z][A-Za-z0-9&\s.-]{2,44}\s(?:Company|Corp\.?|Corporation|Holding|Bank|Group|Industries|Limited|Ltd\.?|Co\.?|JSC))\b/i
    );
    if (enM && enM[1]) {
      companyName = enM[1].trim();
      break;
    }
  }
  if (!companyName) {
    const cleanFileName = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
    companyName = cleanFileName.length > 2 ? cleanFileName : 'المنشأة المالية';
  }

  // Detect years present in the PDF (e.g., 2025 & 2024)
  const yearMatches = Array.from(new Set(rawText.match(/\b202[0-9]\b/g) || []))
    .map(Number)
    .sort((a, b) => b - a);
  const currentYear = yearMatches[0];
  const previousYear = yearMatches[1];

  let period = '';
  const periodMatch = rawText.match(
    /(?:للسنة\s*المنتهية|للفترة\s*المنتهية|للعام\s*المالي|الربع\s*(?:الأول|الثاني|الثالث|الرابع))\s*(?:في)?\s*([^\n\r|]{3,40})/i
  );
  if (periodMatch) {
    period = periodMatch[0].trim();
  } else if (currentYear) {
    period = previousYear ? `السنة المالية ${currentYear} (مقارنة بـ ${previousYear})` : `السنة المالية ${currentYear}`;
  } else {
    period = 'الفترة المالية الواردة بالمستند';
  }

  // Row-by-row financial metric extraction with dynamic year column X-tracking per page
  const foundMetrics = new Map<string, MatchedFinancialLineItem>();
  const extraNumericRows: Array<{ label: string; values: number[]; page: number }> = [];

  let currentPageNum = -1;
  let pageCurrentYearX: number | undefined;
  let pagePrevYearX: number | undefined;
  let pageSingleCellCurrentFirst: boolean | undefined;

  for (const row of extracted.rows) {
    if (row.page !== currentPageNum) {
      currentPageNum = row.page;
      pageCurrentYearX = undefined;
      pagePrevYearX = undefined;
      pageSingleCellCurrentFirst = undefined;
    }

    // Check if this row is a table header containing both currentYear and previousYear
    if (currentYear && previousYear) {
      let curX: number | undefined;
      let prevX: number | undefined;
      for (const cell of row.cells) {
        if (cell.text.includes(String(currentYear)) && curX === undefined) {
          curX = cell.x;
        }
        if (cell.text.includes(String(previousYear)) && prevX === undefined) {
          prevX = cell.x;
        }
      }
      if (curX !== undefined && prevX !== undefined) {
        pageCurrentYearX = curX;
        pagePrevYearX = prevX;
      }

      if (row.cells.length === 1) {
        const line = row.cells[0].text;
        const idxCur = line.indexOf(String(currentYear));
        const idxPrev = line.indexOf(String(previousYear));
        if (idxCur !== -1 && idxPrev !== -1 && idxCur !== idxPrev) {
          pageSingleCellCurrentFirst = idxCur < idxPrev;
        }
      }
    }

    // Identify text cells on this row (cells containing Arabic or English words)
    let matchedInRow = false;
    for (let cellIdx = 0; cellIdx < row.cells.length; cellIdx++) {
      const cellText = row.cells[cellIdx].text;
      if (!/[a-zA-Z\u0621-\u064A]{3,}/.test(cellText)) continue;

      const normCell = normalizeForMatch(cellText);

      for (const schema of FINANCIAL_METRICS_SCHEMA) {
        if (foundMetrics.has(schema.key)) continue;

        if (schema.excludePatterns?.some((ex) => normCell.includes(ex))) {
          continue;
        }

        const isMatch = schema.patterns.some((pat) => {
          // Exact phrase containment, preferring reasonable label length (< 85 chars so we don't match narrative paragraphs)
          return normCell.includes(pat) && cellText.length < 95;
        });

        if (isMatch) {
          const extractedNums = extractAmountsFromRow(
            row,
            cellIdx,
            pageCurrentYearX,
            pagePrevYearX,
            pageSingleCellCurrentFirst
          );
          if (extractedNums.current !== undefined) {
            foundMetrics.set(schema.key, {
              key: schema.key,
              labelAr: schema.labelAr,
              rawLabel: cellText,
              currentValue: extractedNums.current * unitMultiplier,
              previousValue:
                extractedNums.previous !== undefined
                  ? extractedNums.previous * unitMultiplier
                  : undefined,
              page: row.page,
            });
            matchedInRow = true;
            break;
          }
        }
      }

      if (matchedInRow) break;
    }

    // Also store notable unlabeled numeric table rows as backup transparency
    if (!matchedInRow && extraNumericRows.length < 18) {
      const labelCell = row.cells.find((c) => /[a-zA-Z\u0621-\u064A]{4,}/.test(c.text) && c.text.length < 70);
      if (labelCell) {
        const labelIdx = row.cells.indexOf(labelCell);
        const nums = extractAmountsFromRow(row, labelIdx, pageCurrentYearX, pagePrevYearX, pageSingleCellCurrentFirst);
        if (nums.allValues.length >= 1 && nums.allValues.some((v) => Math.abs(v) >= 1000)) {
          extraNumericRows.push({
            label: labelCell.text,
            values: nums.allValues.map((v) => v * unitMultiplier),
            page: row.page,
          });
        }
      }
    }
  }

  // Also fallback regex pass across full text if a line item was split across consecutive lines
  if (foundMetrics.size === 0 && !extracted.isLikelyScanned && normalizedAll.length > 200) {
    for (let idx = 0; idx < extracted.rows.length - 1; idx++) {
      const row = extracted.rows[idx];
      const nextRow = extracted.rows[idx + 1];
      if (row.page !== nextRow.page) continue;

      const textOnly = row.cells.every((c) => !/\d{3,}/.test(c.text));
      const nextHasNumbers = nextRow.cells.some((c) => /\d{3,}/.test(c.text));
      if (!textOnly || !nextHasNumbers) continue;

      const normLine = normalizeForMatch(row.lineText);
      for (const schema of FINANCIAL_METRICS_SCHEMA) {
        if (foundMetrics.has(schema.key)) continue;
        if (schema.excludePatterns?.some((ex) => normLine.includes(ex))) continue;
        if (schema.patterns.some((pat) => normLine.includes(pat) && row.lineText.length < 90)) {
          const nums = extractAmountsFromRow(nextRow, -1);
          if (nums.current !== undefined) {
            foundMetrics.set(schema.key, {
              key: schema.key,
              labelAr: schema.labelAr,
              rawLabel: row.lineText,
              currentValue: nums.current * unitMultiplier,
              previousValue:
                nums.previous !== undefined ? nums.previous * unitMultiplier : undefined,
              page: row.page,
            });
          }
        }
      }
    }
  }

  const getCur = (k: string) => foundMetrics.get(k)?.currentValue;
  const getPrev = (k: string) => foundMetrics.get(k)?.previousValue;

  return {
    fileName,
    fileSizeBytes,
    pageCount: extracted.pages,
    pagesScanned: extracted.pagesScanned,
    totalChars: extracted.totalChars,
    isLikelyScanned: extracted.isLikelyScanned,
    rawText,
    sampleExcerpt: extracted.sampleExcerpt,
    isFinancialStatement,
    isInvoice,
    companyName,
    period,
    currentYearLabel: currentYear ? String(currentYear) : undefined,
    previousYearLabel: previousYear ? String(previousYear) : undefined,
    currency: 'SAR',
    unitMultiplier,
    unitLabel,
    revenue: getCur('revenue'),
    prevRevenue: getPrev('revenue'),
    costOfRevenue: getCur('costOfRevenue'),
    prevCostOfRevenue: getPrev('costOfRevenue'),
    grossProfit: getCur('grossProfit'),
    prevGrossProfit: getPrev('grossProfit'),
    operatingExpenses: getCur('operatingExpenses'),
    operatingProfit: getCur('operatingProfit'),
    prevOperatingProfit: getPrev('operatingProfit'),
    netProfit: getCur('netProfit'),
    prevNetProfit: getPrev('netProfit'),
    zakatAndTax: getCur('zakatAndTax'),
    totalAssets: getCur('totalAssets'),
    prevTotalAssets: getPrev('totalAssets'),
    currentAssets: getCur('currentAssets'),
    prevCurrentAssets: getPrev('currentAssets'),
    cashAndEquivalents: getCur('cashAndEquivalents'),
    prevCashAndEquivalents: getPrev('cashAndEquivalents'),
    totalLiabilities: getCur('totalLiabilities'),
    prevTotalLiabilities: getPrev('totalLiabilities'),
    currentLiabilities: getCur('currentLiabilities'),
    prevCurrentLiabilities: getPrev('currentLiabilities'),
    totalEquity: getCur('totalEquity'),
    prevTotalEquity: getPrev('totalEquity'),
    operatingCashFlow: getCur('operatingCashFlow'),
    prevOperatingCashFlow: getPrev('operatingCashFlow'),
    matchedLineItems: Array.from(foundMetrics.values()),
    extraNumericRows,
  };
}

/**
 * Calculates essential financial ratios & YoY growth ONLY from real extracted figures
 */
export function calculateFinancialRatios(doc: ParsedFinancialDocument): FinancialRatios {
  const ratios: FinancialRatios = {};

  if (doc.revenue && Math.abs(doc.revenue) > 0) {
    if (doc.grossProfit !== undefined) {
      ratios.grossMarginPct = (doc.grossProfit / doc.revenue) * 100;
    }
    if (doc.operatingProfit !== undefined) {
      ratios.operatingMarginPct = (doc.operatingProfit / doc.revenue) * 100;
    }
    if (doc.netProfit !== undefined) {
      ratios.netMarginPct = (doc.netProfit / doc.revenue) * 100;
    }
  }

  if (doc.currentAssets !== undefined && doc.currentLiabilities && doc.currentLiabilities > 0) {
    ratios.currentRatio = doc.currentAssets / doc.currentLiabilities;
  }

  if (doc.totalLiabilities !== undefined && doc.totalEquity && doc.totalEquity > 0) {
    ratios.debtToEquity = doc.totalLiabilities / doc.totalEquity;
  }

  if (doc.totalLiabilities !== undefined && doc.totalAssets && doc.totalAssets > 0) {
    ratios.debtToAssetsPct = (doc.totalLiabilities / doc.totalAssets) * 100;
  }

  if (doc.netProfit !== undefined && doc.totalEquity && doc.totalEquity > 0) {
    ratios.roePct = (doc.netProfit / doc.totalEquity) * 100;
  }

  if (doc.netProfit !== undefined && doc.totalAssets && doc.totalAssets > 0) {
    ratios.roaPct = (doc.netProfit / doc.totalAssets) * 100;
  }

  if (doc.revenue !== undefined && doc.prevRevenue && Math.abs(doc.prevRevenue) > 0) {
    ratios.revenueGrowthPct = ((doc.revenue - doc.prevRevenue) / Math.abs(doc.prevRevenue)) * 100;
  }

  if (doc.netProfit !== undefined && doc.prevNetProfit && Math.abs(doc.prevNetProfit) > 0) {
    ratios.netProfitGrowthPct =
      ((doc.netProfit - doc.prevNetProfit) / Math.abs(doc.prevNetProfit)) * 100;
  }

  return ratios;
}

function formatMoney(val: number): string {
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return val < 0 ? `(${formatted}) ر.س` : `${formatted} ر.س`;
}

function formatChangePct(cur?: number, prev?: number): string {
  if (cur === undefined || prev === undefined || prev === 0) return '—';
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const arrow = pct > 0 ? '📈 +' : pct < 0 ? '📉 ' : '➖ ';
  return `${arrow}${pct.toFixed(1)}%`;
}

/**
 * Generates an honest, strictly data-grounded financial report in Arabic.
 * NEVER fabricates placeholder judgments if numbers were not extracted.
 */
export function generateComprehensiveFinancialReport(
  doc: ParsedFinancialDocument,
  userPrompt?: string
): string {
  const sizeKb = (doc.fileSizeBytes / 1024).toFixed(1);
  const ratios = calculateFinancialRatios(doc);
  const hasMatchedFigures = doc.matchedLineItems.length >= 2;
  const hasExtraNumericRows = doc.extraNumericRows.length >= 2;

  // CASE 1: Scanned image-only PDF (no selectable text tables)
  if (!hasMatchedFigures && !hasExtraNumericRows && doc.isLikelyScanned) {
    return `⚠️ **ملاحظة فنية مهمة حول ملف PDF المرفق:**
📁 **الملف**: \`${doc.fileName}\` (${sizeKb} KB — عدد الصفحات: ${doc.pageCount} صفحة)
🔍 **نتيجة الفحص الفعلي للملف**:
تبيّن عند فحص البنية الداخلية للمستند أن صفحات القوائم المالية داخل هذا الملف **مصوّرة كصور ممسوحة ضوئياً (Scanned PDF)** وليست كنصوص وجداول رقمية قابلة للاستخراج الآلي المباشر (تم استخراج ${doc.totalChars} حرف نصي فقط من أصل ${doc.pagesScanned} صفحة).
${doc.sampleExcerpt ? `\n📝 **النصوص التي تم العثور عليها فعلياً بالملف:**\n\`${doc.sampleExcerpt.slice(0, 300)}\`\n` : ''}
---

### كيف تحصل على التحليل الدقيق والحقيقي لهذا الملف الآن؟
1. **إضافة مفتاح Gemini API (GEMINI_API_KEY)**: تتيح للمستشار المالي قراءة الصور والجداول المصوّرة بالذكاء الاصطناعي البصري (Vision OCR) بدقة 100%.
2. **أو رفع النسخة الرقمية الأصلية (Digital PDF)**: إذا قمت بتنزيل التقرير النصي مباشرة من بوابة تداول أو موقع الشركة بدلاً من النسخة الموقعة والمصورة، سيقرأ النظام كافة الأرقام فوراً.
3. **أو اكتب الأرقام الرئيسية هنا مباشرة** (مثلاً: الإيرادات، صافي الربح، إجمالي الأصول، الالتزامات، حقوق المساهمين) وسأقدم لك التقييم المالي والنسب والتوصيات فوراً بالأرقام الحقيقية.`;
  }

  // CASE 2: Digital PDF with real text, but line item labels differed from standard schema -> show real extracted rows!
  if (!hasMatchedFigures) {
    const rowsMarkdown = hasExtraNumericRows
      ? doc.extraNumericRows
          .slice(0, 12)
          .map(
            (r) =>
              `| ${r.label} | ${r.values.map((v) => formatMoney(v)).join(' / ')} | ص ${r.page} |`
          )
          .join('\n')
      : '';

    return `📄 **نتائج استخراج النصوص والأرقام من المستند المرفق**
📁 **الملف**: \`${doc.fileName}\` (${sizeKb} KB — ${doc.pageCount} صفحة)
🏢 **الجهة المكتشفة**: **${doc.companyName}**
📅 **الفترة**: **${doc.period}**

${rowsMarkdown ? `### 📊 البنود والأرقام المستخرجة فعلياً من جداول الملف:\n| البند كما ورد في الملف | القيم المستخرجة | الصفحة |\n| :--- | :--- | :--- |\n${rowsMarkdown}\n` : ''}
${doc.sampleExcerpt ? `### 📝 مقتطف من النص الحقيقي للمستند:\n${doc.sampleExcerpt.slice(0, 500)}\n` : ''}
---
💡 **ملاحظة**: لم تتطابق عناوين الصفوف تلقائياً مع قوالب قائمة الدخل والميزانية القياسية بالكامل. أخبرني بأي بند أو رقم من الجداول أعلاه تود التركيز عليه وسأحلله لك فوراً.`;
  }

  // CASE 3: Real financial metrics were extracted -> build a strict data-grounded analytical report
  const curCol = doc.currentYearLabel || 'الفترة الحالية';
  const prevCol = doc.previousYearLabel || 'الفترة المقارنة';

  const incomeKeys = ['revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses', 'operatingProfit', 'zakatAndTax', 'netProfit'];
  const incomeItems = doc.matchedLineItems.filter((item) => incomeKeys.includes(item.key));

  const balanceKeys = ['totalAssets', 'currentAssets', 'cashAndEquivalents', 'totalLiabilities', 'currentLiabilities', 'totalEquity', 'operatingCashFlow'];
  const balanceItems = doc.matchedLineItems.filter((item) => balanceKeys.includes(item.key));

  const buildRows = (items: MatchedFinancialLineItem[]) =>
    items
      .map((it) => {
        const curStr = it.currentValue !== undefined ? formatMoney(it.currentValue) : '—';
        const prevStr = it.previousValue !== undefined ? formatMoney(it.previousValue) : '—';
        const chgStr = formatChangePct(it.currentValue, it.previousValue);
        return `| **${it.labelAr}** | **${curStr}** | ${prevStr} | ${chgStr} |`;
      })
      .join('\n');

  const ratioLines: string[] = [];
  if (ratios.grossMarginPct !== undefined) {
    ratioLines.push(`- **هامش مجمل الربح**: **${ratios.grossMarginPct.toFixed(1)}%**`);
  }
  if (ratios.operatingMarginPct !== undefined) {
    ratioLines.push(`- **هامش الربح التشغيلي**: **${ratios.operatingMarginPct.toFixed(1)}%**`);
  }
  if (ratios.netMarginPct !== undefined) {
    const icon = ratios.netMarginPct >= 10 ? '🟢' : ratios.netMarginPct > 0 ? '🟡' : '🔴';
    ratioLines.push(`- ${icon} **هامش صافي الربح**: **${ratios.netMarginPct.toFixed(1)}%**`);
  }
  if (ratios.currentRatio !== undefined) {
    const icon = ratios.currentRatio >= 1.5 ? '🟢' : ratios.currentRatio >= 1.0 ? '🟡' : '🔴';
    ratioLines.push(`- ${icon} **نسبة التداول (السيولة قصيرة الأجل)**: **${ratios.currentRatio.toFixed(2)}x**`);
  }
  if (ratios.debtToEquity !== undefined) {
    const icon = ratios.debtToEquity <= 1.0 ? '🟢' : ratios.debtToEquity <= 2.0 ? '🟡' : '🔴';
    ratioLines.push(`- ${icon} **نسبة المديونية لحقوق الملكية**: **${ratios.debtToEquity.toFixed(2)}x**`);
  }
  if (ratios.roePct !== undefined) {
    ratioLines.push(`- **العائد على حقوق الملكية (ROE)**: **${ratios.roePct.toFixed(1)}%**`);
  }
  if (ratios.roaPct !== undefined) {
    ratioLines.push(`- **العائد على الأصول (ROA)**: **${ratios.roaPct.toFixed(1)}%**`);
  }

  // Honest data-backed insights
  const insights: string[] = [];
  if (doc.revenue !== undefined && doc.netProfit !== undefined) {
    if (doc.netProfit < 0) {
      insights.push(
        `🔴 **الربحية**: سجلت المنشأة **صافي خسارة** قدره ${formatMoney(doc.netProfit)} من إيرادات قدرها ${formatMoney(doc.revenue)}، ما يستدعي مراجعة هيكل التكاليف المباشرة والمصاريف التشغيلية فوراً.`
      );
    } else if (ratios.netMarginPct !== undefined) {
      insights.push(
        `🟢 **الربحية**: حققت المنشأة صافي ربح فعلي قدره **${formatMoney(doc.netProfit)}** من إيرادات **${formatMoney(doc.revenue)}** بهامش صافي ربح **${ratios.netMarginPct.toFixed(1)}%**.`
      );
    }
  }
  if (ratios.revenueGrowthPct !== undefined) {
    insights.push(
      ratios.revenueGrowthPct >= 0
        ? `📈 **نمو المبيعات**: ارتفعت الإيرادات بنسبة **+${ratios.revenueGrowthPct.toFixed(1)}%** مقارنة بالفترة السابقة.`
        : `📉 **تراجع المبيعات**: انخفضت الإيرادات بنسبة **${ratios.revenueGrowthPct.toFixed(1)}%** مقارنة بالفترة السابقة، وهي نقطة يجب التوقف عندها.`
    );
  }
  if (ratios.netProfitGrowthPct !== undefined) {
    insights.push(
      ratios.netProfitGrowthPct >= 0
        ? `📈 **نمو صافي الأرباح**: نما صافي الربح بنسبة **+${ratios.netProfitGrowthPct.toFixed(1)}%** على أساس سنوي.`
        : `📉 **ضغط على الأرباح**: تراجع صافي الربح بنسبة **${ratios.netProfitGrowthPct.toFixed(1)}%** مقارنة بالفترة السابقة.`
    );
  }
  if (ratios.currentRatio !== undefined) {
    insights.push(
      ratios.currentRatio >= 1.2
        ? `🟢 **السيولة**: نسبة التداول (**${ratios.currentRatio.toFixed(2)}x**) مريحة وتغطي الالتزامات قصيرة الأجل بأمان.`
        : ratios.currentRatio >= 1.0
        ? `🟡 **السيولة**: نسبة التداول (**${ratios.currentRatio.toFixed(2)}x**) متقاربة من حد التعادل وتحتاج مراقبة رأس المال العامل.`
        : `🔴 **تنبيه سيولة**: نسبة التداول (**${ratios.currentRatio.toFixed(2)}x**) أقل من 1.0x، مما يعني أن الالتزامات المتداولة تتجاوز الأصول المتداولة.`
    );
  }
  if (ratios.debtToEquity !== undefined) {
    insights.push(
      ratios.debtToEquity <= 1.2
        ? `🟢 **الملاءة المالية**: نسبة الالتزامات إلى حقوق الملكية (**${ratios.debtToEquity.toFixed(2)}x**) متوازنة وتمنح الشركة مرونة تمويلية.`
        : `🟡 **الرافعة المالية**: نسبة الالتزامات إلى حقوق الملكية (**${ratios.debtToEquity.toFixed(2)}x**) مرتفعة نسبياً وتتطلب متابعة أعباء التمويل.`
    );
  }

  let report = `📊 **التحليل المالي الفعلي المستخرج من القوائم المالية**
📁 **الملف**: \`${doc.fileName}\` (${sizeKb} KB — تم فحص ${doc.pagesScanned} من ${doc.pageCount} صفحة)
🏢 **المنشأة**: **${doc.companyName}**
📅 **الفترة**: **${doc.period}**
💱 **وحدة القياس**: ${doc.unitLabel}\n`;

  if (incomeItems.length > 0) {
    report += `\n### 1️⃣ قائمة الدخل (الأرقام الحقيقية المستخرجة)\n| البند المالي | ${curCol} | ${prevCol} | التغير |\n| :--- | :--- | :--- | :--- |\n${buildRows(incomeItems)}\n`;
  }

  if (balanceItems.length > 0) {
    report += `\n### 2️⃣ قائمة المركز المالي والتدفقات النقدية\n| البند المالي | ${curCol} | ${prevCol} | التغير |\n| :--- | :--- | :--- | :--- |\n${buildRows(balanceItems)}\n`;
  }

  if (ratioLines.length > 0) {
    report += `\n### 3️⃣ المؤشرات والنسب المالية المحسوبة فعلياً\n${ratioLines.join('\n')}\n`;
  }

  if (insights.length > 0) {
    report += `\n### 💡 التقييم المالي الصريح المبني على الأرقام:\n${insights.join('\n')}\n`;
  }

  if (userPrompt?.trim()) {
    report += `\n📌 يمكنك سؤالي الآن عن أي بند محدد من الأرقام أعلاه للتفصيل والمقارنة.`;
  }

  return report;
}

/**
 * Formats a focused opinion in response to "أريد رأيك" or follow-up questions
 */
export function generateFocusedFinancialOpinion(
  doc: ParsedFinancialDocument,
  userQuestion: string
): string {
  // Never fabricate an opinion if no real numbers were extracted
  if (doc.matchedLineItems.length < 2) {
    return generateComprehensiveFinancialReport(doc, userQuestion);
  }

  const ratios = calculateFinancialRatios(doc);
  const parts: string[] = [];

  parts.push(`📊 **التقييم المهني المباشر للقوائم المالية لـ (${doc.companyName}):**`);
  parts.push(`بناءً على الأرقام الفعلية المستخرجة من \`${doc.fileName}\` (${doc.period}):\n`);

  if (doc.revenue !== undefined || doc.netProfit !== undefined) {
    parts.push(`### 1️⃣ تقييم الأداء التشغيلي والربحية:`);
    if (doc.revenue !== undefined) {
      parts.push(
        `- **الإيرادات**: بلغت **${formatMoney(doc.revenue)}**` +
          (doc.prevRevenue !== undefined && ratios.revenueGrowthPct !== undefined
            ? ` (تغير سنوي: **${ratios.revenueGrowthPct >= 0 ? '+' : ''}${ratios.revenueGrowthPct.toFixed(1)}%** مقارنة بـ ${formatMoney(doc.prevRevenue)})`
            : '') +
          '.'
      );
    }
    if (doc.netProfit !== undefined) {
      parts.push(
        `- **صافي النتيجة**: حققت الشركة ${doc.netProfit >= 0 ? 'صافي ربح' : 'صافي خسارة'} قدره **${formatMoney(doc.netProfit)}**` +
          (ratios.netMarginPct !== undefined ? ` (هامش صافي ربح **${ratios.netMarginPct.toFixed(1)}%**)` : '') +
          (doc.prevNetProfit !== undefined && ratios.netProfitGrowthPct !== undefined
            ? `، بنمو قدره **${ratios.netProfitGrowthPct >= 0 ? '+' : ''}${ratios.netProfitGrowthPct.toFixed(1)}%** عن الفترة السابقة`
            : '') +
          '.'
      );
    }
  }

  if (doc.totalAssets !== undefined || doc.totalEquity !== undefined || ratios.currentRatio !== undefined) {
    parts.push(`\n### 2️⃣ تقييم المركز المالي والسيولة:`);
    if (doc.totalAssets !== undefined) {
      parts.push(`- **إجمالي الأصول**: **${formatMoney(doc.totalAssets)}**`);
    }
    if (doc.totalLiabilities !== undefined) {
      parts.push(`- **إجمالي الالتزامات**: **${formatMoney(doc.totalLiabilities)}**`);
    }
    if (doc.totalEquity !== undefined) {
      parts.push(`- **حقوق الملكية**: **${formatMoney(doc.totalEquity)}**`);
    }
    if (ratios.currentRatio !== undefined) {
      parts.push(
        `- **نسبة التداول**: **${ratios.currentRatio.toFixed(2)}x** — ${
          ratios.currentRatio >= 1.2
            ? 'سيولة صحية قادرة على تغطية الالتزامات القصيرة.'
            : 'تحتاج مراقبة لضمان عدم حدوث ضغط على رأس المال العامل.'
        }`
      );
    }
    if (ratios.debtToEquity !== undefined) {
      parts.push(`- **نسبة المديونية لحقوق الملكية**: **${ratios.debtToEquity.toFixed(2)}x**`);
    }
  }

  // Honest bottom-line verdict
  parts.push(`\n### 3️⃣ الخلاصة النهائية:`);
  if (doc.netProfit !== undefined && doc.netProfit < 0) {
    parts.push(
      `⚠️ الأداء المالي يعاني حالياً من **خسائر صافية (${formatMoney(doc.netProfit)})**، والأولوية القصوى هي ضبط التكاليف وتحسين هوامش التشغيل قبل أي توسع.`
    );
  } else if (ratios.netMarginPct !== undefined && ratios.netMarginPct >= 10 && (ratios.currentRatio ?? 1.2) >= 1.0) {
    parts.push(
      `✅ الأداء المالي **قوي وإيجابي** مدعوماً بهامش ربح صافٍ يبلغ **${ratios.netMarginPct.toFixed(1)}%**${
        ratios.roePct !== undefined ? ` وعائد على حقوق الملكية **${ratios.roePct.toFixed(1)}%**` : ''
      }.`
    );
  } else {
    parts.push(
      `⚖️ الأداء المالي **متوسط ومتوازن** بناءً على الأرقام المستخرجة أعلاه؛ ويُنصح بمراقبة نمو الإيرادات وكفاءة التكاليف لرفع هامش الربحية الصافي.`
    );
  }

  return parts.join('\n');
}
