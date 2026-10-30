import React from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  Terminal, 
  Smartphone, 
  DollarSign, 
  Key, 
  Layers,
  Sparkles,
  Wifi,
  Bot,
  Send
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: {
    systemLoad?: string;
    activeAgentsCount?: number;
    syncLatencyMs?: number;
  };
  telegramConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  telegramConnected,
  onRefresh,
  isRefreshing,
}) => {
  const tabs = [
    { id: 'cockpit', label: 'لوحة التحكم OS', icon: Terminal },
    { id: 'agents_registry', label: 'سجل الوكلاء والتوسع', icon: Bot, badge: 'Roadmap' },
    { id: 'agent_chat', label: 'الوكيل المالي (FinOS)', icon: Sparkles, badge: 'Active' },
    { id: 'telegram_gateway', label: 'بوابة بوتات تليجرام', icon: Send, badge: 'Telegram' },
    { id: 'ledger', label: 'الدفاتر والميزانيات', icon: DollarSign },
    { id: 'tasks', label: 'طابور المهام', icon: Layers },
    { id: 'security_keys', label: 'مفاتيح API والأمان', icon: Key },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Top OS System Strip */}
      <div className="px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold tracking-wider">Tariq-AgentOS KERNEL v2.4</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>حمل النظام: <strong className="text-slate-200">{systemStatus.systemLoad || '14%'}</strong></span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>زمن المزامنة اللحظية: <strong className="text-emerald-300 font-mono">{systemStatus.syncLatencyMs || 14}ms</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="font-medium text-[11px]">
              {telegramConnected ? 'بوابة تليجرام: متصلة بمفتاح API ومزامنة آمنة' : 'بوابة تليجرام: جاهزة'}
            </span>
          </div>

          <button
            onClick={onRefresh}
            aria-label="تحديث بيانات النظام"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Header & Navigation */}
      <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-400/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Tariq-AgentOS | نظام تشغيل الوكلاء المتعددين</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Tariq OS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              منظومة وكلاء ذكاء اصطناعي لإدارة المهام المتعددة • نبدأ بالوكيل المالي مع جاهزية تامة للتوسع للتسويق والمبيعات لاحقاً
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 flex-wrap" aria-label="أقسام نظام التشغيل">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
