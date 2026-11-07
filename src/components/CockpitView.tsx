import React, { useState } from 'react';
import { 
  Zap, 
  Send,
  Sparkles
} from 'lucide-react';
import type { AgentProfile, FinancialTransaction, SyncedMessage } from '../types/index';
import { FabricPatternModal } from './FabricPatternModal';

interface CockpitViewProps {
  agents: AgentProfile[];
  metrics?: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    savingsRate: number;
    healthScore: number;
  };
  transactions?: FinancialTransaction[];
  messages?: SyncedMessage[];
  onNavigateTab?: (tab: string) => void;
  onRunAudit?: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  agents,
}) => {
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const finAgent = agents.find((a) => a.specialty === 'finance') || agents[0];

  return (
    <div className="space-y-6">
      {/* Hero Notification Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-black/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Tariq-AgentOS • نظام تشغيل الوكلاء المتعددين (البداية مع الوكيل المالي)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                منظومة تليجرام الموحدة
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              يعمل الوكيل المالي كأول وكيل نشط لإدارة النفقات وبوتات تليجرام، مع جاهزية معمارية كاملة لضم وكيل التسويق ووكيل المبيعات لاحقاً.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFabricModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all shadow-md shadow-purple-900/20 cursor-pointer"
            title="عرض ونسخ نمط Fabric للتحليل المالي"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>📜 نمط Fabric المالي</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Agent Card (Featured Focus) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/40 relative overflow-hidden shadow-lg shadow-black/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-inner shadow-emerald-500/20 shrink-0">
              {finAgent?.avatar || '💼'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white">{finAgent?.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  نشط ويعالج البيانات
                </span>
                <span className="text-xs text-slate-400 font-mono">[{finAgent?.id}]</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {finAgent?.description}
              </p>

              {/* Capabilities Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {finAgent?.capabilities.map((cap, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    ✓ {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Agent Stats & Action */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 w-full lg:w-auto">
            <div className="text-center px-3 border-l border-slate-800 last:border-l-0">
              <span className="text-[10px] text-slate-400 block">المهام المنجزة</span>
              <strong className="text-sm font-bold text-white font-mono">{finAgent?.metrics.tasksCompleted}</strong>
            </div>
            <div className="text-center px-3 border-l border-slate-800 last:border-l-0">
              <span className="text-[10px] text-slate-400 block">استهلاك التوكنز</span>
              <strong className="text-sm font-bold text-emerald-400 font-mono">{finAgent?.metrics.tokensUsed.toLocaleString()}</strong>
            </div>
            <div className="text-center px-3 border-l border-slate-800 last:border-l-0">
              <span className="text-[10px] text-slate-400 block">متوسط الاستجابة</span>
              <strong className="text-sm font-bold text-cyan-400 font-mono">{finAgent?.metrics.avgLatencyMs}ms</strong>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tg://resolve?domain=${finAgent?.telegramBotUsername || 'yosef0bot'}&start=agent_finance`}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-sky-500/20 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>فتح محادثة الوكيل في تليجرام</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Fabric Financial Analysis Pattern Modal */}
      <FabricPatternModal
        isOpen={isFabricModalOpen}
        onClose={() => setIsFabricModalOpen(false)}
      />
    </div>
  );
};

