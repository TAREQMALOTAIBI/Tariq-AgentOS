import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePdfArabicText,
  stripPuaGlyphs,
  parseFinancialDocumentText,
  calculateFinancialRatios,
  generateComprehensiveFinancialReport,
  type ExtractedPdfContent,
} from './pdf-financial-analyzer.ts';

test('normalizePdfArabicText repairs Presentation Forms and spaced letters', () => {
  const presentation = '\uFEDF\uFE9E\uFEE8\uFE8E\uFEAE\uFE94'; // Presentation forms
  assert.ok(normalizePdfArabicText(presentation).length > 0);
  const spaced = 'ا ل إ ي ر ا د ا ت';
  assert.equal(normalizePdfArabicText(spaced), 'الإيرادات');
});

test('stripPuaGlyphs removes Private-Use-Area unicode boxes without altering valid text', () => {
  const dirty = '\uE0A6\uE035\uE08B 31 ديسمبر 2025 | \uE01E \uE020 الإيرادات 1,500,000';
  const cleaned = stripPuaGlyphs(dirty);
  assert.equal(/[\uE000-\uF8FF]/.test(cleaned), false);
  assert.ok(cleaned.includes('31 ديسمبر 2025'));
  assert.ok(cleaned.includes('الإيرادات 1,500,000'));
});

test('parseFinancialDocumentText parses single-cell OCR rows following header year ordering', () => {
  const ocrText = [
    'AL-MARWA INDUSTRIAL CO.',
    'Consolidated Financial Statements',
    '2024 2025 Statement',
    'Revenues 4,200,000 5,500,000',
    'Net profit for the year 410,000 660,000',
    'Total assets 8,000,000 9,200,000',
    'Total equity 3,500,000 4,100,000',
  ].join('\n');

  const doc = parseFinancialDocumentText(ocrText, 'Financials.pdf', 102400, 5);
  assert.equal(doc.currentYearLabel, '2025');
  assert.equal(doc.previousYearLabel, '2024');
  // Since header lists "2024 2025", second column is 2025 (current) and first column is 2024 (previous)
  assert.equal(doc.revenue, 5_500_000);
  assert.equal(doc.prevRevenue, 4_200_000);
  assert.equal(doc.netProfit, 660_000);
  assert.equal(doc.prevNetProfit, 410_000);
});

test('parseFinancialDocumentText extracts RTL table figures accurately with thousands multiplier', () => {
  const simulatedRtlContent: ExtractedPdfContent = {
    text: 'شركة المروة الصناعية المساهمة\nالقوائم المالية للسنة المنتهية في 31 ديسمبر 2025\nجميع الأرقام بآلاف الريالات\n2024 2025 إيضاح البيان\n1,200,000 1,500,000 14 الإيرادات\n350,000 450,000 15 مجمل الربح\n150,000 225,000 صافي الربح للفترة\n2,100,000 2,500,000 إجمالي الأصول\n900,000 1,000,000 إجمالي الأصول المتداولة\n450,000 500,000 إجمالي الالتزامات المتداولة\n800,000 1,000,000 إجمالي الالتزامات\n1,300,000 1,500,000 إجمالي حقوق الملكية',
    pages: 10,
    pagesScanned: 10,
    totalChars: 650,
    pagesWithSubstantialText: 5,
    isLikelyScanned: false,
    sampleExcerpt: 'شركة المروة الصناعية المساهمة',
    rows: [
      { page: 1, y: 750, lineText: 'شركة المروة الصناعية المساهمة', cells: [{ text: 'شركة المروة الصناعية المساهمة', x: 350 }] },
      { page: 4, y: 700, lineText: 'جميع الأرقام بآلاف الريالات', cells: [{ text: 'جميع الأرقام بآلاف الريالات', x: 350 }] },
      {
        page: 5,
        y: 650,
        lineText: '2024 | 2025 | إيضاح | البيان',
        cells: [
          { text: '2024', x: 80 },
          { text: '2025', x: 180 },
          { text: 'إيضاح', x: 260 },
          { text: 'البيان', x: 400 },
        ],
      },
      {
        page: 5,
        y: 620,
        lineText: '1,200,000 | 1,500,000 | 14 | الإيرادات',
        cells: [
          { text: '1,200,000', x: 80 },
          { text: '1,500,000', x: 180 },
          { text: '14', x: 260 },
          { text: 'الإيرادات', x: 400 },
        ],
      },
      {
        page: 5,
        y: 590,
        lineText: '350,000 | 450,000 | 15 | مجمل الربح',
        cells: [
          { text: '350,000', x: 80 },
          { text: '450,000', x: 180 },
          { text: '15', x: 260 },
          { text: 'مجمل الربح', x: 400 },
        ],
      },
      {
        page: 5,
        y: 560,
        lineText: '150,000 | 225,000 | صافي الربح للفترة',
        cells: [
          { text: '150,000', x: 80 },
          { text: '225,000', x: 180 },
          { text: 'صافي الربح للفترة', x: 400 },
        ],
      },
      {
        page: 6,
        y: 600,
        lineText: '2024 | 2025 | البيان',
        cells: [
          { text: '2024', x: 80 },
          { text: '2025', x: 180 },
          { text: 'البيان', x: 400 },
        ],
      },
      {
        page: 6,
        y: 570,
        lineText: '2,100,000 | 2,500,000 | إجمالي الأصول',
        cells: [
          { text: '2,100,000', x: 80 },
          { text: '2,500,000', x: 180 },
          { text: 'إجمالي الأصول', x: 400 },
        ],
      },
      {
        page: 6,
        y: 540,
        lineText: '900,000 | 1,000,000 | إجمالي الأصول المتداولة',
        cells: [
          { text: '900,000', x: 80 },
          { text: '1,000,000', x: 180 },
          { text: 'إجمالي الأصول المتداولة', x: 400 },
        ],
      },
      {
        page: 6,
        y: 510,
        lineText: '450,000 | 500,000 | إجمالي الالتزامات المتداولة',
        cells: [
          { text: '450,000', x: 80 },
          { text: '500,000', x: 180 },
          { text: 'إجمالي الالتزامات المتداولة', x: 400 },
        ],
      },
      {
        page: 6,
        y: 480,
        lineText: '800,000 | 1,000,000 | إجمالي الالتزامات',
        cells: [
          { text: '800,000', x: 80 },
          { text: '1,000,000', x: 180 },
          { text: 'إجمالي الالتزامات', x: 400 },
        ],
      },
      {
        page: 6,
        y: 450,
        lineText: '1,300,000 | 1,500,000 | إجمالي حقوق الملكية',
        cells: [
          { text: '1,300,000', x: 80 },
          { text: '1,500,000', x: 180 },
          { text: 'إجمالي حقوق الملكية', x: 400 },
        ],
      },
    ],
  };

  const doc = parseFinancialDocumentText(simulatedRtlContent, 'القوائم المالية.pdf', 2873200);
  assert.equal(doc.companyName, 'شركة المروة الصناعية المساهمة');
  assert.equal(doc.unitMultiplier, 1000);
  assert.equal(doc.revenue, 1_500_000_000);
  assert.equal(doc.prevRevenue, 1_200_000_000);
  assert.equal(doc.netProfit, 225_000_000);
  assert.equal(doc.prevNetProfit, 150_000_000);
  assert.equal(doc.currentAssets, 1_000_000_000);
  assert.equal(doc.currentLiabilities, 500_000_000);

  const ratios = calculateFinancialRatios(doc);
  assert.equal(ratios.netMarginPct, 15);
  assert.equal(ratios.grossMarginPct, 30);
  assert.equal(ratios.currentRatio, 2);
  assert.equal(ratios.revenueGrowthPct, 25);
  assert.equal(ratios.netProfitGrowthPct, 50);

  const report = generateComprehensiveFinancialReport(doc);
  assert.ok(report.includes('شركة المروة الصناعية المساهمة'));
  assert.ok(report.includes('1,500,000,000 ر.س'));
  assert.ok(!report.includes('مدرجة بالقوائم'));
});

test('generateComprehensiveFinancialReport honestly flags scanned PDFs with zero fake boilerplate', () => {
  const scannedContent: ExtractedPdfContent = {
    text: '2025',
    pages: 29,
    pagesScanned: 29,
    totalChars: 4,
    pagesWithSubstantialText: 0,
    isLikelyScanned: true,
    sampleExcerpt: '2025',
    rows: [{ page: 1, y: 700, lineText: '2025', cells: [{ text: '2025', x: 100 }] }],
  };

  const doc = parseFinancialDocumentText(scannedContent, 'القوائم المالية.pdf', 2873200);
  const report = generateComprehensiveFinancialReport(doc);
  assert.ok(report.includes('Scanned PDF'));
  assert.ok(!report.includes('مدرجة بالقوائم'));
  assert.ok(!report.includes('إيجابي ومستقر'));
});
