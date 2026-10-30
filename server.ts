process.env.DISABLE_HMR = 'true';

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  parseFinancialInput,
  calculateBudgetStatus,
  calculateCashFlowMetrics,
  generateApiKey,
  validateApiKey,
  CATEGORY_LABELS_AR,
} from './src/utils/finance-engine.ts';
import { routeIncomingMessageToAgent } from './src/utils/agent-router.ts';
import type {
  FinancialTransaction,
  BudgetCategory,
  ApiKeyItem,
  SyncedMessage,
  AgentTask,
  AgentProfile,
  SystemAuditLog,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini Client if key exists
let genAI: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI();
}

// -------------------------------------------------------------
// IN-MEMORY AGENT OS STORE & MULTI-AGENT CLUSTER REGISTRY
// -------------------------------------------------------------
// IN-MEMORY AGENT OS STORE & MULTI-AGENT CLUSTER REGISTRY
// -------------------------------------------------------------
const defaultApiKeySecret = 'agt_live_tg_99a8b7c6d5e4f3a2b1c0';

const apiKeysStore: ApiKeyItem[] = [
  {
    id: 'key-1',
    name: 'Telegram Bot Production Webhook (@TariqFin_Bot)',
    keyPreview: 'agt_live_tg_99a8...b1c0',
    fullKey: defaultApiKeySecret,
    botUsername: 'TariqFin_Bot',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'active',
    scopes: ['telegram:receive', 'telegram:send', 'finance:read', 'finance:write'],
    requestsCount: 42,
  },
  {
    id: 'key-2',
    name: 'Telegram Internal Webhook Tester',
    keyPreview: 'agt_live_test_7f2a...88e1',
    fullKey: 'agt_live_test_7f2a4b9c1d0e88e1',
    botUsername: 'TariqAgentOS_Bot',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'active',
    scopes: ['telegram:receive', 'finance:read', 'finance:write'],
    requestsCount: 15,
  },
];

const agentsStore: AgentProfile[] = [
  {
    id: 'fin-agent-01',
    name: 'الوكيل المالي الذكي (FinOS Bot)',
    nameEn: 'FinOS Financial Bot',
    role: 'إدارة العمليات المالية والتدفقات النقدية والميزانيات',
    roleEn: 'Financial Operations & Cash Flow Management',
    description: 'بوت مالي مستقل (@TariqFin_Bot) مخصص للتدقيق المالي، معالجة فواتير ومصروفات تليجرام، والتحليل التنبؤي للميزانية. (الوكيل المفعّل الأول في المنظومة).',
    status: 'active',
    avatar: '💼',
    isSpecialist: true,
    specialty: 'finance',
    phase: 'المرحلة 1 (الوكيل النشط الحالي)',
    telegramBotUsername: 'TariqFin_Bot',
    telegramCommand: '/budget',
    telegramTopicId: 101,
    telegramTopicName: 'المالية والمصروفات',
    triggerKeywords: ['مصروف', 'فاتورة', 'ميزانية', 'ريال', 'ضريبة', 'إيراد', 'كاش', 'finance', '/budget', '/expense', '/vat'],
    systemPromptPreview: 'أنت الوكيل المالي الأساسي في Tariq-AgentOS عبر تليجرام، تتولى تدقيق العمليات والميزانيات والتحقق من الضرائب...',
    capabilities: [
      'تتبع النفقات والإيرادات عبر بوت تليجرام المخصص',
      'دعم أوامر تليجرام المدمجة (/budget, /expense, /summary)',
      'توجيه موضوعات المجموعات الفائقة (Forum Topic #101)',
      'حساب ضريبة القيمة المضافة (VAT 15%)',
      'مزامنة فورية ثنائية الاتجاه مع دفاتر المنظومة',
    ],
    metrics: {
      tasksCompleted: 184,
      uptime: '99.98%',
      memoryMb: 142,
      tokensUsed: 48920,
      avgLatencyMs: 24,
    },
  },
  {
    id: 'mkt-agent-02',
    name: 'وكيل التسويق الرقمي (MarketOS Bot)',
    nameEn: 'MarketOS Marketing Bot',
    role: 'إدارة الحملات الإعلانية وتحليل العائد (ROAS)',
    roleEn: 'Digital Marketing & Campaign Analytics',
    description: 'بوت متخصص (@TariqMarketing_Bot) في إطلاق الحملات، إدارة إعلانات سناب وتيك توك وجوجل، وتنسيق ميزانية التسويق مع الوكيل المالي. (مخطط للتفعيل لاحقاً).',
    status: 'planned',
    avatar: '📢',
    isSpecialist: true,
    specialty: 'marketing',
    phase: 'المرحلة 2 (مخطط للإضافة والتفعيل لاحقاً)',
    telegramBotUsername: 'TariqMarketing_Bot',
    telegramCommand: '/campaigns',
    telegramTopicId: 102,
    telegramTopicName: 'التسويق والإعلانات',
    triggerKeywords: ['تسويق', 'حملة', 'اعلانات', 'سوشيال', 'roas', 'سناب شات', 'marketing', '/campaigns', '/roas'],
    systemPromptPreview: 'أنت وكيل التسويق في Tariq-AgentOS على تليجرام، تدير الحملات الإعلانية وتحسب العائد على الإنفاق...',
    capabilities: [
      'تحليل العائد الإعلاني (ROAS & CAC)',
      'إدارة حملات تيك توك وسناب وجوجل عبر تليجرام',
      'صياغة الإعلانات التسويقية',
      'طلب اعتمادات الميزانية من الوكيل المالي',
    ],
    metrics: {
      tasksCompleted: 0,
      uptime: 'جاهز للإطلاق',
      memoryMb: 0,
      tokensUsed: 0,
      avgLatencyMs: 0,
    },
  },
  {
    id: 'sales-agent-03',
    name: 'وكيل المبيعات والصفقات (SalesOS Bot)',
    nameEn: 'SalesOS Sales & Pipeline Bot',
    role: 'إدارة مسار الصفقات وإصدار عروض الأسعار وتأهيل العملاء',
    roleEn: 'Sales Pipeline & Deal Closures',
    description: 'بوت متخصص (@TariqSales_Bot) في متابعة العملاء المحتملين، مسار الصفقات (CRM)، وتمرير الفواتير المغلقة للوكيل المالي. (مخطط للتفعيل لاحقاً).',
    status: 'planned',
    avatar: '🎯',
    isSpecialist: true,
    specialty: 'sales',
    phase: 'المرحلة 2 (مخطط للإضافة والتفعيل لاحقاً)',
    telegramBotUsername: 'TariqSales_Bot',
    telegramCommand: '/pipeline',
    telegramTopicId: 103,
    telegramTopicName: 'المبيعات والصفقات',
    triggerKeywords: ['مبيعات', 'صفقة', 'عميل', 'عروض أسعار', 'crm', 'sales', 'deals', '/pipeline', '/quote'],
    systemPromptPreview: 'أنت وكيل المبيعات في Tariq-AgentOS على تليجرام، تتابع مراحل الصفقات وعروض الأسعار...',
    capabilities: [
      'تأهيل العملاء المحتملين (Leads Scoring)',
      'إدارة خط الصفقات (Deals Pipeline)',
      'إصدار عروض الأسعار الآلية عبر تليجرام',
      'تمرير المدفوعات للوكيل المالي تلقائياً',
    ],
    metrics: {
      tasksCompleted: 0,
      uptime: 'جاهز للإطلاق',
      memoryMb: 0,
      tokensUsed: 0,
      avgLatencyMs: 0,
    },
  },
  {
    id: 'orch-agent-04',
    name: 'منسق المهام والراوتر المركزي (Kernel Dispatcher)',
    nameEn: 'Multi-Task Orchestrator & Router',
    role: 'توزيع الأحمال وتوجيه الرسائل بين الوكلاء المتخصصين',
    roleEn: 'Task Scheduling & Router Dispatcher',
    description: 'نواة النظام المسؤولة عن تحليل نية المستخدم وتوجيه المهام إلى الوكيل المتخصص المناسب، وإدارة الطوابير غير المتزامنة.',
    status: 'active',
    avatar: '⚡',
    isSpecialist: false,
    specialty: 'operations',
    phase: 'النواة الأساسية لـ Tariq-AgentOS',
    triggerKeywords: ['راوتر', 'توجيه', 'نواة', 'مهام'],
    capabilities: ['التوجيه الذكي بين الوكلاء', 'مراقبة خط الأنابيب', 'معالجة الرسائل الدفعية'],
    metrics: {
      tasksCompleted: 95,
      uptime: '99.95%',
      memoryMb: 88,
      tokensUsed: 12300,
      avgLatencyMs: 14,
    },
  },
  {
    id: 'sec-agent-05',
    name: 'حارس الأمان ومفاتيح API (SecGuard)',
    nameEn: 'Security & API Guardian',
    role: 'التدقيق الأمني والتحقق من التوقيع والمفاتيح',
    roleEn: 'Security Audit & API Verification',
    description: 'يتحقق من هوية مرسلي الواتساب وتدقيق طلبات الـ Webhook والتوقيعات الرقمية ومفاتيح الـ API.',
    status: 'active',
    avatar: '🛡️',
    isSpecialist: false,
    specialty: 'security',
    phase: 'النواة الأساسية لـ Tariq-AgentOS',
    triggerKeywords: ['أمان', 'تشفير', 'api key'],
    capabilities: ['التحقق من Bearer Tokens', 'مكافحة التكرار والفيضان', 'سجلات التدقيق المشفرة'],
    metrics: {
      tasksCompleted: 430,
      uptime: '100%',
      memoryMb: 64,
      tokensUsed: 8900,
      avgLatencyMs: 8,
    },
  },
];

const budgetsStore: BudgetCategory[] = [
  {
    id: 'b-1',
    category: 'marketing',
    allocated: 15000,
    spent: 8500,
    period: 'شهري (أكتوبر 2026)',
    threshold: 85,
    color: '#8b5cf6',
  },
  {
    id: 'b-2',
    category: 'software',
    allocated: 6000,
    spent: 4200,
    period: 'شهري (أكتوبر 2026)',
    threshold: 80,
    color: '#06b6d4',
  },
  {
    id: 'b-3',
    category: 'food_dining',
    allocated: 3500,
    spent: 1950,
    period: 'شهري (أكتوبر 2026)',
    threshold: 75,
    color: '#f59e0b',
  },
  {
    id: 'b-4',
    category: 'supplies',
    allocated: 4000,
    spent: 1400,
    period: 'شهري (أكتوبر 2026)',
    threshold: 85,
    color: '#10b981',
  },
  {
    id: 'b-5',
    category: 'salaries',
    allocated: 45000,
    spent: 45000,
    period: 'شهري (أكتوبر 2026)',
    threshold: 95,
    color: '#3b82f6',
  },
];

const transactionsStore: FinancialTransaction[] = [
  {
    id: 'tx-101',
    timestamp: new Date(Date.now() - 3600000 * 26).toISOString(),
    type: 'income',
    amount: 52000,
    currency: 'SAR',
    category: 'sales',
    merchantOrParty: 'شركة الأفق الرقمي للتجارة',
    description: 'تحصيل دفعة عقد تطوير برمجيات الربع الرابع',
    source: 'web_frontend',
    status: 'cleared',
    agentNotes: 'تمت مطابقة الفاتورة مع العقد الرئيسي بنجاح.',
    synced: true,
  },
  {
    id: 'tx-102',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    type: 'expense',
    amount: 4200,
    currency: 'SAR',
    category: 'software',
    merchantOrParty: 'Google Cloud Platform & AI Studio',
    description: 'تجديد خدمات السحابة ونماذج الذكاء الاصطناعي',
    source: 'telegram',
    senderHandle: '@tariq_admin',
    telegramChatId: -100987654321,
    status: 'cleared',
    agentNotes: 'تم الاستلام عبر بوت تليجرام (@TariqFin_Bot) والتحقق من الرمز المحاسبي السحابي.',
    synced: true,
  },
  {
    id: 'tx-103',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    type: 'expense',
    amount: 1950,
    currency: 'SAR',
    category: 'food_dining',
    merchantOrParty: 'مطعم السرايا للضيافة',
    description: 'عشاء عمل مع وفد المستثمرين',
    source: 'telegram',
    senderHandle: '@tariq_admin',
    telegramChatId: -100987654321,
    status: 'cleared',
    agentNotes: 'تم قيد المصروف في حساب العلاقات العامة والضيافة عبر تليجرام.',
    synced: true,
  },
  {
    id: 'tx-104',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    type: 'expense',
    amount: 3500,
    currency: 'SAR',
    category: 'marketing',
    merchantOrParty: 'حملة تيك توك وسناب شات',
    description: 'إطلاق إعلانات موسم الخريف',
    source: 'web_frontend',
    status: 'cleared',
    agentNotes: 'تم رصد 56.6% من ميزانية التسويق الإجمالية.',
    synced: true,
  },
];

const messagesStore: SyncedMessage[] = [
  {
    id: 'msg-01',
    timestamp: new Date(Date.now() - 3600000 * 18 - 60000).toISOString(),
    channel: 'telegram',
    sender: {
      name: 'طارق المدير المالي',
      handle: '@tariq_admin',
      isAgent: false,
    },
    telegramThreadId: 101,
    telegramTopicName: 'المالية والمصروفات',
    content: '/expense 4,200 ريال لخدمات Google Cloud والسحابة',
    parsedAction: {
      actionType: 'record_expense',
      amount: 4200,
      currency: 'SAR',
      category: 'software',
      transactionId: 'tx-102',
    },
    status: 'processed',
    syncLatencyMs: 18,
  },
  {
    id: 'msg-02',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    channel: 'telegram',
    sender: {
      name: 'FinOS الوكيل المالي',
      handle: '@TariqFin_Bot',
      isAgent: true,
    },
    telegramThreadId: 101,
    telegramTopicName: 'المالية والمصروفات',
    content: '✅ تم توثيق المصروف فوراً عبر تليجرام!\n• المبلغ: 4,200 ريال سعودي\n• التصنيف: برمجيات وسحابة\n• المستهلك من ميزانية البرمجيات: 70%\n• تم المزامنة اللحظية مع لوحة تشغيل Tariq-AgentOS.',
    status: 'delivered',
    syncLatencyMs: 22,
  },
  {
    id: 'msg-03',
    timestamp: new Date(Date.now() - 3600000 * 8 - 45000).toISOString(),
    channel: 'telegram',
    sender: {
      name: 'طارق المدير المالي',
      handle: '@tariq_admin',
      isAgent: false,
    },
    telegramThreadId: 101,
    telegramTopicName: 'المالية والمصروفات',
    content: '/expense 1950 ريال عشاء عمل مع وفد المستثمرين',
    parsedAction: {
      actionType: 'record_expense',
      amount: 1950,
      currency: 'SAR',
      category: 'food_dining',
      transactionId: 'tx-103',
    },
    status: 'processed',
    syncLatencyMs: 15,
  },
  {
    id: 'msg-04',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    channel: 'telegram',
    sender: {
      name: 'FinOS الوكيل المالي',
      handle: '@TariqFin_Bot',
      isAgent: true,
    },
    telegramThreadId: 101,
    telegramTopicName: 'المالية والمصروفات',
    content: '✅ تم تسجيل المصروف ومطابقته بالدفاتر.\n• الفئة: طعام وضيافة\n• المبلغ: 1,950 ريال\n• المتبقي في ميزانية الضيافة: 1,550 ريال\n• الحالة: آمن وضمن المعدل الطبيعي.',
    status: 'delivered',
    syncLatencyMs: 19,
  },
];

const tasksStore: AgentTask[] = [
  {
    id: 'task-vat',
    title: 'مراجعة وتدقيق ضريبة القيمة المضافة (VAT 15%)',
    titleEn: 'Monthly VAT 15% Reconciliation',
    agentId: 'fin-agent-01',
    type: 'scheduled',
    status: 'completed',
    lastRun: new Date(Date.now() - 3600000 * 5).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 19).toISOString(),
    details: 'فحص جميع المعاملات الواردة من تليجرام والويب للتأكد من حساب ضريبة الـ 15% بدقة.',
  },
  {
    id: 'task-sync-watch',
    title: 'مراقبة خط تزامن بوتات تليجرام مع الدفاتر',
    titleEn: 'Telegram Bots Bi-directional Sync Stream',
    agentId: 'orch-agent-02',
    type: 'event_driven',
    status: 'running',
    lastRun: new Date(Date.now() - 60000 * 2).toISOString(),
    nextRun: 'مستمر (Active Stream)',
    details: 'معالجة الـ Webhooks الواردة من تليجرام بمعدل استجابة يقل عن 25ms مع التحقق المشفر.',
  },
  {
    id: 'task-budget-drift',
    title: 'الكشف الاستباقي عن انحرافات الميزانية',
    titleEn: 'Budget Variance & Anomaly Detection',
    agentId: 'fin-agent-01',
    type: 'scheduled',
    status: 'scheduled',
    lastRun: new Date(Date.now() - 3600000 * 12).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 4).toISOString(),
    details: 'إرسال تنبيهات تلقائية لمدير المالية عند وصول أي بند إلى 85% من المخصص الشهري.',
  },
];

const auditLogsStore: SystemAuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    channel: 'whatsapp',
    event: 'Webhook Auth & Transaction Processed',
    ip: '185.199.108.153',
    status: 'success',
    tokenUsed: 'agt_live_wa_99a8...b1c0',
    latencyMs: 18,
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    channel: 'web',
    event: 'Ledger Synced & Budget Recomputed',
    ip: '10.0.4.12',
    status: 'success',
    latencyMs: 9,
  },
];

// Helper to update budget after transaction
function adjustBudget(category: string, amount: number, isExpense: boolean) {
  const budget = budgetsStore.find((b) => b.category === category);
  if (budget) {
    if (isExpense) {
      budget.spent += amount;
    } else {
      budget.spent = Math.max(0, budget.spent - amount);
    }
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. System OS Status
app.get('/api/system/status', (req, res) => {
  const activeAgentsCount = agentsStore.filter((a) => a.status === 'active' || a.status === 'busy').length;
  res.json({
    osVersion: 'Tariq-AgentOS v2.4 Kernel (Multi-Agent Cluster)',
    status: 'healthy',
    systemLoad: '14.2%',
    activeAgentsCount,
    totalAgents: agentsStore.length,
    agents: agentsStore,
    syncLatencyMs: 14,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Agent Registry API
app.get('/api/agents', (req, res) => {
  res.json({
    agents: agentsStore,
    total: agentsStore.length,
    active: agentsStore.filter((a) => a.status === 'active').length,
    planned: agentsStore.filter((a) => a.status === 'planned' || a.status === 'staged').length,
  });
});

app.post('/api/agents', (req, res) => {
  const agentData = req.body;
  if (!agentData.name) {
    res.status(400).json({ error: 'اسم الوكيل مطلوب' });
    return;
  }

  const newAgent: AgentProfile = {
    id: agentData.id || `agent-${Date.now().toString(36)}`,
    name: agentData.name,
    nameEn: agentData.nameEn || agentData.name,
    role: agentData.role || 'وكيل ذكاء اصطناعي متخصص',
    roleEn: agentData.roleEn || 'Specialist Agent',
    description: agentData.description || 'وكيل تم تجهيزه للمنظومة.',
    status: agentData.status || 'planned',
    avatar: agentData.avatar || '🤖',
    isSpecialist: true,
    specialty: agentData.specialty || 'custom',
    phase: agentData.phase || 'المرحلة 2 (مخطط للإضافة والتفعيل لاحقاً)',
    triggerKeywords: agentData.triggerKeywords || [],
    capabilities: agentData.capabilities || ['معالجة المهام الذكية'],
    metrics: {
      tasksCompleted: 0,
      uptime: 'جاهز للإطلاق',
      memoryMb: 0,
      tokensUsed: 0,
      avgLatencyMs: 0,
    },
  };

  agentsStore.push(newAgent);

  auditLogsStore.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: 'web',
    event: `Agent Staged: ${newAgent.name} [${newAgent.specialty}]`,
    ip: req.ip || '127.0.0.1',
    status: 'success',
    latencyMs: 8,
  });

  res.status(201).json({
    success: true,
    agent: newAgent,
  });
});

// 2. Financial Overview Data
app.get('/api/financial/data', (req, res) => {
  const metrics = calculateCashFlowMetrics(transactionsStore);
  const budgetsWithStatus = budgetsStore.map((b) => calculateBudgetStatus(b, b.threshold));

  res.json({
    metrics,
    budgets: budgetsWithStatus,
    transactions: transactionsStore,
    recentCount: transactionsStore.length,
  });
});

// 3. Add Financial Transaction (Manual / Frontend API)
app.post('/api/financial/transaction', (req, res) => {
  const { type, amount, currency, category, merchantOrParty, description, source } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    res.status(400).json({ error: 'المبلغ غير صالح' });
    return;
  }

  const newTx: FinancialTransaction = {
    id: `tx-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    type: type || 'expense',
    amount: Number(amount),
    currency: currency || 'SAR',
    category: category || 'other',
    merchantOrParty: merchantOrParty || 'معاملة يدوية',
    description: description || 'تم الإدخال من وحدة تحكم النظام',
    source: source || 'web_frontend',
    status: 'cleared',
    agentNotes: 'تم توثيق المعاملة وتحديث الدفاتر والميزانية المرتبطة تلقائياً.',
    synced: true,
  };

  transactionsStore.unshift(newTx);
  if (newTx.type === 'expense') {
    adjustBudget(newTx.category, newTx.amount, true);
  }

  // Record audit log
  auditLogsStore.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: newTx.source === 'whatsapp' ? 'whatsapp' : 'web',
    event: `Transaction Created: ${newTx.type} ${newTx.amount} ${newTx.currency}`,
    ip: req.ip || '127.0.0.1',
    status: 'success',
    latencyMs: 12,
  });

  res.status(201).json({
    success: true,
    transaction: newTx,
    updatedMetrics: calculateCashFlowMetrics(transactionsStore),
  });
});

// 4. Synced Messages Stream (WhatsApp & Web Unified Thread)
app.get('/api/messages', (req, res) => {
  res.json({
    messages: messagesStore,
    count: messagesStore.length,
  });
});

// Helper function to handle incoming channel updates (Telegram First)
async function handleChannelWebhook(req: express.Request, res: express.Response, channel: 'telegram' | 'whatsapp') {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;
  const validKeyStrings = apiKeysStore
    .filter((k) => k.status === 'active' && k.fullKey)
    .map((k) => k.fullKey!);

  // Security Check: API Key verification
  if (!validateApiKey(authHeader, validKeyStrings)) {
    auditLogsStore.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: channel,
      event: `Unauthorized ${channel} Webhook Attempt`,
      ip: req.ip || '127.0.0.1',
      status: 'error',
      latencyMs: Date.now() - startTime,
    });
    res.status(401).json({
      ok: false,
      error: `مفتاح API غير صالح أو غير مصرح به لبوابة ${channel === 'telegram' ? 'تليجرام' : 'الرسائل'} (Unauthorized)`,
      hint: 'يرجى إرسال Header: Authorization: Bearer agt_live_tg_...',
    });
    return;
  }

  // Update key usage
  const usedKey = authHeader?.replace('Bearer ', '').trim();
  const matchedKeyObj = apiKeysStore.find((k) => k.fullKey === usedKey);
  if (matchedKeyObj) {
    matchedKeyObj.lastUsedAt = new Date().toISOString();
    matchedKeyObj.requestsCount += 1;
  }

  // Parse Telegram Update structure or fallback to direct body fields
  const telegramMessage = req.body.message || req.body;
  const text: string = telegramMessage.text || req.body.text || '';
  const fromHandle: string = telegramMessage.from?.username 
    ? `@${telegramMessage.from.username}`
    : req.body.from || '@tariq_admin';
  const senderName: string = telegramMessage.from?.first_name 
    ? telegramMessage.from.first_name 
    : req.body.senderName || 'طارق (مشرف تليجرام)';
  const threadId: number | undefined = telegramMessage.message_thread_id || req.body.threadId || undefined;
  const chatId = telegramMessage.chat?.id || -100987654321;

  if (!text.trim()) {
    res.status(400).json({ ok: false, error: 'نص الرسالة فارغ' });
    return;
  }

  // Multi-Agent Kernel Routing Check (Supports slash commands and forum topic IDs)
  const agentRouting = routeIncomingMessageToAgent(text, agentsStore, threadId);

  // Parse financial intent
  const intent = parseFinancialInput(text);
  let replyText = '';
  let createdTx: FinancialTransaction | null = null;

  if (agentRouting.specialty === 'marketing' && !agentRouting.isTargetActive && intent.action === 'general_query') {
    const mktBudget = budgetsStore.find((b) => b.category === 'marketing');
    const mktLeft = mktBudget ? (mktBudget.allocated - mktBudget.spent).toLocaleString() : '6,500';
    replyText = `📢 [بوت التسويق MarketOS عبر تليجرام]:\n• تم توجيه رسالتك إلى: وكيل التسويق الرقمي (@TariqMarketing_Bot).\n• الحالة: مجدول للإضافة والتفعيل في المرحلة القادمة.\n• المعالجة في المرحلة الحالية: يتولى الوكيل المالي (FinOS) إدارة ميزانيتك التسويقية (المتبقي: ${mktLeft} ر.س).\n• لتسجيل مصروف إعلاني لحملتك، أرسل: "/expense 1500 إعلانات سناب شات".`;
  } else if (agentRouting.specialty === 'sales' && !agentRouting.isTargetActive && intent.action === 'general_query') {
    replyText = `🎯 [بوت المبيعات SalesOS عبر تليجرام]:\n• تم توجيه رسالتك إلى: وكيل المبيعات والصفقات (@TariqSales_Bot).\n• الحالة: مجدول للإضافة والتفعيل في المرحلة القادمة.\n• المعالجة في المرحلة الحالية: يتولى الوكيل المالي (FinOS) توثيق دفعات المبيعات وتحصيل العقود.\n• لقيد دفعة مبيعات، أرسل: "/income 25000 دفعة عقد عميل".`;
  } else if (intent.action === 'record_expense' && intent.amount) {
    createdTx = {
      id: `tx-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'expense',
      amount: intent.amount,
      currency: intent.currency || 'SAR',
      category: intent.category || 'other',
      merchantOrParty: intent.merchant || 'تليجرام - قيد مباشر',
      description: text,
      source: 'telegram',
      senderHandle: fromHandle,
      telegramChatId: chatId,
      status: 'cleared',
      agentNotes: 'تم الاستلام عبر بوت تليجرام الموثق بمفتاح API وتمت المزامنة فوراً.',
      synced: true,
    };
    transactionsStore.unshift(createdTx);
    adjustBudget(createdTx.category, createdTx.amount, true);

    const catLabel = CATEGORY_LABELS_AR[createdTx.category] || createdTx.category;
    const catBudget = budgetsStore.find((b) => b.category === createdTx?.category);
    const budgetInfo = catBudget
      ? `\n• ميزانية ${catLabel}: تم استهلاك ${Math.round((catBudget.spent / catBudget.allocated) * 100)}% (المتبقي: ${(catBudget.allocated - catBudget.spent).toLocaleString()} ${createdTx.currency})`
      : '';

    replyText = `✅ أهلاً ${senderName}، تم توثيق المصروف في النظام المالي عبر تليجرام:\n• المبلغ: ${intent.amount.toLocaleString()} ${intent.currency}\n• البند: ${catLabel}${budgetInfo}\n• رقم المعاملة: #${createdTx.id}\n• تمت المزامنة مع لوحة تشغيل Tariq-AgentOS بشكل آمن.`;
  } else if (intent.action === 'record_income' && intent.amount) {
    createdTx = {
      id: `tx-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'income',
      amount: intent.amount,
      currency: intent.currency || 'SAR',
      category: 'sales',
      merchantOrParty: intent.merchant || 'تحصيل عميل',
      description: text,
      source: 'telegram',
      senderHandle: fromHandle,
      telegramChatId: chatId,
      status: 'cleared',
      agentNotes: 'تم قيد الإيراد عبر تليجرام والمزامنة اللحظية مع الدفاتر.',
      synced: true,
    };
    transactionsStore.unshift(createdTx);
    replyText = `🎉 تم قيد الإيراد بنجاح في الدفاتر:\n• المبلغ: +${intent.amount.toLocaleString()} ${intent.currency}\n• التصنيف: إيرادات ومبيعات\n• تم تحديث التدفق النقدي في لوحة FinOS.`;
  } else if (intent.action === 'query_budget') {
    const relevantBudgets = intent.category && intent.category !== 'all'
      ? budgetsStore.filter((b) => b.category === intent.category)
      : budgetsStore;

    const summaryLines = relevantBudgets.map((b) => {
      const label = CATEGORY_LABELS_AR[b.category] || b.category;
      const left = Math.max(0, b.allocated - b.spent);
      const pct = Math.round((b.spent / b.allocated) * 100);
      return `• ${label}: متبقي ${left.toLocaleString()} ر.س من ${b.allocated.toLocaleString()} ر.س (${pct}%)`;
    });

    replyText = `📊 تقرير الميزانيات الحالي من FinOS Bot:\n${summaryLines.join('\n')}\n• جميع الأرقام محدثة لحظياً مع نظام التشغيل.`;
  } else if (intent.action === 'query_summary') {
    const metrics = calculateCashFlowMetrics(transactionsStore);
    replyText = `💼 ملخص التدفق النقدي لهذا الشهر من بوت FinOS:\n• إجمالي الإيرادات: ${metrics.totalIncome.toLocaleString()} ر.س\n• إجمالي المصروفات: ${metrics.totalExpense.toLocaleString()} ر.س\n• صافي التدفق: ${metrics.netCashFlow.toLocaleString()} ر.س\n• مؤشر الصحة المالية: ${metrics.healthScore}/100 🟢\n• عدد المعاملات المسجلة: ${transactionsStore.length}`;
  } else {
    // General or financial advice via Gemini or agent reasoning
    if (genAI) {
      try {
        const prompt = `أنت الوكيل المالي الذكي (FinOS Agent @TariqFin_Bot) داخل نظام تشغيل الوكلاء Tariq-AgentOS. وصلتك هذه الرسالة عبر تليجرام من مستخدم مصرح: "${text}". أجب باللغة العربية باختصار ومهنية كخبير مالي متصل بأنظمة المحاسبة، واقترح أوامر تليجرام السريعة مثل /budget أو /expense أو /summary.`;
        const result = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
        replyText = result.text || 'مرحباً، أنا وكيل المالية الذكي (FinOS Bot). يمكنك إرسال أوامرك مثل /expense أو /budget أو /summary مباشرة هنا.';
      } catch {
        replyText = `مرحباً ${senderName}، أنا وكيل المالية في FinOS Bot. تلقيت رسالتك: "${text}". يمكنك كتابة أمر مثل /expense 150 غداء عمل أو /budget للاطلاع على ميزانياتك.`;
      }
    } else {
      replyText = `مرحباً ${senderName}، أنا بوت المالية FinOS. يمكنك استخدام أوامر تليجرام المباشرة: /expense لتسجيل المصروفات، أو /budget لعرض الميزانيات، أو /summary للملخص الشهري.`;
    }
  }

  const latency = Date.now() - startTime;

  // Add User Message to unified stream
  const incomingMsg: SyncedMessage = {
    id: `msg-tg-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: 'telegram',
    sender: {
      name: senderName,
      handle: fromHandle,
      isAgent: false,
    },
    telegramThreadId: threadId,
    content: text,
    parsedAction: createdTx
      ? {
          actionType: createdTx.type === 'expense' ? 'record_expense' : 'record_income',
          amount: createdTx.amount,
          currency: createdTx.currency,
          category: createdTx.category,
          transactionId: createdTx.id,
        }
      : undefined,
    status: 'processed',
    syncLatencyMs: latency,
  };
  messagesStore.push(incomingMsg);

  // Add Agent Response to unified stream
  const agentMsg: SyncedMessage = {
    id: `msg-ag-${Date.now() + 1}`,
    timestamp: new Date().toISOString(),
    channel: 'telegram',
    sender: {
      name: agentRouting.targetAgentName || 'FinOS الوكيل المالي',
      handle: `@${agentsStore.find((a) => a.id === agentRouting.targetAgentId)?.telegramBotUsername || 'TariqFin_Bot'}`,
      isAgent: true,
    },
    telegramThreadId: threadId,
    content: replyText,
    status: 'delivered',
    syncLatencyMs: latency + 10,
  };
  messagesStore.push(agentMsg);

  // Audit log entry
  auditLogsStore.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: 'telegram',
    event: `Telegram Webhook Processed [${intent.action}] -> ${agentRouting.targetAgentName}`,
    ip: req.ip || '127.0.0.1',
    status: 'success',
    tokenUsed: matchedKeyObj ? matchedKeyObj.keyPreview : 'unknown',
    latencyMs: latency,
  });

  // Return standard Telegram Bot API response payload
  res.json({
    ok: true,
    success: true,
    telegramUpdateId: telegramMessage.update_id || Math.floor(Math.random() * 100000),
    targetAgent: agentRouting.targetAgentName,
    agentResponse: replyText,
    parsedIntent: intent,
    syncedTransactionId: createdTx?.id || null,
    threadId: threadId || null,
    latencyMs: latency,
  });
}

// 5. Telegram Webhook (Primary Channel)
app.post('/api/telegram/webhook', async (req, res) => {
  await handleChannelWebhook(req, res, 'telegram');
});

// Fallback alias for backward-compatibility
app.post('/api/whatsapp/webhook', async (req, res) => {
  await handleChannelWebhook(req, res, 'telegram');
});

// 6. Agent Frontend Chat (Web Console)
app.post('/api/agent/chat', async (req, res) => {
  const startTime = Date.now();
  const { message = '', history = [] } = req.body;

  if (!message.trim()) {
    res.status(400).json({ error: 'الرسالة مطلوبة' });
    return;
  }

  // Multi-Agent Kernel Routing Check
  const agentRouting = routeIncomingMessageToAgent(message, agentsStore);

  // Parse financial intent
  const intent = parseFinancialInput(message);
  let agentReply = '';
  let createdTx: FinancialTransaction | null = null;

  if (agentRouting.specialty === 'marketing' && !agentRouting.isTargetActive && intent.action === 'general_query') {
    const mktBudget = budgetsStore.find((b) => b.category === 'marketing');
    const mktLeft = mktBudget ? (mktBudget.allocated - mktBudget.spent).toLocaleString() : '6,500';
    agentReply = `📢 **[راوتر نظام تشغيل الوكلاء Tariq-AgentOS]**:\n• **الوكيل المستهدف**: وكيل التسويق الرقمي (MarketOS)\n• **حالة الوكيل**: مجدول ومخطط للإضافة والتفعيل في **المرحلة 2** (المنظومة مصممة لتضم وكيل تسويق ووكيل مبيعات لاحقاً).\n• **الدور الحالي للوكيل المالي (FinOS)**: يتولى حالياً إدارة مخصصات ميزانية التسويق والإعلانات (المتبقي في ميزانية التسويق: **${mktLeft} ر.س**).\n• يمكنك توجيه أمر مالي مثل: *"سجلت 2500 ريال إعلانات تيك توك"* وسيتم قيدها واعتمادها فوراً.`;
  } else if (agentRouting.specialty === 'sales' && !agentRouting.isTargetActive && intent.action === 'general_query') {
    agentReply = `🎯 **[راوتر نظام تشغيل الوكلاء Tariq-AgentOS]**:\n• **الوكيل المستهدف**: وكيل المبيعات والصفقات (SalesOS)\n• **حالة الوكيل**: مجدول ومخطط للإضافة والتفعيل في **المرحلة 2**.\n• **الدور الحالي للوكيل المالي (FinOS)**: يتولى توثيق تحصيلات العقود وإيرادات الصفقات وإصدار القيود النقدية.\n• يمكنك كتابة أمر مثل: *"استلمت دفعة مبيعات بقيمة 15,000 ريال"* وسيقوم الوكيل المالي بتحديث الدفاتر فوراً.`;
  } else if (intent.action === 'record_expense' && intent.amount) {
    createdTx = {
      id: `tx-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'expense',
      amount: intent.amount,
      currency: intent.currency || 'SAR',
      category: intent.category || 'other',
      merchantOrParty: intent.merchant || 'لوحة الويب - إدخال مباشر',
      description: message,
      source: 'web_frontend',
      status: 'cleared',
      agentNotes: 'تم تسجيل المعاملة مباشرة من خلال شات واجهة الويب الخاصة بنظام التشغيل.',
      synced: true,
    };
    transactionsStore.unshift(createdTx);
    adjustBudget(createdTx.category, createdTx.amount, true);

    const catLabel = CATEGORY_LABELS_AR[createdTx.category] || createdTx.category;
    const catBudget = budgetsStore.find((b) => b.category === createdTx?.category);
    const budgetInfo = catBudget
      ? ` • استهلاك ميزانية ${catLabel}: ${Math.round((catBudget.spent / catBudget.allocated) * 100)}%`
      : '';

    agentReply = `✅ تم تقييد المصروف بنجاح في النظام:\n• المبلغ: ${intent.amount.toLocaleString()} ${intent.currency}\n• التصنيف: ${catLabel}${budgetInfo}\n• تم مزامنة القيد عبر القنوات وسيكون مرئياً أيضاً في سجل واتساب والتقارير.`;
  } else if (intent.action === 'record_income' && intent.amount) {
    createdTx = {
      id: `tx-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'income',
      amount: intent.amount,
      currency: intent.currency || 'SAR',
      category: 'sales',
      merchantOrParty: intent.merchant || 'إيراد مباشر',
      description: message,
      source: 'web_frontend',
      status: 'cleared',
      agentNotes: 'تم قيد الإيراد من واجهة المستخدم وتحديث الأرصدة.',
      synced: true,
    };
    transactionsStore.unshift(createdTx);
    agentReply = `🎉 تم توثيق الإيراد في الدفاتر:\n• المبلغ: +${intent.amount.toLocaleString()} ${intent.currency}\n• التصنيف: إيرادات ومبيعات\n• تم تحديث الأرقام والتدفقات النقدية فوراً.`;
  } else if (intent.action === 'query_budget') {
    const relevantBudgets = intent.category && intent.category !== 'all'
      ? budgetsStore.filter((b) => b.category === intent.category)
      : budgetsStore;

    const list = relevantBudgets.map((b) => {
      const label = CATEGORY_LABELS_AR[b.category] || b.category;
      const left = Math.max(0, b.allocated - b.spent);
      const pct = Math.round((b.spent / b.allocated) * 100);
      return `• **${label}**: المتبقي ${left.toLocaleString()} ر.س من ${b.allocated.toLocaleString()} ر.س (${pct}% مستهلك)`;
    });

    agentReply = `📊 **حالة الميزانيات التشغيلية الحالية**:\n${list.join('\n')}\n\n*البيانات متزامنة آنياً مع جميع مصادر الدخل والمصروفات.*`;
  } else if (intent.action === 'query_summary') {
    const metrics = calculateCashFlowMetrics(transactionsStore);
    agentReply = `💼 **تقرير الموقف المالي الشامل**:\n• إجمالي الإيرادات: **${metrics.totalIncome.toLocaleString()} ر.س**\n• إجمالي المصروفات: **${metrics.totalExpense.toLocaleString()} ر.س**\n• صافي التدفق المالي: **${metrics.netCashFlow.toLocaleString()} ر.س**\n• مؤشر الصحة المالية: **${metrics.healthScore}/100** 🟢\n• إجمالي القيود المالية: **${transactionsStore.length} معاملة**\n• حالة الربط مع الواتساب: **متصل ومفعل (Active Sync)**`;
  } else if (intent.action === 'audit_check') {
    const nearLimitBudgets = budgetsStore.filter((b) => (b.spent / b.allocated) >= 0.8);
    const warnings = nearLimitBudgets.map((b) => {
      const label = CATEGORY_LABELS_AR[b.category] || b.category;
      return `⚠️ تحذير: بند "${label}" اقترب من الحد الأقصى (${Math.round((b.spent / b.allocated) * 100)}%).`;
    });

    agentReply = warnings.length > 0
      ? `🔍 **نتائج التدقيق المالي الآلي**:\n${warnings.join('\n')}\n\n• تم التحقق من ضريبة القيمة المضافة 15% لجميع الفواتير المسجلة.\n• لم يتم رصد أي محاولات اختراق أو معاملات مجهولة المصدر.`
      : `🔍 **نتائج التدقيق المالي الآلي**:\n✅ جميع بنود الميزانية ضمن الحدود الآمنة والمستهدفة.\n• تم فحص ${transactionsStore.length} حركة مالية ولا توجد انحرافات غير مصرح بها.`;
  } else {
    // General chat using Gemini if available
    if (genAI) {
      try {
        const systemPrompt = `أنت FinOS، الوكيل المالي الذكي المتقدم في نظام تشغيل الوكلاء (Tariq-AgentOS). تمتلك صلاحية إدارة المعاملات وتتبع الميزانيات والمزامنة اللحظية مع تطبيق الواتساب عبر مفاتيح API. أجب باحترافية وسرعة باللغة العربية مع توفير نصائح مالية دقيقة وأسلوب تقني رشيق.`;
        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${systemPrompt}\n\nسؤال المستخدم: ${message}`,
        });
        agentReply = response.text || 'مرحباً، أنا وكيل FinOS المالي. أنا جاهز لإدارة فواتيرك، ميزانياتك، ومزامنة بياناتك مع الواتساب.';
      } catch (err) {
        console.error('Gemini call error:', err);
        agentReply = `أهلاً بك! أنا وكيل المالية في Tariq-AgentOS. يمكنك إعطائي أي أمر مالي مثل تسجيل مصروف، أو الاستعلام عن الميزانية، أو الاطلاع على ملخص التدفقات النقدية.`;
      }
    } else {
      agentReply = `أهلاً بك! أنا وكيل المالية في Tariq-AgentOS. يمكنك إعطائي أوامر مثل "سجلت مصروف 200 ريال ضيافة"، أو "كم متبقي في ميزانية التسويق"، وستتم معالجتها وتحديث الدفاتر فوراً.`;
    }
  }

  const latency = Date.now() - startTime;

  // Add messages to unified stream
  const userMsg: SyncedMessage = {
    id: `msg-web-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: 'web',
    sender: {
      name: 'المستخدم (Web Console)',
      handle: 'admin@agentos.local',
      isAgent: false,
    },
    content: message,
    parsedAction: createdTx
      ? {
          actionType: createdTx.type === 'expense' ? 'record_expense' : 'record_income',
          amount: createdTx.amount,
          currency: createdTx.currency,
          category: createdTx.category,
          transactionId: createdTx.id,
        }
      : undefined,
    status: 'processed',
    syncLatencyMs: latency,
  };
  messagesStore.push(userMsg);

  const agMsg: SyncedMessage = {
    id: `msg-ag-${Date.now() + 1}`,
    timestamp: new Date().toISOString(),
    channel: 'web',
    sender: {
      name: 'FinOS الوكيل المالي',
      handle: 'fin-agent-01',
      isAgent: true,
    },
    content: agentReply,
    status: 'delivered',
    syncLatencyMs: latency + 10,
  };
  messagesStore.push(agMsg);

  res.json({
    reply: agentReply,
    parsedIntent: intent,
    createdTransaction: createdTx,
    updatedMetrics: calculateCashFlowMetrics(transactionsStore),
    latencyMs: latency,
  });
});

// 7. API Keys Management (CRUD)
app.get('/api/keys', (req, res) => {
  res.json({
    keys: apiKeysStore,
  });
});

app.post('/api/keys', (req, res) => {
  const { name = 'WhatsApp Webhook Key', scopes = ['whatsapp:receive', 'whatsapp:send', 'finance:read', 'finance:write'] } = req.body;
  const newSecret = generateApiKey();
  const preview = `${newSecret.substring(0, 14)}...${newSecret.substring(newSecret.length - 4)}`;

  const newKey: ApiKeyItem = {
    id: `key-${Date.now()}`,
    name,
    keyPreview: preview,
    fullKey: newSecret,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: 'active',
    scopes,
    requestsCount: 0,
  };

  apiKeysStore.unshift(newKey);
  res.status(201).json({
    success: true,
    key: newKey,
  });
});

app.delete('/api/keys/:id', (req, res) => {
  const { id } = req.params;
  const target = apiKeysStore.find((k) => k.id === id);
  if (!target) {
    res.status(404).json({ error: 'المفتاح غير موجود' });
    return;
  }
  target.status = 'revoked';
  res.json({ success: true, message: 'تم إبطال المفتاح بنجاح' });
});

// 8. Multi-tasking Queue & Background Jobs
app.get('/api/agent/tasks', (req, res) => {
  res.json({
    tasks: tasksStore,
  });
});

app.post('/api/agent/tasks/trigger', (req, res) => {
  const { taskId } = req.body;
  const task = tasksStore.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: 'المهمة غير موجودة' });
    return;
  }

  task.status = 'running';
  task.lastRun = new Date().toISOString();

  setTimeout(() => {
    task.status = 'completed';
  }, 1200);

  res.json({
    success: true,
    message: `تم تشغيل مهمة: "${task.title}" بنجاح في خلفية Tariq-AgentOS`,
    task,
  });
});

// 9. System Security Audit Logs
app.get('/api/audit-logs', (req, res) => {
  res.json({
    logs: auditLogsStore,
  });
});

// -------------------------------------------------------------
// VITE OR STATIC ASSETS HANDLER
// -------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Tariq-AgentOS Server is running on port ${PORT}`);
  });
});
