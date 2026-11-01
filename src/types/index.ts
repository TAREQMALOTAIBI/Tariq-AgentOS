export type AgentSpecialty = 'finance' | 'marketing' | 'sales' | 'operations' | 'security' | 'support' | 'custom';
export type AgentDeploymentStatus = 'active' | 'staged' | 'planned' | 'idle' | 'busy' | 'standby';

export interface AgentProfile {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  description: string;
  status: AgentDeploymentStatus;
  avatar: string;
  isSpecialist: boolean;
  specialty: AgentSpecialty;
  phase: string; // e.g. 'المرحلة 1 (الوكيل النشط الحالي)' or 'المرحلة 2 (مخطط للإضافة لاحقاً)'
  capabilities: string[];
  triggerKeywords: string[];
  systemPromptPreview?: string;
  telegramBotUsername?: string;
  telegramCommand?: string;
  telegramTopicId?: number;
  telegramTopicName?: string;
  metrics: {
    tasksCompleted: number;
    uptime: string;
    memoryMb: number;
    tokensUsed: number;
    avgLatencyMs: number;
  };
}

export interface AgentRoutingResult {
  targetAgentId: string;
  targetAgentName: string;
  specialty: AgentSpecialty;
  isTargetActive: boolean;
  confidence: number;
  reason: string;
  detectedCommand?: string;
  detectedTopicId?: number;
}

export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionSource = 'telegram' | 'web_frontend' | 'api_webhook';
export type TransactionStatus = 'cleared' | 'pending' | 'flagged';

export interface FinancialTransaction {
  id: string;
  timestamp: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  merchantOrParty: string;
  description: string;
  source: TransactionSource;
  status: TransactionStatus;
  agentNotes?: string;
  senderHandle?: string;
  telegramChatId?: string | number;
  synced: boolean;
}

export interface BudgetCategory {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  period: string;
  threshold: number; // e.g. 85%
  color: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPreview: string; // agt_live_...4a9f
  fullKey?: string;
  createdAt: string;
  lastUsedAt: string | null;
  status: 'active' | 'revoked';
  scopes: string[];
  requestsCount: number;
  botUsername?: string;
}

export interface SyncedMessage {
  id: string;
  timestamp: string;
  channel: 'telegram' | 'web';
  sender: {
    name: string;
    handle: string; // telegram handle (@user), chat ID or email
    avatar?: string;
    isAgent: boolean;
    agentId?: string;
  };
  routedAgent?: {
    id: string;
    name: string;
    specialty: AgentSpecialty;
  };
  telegramThreadId?: number;
  telegramTopicName?: string;
  content: string;
  parsedAction?: {
    actionType: string;
    amount?: number;
    currency?: string;
    category?: string;
    transactionId?: string;
  };
  status: 'sent' | 'delivered' | 'processed';
  syncLatencyMs: number;
}

export interface AgentTask {
  id: string;
  title: string;
  titleEn: string;
  agentId: string;
  type: 'scheduled' | 'event_driven' | 'manual';
  status: 'running' | 'completed' | 'queued' | 'scheduled';
  lastRun: string;
  nextRun: string;
  details: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  channel: 'telegram' | 'web' | 'api';
  event: string;
  ip: string;
  status: 'success' | 'warning' | 'error';
  tokenUsed?: string;
  latencyMs: number;
}

