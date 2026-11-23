process.env.DISABLE_HMR = 'true';

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, FileState } from '@google/genai';
import * as XLSX from 'xlsx';
import {
  parseFinancialInput,
  calculateBudgetStatus,
  calculateCashFlowMetrics,
  generateApiKey,
  validateApiKey,
  CATEGORY_LABELS_AR,
  type ParsedFinancialIntent,
} from './src/utils/finance-engine.ts';
import { routeIncomingMessageToAgent } from './src/utils/agent-router.ts';
import {
  FABRIC_FINANCIAL_ANALYSIS_PATTERN,
  FABRIC_PATTERN_METADATA,
} from './src/utils/fabric-patterns.ts';
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

// Larger limit so the web console can upload files (base64) for the financial agent to analyze
app.use(express.json({ limit: '30mb' }));

// Initialize Gemini Client if key exists
let genAI: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
    name: 'Telegram Bot Production (@yosef0bot - وكيل التحليل المالي)',
    keyPreview: '889612139...8IVOE',
    fullKey: defaultApiKeySecret,
    botUsername: 'yosef0bot',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastUsedAt: new Date().toISOString(),
    status: 'active',
    scopes: ['telegram:receive', 'telegram:send', 'finance:read', 'finance:write'],
    requestsCount: 42,
  },
  {
    id: 'key-2',
    name: 'Telegram Internal Webhook Tester',
    keyPreview: 'agt_live_test_7f2a...88e1',
    fullKey: 'agt_live_test_7f2a4b9c1d0e88e1',
    botUsername: 'yosef0bot',
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
    name: 'وكيل التحليل المالي (FinOS Bot)',
    nameEn: 'Financial Analysis Bot (@yosef0bot)',
    role: 'إدارة العمليات المالية والتدفقات النقدية والميزانيات',
    roleEn: 'Financial Operations & Cash Flow Management',
    description: 'بوت مالي مستقل (@yosef0bot) متصل حياً بتطبيق تليجرام للتدقيق المالي، معالجة فواتير ومصروفات تليجرام، والتحليل التنبؤي للميزانية.',
    status: 'active',
    avatar: '💼',
    isSpecialist: true,
    specialty: 'finance',
    phase: 'المرحلة 1 (الوكيل النشط والمتصل بتليجرام)',
    telegramBotUsername: 'yosef0bot',
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
    description: 'يتحقق من هوية مرسلي تليجرام وتدقيق طلبات الـ Webhook والتوقيعات الرقمية ومفاتيح الـ API.',
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

const budgetsStore: BudgetCategory[] = [];

const transactionsStore: FinancialTransaction[] = [];

const messagesStore: SyncedMessage[] = [];

const tasksStore: AgentTask[] = [
  {
    id: 'task-vat',
    title: 'مراجعة وتدقيق ضريبة القيمة المضافة (VAT 15%)',
    titleEn: 'Monthly VAT 15% Reconciliation',
    agentId: 'fin-agent-01',
    type: 'scheduled',
    status: 'completed',
    lastRun: new Date().toISOString(),
    nextRun: 'مجدول تلقائياً',
    details: 'فحص المعاملات الفعلية الواردة من تليجرام والويب لحساب ضريبة الـ 15% بدقة.',
  },
  {
    id: 'task-sync-watch',
    title: 'مراقبة خط تزامن بوت تليجرام المالي',
    titleEn: 'Telegram Financial Bot Sync Stream',
    agentId: 'fin-agent-01',
    type: 'event_driven',
    status: 'running',
    lastRun: new Date().toISOString(),
    nextRun: 'مستمر (Active Stream)',
    details: 'استلام الرسائل والقيود المالية الحقيقية من تليجرام والرد الفوري عليها.',
  },
];

const auditLogsStore: SystemAuditLog[] = [];

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
    channel: newTx.source === 'telegram' ? 'telegram' : 'web',
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
async function handleChannelWebhook(req: express.Request, res: express.Response, channel: 'telegram') {
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
    // Conversational response via Gemini
    replyText = await generateConversationalFinancialReply(text, senderName, `sim-${chatId}`);
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

// -------------------------------------------------------------
// REAL TELEGRAM BOT API ENGINE (LIVE IN-TELEGRAM APP CHAT)
// Connects directly to https://api.telegram.org/bot<TOKEN>/...
// so the user chats inside the real Telegram app itself!
// -------------------------------------------------------------
interface ConnectedTelegramBot {
  agentId: string;
  botToken: string;
  maskedToken: string;
  botId: number;
  botUsername: string;
  botFirstName: string;
  connectedAt: string;
  lastUpdateId: number;
  pollingActive: boolean;
  messagesProcessed: number;
  activeChats: Array<{
    chatId: number;
    name: string;
    username?: string;
    lastMessageAt: string;
  }>;
}

const connectedTelegramBots = new Map<string, ConnectedTelegramBot>();
const pollingTimers = new Map<string, NodeJS.Timeout>();
// Tracks which agent a specific Telegram chat_id (+ optional thread_id) is currently talking to
const chatAgentSessionMap = new Map<string, string>();
// Maps newly created Telegram Forum Topic thread_id -> agentId
const dynamicTopicAgentMap = new Map<number, string>();

async function createAgentTopicsInTelegramGroup(botEntry: ConnectedTelegramBot, groupChatId: number | string) {
  const topicsToCreate = [
    { agentId: 'fin-agent-01', name: '💼 الوكيل المالي (FinOS)', welcome: '✅ تم تفعيل غرفة محادثة **الوكيل المالي (FinOS)**!\nأرسل هنا أوامرك المالية مثل:\n• /budget لعرض الميزانيات\n• /expense 250 غداء عمل\n• /summary لملخص السيولة' },
    { agentId: 'mkt-agent-02', name: '📢 وكيل التسويق (MarketOS)', welcome: '✅ تم تفعيل غرفة محادثة **وكيل التسويق الرقمي (MarketOS)**!\nأرسل هنا خطط الحملات أو استفسر عن العائد الإعلاني:\n• /campaigns لحالة الحملات\n• /roas لتحليل العائد الإعلاني\n• أو اكتب استفسارك التسويقي مباشرة' },
    { agentId: 'sales-agent-03', name: '🎯 وكيل المبيعات (SalesOS)', welcome: '✅ تم تفعيل غرفة محادثة **وكيل المبيعات والصفقات (SalesOS)**!\nأرسل هنا تفاصيل العملاء والصفقات:\n• /pipeline لمسار الصفقات\n• /quote لإنشاء عرض سعر فوري\n• /income 15000 لتوثيق دفعة عميل' },
  ];

  const createdTopics: Array<{ name: string; threadId: number; agentId: string }> = [];

  for (const item of topicsToCreate) {
    const res = await fetch(`https://api.telegram.org/bot${botEntry.botToken}/createForumTopic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupChatId,
        name: item.name,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.result?.message_thread_id) {
      const threadId = data.result.message_thread_id;
      dynamicTopicAgentMap.set(threadId, item.agentId);
      createdTopics.push({ name: item.name, threadId, agentId: item.agentId });

      // Send welcome message inside the newly created topic in Telegram
      await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: groupChatId,
          message_thread_id: threadId,
          text: item.welcome,
        }),
      }).catch(() => {});
    } else if (!res.ok || !data.ok) {
      throw new Error(
        data.description ||
          'تأكد من أن المجموعة مفعل فيها خيار المواضيع (Topics) وأن البوت مشرف (Admin) بصلاحية Manage Topics.'
      );
    }
  }

  return createdTopics;
}

// Multi-turn conversation memory per chat so the Financial Agent naturally converses back and forth
const telegramConversationMemory = new Map<
  string,
  Array<{ role: 'user' | 'model'; text: string }>
>();

// -------------------------------------------------------------
// FILE ATTACHMENTS (PDF, images, Excel, CSV, text) FOR THE FINANCIAL AGENT
// -------------------------------------------------------------
// A normalized attachment ready to be sent to Gemini.
// - Binary formats Gemini understands natively (PDF, images) are sent as inlineData.
// - Spreadsheets (xlsx/xls/ods) are converted to CSV text, because Gemini cannot read them directly.
// - Plain-text formats (csv, txt, json, md...) are decoded and sent as text.
interface AgentAttachment {
  fileName: string;
  mimeType: string;
  inlineBase64?: string;
  extractedText?: string;
  fileUri?: string; // set once the file has been uploaded to the Gemini Files API
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // Telegram bot API download limit
const MAX_EXTRACTED_TEXT_CHARS = 200_000;
const GEMINI_INLINE_MIME_PREFIXES = ['image/', 'application/pdf', 'audio/', 'video/'];
const SPREADSHEET_EXTENSIONS = ['xlsx', 'xlsm', 'xls', 'ods', 'xlsb'];
const TEXT_EXTENSIONS = ['csv', 'tsv', 'txt', 'json', 'md', 'xml', 'html', 'htm', 'log'];

// Last files received per chat, so follow-up questions ("حلل الملف", "كم المصروفات فيه؟") still see them
const chatAttachmentMemory = new Map<string, AgentAttachment[]>();
const MAX_REMEMBERED_ATTACHMENTS = 3;

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}

function truncateText(text: string): string {
  return text.length > MAX_EXTRACTED_TEXT_CHARS
    ? `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n...[تم اقتطاع بقية الملف لكبر حجمه]`
    : text;
}

function buildAttachmentFromBuffer(buffer: Buffer, fileName: string, mimeType?: string): AgentAttachment {
  const ext = getFileExtension(fileName);
  const mime = (mimeType || '').toLowerCase();

  if (
    SPREADSHEET_EXTENSIONS.includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('ms-excel')
  ) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetsText = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false });
      return `### ورقة: ${name}\n${csv}`;
    }).join('\n\n');
    return { fileName, mimeType: 'text/csv', extractedText: truncateText(sheetsText) };
  }

  if (TEXT_EXTENSIONS.includes(ext) || mime.startsWith('text/') || mime === 'application/json') {
    return { fileName, mimeType: mime || 'text/plain', extractedText: truncateText(buffer.toString('utf8')) };
  }

  const MIME_BY_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    heic: 'image/heic',
  };
  const effectiveMime = mime || MIME_BY_EXTENSION[ext] || '';
  if (GEMINI_INLINE_MIME_PREFIXES.some((p) => effectiveMime.startsWith(p))) {
    return { fileName, mimeType: effectiveMime, inlineBase64: buffer.toString('base64') };
  }

  throw new Error(
    `صيغة الملف (${ext || mime || 'غير معروفة'}) غير مدعومة حالياً. الصيغ المدعومة: PDF، صور، Excel، CSV، ملفات نصية.`
  );
}

// Downloads a document/photo attached to a Telegram message via getFile and converts it for Gemini
async function extractTelegramAttachment(botToken: string, msg: any): Promise<AgentAttachment | null> {
  let fileId: string | undefined;
  let fileName = 'file';
  let mimeType: string | undefined;
  let fileSize: number | undefined;

  if (msg.document) {
    fileId = msg.document.file_id;
    fileName = msg.document.file_name || 'document';
    mimeType = msg.document.mime_type;
    fileSize = msg.document.file_size;
  } else if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1]; // Telegram sorts sizes ascending
    fileId = largest.file_id;
    fileName = 'photo.jpg';
    mimeType = 'image/jpeg';
    fileSize = largest.file_size;
  }

  if (!fileId) return null;
  if (fileSize && fileSize > MAX_ATTACHMENT_BYTES) {
    throw new Error('حجم الملف أكبر من 20 ميجابايت، وهو الحد الأقصى الذي يسمح تليجرام للبوتات بتحميله.');
  }

  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const info = await infoRes.json();
  if (!info.ok || !info.result?.file_path) {
    throw new Error('تعذر الحصول على الملف من خوادم تليجرام.');
  }

  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${info.result.file_path}`);
  if (!fileRes.ok) {
    throw new Error('تعذر تحميل الملف من خوادم تليجرام.');
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return buildAttachmentFromBuffer(buffer, fileName, mimeType);
}

// Converts files uploaded from the web console ({ fileName, mimeType, dataBase64 }) into attachments
function parseWebAttachments(raw: unknown): AgentAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_REMEMBERED_ATTACHMENTS).map((item: any) => {
    const buffer = Buffer.from(String(item?.dataBase64 || ''), 'base64');
    if (buffer.length === 0) throw new Error('الملف المرفق فارغ.');
    if (buffer.length > MAX_ATTACHMENT_BYTES) throw new Error('حجم الملف أكبر من 20 ميجابايت.');
    return buildAttachmentFromBuffer(buffer, String(item?.fileName || 'file'), item?.mimeType);
  });
}

function rememberAttachments(chatKey: string, newAttachments: AgentAttachment[]): AgentAttachment[] {
  const existing = chatAttachmentMemory.get(chatKey) || [];
  const merged = [...existing, ...newAttachments].slice(-MAX_REMEMBERED_ATTACHMENTS);
  chatAttachmentMemory.set(chatKey, merged);
  return merged;
}

// Files above this size are uploaded through the Gemini Files API instead of being embedded in the
// request: big base64 payloads hit request-size limits and make PDF analysis fail.
const INLINE_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
const GEMINI_PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';

async function toGeminiFilePart(att: AgentAttachment): Promise<Record<string, unknown>> {
  if (!att.inlineBase64 && !att.fileUri) {
    throw new Error(`الملف ${att.fileName} فارغ.`);
  }
  const rawBytes = att.inlineBase64 ? Math.floor((att.inlineBase64.length * 3) / 4) : 0;
  if (!att.fileUri && rawBytes <= INLINE_ATTACHMENT_MAX_BYTES) {
    return { inlineData: { mimeType: att.mimeType, data: att.inlineBase64 } };
  }

  if (!att.fileUri) {
    const uploaded = await genAI!.files.upload({
      file: new Blob([Buffer.from(att.inlineBase64!, 'base64')], { type: att.mimeType }),
      config: { mimeType: att.mimeType, displayName: att.fileName },
    });
    // PDFs/videos are processed asynchronously; wait until the file is ready to be used
    let file = uploaded;
    for (let i = 0; i < 30 && file.state === FileState.PROCESSING && file.name; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      file = await genAI!.files.get({ name: file.name });
    }
    if (file.state === FileState.FAILED || !file.uri) {
      throw new Error('فشلت معالجة الملف على خوادم Gemini.');
    }
    att.fileUri = file.uri; // cached: follow-up questions reuse the upload
  }
  return { fileData: { fileUri: att.fileUri, mimeType: att.mimeType } };
}

function describeGeminiError(err: any): string {
  const status = err?.status ?? err?.code;
  const msg = String(err?.message || err || '');
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'تم تجاوز حد الاستخدام لمفتاح Gemini (Quota). انتظر قليلاً أو راجع الحصة في Google AI Studio.';
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(msg)) return 'خوادم Gemini مشغولة حالياً.';
  if (status === 413 || /too large|payload size|exceeds/i.test(msg)) return 'حجم الملف أكبر من المسموح.';
  if (/password|encrypted/i.test(msg)) return 'الملف محمي بكلمة مرور.';
  if (status === 400) return `Gemini رفض الطلب: ${msg.slice(0, 200)}`;
  if (status === 401 || status === 403) return 'مفتاح Gemini غير صالح أو لا يملك صلاحية.';
  return msg.slice(0, 200) || 'خطأ غير معروف';
}

function isRetryableGeminiError(err: any): boolean {
  const status = err?.status ?? err?.code;
  return [429, 500, 503, 504].includes(status) || /UNAVAILABLE|overloaded|INTERNAL|DEADLINE/i.test(String(err?.message || ''));
}

// Calls Gemini with a short retry on transient errors, then falls back to a second model
async function generateWithRetry(
  parts: Array<Record<string, unknown>>,
  systemInstruction: string
): Promise<{ text: string; failureReason: string }> {
  let failureReason = '';
  const models = [...new Set([GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODEL])];
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await genAI!.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction,
            ...(model.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
          },
        });
        const text = (response.text || '').trim();
        if (text) return { text, failureReason: '' };
        const finish = response.candidates?.[0]?.finishReason || response.promptFeedback?.blockReason;
        failureReason = `Gemini أعاد رداً فارغاً${finish ? ` (${finish})` : ''}.`;
        console.error(`Gemini empty response from ${model}:`, finish);
        break; // empty/blocked response: try the next model
      } catch (err: any) {
        console.error(`Gemini error from ${model} (attempt ${attempt + 1}):`, err);
        failureReason = describeGeminiError(err);
        if (!isRetryableGeminiError(err)) break;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  return { text: '', failureReason };
}

async function generateConversationalFinancialReply(
  userMessage: string,
  senderName: string,
  chatKey: string | number,
  actionExecutedSummary?: string,
  newAttachments: AgentAttachment[] = []
): Promise<string> {
  const key = String(chatKey);
  const history = telegramConversationMemory.get(key) || [];
  const attachments = newAttachments.length > 0
    ? rememberAttachments(key, newAttachments)
    : chatAttachmentMemory.get(key) || [];
  const metrics = calculateCashFlowMetrics(transactionsStore);

  const hasRealTransactions = transactionsStore.length > 0;
  const recentTxSnapshot = hasRealTransactions
    ? transactionsStore
        .slice(0, 4)
        .map((t) => `${t.type === 'income' ? 'إيراد' : 'مصروف'} ${t.amount} ر.س (${t.description})`)
        .join(' ، ')
    : 'لا توجد أي معاملات مسجلة حتى الآن';

  const conversationTranscript = history
    .slice(-10)
    .map((turn) => `${turn.role === 'user' ? `المستخدم (${senderName})` : 'أنت (الوكيل المالي)'}: ${turn.text}`)
    .join('\n');

  const realDataContext = hasRealTransactions
    ? `البيانات الفعلية التي سجلها المستخدم بنفسه حتى الآن:
   - إجمالي الإيرادات الفعلية: ${metrics.totalIncome.toLocaleString()} ر.س
   - إجمالي المصروفات الفعلية: ${metrics.totalExpense.toLocaleString()} ر.س
   - صافي السيولة الفعلية: ${metrics.netCashFlow.toLocaleString()} ر.س
   - المعاملات المسجلة: ${recentTxSnapshot}`
    : `حالة السجل المالي حالياً: فارغ وجديد تماماً (0 معاملات مسجلة، لم يدخل المستخدم أي مبالغ أو مصاريف أو إيرادات بعد).`;

  const systemInstruction = `أنت "وكيل التحليل المالي" (@yosef0bot)، مستشار ومحاور مالي ذكي وطبيعي جداً تتحدث مع "${senderName}" عبر تليجرام.
أهم قواعد أسلوبك الصارمة:
1. تحدث بأسلوب بشري طبيعي، ودود، ذكي، وتفاعلي (خذ وأعطِ في الكلام كأنك مستشار مالي وصديق خبير يجلس معه).
2. ممنوع منعاً باتاً اختلاق أو ذكر أي أرقام أو مبالغ أو عقود أو رواتب أو صفقات أو مصاريف وهمية من خيالك! لا تذكر أي رقم أو عملية مالية إلا إذا كان المستخدم نفسه قد ذكرها لك في المحادثة أو سجلها فعلياً.
3. ممنوع إرسال قوالب آلية جاهزة أو قوائم أوامر برمجية مثل (/budget, /expense, /summary) إلا إذا طلب المستخدم صراحةً معرفة الأوامر.
4. يمكنك مناقشة أي فكرة، خطة مالية، تسعير، استثمار، توفير، دراسة جدوى، تحليل مصاريف، أو الإجابة عن أي سؤال يطرحه بمرونة وذكاء وصدق تام.
5. ${realDataContext}
${actionExecutedSummary ? `6. قمتَ للتو بتنفيذ العملية الحقيقية التالية بناءً على طلب المستخدم: (${actionExecutedSummary}) — أكّد له ذلك بأسلوب طبيعي وحديث ودي.` : ''}
${attachments.length > 0 ? `7. أرسل لك المستخدم ملفات (${attachments.map((a) => a.fileName).join('، ')}) وهي مرفقة لك في هذه الرسالة. اقرأ محتواها فعلياً وحلّلها مالياً (إجماليات، إيرادات، مصروفات، أبرز البنود، ملاحظات ومخاطر، توصيات)، واعتمد فقط على الأرقام الموجودة في الملف. الأرقام الواردة في الملفات تعتبر بيانات حقيقية من المستخدم. إذا لم يذكر المستخدم طلباً محدداً فقدّم ملخصاً تحليلياً للملف.` : ''}
اجعل ردك طبيعياً، صادقاً 100% بدون أي أمثلة أو بيانات وهمية، ومترابطاً مع رسالته.`;

  const fullPrompt = conversationTranscript
    ? `سياق المحادثة السابقة:\n${conversationTranscript}\n\nرسالة المستخدم الجديدة (${senderName}): ${userMessage}`
    : `رسالة المستخدم (${senderName}): ${userMessage}`;

  let replyText = '';
  let failureReason = '';
  if (genAI) {
    try {
      // Build multimodal parts: the prompt text + every attached file (text, inline binary, or uploaded file)
      const parts: Array<Record<string, unknown>> = [{ text: fullPrompt }];
      for (const att of attachments) {
        if (att.extractedText !== undefined) {
          parts.push({ text: `\n--- محتوى الملف المرفق: ${att.fileName} ---\n${att.extractedText}\n--- نهاية الملف ---` });
        } else {
          parts.push({ text: `\n--- الملف المرفق: ${att.fileName} ---` });
          parts.push(await toGeminiFilePart(att));
        }
      }
      const result = await generateWithRetry(parts, systemInstruction);
      replyText = result.text;
      failureReason = result.failureReason;
    } catch (err: any) {
      console.error('Gemini conversational error:', err);
      failureReason = describeGeminiError(err);
    }
  }

  if (!replyText && attachments.length > 0) {
    // Forget the files that failed so they don't break every following message in this chat
    chatAttachmentMemory.delete(key);
    replyText = genAI
      ? `استلمت الملف، لكن حصل خطأ أثناء تحليله.\nالسبب: ${failureReason || 'غير معروف'}\nجرّب ترسله مرة ثانية بعد لحظات.`
      : 'استلمت الملف، لكن خدمة التحليل الذكي غير مفعّلة (مفتاح GEMINI_API_KEY غير مضبوط على الخادم)، فما أقدر أقرأ محتواه حالياً.';
  }

  if (!replyText) {
    replyText = actionExecutedSummary
      ? `تم طال عمرك! ${actionExecutedSummary}. قول لي، في بالك شيء ثاني نراجعه أو نحسبه سوا؟`
      : `أهلاً بك! أنا معك كمستشارك المالي، وجاهز نناقش أي فكرة أو خطة مالية أو نحسب أي أرقام حقيقية تطرحها بدون أي بيانات افتراضية. وش اللي في بالك نبدأ فيه؟`;
  }

  const historyUserText = newAttachments.length > 0
    ? `${userMessage} [أرفق ملف: ${newAttachments.map((a) => a.fileName).join('، ')}]`
    : userMessage;
  history.push({ role: 'user', text: historyUserText });
  history.push({ role: 'model', text: replyText });
  if (history.length > 24) {
    history.splice(0, history.length - 24);
  }
  telegramConversationMemory.set(key, history);

  return replyText;
}

async function generateTelegramAgentReply(
  text: string,
  senderName: string,
  fromHandle: string,
  chatId: number,
  _threadId?: number,
  _boundAgentId?: string,
  attachments: AgentAttachment[] = []
): Promise<{ replyText: string; createdTx: FinancialTransaction | null; targetAgentName: string; activeAgentId: string }> {
  const trimmed = text.trim();

  // A file was sent: analyze it instead of trying to parse the caption as a single transaction
  if (attachments.length > 0) {
    const replyText = await generateConversationalFinancialReply(
      trimmed || 'حلّل هذا الملف مالياً وأعطني ملخصاً واضحاً.',
      senderName,
      chatId,
      undefined,
      attachments
    );
    return {
      replyText,
      createdTx: null,
      targetAgentName: 'وكيل التحليل المالي (FinOS Bot)',
      activeAgentId: 'fin-agent-01',
    };
  }

  // Reject switching to other agents if someone clicks an old button
  if (trimmed.startsWith('/switch_')) {
    const replyText = await generateConversationalFinancialReply(
      'هل يمكنك التحدث كوكيل تسويق أو مبيعات؟ (ملاحظة: وضح للمستخدم بود أنك متخصص ومكرس هنا كوكيل ومستشار مالي له، وأن وكلاء التسويق والمبيعات مستقلون)',
      senderName,
      chatId
    );
    return {
      replyText,
      createdTx: null,
      targetAgentName: 'وكيل التحليل المالي (FinOS Bot)',
      activeAgentId: 'fin-agent-01',
    };
  }

  // Check if the message is recording an actual financial transaction (expense or income)
  const intent = parseFinancialInput(trimmed);
  let createdTx: FinancialTransaction | null = null;
  let actionExecutedSummary: string | undefined;

  if (intent.action === 'record_expense' && intent.amount) {
    createdTx = {
      id: `tx-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'expense',
      amount: intent.amount,
      currency: intent.currency || 'SAR',
      category: intent.category || 'other',
      merchantOrParty: intent.merchant || 'تطبيق تليجرام المباشر',
      description: trimmed,
      source: 'telegram',
      senderHandle: fromHandle,
      telegramChatId: chatId,
      status: 'cleared',
      agentNotes: 'تم القيد مباشرة من محادثة تليجرام.',
      synced: true,
    };
    transactionsStore.unshift(createdTx);
    adjustBudget(createdTx.category, createdTx.amount, true);

    const catLabel = CATEGORY_LABELS_AR[createdTx.category] || createdTx.category;
    const catBudget = budgetsStore.find((b) => b.category === createdTx?.category);
    const leftInfo = catBudget
      ? ` والمتبقي في ميزانية ${catLabel} الآن هو ${(catBudget.allocated - catBudget.spent).toLocaleString()} ر.س`
      : '';
    actionExecutedSummary = `تم تسجيل مصروف بمبلغ ${intent.amount.toLocaleString()} ${intent.currency} ضمن تصنيف "${catLabel}" برقم قيد #${createdTx.id}${leftInfo}`;
  } else if (intent.action === 'record_income' && intent.amount) {
    createdTx = {
      id: `tx-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      type: 'income',
      amount: intent.amount,
      currency: intent.currency || 'SAR',
      category: 'sales',
      merchantOrParty: intent.merchant || 'تحصيل عبر تليجرام',
      description: trimmed,
      source: 'telegram',
      senderHandle: fromHandle,
      telegramChatId: chatId,
      status: 'cleared',
      agentNotes: 'تم قيد الإيراد مباشرة من محادثة تليجرام.',
      synced: true,
    };
    transactionsStore.unshift(createdTx);
    const metrics = calculateCashFlowMetrics(transactionsStore);
    actionExecutedSummary = `تم تسجيل إيراد جديد بمبلغ +${intent.amount.toLocaleString()} ${intent.currency} برقم قيد #${createdTx.id} وأصبح صافي السيولة ${metrics.netCashFlow.toLocaleString()} ر.س`;
  }

  // Generate a natural, human-like conversational response via Gemini
  const replyText = await generateConversationalFinancialReply(
    trimmed,
    senderName,
    chatId,
    actionExecutedSummary
  );

  return {
    replyText,
    createdTx,
    targetAgentName: 'وكيل التحليل المالي (FinOS Bot)',
    activeAgentId: 'fin-agent-01',
  };
}

function buildTelegramInlineKeyboard(_activeAgentId?: string) {
  return {
    inline_keyboard: [
      [
        { text: '📊 الميزانيات التشغيلية', callback_data: '/budget' },
        { text: '💼 ملخص التدفق النقدي', callback_data: '/summary' },
      ],
      [
        { text: '🧾 ضريبة VAT (15%)', callback_data: '/vat' },
        { text: '📜 نمط Fabric المالي', callback_data: '/fabric' },
      ],
    ],
  };
}

async function pollSingleBotUpdates(botEntry: ConnectedTelegramBot) {
  if (!botEntry.pollingActive) return;

  try {
    const url = `https://api.telegram.org/bot${botEntry.botToken}/getUpdates?offset=${botEntry.lastUpdateId + 1}&timeout=4`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          botEntry.lastUpdateId = Math.max(botEntry.lastUpdateId, update.update_id);

          // Handle Callback Query (Inline Keyboard button clicks inside Telegram app)
          if (update.callback_query) {
            const cb = update.callback_query;
            const chatId = cb.message?.chat?.id;
            const threadId = cb.message?.message_thread_id;
            const cmdData = cb.data || '/summary';
            const senderName = cb.from?.first_name || 'مستخدم تليجرام';
            const fromHandle = cb.from?.username ? `@${cb.from.username}` : `tg_${cb.from?.id || chatId}`;

            await fetch(`https://api.telegram.org/bot${botEntry.botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cb.id }),
            }).catch(() => {});

            if (chatId) {
              await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendChatAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
              }).catch(() => {});

              const { replyText } = await generateTelegramAgentReply(
                cmdData,
                senderName,
                fromHandle,
                chatId,
                threadId,
                botEntry.agentId
              );

              await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  ...(threadId ? { message_thread_id: threadId } : {}),
                  text: replyText,
                }),
              }).catch(() => {});
            }
            continue;
          }

          // Handle standard text messages sent inside Telegram app
          const msg = update.message || update.edited_message;
          const hasFile = !!(msg?.document || (Array.isArray(msg?.photo) && msg.photo.length > 0));
          if (!msg || (!msg.text && !hasFile)) continue;

          const chatId: number = msg.chat.id;
          const threadId: number | undefined = msg.message_thread_id;
          const senderName: string = msg.from?.first_name || msg.chat?.title || 'مشرف تليجرام';
          const fromHandle: string = msg.from?.username ? `@${msg.from.username}` : `tg_${msg.from?.id || chatId}`;
          // Files arrive with an optional caption instead of text
          const text: string = msg.text || msg.caption || '';

          let attachments: AgentAttachment[] = [];
          if (hasFile) {
            try {
              const att = await extractTelegramAttachment(botEntry.botToken, msg);
              if (att) attachments = [att];
            } catch (fileErr: any) {
              await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  ...(threadId ? { message_thread_id: threadId } : {}),
                  text: `⚠️ ما قدرت أقرأ الملف: ${fileErr?.message || 'خطأ غير معروف'}`,
                }),
              }).catch(() => {});
              continue;
            }
          }

          // Record active Telegram chat
          const existingChat = botEntry.activeChats.find((c) => c.chatId === chatId);
          if (existingChat) {
            existingChat.lastMessageAt = new Date().toISOString();
            existingChat.name = msg.chat?.title || senderName;
          } else {
            botEntry.activeChats.unshift({
              chatId,
              name: msg.chat?.title || senderName,
              username: msg.from?.username,
              lastMessageAt: new Date().toISOString(),
            });
          }

          // Show real-time "typing..." indicator in Telegram while generating response
          await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              ...(threadId ? { message_thread_id: threadId } : {}),
              action: 'typing',
            }),
          }).catch(() => {});

          // Special command /setup_topics inside a Telegram Forum Group
          if (text.trim().startsWith('/setup_topics')) {
            try {
              const created = await createAgentTopicsInTelegramGroup(botEntry, chatId);
              await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `🎉 تم إنشاء ${created.length} محادثات/مواضيع مستقلة للوكلاء داخل هذه المجموعة بنجاح:\n${created.map((c) => `• ${c.name} (Topic #${c.threadId})`).join('\n')}`,
                }),
              });
            } catch (e: any) {
              await fetch(`https://api.telegram.org/bot${botEntry.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `⚠️ لم نتمكن من إنشاء المواضيع تلقائياً: ${e?.message || ''}`,
                }),
              });
            }
            continue;
          }

          const { replyText, createdTx, targetAgentName } = await generateTelegramAgentReply(
            text,
            senderName,
            fromHandle,
            chatId,
            threadId,
            botEntry.agentId,
            attachments
          );

          botEntry.messagesProcessed += 1;

          messagesStore.push({
            id: `msg-tg-live-${Date.now()}`,
            timestamp: new Date().toISOString(),
            channel: 'telegram',
            sender: { name: senderName, handle: fromHandle, isAgent: false },
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
            syncLatencyMs: 18,
          });

          messagesStore.push({
            id: `msg-ag-live-${Date.now() + 1}`,
            timestamp: new Date().toISOString(),
            channel: 'telegram',
            sender: { name: targetAgentName, handle: `@${botEntry.botUsername}`, isAgent: true },
            telegramThreadId: threadId,
            content: replyText,
            status: 'delivered',
            syncLatencyMs: 22,
          });

          auditLogsStore.unshift({
            id: `log-tg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            channel: 'telegram',
            event: `Real Telegram App Message (@${botEntry.botUsername}) -> ${targetAgentName}`,
            ip: 'api.telegram.org',
            status: 'success',
            tokenUsed: botEntry.maskedToken,
            latencyMs: 21,
          });

          const showInlineMenu = text.trim() === '/menu' || text.trim() === '/commands';

          await sendLongTelegramMessage(botEntry.botToken, chatId, threadId, replyText, showInlineMenu);
        }
      }
    }
  } catch (err) {
    // Transient network error, continue polling on next tick
  } finally {
    if (botEntry.pollingActive) {
      const t = setTimeout(() => pollSingleBotUpdates(botEntry), 1200);
      pollingTimers.set(botEntry.agentId, t);
    }
  }
}

// Telegram rejects messages over 4096 chars; file analyses are often longer, so split them
async function sendLongTelegramMessage(
  botToken: string,
  chatId: number,
  threadId: number | undefined,
  text: string,
  showInlineMenu = false
) {
  const LIMIT = 4000;
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > LIMIT) {
    let cut = remaining.lastIndexOf('\n', LIMIT);
    if (cut < LIMIT / 2) cut = LIMIT;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n+/, '');
  }
  chunks.push(remaining);

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        ...(threadId ? { message_thread_id: threadId } : {}),
        text: chunks[i],
        ...(isLast && showInlineMenu ? { reply_markup: buildTelegramInlineKeyboard() } : {}),
      }),
    }).catch(() => {});
  }
}


// Get status of all connected real Telegram bots
app.get('/api/telegram/bots', (req, res) => {
  const list = Array.from(connectedTelegramBots.values()).map((b) => ({
    agentId: b.agentId,
    maskedToken: b.maskedToken,
    botId: b.botId,
    botUsername: b.botUsername,
    botFirstName: b.botFirstName,
    connectedAt: b.connectedAt,
    pollingActive: b.pollingActive,
    messagesProcessed: b.messagesProcessed,
    activeChats: b.activeChats,
  }));
  res.json({
    ok: true,
    bots: list,
  });
});

// Connect a real Telegram Bot via @BotFather token so chat happens in Telegram itself
app.post('/api/telegram/connect', async (req, res) => {
  const { botToken = '', agentId = 'fin-agent-01' } = req.body;
  const cleanToken = String(botToken).trim();

  if (!cleanToken || !cleanToken.includes(':')) {
    res.status(400).json({
      ok: false,
      error: 'صيغة توكن تليجرام غير صحيحة. يجب أن يكون التوكن مستخرجاً من @BotFather مثل: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ',
    });
    return;
  }

  try {
    // 1. Verify token with real Telegram Bot API (getMe)
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();

    if (!meRes.ok || !meData.ok || !meData.result) {
      res.status(400).json({
        ok: false,
        error: meData.description || 'رفضت خوادم تليجرام هذا التوكن. تأكد من نسخ التوكن الصحيح من @BotFather.',
      });
      return;
    }

    const botInfo = meData.result;
    const realUsername: string = botInfo.username;
    const realFirstName: string = botInfo.first_name || 'Tariq OS Bot';

    // 2. Delete any old webhook so real-time Long Polling works immediately inside Telegram
    await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`, {
      method: 'POST',
    }).catch(() => {});

    // 3. Register Arabic slash commands menu inside the real Telegram app (Financial Agent only)
    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'بدء المحادثة مع وكيل التحليل المالي' },
          { command: 'budget', description: 'تقرير الميزانيات التشغيلية والمتبقي' },
          { command: 'summary', description: 'ملخص التدفق النقدي وصافي السيولة' },
          { command: 'expense', description: 'تسجيل مصروف فوري (مثال: /expense 250 غداء)' },
          { command: 'income', description: 'تسجيل إيراد جديد (مثال: /income 15000 دفعة)' },
          { command: 'vat', description: 'فحص ضريبة القيمة المضافة 15%' },
          { command: 'fabric', description: 'تحليل استراتيجي بنمط Fabric المالي' },
        ],
      }),
    }).catch(() => {});

    // Stop any previous polling timer for this agent
    const oldEntry = connectedTelegramBots.get(agentId);
    if (oldEntry) {
      oldEntry.pollingActive = false;
    }
    const oldTimer = pollingTimers.get(agentId);
    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    const maskedToken = `${cleanToken.slice(0, 9)}...${cleanToken.slice(-5)}`;
    const newEntry: ConnectedTelegramBot = {
      agentId,
      botToken: cleanToken,
      maskedToken,
      botId: botInfo.id,
      botUsername: realUsername,
      botFirstName: realFirstName,
      connectedAt: new Date().toISOString(),
      lastUpdateId: 0,
      pollingActive: true,
      messagesProcessed: 0,
      activeChats: [],
    };

    connectedTelegramBots.set(agentId, newEntry);

    // Update agent profile username & activate it in memory
    const targetAgent = agentsStore.find((a) => a.id === agentId);
    if (targetAgent) {
      targetAgent.telegramBotUsername = realUsername;
      targetAgent.status = 'active';
    }

    // Start live polling from api.telegram.org
    pollSingleBotUpdates(newEntry);

    auditLogsStore.unshift({
      id: `log-connect-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: 'telegram',
      event: `Connected Live Telegram Bot @${realUsername} (${realFirstName})`,
      ip: 'api.telegram.org',
      status: 'success',
      tokenUsed: maskedToken,
      latencyMs: 35,
    });

    res.json({
      ok: true,
      bot: {
        agentId,
        botId: newEntry.botId,
        botUsername: newEntry.botUsername,
        botFirstName: newEntry.botFirstName,
        maskedToken: newEntry.maskedToken,
        connectedAt: newEntry.connectedAt,
        pollingActive: true,
        directUrl: `https://t.me/${realUsername}?start=welcome`,
        nativeAppUrl: `tg://resolve?domain=${realUsername}&start=welcome`,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: `تعذر الاتصال بخوادم تليجرام: ${err?.message || 'خطأ في الشبكة'}`,
    });
  }
});

// Auto-create 3 separate Forum Topics (Chat Rooms) for Finance, Marketing, and Sales in a Telegram Supergroup
app.post('/api/telegram/create-topics', async (req, res) => {
  const { groupChatId } = req.body;
  const botEntry = Array.from(connectedTelegramBots.values())[0];

  if (!botEntry) {
    res.status(400).json({
      ok: false,
      error: 'يرجى ربط توكن البوت من @BotFather أولاً في الأعلى.',
    });
    return;
  }

  // Find a group chat ID from activeChats if not explicitly passed
  const detectedGroupChat = botEntry.activeChats.find((c) => String(c.chatId).startsWith('-'));
  const targetChatId = groupChatId || detectedGroupChat?.chatId;

  if (!targetChatId) {
    res.status(400).json({
      ok: false,
      error: `أضف البوت @${botEntry.botUsername} كمشرف (Admin) في مجموعتك في تليجرام وأرسل داخل المجموعة الأمر /setup_topics ليقوم البوت بإنشاء محادثة مستقلة لكل وكيل تلقائياً.`,
    });
    return;
  }

  try {
    const created = await createAgentTopicsInTelegramGroup(botEntry, targetChatId);
    res.json({
      ok: true,
      topics: created,
      message: `تم إنشاء ${created.length} محادثات/مواضيع مستقلة للوكلاء داخل مجموعتك في تليجرام بنجاح!`,
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err?.message || 'تعذر إنشاء المواضيع في مجموعة تليجرام.',
    });
  }
});

// Disconnect a live Telegram bot
app.post('/api/telegram/disconnect', (req, res) => {
  const { agentId = 'fin-agent-01' } = req.body;
  const entry = connectedTelegramBots.get(agentId);
  if (entry) {
    entry.pollingActive = false;
    connectedTelegramBots.delete(agentId);
  }
  const timer = pollingTimers.get(agentId);
  if (timer) {
    clearTimeout(timer);
    pollingTimers.delete(agentId);
  }
  res.json({ ok: true });
});

// Send a financial report directly to the user's real Telegram app chat
app.post('/api/telegram/send-report', async (req, res) => {
  const { agentId = 'fin-agent-01', chatId } = req.body;
  const entry = connectedTelegramBots.get(agentId) || Array.from(connectedTelegramBots.values())[0];

  if (!entry) {
    res.status(400).json({
      ok: false,
      error: 'يرجى ربط توكن البوت من @BotFather أولاً لإرسال التقارير إلى تطبيق تليجرام.',
    });
    return;
  }

  const targetChatId = chatId || entry.activeChats[0]?.chatId;
  if (!targetChatId) {
    res.status(400).json({
      ok: false,
      error: `افتح المحادثة مع @${entry.botUsername} في تطبيق تليجرام واضغط Start أولاً ليتمكن البوت من مراسلتك.`,
    });
    return;
  }

  const metrics = calculateCashFlowMetrics(transactionsStore);
  const reportText = `📊 تقرير مالي فوري من نظام Tariq-AgentOS:\n\n• إجمالي الإيرادات: +${metrics.totalIncome.toLocaleString()} ر.س\n• إجمالي المصروفات: -${metrics.totalExpense.toLocaleString()} ر.س\n• صافي التدفق النقدي: ${metrics.netCashFlow.toLocaleString()} ر.س\n• مؤشر الصحة المالية: ${metrics.healthScore}/100 🟢\n• عدد المعاملات المسجلة: ${transactionsStore.length}\n\nيمكنك الرد هنا مباشرة في تليجرام بأي أمر مثل /expense أو /budget.`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${entry.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: reportText,
      }),
    });
    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      res.status(400).json({ ok: false, error: tgData.description || 'فشل إرسال الرسالة إلى تليجرام' });
      return;
    }

    res.json({
      ok: true,
      message: `تم إرسال التقرير المالي مباشرة إلى محادثتك في تطبيق تليجرام (@${entry.botUsername})!`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'فشل الاتصال بتليجرام' });
  }
});

// Auto-connect the Financial Analysis Agent Telegram Bot (@yosef0bot) on server startup
const defaultFinBotToken =
  process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.includes(':')
    ? process.env.TELEGRAM_BOT_TOKEN.trim()
    : '8896121398:AAEl63Xn_wGIXQqCbnbw5v1vIWORIN8IVOE';

const defaultWebhookUrl =
  process.env.TELEGRAM_WEBHOOK_URL ||
  'https://ais-dev-q2x6gzcx2p4qym6t3mp7a7-248609321129.europe-west2.run.app/api/telegram/webhook';

let currentTelegramMode: 'webhook' | 'polling' = 'polling';

async function bootstrapDefaultFinancialTelegramBot(token: string) {
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await meRes.json();
    if (data?.ok && data.result) {
      // 1. Clear any webhook that might be blocked by preview proxy (302 Found), keeping pending updates so queued messages are answered immediately
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        method: 'POST',
      }).catch(() => {});

      // 2. Set commands menu in Telegram
      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'بدء المحادثة مع وكيل التحليل المالي' },
            { command: 'budget', description: 'تقرير الميزانيات التشغيلية والمتبقي' },
            { command: 'summary', description: 'ملخص التدفق النقدي وصافي السيولة' },
            { command: 'expense', description: 'تسجيل مصروف فوري (مثال: /expense 250 غداء)' },
            { command: 'income', description: 'تسجيل إيراد جديد (مثال: /income 15000 دفعة)' },
            { command: 'vat', description: 'فحص ضريبة القيمة المضافة 15%' },
            { command: 'fabric', description: 'تحليل استراتيجي بنمط Fabric المالي' },
          ],
        }),
      }).catch(() => {});

      const entry: ConnectedTelegramBot = {
        agentId: 'fin-agent-01',
        botToken: token,
        maskedToken: `${token.slice(0, 9)}...${token.slice(-5)}`,
        botId: data.result.id,
        botUsername: data.result.username,
        botFirstName: data.result.first_name || 'وكيل التحليل المالي',
        connectedAt: new Date().toISOString(),
        lastUpdateId: 0,
        pollingActive: true,
        messagesProcessed: 0,
        activeChats: [],
      };
      connectedTelegramBots.set('fin-agent-01', entry);
      if (agentsStore[0]) {
        agentsStore[0].telegramBotUsername = data.result.username;
        agentsStore[0].name = `${data.result.first_name || 'وكيل التحليل المالي'} (@${data.result.username})`;
      }

      auditLogsStore.unshift({
        id: `log-poll-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        channel: 'telegram',
        event: `Connected Live Financial Telegram Bot @${data.result.username} (Active Long Polling)`,
        ip: 'api.telegram.org',
        status: 'success',
        tokenUsed: entry.maskedToken,
        latencyMs: 35,
      });

      // 3. Start Long Polling loop immediately to process pending and live messages
      pollSingleBotUpdates(entry);
    }
  } catch (err) {
    console.error('Failed to bootstrap Telegram bot:', err);
  }
}

bootstrapDefaultFinancialTelegramBot(defaultFinBotToken);

// 5. Official Telegram Inbound Webhook Endpoint (Production Event-Driven)
app.post('/api/telegram/webhook', async (req, res) => {
  const startTime = Date.now();
  const update = req.body;

  if (!update || typeof update !== 'object') {
    res.status(400).json({ ok: false, error: 'Empty update payload' });
    return;
  }

  const botEntry = connectedTelegramBots.get('fin-agent-01');
  const token = botEntry?.botToken || defaultFinBotToken;

  // Case A: Handle Callback Query (inline keyboard button click in Telegram)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const threadId = cb.message?.message_thread_id;
    const cmdData = cb.data || '/summary';
    const senderName = cb.from?.first_name || 'مستخدم تليجرام';
    const fromHandle = cb.from?.username ? `@${cb.from.username}` : `tg_${cb.from?.id || chatId}`;

    // Acknowledge callback immediately to clear loading state in Telegram
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cb.id }),
    }).catch(() => {});

    if (chatId) {
      const { replyText } = await generateTelegramAgentReply(
        cmdData,
        senderName,
        fromHandle,
        chatId,
        threadId,
        'fin-agent-01'
      );

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          ...(threadId ? { message_thread_id: threadId } : {}),
          text: replyText,
        }),
      }).catch(() => {});
    }

    res.json({ ok: true });
    return;
  }

  // Case B: Handle Text Message
  const msg = update.message || update.edited_message;
  const hasFile = !!(msg?.document || (Array.isArray(msg?.photo) && msg.photo.length > 0));
  if (!msg || (!msg.text && !hasFile)) {
    // Fallback if someone sends synthetic payload
    if (req.body.text) {
      await handleChannelWebhook(req, res, 'telegram');
      return;
    }
    res.json({ ok: true, message: 'Non-text update ignored' });
    return;
  }

  const chatId: number = msg.chat.id;
  const threadId: number | undefined = msg.message_thread_id;
  const senderName: string = msg.from?.first_name || msg.chat?.title || 'مستخدم تليجرام';
  const fromHandle: string = msg.from?.username ? `@${msg.from.username}` : `tg_${msg.from?.id || chatId}`;
  const text: string = msg.text || msg.caption || '';

  let attachments: AgentAttachment[] = [];
  if (hasFile) {
    try {
      const att = await extractTelegramAttachment(token, msg);
      if (att) attachments = [att];
    } catch (fileErr: any) {
      await sendLongTelegramMessage(token, chatId, threadId, `⚠️ ما قدرت أقرأ الملف: ${fileErr?.message || 'خطأ غير معروف'}`);
      res.json({ ok: true, message: 'File could not be processed' });
      return;
    }
  }

  const { replyText, createdTx, targetAgentName } = await generateTelegramAgentReply(
    text,
    senderName,
    fromHandle,
    chatId,
    threadId,
    'fin-agent-01',
    attachments
  );

  const latency = Date.now() - startTime;

  if (botEntry) {
    botEntry.messagesProcessed += 1;
    const existing = botEntry.activeChats.find((c) => c.chatId === chatId);
    if (existing) {
      existing.lastMessageAt = new Date().toISOString();
      existing.name = msg.chat?.title || senderName;
    } else {
      botEntry.activeChats.unshift({
        chatId,
        name: msg.chat?.title || senderName,
        username: msg.from?.username,
        lastMessageAt: new Date().toISOString(),
      });
    }
  }

  messagesStore.push({
    id: `msg-tg-wh-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: 'telegram',
    sender: { name: senderName, handle: fromHandle, isAgent: false },
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
  });

  messagesStore.push({
    id: `msg-ag-wh-${Date.now() + 1}`,
    timestamp: new Date().toISOString(),
    channel: 'telegram',
    sender: { name: targetAgentName, handle: `@${botEntry?.botUsername || 'yosef0bot'}`, isAgent: true },
    telegramThreadId: threadId,
    content: replyText,
    status: 'delivered',
    syncLatencyMs: latency + 8,
  });

  auditLogsStore.unshift({
    id: `log-wh-${Date.now()}`,
    timestamp: new Date().toISOString(),
    channel: 'telegram',
    event: `Telegram Production Webhook: message from ${fromHandle}`,
    ip: req.ip || 'api.telegram.org',
    status: 'success',
    latencyMs: latency,
  });

  // Reply back to user via Telegram Bot API
  const showInlineMenu = text.trim() === '/menu' || text.trim() === '/commands';
  await sendLongTelegramMessage(token, chatId, threadId, replyText, showInlineMenu);

  res.json({
    ok: true,
    targetAgent: targetAgentName,
    latencyMs: latency,
  });
});

// Endpoint to inspect Telegram Webhook Info & Switch Mode
app.get('/api/telegram/webhook-info', async (_req, res) => {
  const botEntry = connectedTelegramBots.get('fin-agent-01');
  const token = botEntry?.botToken || defaultFinBotToken;
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const tgData = await tgRes.json();
    res.json({
      ok: true,
      mode: currentTelegramMode,
      activeWebhookUrl: defaultWebhookUrl,
      telegramWebhookInfo: tgData?.result || null,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch webhook info' });
  }
});


// Multi-Agent Specialty Response Generator for Web Console
async function generateAgentResponseBySpecialty(
  agentId: string,
  userMessage: string,
  history: Array<{ role: string; text: string }> = []
): Promise<{ reply: string; agentName: string }> {
  const agent = agentsStore.find((a) => a.id === agentId) || agentsStore[0];

  let systemInstruction = '';
  if (agentId === 'mkt-agent-02') {
    systemInstruction = `أنت "وكيل التسويق الرقمي" (MarketOS Bot) في منظومة Tariq-AgentOS.
دورك: مستشار تسويقي محترف وخبير في إطلاق الحملات الإعلانية الممولة (سناب شات، تيك توك، جوجل، إنستغرام)، تحسين العائد على الإنفاق الإعلاني (ROAS)، تخفيض تكلفة الاستحواذ (CAC)، وصياغة الرسائل الإعلانية الجذابة.
أسلوبك: تفاعلي، ذكي، مقنع، يطرح أفكاراً عملية وخطوات واضحة بالأرقام والنسب. تدرك أنك تعمل بتكامل مع الوكيل المالي (@yosef0bot) لطلب اعتمادات الميزانية.`;
  } else if (agentId === 'sales-agent-03') {
    systemInstruction = `أنت "وكيل المبيعات والصفقات" (SalesOS Bot) في منظومة Tariq-AgentOS.
دورك: خبير إغلاق الصفقات، إدارة مسار المبيعات (Pipeline)، تأهيل العملاء المحتملين، صياغة عروض الأسعار التنافسية، والتعامل مع اعتراضات العملاء.
أسلوبك: واثق، احترافي، يركز على القيمة، ويوضح كيفية تحويل الفرص إلى إيرادات مغلقة تمرر تلقائياً إلى الوكيل المالي.`;
  } else if (agentId === 'orch-agent-04') {
    systemInstruction = `أنت "منسق المهام والراوتر المركزي" (Kernel Dispatcher) في منظومة Tariq-AgentOS.
دورك: نواة المنظومة الذكية، تحلل احتياجات المستخدم، توزع المهام بين الوكيل المالي (@yosef0bot)، وكيل التسويق (MarketOS)، ووكيل المبيعات (SalesOS)، وتقدم رؤية استراتيجية شمولية للأعمال.
أسلوبك: تنظيمي، استراتيجي، يعطي خارطة طريق واضحة لكل قسم في الشركة.`;
  } else {
    systemInstruction = `أنت "وكيل التحليل المالي" (@yosef0bot) في منظومة Tariq-AgentOS، خبير ومستشار مالي يقدم استشارات مالية وإدارة نفقات ذكية ودقيقة.`;
  }

  const transcript = history
    .slice(-8)
    .map((turn) => `${turn.role === 'user' ? 'المستخدم' : agent.name}: ${turn.text}`)
    .join('\n');

  const fullPrompt = transcript
    ? `سياق المحادثة:\n${transcript}\n\nرسالة المستخدم: ${userMessage}`
    : `رسالة المستخدم: ${userMessage}`;

  let replyText = '';
  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: fullPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      replyText = (response.text || '').trim();
    } catch (err) {
      console.error(`Gemini error for agent ${agentId}:`, err);
    }
  }

  // Intelligent fallback if Gemini was offline
  if (!replyText) {
    if (agentId === 'mkt-agent-02') {
      replyText = `أهلاً بك! بصفتي وكيل التسويق الرقمي (MarketOS):
لقد حللت استفسارك التسويقي بعناية. لتعظيم نتائج حملاتك ورفع معدل العائد (ROAS):
1. **استهداف المنصات**: نوصي بالتركيز على تيك توك وسناب شات للفيديو القصير، وإعلانات جوجل للبحث المباشر.
2. **صياغة العرض (Hook & Offer)**: التركيز على حل المشكلة فورياً في أول 3 ثوانٍ.
3. **التكامل المالي**: سننسق الميزانية المطلوبة مباشرة مع الوكيل المالي في Tariq-AgentOS لضمان كفاءة الإنفاق.
كيف ترغب في بدء صياغة الحملة أو حساب الميزانية المخصصة؟`;
    } else if (agentId === 'sales-agent-03') {
      replyText = `مرحباً بك! أنا وكيل المبيعات والصفقات (SalesOS):
بخصوص استفسارك، إليك خطة العمل المباشرة لإتمام الصفقات:
1. **تأهيل العميل**: التحقق من الميزانية، وصانع القرار، والجدول الزمني (BANT Framework).
2. **عرض السعر**: صياغة عرض ذي قيمة واضحة يبرز العائد الاستثماري للعميل.
3. **المتابعة والإغلاق**: جدولة نقاط اتصال محددة وإرسال نموذج الفاتورة الأولية للوكيل المالي لاعتمادها.
هل نجهز عرض سعر محدد أو نناقش اعتراضات العميل الحالية؟`;
    } else if (agentId === 'orch-agent-04') {
      replyText = `أهلاً بك! بصفتي منسق المهام والراوتر المركزي (Kernel Dispatcher):
استلمت طلبك وجارٍ توجيهه وتنسيقه عبر نواة Tariq-AgentOS:
- **المسار المالي**: يُوجّه إلى الوكيل المالي (@yosef0bot) لفحص التدفقات والاعتمادات.
- **مسار النمو**: يُوجّه إلى وكيل التسويق (MarketOS) لتوسيع نطاق الحملات.
- **مسار الإيراد**: يُوجّه إلى وكيل المبيعات (SalesOS) لمتابعة التحويلات.
كل الوكلاء متناغمون على نفس قاعدة البيانات. ما هي الخطوة ذات الأولوية القصوى لديك الآن؟`;
    } else {
      replyText = `مرحباً بك، أنا الوكيل المالي في Tariq-AgentOS. أنا جاهز لمساعدتك في تدقيق المصروفات، فحص الميزانية، وتسجيل المعاملات المالية ومزامنتها فوراً مع تليجرام.`;
    }
  }

  return { reply: replyText, agentName: agent.name };
}

// 6. Agent Frontend Chat (Web Console)
app.post('/api/agent/chat', async (req, res) => {
  const startTime = Date.now();
  const { message = '', history = [], agentId = 'fin-agent-01', attachments: rawAttachments } = req.body;

  let webAttachments: AgentAttachment[] = [];
  try {
    webAttachments = parseWebAttachments(rawAttachments);
  } catch (fileErr: any) {
    res.status(400).json({ error: fileErr?.message || 'تعذر قراءة الملف المرفق' });
    return;
  }

  if (!message.trim() && webAttachments.length === 0) {
    res.status(400).json({ error: 'الرسالة مطلوبة' });
    return;
  }

  const selectedAgent = agentsStore.find((a) => a.id === agentId) || agentsStore[0];
  let agentReply = '';
  let createdTx: FinancialTransaction | null = null;
  let intent: ParsedFinancialIntent = { action: 'general_query', confidence: 1 };

  if (agentId === 'fin-agent-01' && webAttachments.length > 0) {
    // Uploaded file(s): let the financial agent read and analyze them
    agentReply = await generateConversationalFinancialReply(
      message.trim() || 'حلّل هذا الملف مالياً وأعطني ملخصاً واضحاً.',
      'المستخدم',
      'web-console',
      undefined,
      webAttachments
    );
  } else if (agentId === 'fin-agent-01') {
    // Parse financial intent
    intent = parseFinancialInput(message);

    // Generate conversational response via Gemini (while still executing any recorded expense/income)
    let actionSummary: string | undefined;
    if (intent.action === 'record_expense' && intent.amount) {
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
        agentNotes: 'تم تسجيل المعاملة مباشرة من خلال شات واجهة الويب.',
        synced: true,
      };
      transactionsStore.unshift(createdTx);
      adjustBudget(createdTx.category, createdTx.amount, true);
      const catLabel = CATEGORY_LABELS_AR[createdTx.category] || createdTx.category;
      actionSummary = `تم تسجيل مصروف ${intent.amount.toLocaleString()} ${intent.currency} في تصنيف ${catLabel}`;
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
      actionSummary = `تم تسجيل إيراد +${intent.amount.toLocaleString()} ${intent.currency}`;
    }

    agentReply = await generateConversationalFinancialReply(
      message,
      'المستخدم',
      'web-console',
      actionSummary
    );
  } else {
    // Specialist agent response
    const agentRes = await generateAgentResponseBySpecialty(agentId, message, history);
    agentReply = agentRes.reply;
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
    content: webAttachments.length > 0
      ? `📎 ${webAttachments.map((a) => a.fileName).join('، ')}${message.trim() ? `\n${message}` : ''}`
      : message,
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
      name: selectedAgent.name,
      handle: selectedAgent.id,
      isAgent: true,
    },
    content: agentReply,
    status: 'delivered',
    syncLatencyMs: latency + 10,
  };
  messagesStore.push(agMsg);

  // Real-time two-way synchronization: forward message and agent reply to connected Telegram chat(s)
  const finBot = connectedTelegramBots.get('fin-agent-01') || Array.from(connectedTelegramBots.values())[0];
  if (finBot && finBot.activeChats && finBot.activeChats.length > 0) {
    for (const chat of finBot.activeChats) {
      try {
        // Forward user's web message to Telegram
        await fetch(`https://api.telegram.org/bot${finBot.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chat.chatId,
            text: `🌐 [رسالة من واجهة الموقع]:\n${userMsg.content}`,
          }),
        }).catch(() => {});

        // Forward agent's reply to Telegram (split if longer than Telegram's limit)
        await sendLongTelegramMessage(finBot.botToken, chat.chatId, undefined, `💼 [${selectedAgent.name}]:\n${agentReply}`);
      } catch (err) {
        console.error('Failed to sync message to Telegram:', err);
      }
    }
  }

  res.json({
    reply: agentReply,
    agentId: selectedAgent.id,
    agentName: selectedAgent.name,
    parsedIntent: intent,
    createdTransaction: createdTx,
    updatedMetrics: calculateCashFlowMetrics(transactionsStore),
    latencyMs: latency,
  });
});

// Endpoint to fetch Daniel Miessler's Fabric Pattern for Financial Analysis
app.get('/api/patterns/analyze_financial', (req, res) => {
  res.json({
    ok: true,
    metadata: FABRIC_PATTERN_METADATA,
    systemPrompt: FABRIC_FINANCIAL_ANALYSIS_PATTERN,
  });
});

// 7. API Keys Management (CRUD)
app.get('/api/keys', (req, res) => {
  res.json({
    keys: apiKeysStore,
  });
});

app.post('/api/keys', (req, res) => {
  const { name = 'Telegram Webhook Key', scopes = ['telegram:receive', 'telegram:send', 'finance:read', 'finance:write'] } = req.body;
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
