import React from 'react';
import { 
  Cpu, 
  RefreshCw, 
  Terminal, 
  Wifi,
  Home,
  MessageSquare,
  Send,
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
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Header & Navigation */}
      <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-3 cursor-pointer text-right group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-400/30 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
              Tariq-AgentOS
            </h1>
          </div>
        </button>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-2" aria-label="أقسام الموقع">
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'landing'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>صفحة الهبوط</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>شات الوكلاء الذكية</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
