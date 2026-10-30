import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CockpitView } from './components/CockpitView';
import { AgentRegistryView } from './components/AgentRegistryView';
import { AgentChatView } from './components/AgentChatView';
import { TelegramSimulatorView } from './components/TelegramSimulatorView';
import { FinancialLedgerView } from './components/FinancialLedgerView';
import { ApiKeysView } from './components/ApiKeysView';
import { TasksQueueView } from './components/TasksQueueView';
import { AddTransactionModal } from './components/AddTransactionModal';
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

  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    savingsRate: 0,
    healthScore: 85,
  });
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [messages, setMessages] = useState<SyncedMessage[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);

  // Fetch all live state from backend
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [sysRes, finRes, msgRes, keyRes, taskRes, auditRes] = await Promise.all([
        fetch('/api/system/status'),
        fetch('/api/financial/data'),
        fetch('/api/messages'),
        fetch('/api/keys'),
        fetch('/api/agent/tasks'),
        fetch('/api/audit-logs'),
      ]);

      if (sysRes.ok) {
        const sysData = await sysRes.json();
        setSystemStatus({
          systemLoad: sysData.systemLoad,
          activeAgentsCount: sysData.activeAgentsCount,
          syncLatencyMs: sysData.syncLatencyMs,
        });
        if (sysData.agents) setAgents(sysData.agents);
      }

      if (finRes.ok) {
        const finData = await finRes.json();
        setMetrics(finData.metrics || {});
        setBudgets(finData.budgets || []);
        setTransactions(finData.transactions || []);
      }

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      }

      if (keyRes.ok) {
        const keyData = await keyRes.json();
        setApiKeys(keyData.keys || []);
      }

      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs || []);
      }
    } catch (err) {
      console.error('Failed to sync data with Tariq-AgentOS backend:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time synchronization polling every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAllData(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchAllData]);

  // Actions
  const handleAddTransaction = async (data: {
    type: 'expense' | 'income';
    amount: number;
    currency: string;
    category: string;
    merchantOrParty: string;
    description: string;
  }) => {
    const res = await fetch('/api/financial/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, source: 'web_frontend' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'فشل حفظ القيد');
    }
    await fetchAllData(true);
  };

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
    await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    await fetchAllData(true);
  };

  const handleTriggerTask = async (taskId: string) => {
    await fetch('/api/agent/tasks/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    await fetchAllData(true);
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
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRunAudit={() => setActiveTab('agent_chat')}
          />
        )}

        {activeTab === 'agents_registry' && (
          <AgentRegistryView
            agents={agents}
            onNavigateTab={setActiveTab}
            onOpenStageModal={() => setIsStageModalOpen(true)}
          />
        )}

        {activeTab === 'agent_chat' && (
          <AgentChatView
            onTransactionCreated={() => fetchAllData(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {(activeTab === 'telegram_gateway' || activeTab === 'whatsapp_gateway') && (
          <TelegramSimulatorView
            apiKeys={apiKeys}
            messages={messages}
            onMessageSent={() => fetchAllData(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'ledger' && (
          <FinancialLedgerView
            transactions={transactions}
            budgets={budgets}
            onOpenAddModal={() => setIsAddModalOpen(true)}
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
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTransaction}
      />

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
