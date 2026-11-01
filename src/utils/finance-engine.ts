/**
 * Pure financial calculations, natural language parsing, and API key management
 * Decoupled from UI for deterministic testing and reliable agent execution.
 */

export interface ParsedFinancialIntent {
  action: 'record_expense' | 'record_income' | 'query_budget' | 'query_summary' | 'audit_check' | 'general_query';
  amount?: number;
  currency?: string;
  category?: string;
  merchant?: string;
  description?: string;
  confidence: number;
}

export interface BudgetStatus {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  isNearThreshold: boolean;
}

export interface CashFlowMetrics {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  savingsRate: number;
  healthScore: number; // 0 - 100
}

/**
 * Standard category mappings for Arabic and English terms
 */
export const CATEGORY_MAP: Record<string, string> = {
  // Food & Dining
  'قهوة': 'food_dining',
  'غداء': 'food_dining',
  'عشاء': 'food_dining',
  'مطعم': 'food_dining',
  'وجبات': 'food_dining',
  'اكل': 'food_dining',
  'food': 'food_dining',
  'dining': 'food_dining',
  'coffee': 'food_dining',
  'lunch': 'food_dining',

  // Marketing
  'تسويق': 'marketing',
  'اعلانات': 'marketing',
  'إعلانات': 'marketing',
  'حملة': 'marketing',
  'سوشيال': 'marketing',
  'marketing': 'marketing',
  'ads': 'marketing',

  // Software & Cloud
  'سحابة': 'software',
  'استضافة': 'software',
  'سيرفر': 'software',
  'اشتراك': 'software',
  'برمجيات': 'software',
  'software': 'software',
  'cloud': 'software',
  'hosting': 'software',
  'saas': 'software',

  // Office & Supplies
  'مكتب': 'supplies',
  'مستلزمات': 'supplies',
  'قرطاسية': 'supplies',
  'معدات': 'supplies',
  'supplies': 'supplies',
  'equipment': 'supplies',

  // Salaries & Contractors
  'رواتب': 'salaries',
  'راتب': 'salaries',
  'مكافأة': 'salaries',
  'مستحقات': 'salaries',
  'salary': 'salaries',
  'payroll': 'salaries',

  // Sales & Revenue
  'مبيعات': 'sales',
  'ايراد': 'sales',
  'إيراد': 'sales',
  'دفعة عميل': 'sales',
  'فاتورة مبيعات': 'sales',
  'revenue': 'sales',
  'client_payment': 'sales',
};

export const CATEGORY_LABELS_AR: Record<string, string> = {
  food_dining: 'طعام وضيافة',
  marketing: 'تسويق وإعلانات',
  software: 'اشتراكات وبرمجيات',
  supplies: 'مستلزمات ومكتب',
  salaries: 'رواتب وعقود',
  sales: 'إيرادات ومبيعات',
  consulting: 'استشارات وخدمات',
  other: 'مصروفات عامة',
};

/**
 * Normalizes Eastern Arabic numerals (٠-٩) to Western (0-9)
 */
export function normalizeNumbers(text: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.replace(/[٠-٩]/g, (digit) => {
    return arabicNumerals.indexOf(digit).toString();
  });
}

/**
 * Extracts numeric financial values from text
 */
export function extractAmount(text: string): number | undefined {
  const normalized = normalizeNumbers(text);
  // Match patterns like "150", "1,500", "4200.50", "150 ريال", "$200"
  const regex = /(?:[$€£]|SAR|USD|ريال|درهم|جنيه)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+)\s*(?:[$€£]|SAR|USD|ريال|درهم|جنيه)?/i;
  const match = normalized.match(regex);
  if (match && match[1]) {
    const cleanNum = match[1].replace(/,/g, '');
    const parsed = parseFloat(cleanNum);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Parses financial natural language queries and statements
 * Works for both Arabic and English text from WhatsApp or Frontend
 */
export function parseFinancialInput(input: string): ParsedFinancialIntent {
  const normalized = normalizeNumbers(input).toLowerCase();
  
  // 1. Check for budget inquiries
  if (
    normalized.includes('كم باقي') ||
    normalized.includes('كم المتبقي') ||
    normalized.includes('الميزانية') ||
    normalized.includes('ميزانية') ||
    normalized.includes('remaining budget') ||
    normalized.includes('budget left')
  ) {
    let targetCategory = 'all';
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
      if (normalized.includes(kw)) {
        targetCategory = cat;
        break;
      }
    }
    return {
      action: 'query_budget',
      category: targetCategory,
      confidence: 0.9,
      description: input,
    };
  }

  // 2. Check for overall financial summary or cashflow reports
  if (
    normalized.includes('ملخص') ||
    normalized.includes('تقرير') ||
    normalized.includes('التدفق') ||
    normalized.includes('الوضع المالي') ||
    normalized.includes('summary') ||
    normalized.includes('report') ||
    normalized.includes('cashflow')
  ) {
    return {
      action: 'query_summary',
      confidence: 0.95,
      description: input,
    };
  }

  // 3. Check for audit / anomaly checks
  if (
    normalized.includes('تدقيق') ||
    normalized.includes('مشبوه') ||
    normalized.includes('تجاوز') ||
    normalized.includes('فحص') ||
    normalized.includes('audit') ||
    normalized.includes('anomalies')
  ) {
    return {
      action: 'audit_check',
      confidence: 0.9,
      description: input,
    };
  }

  // 4. Check for recording income
  if (
    normalized.includes('استلمت') ||
    normalized.includes('دخل') ||
    normalized.includes('إيراد') ||
    normalized.includes('ايراد') ||
    normalized.includes('دفعة من') ||
    normalized.includes('تحصيل') ||
    normalized.includes('received') ||
    normalized.includes('income')
  ) {
    const amount = extractAmount(normalized);
    let currency = 'SAR';
    if (normalized.includes('دولار') || normalized.includes('usd') || normalized.includes('$')) {
      currency = 'USD';
    } else if (normalized.includes('درهم') || normalized.includes('aed')) {
      currency = 'AED';
    }

    return {
      action: 'record_income',
      amount: amount || 0,
      currency,
      category: 'sales',
      description: input,
      confidence: amount ? 0.92 : 0.6,
    };
  }

  // 5. Check for recording expense (e.g. "سجلت مصروف 150 ريال قهوة وغداء عمل", "دفعت 400 اشتراك زوم")
  const isExpenseExplicit =
    normalized.includes('مصروف') ||
    normalized.includes('صرفت') ||
    normalized.includes('دفعت') ||
    normalized.includes('فاتورة') ||
    normalized.includes('اشتريت') ||
    normalized.includes('سجلت') ||
    normalized.includes('expense') ||
    normalized.includes('paid') ||
    normalized.includes('bought');

  const amount = extractAmount(normalized);

  if (amount && (isExpenseExplicit || amount > 0)) {
    // Detect category
    let detectedCategory = 'other';
    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
      if (normalized.includes(keyword)) {
        detectedCategory = category;
        break;
      }
    }

    let currency = 'SAR';
    if (normalized.includes('دولار') || normalized.includes('usd') || normalized.includes('$')) {
      currency = 'USD';
    } else if (normalized.includes('درهم') || normalized.includes('aed')) {
      currency = 'AED';
    }

    return {
      action: 'record_expense',
      amount,
      currency,
      category: detectedCategory,
      description: input,
      confidence: 0.94,
    };
  }

  return {
    action: 'general_query',
    confidence: 0.5,
    description: input,
  };
}

/**
 * Calculates budget status and threshold warnings
 */
export function calculateBudgetStatus<T extends { category: string; allocated: number; spent: number }>(
  budget: T,
  thresholdPercentage = 85
): T & BudgetStatus {
  const remaining = Math.max(0, budget.allocated - budget.spent);
  const percentageUsed = budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0;
  const isOverBudget = budget.spent > budget.allocated;
  const isNearThreshold = percentageUsed >= thresholdPercentage && !isOverBudget;

  return {
    ...budget,
    category: budget.category,
    allocated: budget.allocated,
    spent: budget.spent,
    remaining,
    percentageUsed: Math.round(percentageUsed * 10) / 10,
    isOverBudget,
    isNearThreshold,
  };
}

/**
 * Calculates global cashflow health
 */
export function calculateCashFlowMetrics(
  transactions: Array<{ type: 'income' | 'expense' | 'transfer'; amount: number }>
): CashFlowMetrics {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netCashFlow) / totalIncome) * 100 : 0;

  // Health score calculation (0 - 100)
  let healthScore = 70;
  if (totalIncome > 0) {
    if (netCashFlow > 0) {
      healthScore += Math.min(30, (netCashFlow / totalIncome) * 50);
    } else {
      healthScore -= Math.min(50, Math.abs(netCashFlow / totalIncome) * 60);
    }
  }
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  return {
    totalIncome,
    totalExpense,
    netCashFlow,
    savingsRate: Math.round(savingsRate * 10) / 10,
    healthScore,
  };
}

/**
 * API Key generator for WhatsApp webhook verification
 */
export function generateApiKey(prefix = 'agt_live_'): string {
  const randomChars = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `${prefix}${randomChars}`;
}

/**
 * Validates incoming Bearer token from WhatsApp
 */
export function validateApiKey(incomingHeader: string | undefined, validKeys: string[]): boolean {
  if (!incomingHeader) return false;
  const token = incomingHeader.startsWith('Bearer ') ? incomingHeader.slice(7).trim() : incomingHeader.trim();
  return validKeys.includes(token);
}
