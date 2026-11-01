import React, { useState } from 'react';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Activity, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Zap, 
  ShieldCheck, 
  Send,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import type { AgentProfile, FinancialTransaction, SyncedMessage } from '../types/index';
import { CATEGORY_LABELS_AR } from '../utils/finance-engine';
import { formatSafeTime } from '../utils/formatters';
import { FabricPatternModal } from './FabricPatternModal';

interface CockpitViewProps {
  agents: AgentProfile[];
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    savingsRate: number;
    healthScore: number;
  };
  transactions: FinancialTransaction[];
  messages: SyncedMessage[];
  onNavigateTab: (tab: string) => void;
  onRunAudit: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  agents,
  metrics,
  transactions,
  messages,
  onNavigateTab,
  onRunAudit,
}) => {
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const finAgent = agents.find((a) => a.specialty === 'finance') || agents[0];
  const otherAgents = agents.filter((a) => a.id !== finAgent?.id);

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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all shadow-md shadow-purple-900/20 cursor-pointer"
            title="عرض ونسخ نمط Fabric للتحليل المالي"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>📜 نمط Fabric المالي</span>
          </button>
          <button
            onClick={() => onNavigateTab('agents_registry')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>سجل الوكلاء والتوسع</span>
          </button>
          <button
            onClick={() => onNavigateTab('telegram_gateway')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>بوابة بوتات تليجرام</span>
          </button>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>طابور المهام والجدولة</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">إجمالي الإيرادات المحصلة</span>
            <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
              +{metrics.totalIncome.toLocaleString()} <span className="text-xs font-sans">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>معدل الادخار: {metrics.savingsRate}%</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">إجمالي المصروفات والنفقات</span>
            <div className="text-xl font-bold text-rose-400 mt-1 font-mono">
              -{metrics.totalExpense.toLocaleString()} <span className="text-xs font-sans">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>آخر مصروف: منذ دقائق عبر واتساب</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net Cashflow */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">صافي التدفق المالي (Cashflow)</span>
            <div className={`text-xl font-bold mt-1 font-mono ${metrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.netCashFlow >= 0 ? '+' : ''}{metrics.netCashFlow.toLocaleString()} <span className="text-xs font-sans">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>دفاتر مطابقة ومتوازنة</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Financial Health Score */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
          <div>
            <span className="text-xs text-slate-400 font-medium">مؤشر الاستقرار المالي الآلي</span>
            <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-1 font-mono">
              <span className="text-emerald-400">{metrics.healthScore}</span>
              <span className="text-xs text-slate-400 font-sans">/ 100</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
              <Activity className="w-3.5 h-3.5" />
              <span>وضع تشغيلي ممتاز وآمن</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
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

      {/* Two Column Layout: Real-time Synchronized Stream & OS Agent Mesh */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Synced Activity Stream */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">البث المباشر للأنشطة المتزامنة (Telegram ↔ Web)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {messages.length} رسالة معالجة
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {messages.slice(-5).reverse().map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                      msg.channel === 'telegram' || msg.channel === 'whatsapp'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {msg.channel === 'telegram' || msg.channel === 'whatsapp' ? <Send className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{msg.sender.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          msg.channel === 'telegram' || msg.channel === 'whatsapp'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {msg.channel === 'telegram' || msg.channel === 'whatsapp' ? 'تليجرام' : 'واجهة الويب'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatSafeTime(msg.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                      {msg.content}
                    </p>

                    {msg.parsedAction && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-[11px] text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>
                          تم توثيق {msg.parsedAction.actionType === 'record_expense' ? 'مصروف' : 'إيراد'} بقيمة{' '}
                          <strong className="font-mono">{msg.parsedAction.amount?.toLocaleString()} {msg.parsedAction.currency}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono block">
                    تزامن: {msg.syncLatencyMs}ms
                  </span>
                  <span className="inline-block mt-1 w-2 h-2 rounded-full bg-emerald-400" title="محدث ومتزامن"></span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">التزامن آمن 100% ومشفر باستخدام مفاتيح API المعتمدة</span>
            <button
              onClick={() => onNavigateTab('telegram_gateway')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>فتح بوابة تليجرام</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Other OS Agents & Health */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>شبكة وكلاء المنظومة (Cluster Agents)</span>
              </h3>
              <button
                onClick={() => onNavigateTab('agents_registry')}
                className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium hover:bg-indigo-500/30 transition-colors cursor-pointer"
              >
                عرض الكل ({agents.length})
              </button>
            </div>

            <div className="space-y-3">
              {otherAgents.slice(0, 3).map((ag) => (
                <div
                  key={ag.id}
                  className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ag.avatar}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{ag.name}</h4>
                        <span className="text-[10px] text-slate-400">{ag.role}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        ag.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : ag.status === 'planned'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ag.status === 'active' ? '🟢 نشط' : ag.status === 'planned' ? '⏳ المرحلة 2' : 'استعداد'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900 pt-2">
                    <span className="truncate max-w-[170px] text-cyan-300 font-medium">{ag.phase || 'المرحلة 2'}</span>
                    <span>مهام: <strong className="text-slate-200 font-mono">{ag.metrics.tasksCompleted}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Diagnostics Action */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={() => onNavigateTab('agents_registry')}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 border border-indigo-500/40 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>إدارة سجل الوكلاء والتوسع المستقبلي</span>
            </button>
            <button
              onClick={onRunAudit}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>تشغيل تدقيق مالي استباقي</span>
            </button>
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

