import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CockpitView } from './components/CockpitView';
import { AgentRegistryView } from './components/AgentRegistryView';
import { AgentChatView } from './components/AgentChatView';
import { TelegramSimulatorView } from './components/TelegramSimulatorView';
import { ApiKeysView } from './components/ApiKeysView';
import { TasksQueueView } from './components/TasksQueueView';
import { NewKeyModal } from './components/NewKeyModal';
import { StageAgentModal } from './components/StageAgentModal';

import type {
  AgentProfile,
  FinancialTransaction,
  BudgetCategory,
  ApiKeyItem,
  SyncedMessage,
  AgentTask,
  SystemAuditLog,
} from './types/index';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('cockpit');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // System & Agent Data
  const [systemStatus, setSystemStatus] = useState<{
    systemLoad?: string;
    activeAgentsCount?: number;
    syncLatencyMs?: number;
  }>({
    systemLoad: '14.2%',
    activeAgentsCount: 1,
    syncLatencyMs: 14,
  });

  const [agents, setAgents] = useState<AgentProfile[]>([
    {
      id: 'fin-agent-01',
      name: 'وكيل التحليل المالي (@yosef0bot)',
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
      triggerKeywords: ['مصروف', 'فاتورة', 'ميزانية', 'ريال', 'ضريبة', 'إيراد', 'كاش'],
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
  ]);
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    savingsRate: 0,
    healthScore: 100,
  });
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [messages, setMessages] = useState<SyncedMessage[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: 'key-1',
      name: 'Telegram Bot Production (@yosef0bot - وكيل التحليل المالي)',
      keyPreview: '889612139...8IVOE',
      fullKey: 'agt_live_tg_99a8b7c6d5e4f3a2b1c0',
      botUsername: 'yosef0bot',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: 'active',
      scopes: ['telegram:receive', 'telegram:send', 'finance:read', 'finance:write'],
      requestsCount: 42,
    },
  ]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // Modals
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);

  // Fallback if ledger was active
  useEffect(() => {
    if (activeTab === 'ledger') {
      setActiveTab('cockpit');
    }
  }, [activeTab]);

  // Safe fetch helper that absorbs transient network disconnects during restarts
  const safeFetchJson = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // Fetch all live state from backend resiliently
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [sysData, finData, msgData, keyData, taskData, auditData] = await Promise.all([
        safeFetchJson('/api/system/status'),
        safeFetchJson('/api/financial/data'),
        safeFetchJson('/api/messages'),
        safeFetchJson('/api/keys'),
        safeFetchJson('/api/agent/tasks'),
        safeFetchJson('/api/audit-logs'),
      ]);

      if (sysData) {
        setSystemStatus({
          systemLoad: sysData.systemLoad,
          activeAgentsCount: sysData.activeAgentsCount,
          syncLatencyMs: sysData.syncLatencyMs,
        });
        if (sysData.agents) setAgents(sysData.agents);
      }

      if (finData) {
        if (finData.metrics) setMetrics(finData.metrics);
        if (finData.budgets) setBudgets(finData.budgets);
        if (finData.transactions) setTransactions(finData.transactions);
      }

      if (msgData && msgData.messages) {
        setMessages(msgData.messages);
      }

      if (keyData && keyData.keys) {
        setApiKeys(keyData.keys);
      }

      if (taskData && taskData.tasks) {
        setTasks(taskData.tasks);
      }

      if (auditData && auditData.logs) {
        setAuditLogs(auditData.logs);
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time synchronization polling every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAllData(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchAllData]);

  // Actions
  const handleGenerateKey = async (name: string, scopes: string[]) => {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scopes }),
    });
    const data = await res.json();
    await fetchAllData(true);
    return data.key;
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      await fetchAllData(true);
    } catch {
      // Ignore transient error
    }
  };

  const handleTriggerTask = async (taskId: string) => {
    try {
      await fetch('/api/agent/tasks/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      await fetchAllData(true);
    } catch {
      // Ignore transient error
    }
  };

  const handleStageAgent = async (agentData: Partial<AgentProfile>) => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'فشل حفظ الوكيل');
    }
    await fetchAllData(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        telegramConnected={apiKeys.some((k) => k.status === 'active')}
        onRefresh={() => fetchAllData(false)}
        isRefreshing={isRefreshing}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'cockpit' && (
          <CockpitView
            agents={agents}
            metrics={metrics}
            transactions={transactions}
            messages={messages}
            onNavigateTab={setActiveTab}
            onRunAudit={() => setActiveTab('telegram_gateway')}
          />
        )}

        {activeTab === 'agents_registry' && (
          <AgentRegistryView
            agents={agents}
            onNavigateTab={setActiveTab}
            onOpenStageModal={() => setIsStageModalOpen(true)}
          />
        )}

        {(activeTab === 'telegram_gateway' || activeTab === 'agent_chat') && (
          <TelegramSimulatorView
            apiKeys={apiKeys}
            messages={messages}
            onMessageSent={() => fetchAllData(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksQueueView
            tasks={tasks}
            onTriggerTask={handleTriggerTask}
          />
        )}

        {activeTab === 'security_keys' && (
          <ApiKeysView
            apiKeys={apiKeys}
            auditLogs={auditLogs}
            onGenerateKey={() => setIsNewKeyModalOpen(true)}
            onRevokeKey={handleRevokeKey}
          />
        )}
      </main>

      {/* Modals */}
      <NewKeyModal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
        onSubmit={handleGenerateKey}
      />

      <StageAgentModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        onSubmit={handleStageAgent}
      />
    </div>
  );
}
