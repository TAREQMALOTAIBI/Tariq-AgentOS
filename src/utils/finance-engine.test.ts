import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNumbers,
  extractAmount,
  parseFinancialInput,
  calculateBudgetStatus,
  calculateCashFlowMetrics,
  generateApiKey,
  validateApiKey,
} from './finance-engine';

test('normalizeNumbers converts Eastern Arabic numerals to Western', () => {
  assert.equal(normalizeNumbers('١٥٠ ريال'), '150 ريال');
  assert.equal(normalizeNumbers('٤٢٠٠.٥٠'), '4200.50');
});

test('extractAmount extracts numeric financial amounts accurately', () => {
  assert.equal(extractAmount('سجلت مصروف 150 ريال'), 150);
  assert.equal(extractAmount('فاتورة بقيمة 4,200 ريال لشركة التقنية'), 4200);
  assert.equal(extractAmount('دفعت 250.75 دولار اشتراك'), 250.75);
  assert.equal(extractAmount('لا يوجد رقم هنا'), undefined);
});

test('parseFinancialInput categorizes expense and extracts currency', () => {
  const result = parseFinancialInput('سجلت مصروف 150 ريال قهوة وغداء عمل');
  assert.equal(result.action, 'record_expense');
  assert.equal(result.amount, 150);
  assert.equal(result.currency, 'SAR');
  assert.equal(result.category, 'food_dining');
});

test('parseFinancialInput identifies marketing expenses', () => {
  const result = parseFinancialInput('دفعت 3500 ريال حملة اعلانات سناب شات');
  assert.equal(result.action, 'record_expense');
  assert.equal(result.amount, 3500);
  assert.equal(result.category, 'marketing');
});

test('parseFinancialInput handles budget inquiries in Arabic', () => {
  const result = parseFinancialInput('كم المتبقي من ميزانية التسويق؟');
  assert.equal(result.action, 'query_budget');
  assert.equal(result.category, 'marketing');
});

test('parseFinancialInput identifies overall summary requests', () => {
  const result = parseFinancialInput('أريد ملخص التدفق المالي لهذا الشهر');
  assert.equal(result.action, 'query_summary');
});

test('calculateBudgetStatus computes remaining amounts and threshold flags', () => {
  const normal = calculateBudgetStatus({ category: 'marketing', allocated: 10000, spent: 4000 });
  assert.equal(normal.remaining, 6000);
  assert.equal(normal.percentageUsed, 40);
  assert.equal(normal.isOverBudget, false);
  assert.equal(normal.isNearThreshold, false);

  const near = calculateBudgetStatus({ category: 'marketing', allocated: 10000, spent: 8800 });
  assert.equal(near.isNearThreshold, true);
  assert.equal(near.isOverBudget, false);

  const over = calculateBudgetStatus({ category: 'marketing', allocated: 10000, spent: 11000 });
  assert.equal(over.isOverBudget, true);
});

test('calculateCashFlowMetrics computes totals, net flow, and health score', () => {
  const transactions: Array<{ type: 'income' | 'expense' | 'transfer'; amount: number }> = [
    { type: 'income', amount: 50000 },
    { type: 'expense', amount: 20000 },
    { type: 'expense', amount: 5000 },
  ];
  const metrics = calculateCashFlowMetrics(transactions);
  assert.equal(metrics.totalIncome, 50000);
  assert.equal(metrics.totalExpense, 25000);
  assert.equal(metrics.netCashFlow, 25000);
  assert.equal(metrics.savingsRate, 50);
  assert.ok(metrics.healthScore >= 70);
});

test('generateApiKey produces valid formatted key and validateApiKey validates correctly', () => {
  const key = generateApiKey();
  assert.ok(key.startsWith('agt_live_'));
  assert.ok(key.length > 20);

  const validKeys = [key, 'agt_live_sample123'];
  assert.equal(validateApiKey(`Bearer ${key}`, validKeys), true);
  assert.equal(validateApiKey(key, validKeys), true);
  assert.equal(validateApiKey('Bearer invalid_token', validKeys), false);
  assert.equal(validateApiKey(undefined, validKeys), false);
});
