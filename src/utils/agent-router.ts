import type { AgentProfile, AgentRoutingResult, AgentSpecialty } from '../types/index';

/**
 * Keywords for intent classification and multi-agent dispatching
 */
export const ROUTING_KEYWORDS: Record<AgentSpecialty, string[]> = {
  marketing: [
    'تسويق', 'حملة', 'اعلانات', 'إعلانات', 'سناب شات', 'تيك توك', 'جوجل ادز',
    'roas', 'cpc', 'محتوى', 'سوشيال', 'marketing', 'campaign', 'ads', 'seo', 'social'
  ],
  sales: [
    'مبيعات', 'صفقة', 'عميل جديد', 'إغلاق صفقة', 'عرض سعر', 'crm', 'خط المبيعات',
    'pipeline', 'lead', 'deals', 'quota', 'sales', 'quotation'
  ],
  finance: [
    'مصروف', 'دفعت', 'فاتورة', 'ميزانية', 'ريال', 'دولار', 'حساب', 'ضريبة',
    'إيراد', 'ايراد', 'دخل', 'تحصيل', 'كاش', 'تدفق', 'expense', 'budget', 'invoice', 'vat', 'cashflow'
  ],
  operations: ['عمليات', 'مهام', 'جدولة', 'سيرفر', 'بنية تحتية', 'توزيع', 'orchestration'],
  security: ['أمان', 'مفتاح', 'api key', 'تحقق', 'تشفير', 'صلاحيات', 'security'],
  support: ['دعم', 'شكوى', 'تذكرة', 'مساعدة', 'عملاء', 'support', 'ticket'],
  custom: [],
};

/**
 * Telegram Slash Commands Map
 */
export const TELEGRAM_COMMAND_MAP: Record<string, AgentSpecialty> = {
  '/fin': 'finance',
  '/budget': 'finance',
  '/expense': 'finance',
  '/vat': 'finance',
  '/income': 'finance',
  '/mkt': 'marketing',
  '/marketing': 'marketing',
  '/campaigns': 'marketing',
  '/ads': 'marketing',
  '/sales': 'sales',
  '/pipeline': 'sales',
  '/deals': 'sales',
  '/quote': 'sales',
};

/**
 * Hashtags and Prefix triggers for Telegram chats
 */
export const AGENT_PREFIX_MAP: Record<string, AgentSpecialty> = {
  '#fin': 'finance',
  '#مالية': 'finance',
  '#finance': 'finance',
  '#ميزانية': 'finance',
  '#mkt': 'marketing',
  '#marketing': 'marketing',
  '#تسويق': 'marketing',
  '#حملة': 'marketing',
  '#sales': 'sales',
  '#مبيعات': 'sales',
  '#صفقة': 'sales',
  '#ops': 'operations',
  '#عمليات': 'operations',
};

/**
 * Supergroup Forum Topic Thread IDs
 * In Telegram Forum Supergroups, each topic has a unique message_thread_id
 */
export const TELEGRAM_TOPIC_THREAD_MAP: Record<number, AgentSpecialty> = {
  101: 'finance',   // Topic: #المالية والمصروفات
  102: 'marketing', // Topic: #التسويق والحملات
  103: 'sales',     // Topic: #المبيعات والصفقات
};

/**
 * Intelligent Kernel Router: inspects message text, commands, and thread ID
 * Supports:
 * 1) Telegram Slash Commands (/budget, /mkt, /sales, /expense)
 * 2) Telegram Forum Supergroup Topic IDs (message_thread_id: 101, 102, 103)
 * 3) Explicit Hashtag prefixes (#مالية, #تسويق, #مبيعات)
 * 4) AI Semantic Intent Classification
 */
export function routeIncomingMessageToAgent(
  text: string,
  agents: AgentProfile[],
  messageThreadId?: number
): AgentRoutingResult {
  const trimmed = text.trim();
  const normalized = trimmed.toLowerCase();

  // Find agents by specialty
  const financeAgent = agents.find((a) => a.specialty === 'finance') || agents[0];
  const marketingAgent = agents.find((a) => a.specialty === 'marketing');
  const salesAgent = agents.find((a) => a.specialty === 'sales');

  // Check 1: Telegram Supergroup Forum Topic ID
  if (messageThreadId && TELEGRAM_TOPIC_THREAD_MAP[messageThreadId]) {
    const specialty = TELEGRAM_TOPIC_THREAD_MAP[messageThreadId];
    if (specialty === 'marketing' && marketingAgent) {
      return {
        targetAgentId: marketingAgent.id,
        targetAgentName: marketingAgent.name,
        specialty: 'marketing',
        isTargetActive: marketingAgent.status === 'active',
        confidence: 1.0,
        detectedTopicId: messageThreadId,
        reason: `توجيه تلقائي عبر موضوع تليجرام المخصص (#التسويق - Thread ID: ${messageThreadId}).`,
      };
    }
    if (specialty === 'sales' && salesAgent) {
      return {
        targetAgentId: salesAgent.id,
        targetAgentName: salesAgent.name,
        specialty: 'sales',
        isTargetActive: salesAgent.status === 'active',
        confidence: 1.0,
        detectedTopicId: messageThreadId,
        reason: `توجيه تلقائي عبر موضوع تليجرام المخصص (#المبيعات - Thread ID: ${messageThreadId}).`,
      };
    }
    if (specialty === 'finance' && financeAgent) {
      return {
        targetAgentId: financeAgent.id,
        targetAgentName: financeAgent.name,
        specialty: 'finance',
        isTargetActive: financeAgent.status === 'active',
        confidence: 1.0,
        detectedTopicId: messageThreadId,
        reason: `توجيه تلقائي عبر موضوع تليجرام المخصص (#المالية - Thread ID: ${messageThreadId}).`,
      };
    }
  }

  // Check 2: Telegram Slash Commands (/fin, /budget, /mkt, /sales, etc.)
  const firstWord = normalized.split(/\s+/)[0];
  if (TELEGRAM_COMMAND_MAP[firstWord]) {
    const specialty = TELEGRAM_COMMAND_MAP[firstWord];
    if (specialty === 'marketing' && marketingAgent) {
      return {
        targetAgentId: marketingAgent.id,
        targetAgentName: marketingAgent.name,
        specialty: 'marketing',
        isTargetActive: marketingAgent.status === 'active',
        confidence: 0.99,
        detectedCommand: firstWord,
        reason: `توجيه بأمر تليجرام المباشر (${firstWord}) لوكيل التسويق MarketOS.`,
      };
    }
    if (specialty === 'sales' && salesAgent) {
      return {
        targetAgentId: salesAgent.id,
        targetAgentName: salesAgent.name,
        specialty: 'sales',
        isTargetActive: salesAgent.status === 'active',
        confidence: 0.99,
        detectedCommand: firstWord,
        reason: `توجيه بأمر تليجرام المباشر (${firstWord}) لوكيل المبيعات SalesOS.`,
      };
    }
    if (specialty === 'finance' && financeAgent) {
      return {
        targetAgentId: financeAgent.id,
        targetAgentName: financeAgent.name,
        specialty: 'finance',
        isTargetActive: financeAgent.status === 'active',
        confidence: 0.99,
        detectedCommand: firstWord,
        reason: `توجيه بأمر تليجرام المباشر (${firstWord}) للوكيل المالي النشط FinOS.`,
      };
    }
  }

  // Check 3: Explicit Hashtags (#fin, #مالية, #mkt, #تسويق, #sales, #مبيعات)
  for (const [prefix, specialty] of Object.entries(AGENT_PREFIX_MAP)) {
    if (normalized.startsWith(prefix)) {
      if (specialty === 'marketing' && marketingAgent) {
        return {
          targetAgentId: marketingAgent.id,
          targetAgentName: marketingAgent.name,
          specialty: 'marketing',
          isTargetActive: marketingAgent.status === 'active',
          confidence: 0.99,
          reason: `توجيه مباشر عبر الوسم (${prefix}) إلى وكيل التسويق الرقمي MarketOS.`,
        };
      }
      if (specialty === 'sales' && salesAgent) {
        return {
          targetAgentId: salesAgent.id,
          targetAgentName: salesAgent.name,
          specialty: 'sales',
          isTargetActive: salesAgent.status === 'active',
          confidence: 0.99,
          reason: `توجيه مباشر عبر الوسم (${prefix}) إلى وكيل المبيعات والصفقات SalesOS.`,
        };
      }
      if (specialty === 'finance' && financeAgent) {
        return {
          targetAgentId: financeAgent.id,
          targetAgentName: financeAgent.name,
          specialty: 'finance',
          isTargetActive: financeAgent.status === 'active',
          confidence: 0.99,
          reason: `توجيه مباشر عبر الوسم (${prefix}) إلى الوكيل المالي النشط FinOS.`,
        };
      }
    }
  }

  // Check 4: Marketing semantic keywords
  const isMarketing = ROUTING_KEYWORDS.marketing.some((kw) => normalized.includes(kw));
  const hasFinanceAmount = normalized.match(/(?:[0-9]+|ريال|sar|دفعت|صرفت|فاتورة)/);

  if (isMarketing && !hasFinanceAmount && marketingAgent) {
    return {
      targetAgentId: marketingAgent.id,
      targetAgentName: marketingAgent.name,
      specialty: 'marketing',
      isTargetActive: marketingAgent.status === 'active',
      confidence: 0.91,
      reason: 'الرسالة موجهة لتكتيكات واستراتيجيات التسويق (وكيل التسويق مجدول للمرحلة القادمة).',
    };
  }

  // Check 5: Sales semantic keywords
  const isSales = ROUTING_KEYWORDS.sales.some((kw) => normalized.includes(kw));
  if (isSales && !hasFinanceAmount && salesAgent) {
    return {
      targetAgentId: salesAgent.id,
      targetAgentName: salesAgent.name,
      specialty: 'sales',
      isTargetActive: salesAgent.status === 'active',
      confidence: 0.88,
      reason: 'الرسالة تتعلق بصفقات وعروض المبيعات (وكيل المبيعات مجدول للمرحلة القادمة).',
    };
  }

  // Check 6: Default to the Active Finance Agent (Initial Agent)
  return {
    targetAgentId: financeAgent.id,
    targetAgentName: financeAgent.name,
    specialty: 'finance',
    isTargetActive: financeAgent.status === 'active',
    confidence: 0.95,
    reason: 'الرسالة تشتمل على قيود مالية ومصروفات وميزانية، يتولاها الوكيل المالي الأساسي FinOS.',
  };
}

/**
 * Generates an official Telegram Bot direct chat URL
 * Works on Mobile and Desktop Telegram app / Telegram Web
 * e.g. https://t.me/TariqFin_Bot?start=fin_quick
 */
export function createTelegramClickUrl(botUsername: string, startParam?: string): string {
  const cleanUsername = botUsername.replace(/^@/, '').trim();
  if (!cleanUsername) return 'https://t.me/';
  if (startParam && startParam.trim()) {
    return `https://t.me/${cleanUsername}?start=${encodeURIComponent(startParam.trim())}`;
  }
  return `https://t.me/${cleanUsername}`;
}

/**
 * Legacy helper retained for backward compatibility
 */
export function createWhatsAppClickUrl(phoneNumber: string, prefillText: string): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(prefillText.trim());
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Telegram Agent Profile Preset
 */
export interface TelegramAgentPreset {
  id: string;
  name: string;
  nameEn: string;
  avatar: string;
  specialty: AgentSpecialty;
  botUsername: string;
  topicThreadId: number;
  topicName: string;
  prefix: string;
  commands: { command: string; description: string }[];
  description: string;
  sampleMessage: string;
  statusBadge: string;
  activeNow: boolean;
  role: string;
}

export const TELEGRAM_AGENT_PRESETS: TelegramAgentPreset[] = [
  {
    id: 'fin-agent-01',
    name: 'الوكيل المالي (FinOS Bot)',
    nameEn: 'FinOS Financial Bot',
    avatar: '💼',
    specialty: 'finance',
    botUsername: 'TariqFin_Bot',
    topicThreadId: 101,
    topicName: 'المالية والمصروفات',
    prefix: '#مالية',
    commands: [
      { command: '/budget', description: 'عرض تفاصيل ومتبقي الميزانيات التشغيلية' },
      { command: '/expense', description: 'تسجيل مصروف جديد (مثال: /expense 250 برمجيات)' },
      { command: '/income', description: 'قيد إيراد أو تحصيل عقد (مثال: /income 15000)' },
      { command: '/summary', description: 'ملخص التدفق النقدي وصافي الأرباح لهذا الشهر' },
      { command: '/vat', description: 'تدقيق ضريبة القيمة المضافة 15%' },
    ],
    description: 'بوت مالي مستقل لتسجيل النفقات والفواتير والتحقق من الميزانية لحظياً عبر تليجرام.',
    sampleMessage: '/expense 420 خدمات سحابية وتجديد استضافة',
    statusBadge: 'الوكيل النشط حالياً (Phase 1)',
    activeNow: true,
    role: 'العمليات المالية والتدفقات النقدية والميزانيات',
  },
  {
    id: 'mkt-agent-02',
    name: 'وكيل التسويق (MarketOS Bot)',
    nameEn: 'MarketOS Marketing Bot',
    avatar: '📢',
    specialty: 'marketing',
    botUsername: 'TariqMarketing_Bot',
    topicThreadId: 102,
    topicName: 'التسويق والحملات الإعلانية',
    prefix: '#تسويق',
    commands: [
      { command: '/campaigns', description: 'استعراض الحملات الإعلانية النشطة' },
      { command: '/roas', description: 'حساب العائد على الإنفاق الإعلاني ومعدل التحويل' },
      { command: '/mkt', description: 'طلب اعتماد ميزانية إعلانية من الوكيل المالي' },
    ],
    description: 'بوت متخصص في تحليل الحملات على سناب وتيك توك وجوجل، وتنسيق الميزانيات مع الوكيل المالي.',
    sampleMessage: '/campaigns خطة حملة سناب شات لموسم العودة للمدارس بميزانية 3000 ريال',
    statusBadge: 'مجدول للإضافة لاحقاً (Phase 2)',
    activeNow: false,
    role: 'إدارة الحملات وتحليل العائد الإعلاني (ROAS)',
  },
  {
    id: 'sales-agent-03',
    name: 'وكيل المبيعات (SalesOS Bot)',
    nameEn: 'SalesOS Sales Bot',
    avatar: '🎯',
    specialty: 'sales',
    botUsername: 'TariqSales_Bot',
    topicThreadId: 103,
    topicName: 'المبيعات والصفقات المغلقة',
    prefix: '#مبيعات',
    commands: [
      { command: '/pipeline', description: 'عرض مسار الصفقات ومراحل الإغلاق' },
      { command: '/deals', description: 'قائمة الصفقات المتوقعة هذا الشهر' },
      { command: '/quote', description: 'إنشاء عرض سعر فوري لعميل محتمل' },
    ],
    description: 'بوت متخصص في متابعة العملاء وتأهيلهم وتمرير الفواتير المغلقة للوكيل المالي تلقائياً.',
    sampleMessage: '/deals حالة عرض سعر العميل لشركة التقنية بقيمة 45,000 ريال',
    statusBadge: 'مجدول للإضافة لاحقاً (Phase 2)',
    activeNow: false,
    role: 'مسار الصفقات وإصدار عروض الأسعار',
  },
  {
    id: 'central-kernel',
    name: 'بوت النواة والراوتر (Tariq Kernel Bot)',
    nameEn: 'Tariq Kernel Orchestrator Bot',
    avatar: '⚡',
    specialty: 'operations',
    botUsername: 'TariqAgentOS_Bot',
    topicThreadId: 100,
    topicName: 'النواة والتوجيه العام',
    prefix: '',
    commands: [
      { command: '/start', description: 'بدء التفاعل وعرض قائمة الوكلاء المتاحين' },
      { command: '/status', description: 'التحقق من حالة النظام والوكلاء النشطين' },
      { command: '/help', description: 'دليل استخدام منظومة Tariq-AgentOS على تليجرام' },
    ],
    description: 'بوت يوجه أي رسالة تلقائياً للوكيل المختص استناداً للذكاء الاصطناعي أو الموضوع المختار.',
    sampleMessage: 'كم المتبقي من ميزانية المشاريع وما هي حالة السيولة لليوم؟',
    statusBadge: 'النواة المركزية للتوجيه',
    activeNow: true,
    role: 'التوجيه الذكي وتوزيع المهام بين الوكلاء',
  },
];

/**
 * Backward compatibility alias for any existing imports
 */
export type WhatsAppAgentPreset = TelegramAgentPreset;
export const WHATSAPP_AGENT_PRESETS = TELEGRAM_AGENT_PRESETS;

/**
 * Telegram Ecosystem Architecture Modes
 */
export interface ArchitectureModeComparison {
  id: 'dedicated_bots' | 'forum_topics' | 'unified_bot';
  title: string;
  badge: string;
  icon: string;
  howItWorks: string;
  costProfile: string;
  userExperience: string;
  contextIsolation: string;
  setupComplexity: string;
  pros: string[];
  cons: string[];
  recommendation: string;
}

export const CHAT_ARCHITECTURE_COMPARISON: ArchitectureModeComparison[] = [
  {
    id: 'dedicated_bots',
    title: 'بوت تليجرام مخصص ومستقل لكل وكيل (Dedicated Bot per Agent)',
    badge: 'الخيار الأقوى والأكثر تنظيماً في تليجرام',
    icon: '🤖',
    howItWorks: 'إنشاء بوت تليجرام مستقل لكل وكيل مجاناً عبر @BotFather (مثل @TariqFin_Bot للمالية، و @TariqMarketing_Bot للتسويق). لكل بوت توكن Webhook خاص به في Tariq-AgentOS.',
    costProfile: 'مجاني تماماً 100% (تليجرام يوفر بوتات مجانية غير محدودة بدون أي أرقام هواتف أو اشتراكات شهرية).',
    userExperience: 'عزل تام؛ في تطبيق تليجرام يظهر كل وكيل في محادثة مستقلة خاصة به مع صورته، أوامره المدمجة، وسجل محادثاته النظيف.',
    contextIsolation: 'عزل فيزيائي كامل في واجهة تليجرام وفي قاعدة البيانات.',
    setupComplexity: 'فوري وسهل (أقل من دقيقتين لكل بوت عبر @BotFather).',
    pros: [
      'محادثة مستقلة ونظيفة لكل وكيل في تليجرام',
      'مجاني بالكامل 100% بدون أي تكلفة اتصالات أو أرقام هواتف',
      'لكل وكيل رابط مباشر: https://t.me/TariqFin_Bot',
      'دعم كامل للأوامر المخصصة (/budget, /expense, /summary)',
      'دعم أزرار الردود السريعة (Inline Keyboards)'
    ],
    cons: [
      'المستخدم يفتح محادثة منفصلة لكل وكيل (وهي الميزة المفضلة لفرق العمل)'
    ],
    recommendation: 'المسار الأمثل إذا كنت تريد لكل وكيل هوية ومحادثة خاصة ومستقلة.'
  },
  {
    id: 'forum_topics',
    title: 'موضوعات المجموعات الفائقة (Supergroup Forum Topics)',
    badge: 'الأفضل لفرق العمل والشركات',
    icon: '💬',
    howItWorks: 'إنشاء مجموعة عمل واحدة في تليجرام للشركة (مثل Tariq OS Headquarters) مع تفعيل ميزة Topics (المواضيع). يتم إنشاء موضوع #المالية (Thread ID 101)، وموضوع #التسويق (Thread ID 102)، وموضوع #المبيعات (Thread ID 103).',
    costProfile: 'مجاني 100% داخل تطبيق تليجرام الرسمي.',
    userExperience: 'مثل قنوات Slack أو Discord تماماً؛ محادثة جماعية منظمة بتبويبات داخل مجموعة واحدة، والراوتر يوجه الرسالة بناءً على Topic Thread ID.',
    contextIsolation: 'تنظيم رائع للأقسام في مكان واحد ومشاركة تقارير الوكلاء مع الفريق بأكمله.',
    setupComplexity: 'سهل جداً: إنشاء مجموعة وتفعيل Topics وإضافة بوت المنظومة كمشرف.',
    pros: [
      'كل الأقسام والوكلاء في مجموعة واحدة منظمة بالمواضيع (Topics)',
      'إمكانية مشاركة فواتير وتنبيهات الوكلاء مع الفريق الإداري',
      'توجيه تلقائي دقيق استناداً إلى معرف الموضوع (message_thread_id)',
      'تفاعل جماعي بين المديرين والوكيل المالي'
    ],
    cons: [
      'يتطلب إنشاء Supergroup في تليجرام'
    ],
    recommendation: 'المسار الأمثل إذا أردت متابعة تقارير الوكلاء مع فريق العمل في مكان واحد.'
  },
  {
    id: 'unified_bot',
    title: 'بوت موحد مع أوامر تفريعية (Unified Bot with Commands)',
    badge: 'البساطة والمركزية',
    icon: '⚡',
    howItWorks: 'بوت رئيسي واحد (@TariqAgentOS_Bot) يستقبل كل الأوامر، ويفصل بين الوكلاء باستخدام أوامر الـ Slash Commands المدمجة (/fin, /budget, /mkt, /sales).',
    costProfile: 'مجاني 100%.',
    userExperience: 'محادثة واحدة يدير منها المستخدم كل الوكلاء عبر قائمة الأوامر المدمجة في تليجرام.',
    contextIsolation: 'تفرع برمجياتي في الخلفية مع وحدة تحكم واحدة.',
    setupComplexity: 'بسيط جداً؛ توكن بوت واحد فقط.',
    pros: [
      'حفظ حساب بوت واحد فقط في قائمة المحادثات',
      'سهولة التنقل السريع بين الوكلاء باستخدام الأوامر',
      'إدارة أمنية لتوكن واحد'
    ],
    cons: [
      'تتداخل ردود المالية والتسويق في نفس شاشة المحادثة'
    ],
    recommendation: 'خيار ممتاز للاستخدام الفردي السريع.'
  }
];

/**
 * Returns summary stats of registered vs planned agents in the OS
 */
export function getAgentRoadmapStats(agents: AgentProfile[]) {
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const stagedCount = agents.filter((a) => a.status === 'staged' || a.status === 'planned').length;
  const totalCount = agents.length;

  return {
    activeCount,
    stagedCount,
    totalCount,
    activePercentage: Math.round((activeCount / totalCount) * 100),
  };
}
