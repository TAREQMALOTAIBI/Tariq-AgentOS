import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LandingPageView } from './components/LandingPageView';
import { AgentChatStudio } from './components/AgentChatStudio';
import { FabricPatternModal } from './components/FabricPatternModal';

import type {
  AgentProfile,
  FinancialTransaction,
  BudgetCategory,
  ApiKeyItem,
  SyncedMessage,
} from './types/index';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('fin-agent-01');
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
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
      name: 'وكيل التحليل المالي (@Financial_Analyst_511_bot)',
      nameEn: 'Financial Analysis Bot (@Financial_Analyst_511_bot)',
      role: 'إدارة العمليات المالية والتدفقات النقدية والميزانيات',
      roleEn: 'Financial Operations & Cash Flow Management',
      description: 'بوت مالي مستقل (@Financial_Analyst_511_bot) متصل حياً بتطبيق تليجرام للتدقيق المالي، معالجة فواتير ومصروفات تليجرام، والتحليل التنبؤي للميزانية.',
      status: 'active',
      avatar: '💼',
      isSpecialist: true,
      specialty: 'finance',
      phase: 'المرحلة 1 (الوكيل النشط والمتصل بتليجرام)',
      telegramBotUsername: 'Financial_Analyst_511_bot',
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
      name: 'Telegram Bot Production (@Financial_Analyst_511_bot - وكيل التحليل المالي)',
      keyPreview: '925259416...4hg3dI',
      fullKey: 'agt_live_tg_99a8b7c6d5e4f3a2b1c0',
      botUsername: 'Financial_Analyst_511_bot',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: 'active',
      scopes: ['telegram:receive', 'telegram:send', 'finance:read', 'finance:write'],
      requestsCount: 42,
    },
  ]);
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
      const [sysData, finData, msgData, keyData] = await Promise.all([
        safeFetchJson('/api/system/status'),
        safeFetchJson('/api/financial/data'),
        safeFetchJson('/api/messages'),
        safeFetchJson('/api/keys'),
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
        {activeTab === 'landing' ? (
          <LandingPageView
            agents={agents}
            onEnterChat={(agentId) => {
              if (agentId) setSelectedAgentId(agentId);
              setActiveTab('chat');
            }}
            onOpenFabricModal={() => setIsFabricModalOpen(true)}
            systemStatus={systemStatus}
          />
        ) : (
          <AgentChatStudio
            agents={agents}
            initialAgentId={selectedAgentId}
            onBackToLanding={() => setActiveTab('landing')}
            onOpenFabricModal={() => setIsFabricModalOpen(true)}
            onTransactionCreated={() => fetchAllData(true)}
          />
        )}
      </main>

      {/* Fabric Pattern Modal */}
      <FabricPatternModal
        isOpen={isFabricModalOpen}
        onClose={() => setIsFabricModalOpen(false)}
      />
    </div>
  );
}
