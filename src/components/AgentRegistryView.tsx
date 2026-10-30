import React, { useState } from 'react';
import { 
  Bot, 
  Cpu, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Zap,
  Tag,
  Code2,
  Terminal,
  Activity,
  Check
} from 'lucide-react';
import type { AgentProfile, AgentSpecialty } from '../types/index';
import { routeIncomingMessageToAgent, getAgentRoadmapStats } from '../utils/agent-router';

interface AgentRegistryViewProps {
  agents: AgentProfile[];
  onNavigateTab: (tab: string) => void;
  onOpenStageModal: () => void;
  onToggleAgentStatus?: (agentId: string) => void;
}

export const AgentRegistryView: React.FC<AgentRegistryViewProps> = ({
  agents,
  onNavigateTab,
  onOpenStageModal,
  onToggleAgentStatus,
}) => {
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [testQuery, setTestQuery] = useState('أريد إطلاق حملة تسويق على سناب شات وتيك توك');
  const [simulatedResult, setSimulatedResult] = useState<any>(null);

  const stats = getAgentRoadmapStats(agents);

  const filteredAgents = agents.filter((ag) => {
    if (filterSpecialty === 'all') return true;
    if (filterSpecialty === 'active') return ag.status === 'active';
    if (filterSpecialty === 'planned') return ag.status === 'planned' || ag.status === 'staged';
    return ag.specialty === filterSpecialty;
  });

  const handleSimulateRoute = () => {
    if (!testQuery.trim()) return;
    const result = routeIncomingMessageToAgent(testQuery, agents);
    setSimulatedResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Top Architecture Explanation Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-indigo-500/10">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">معمارية نظام تشغيل الوكلاء المتعددين (Tariq-AgentOS Architecture)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                الوكيل المالي هو نقطة البداية
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              تم تصميم Tariq-AgentOS كمنظومة قابلة للتوسع التدريجي: نبدأ الآن بـ <strong>الوكيل المالي (FinOS)</strong> لإدارة المصروفات والفواتير عبر بوتات تليجرام وواجهة التطبيق، مع تجهيز مسارات الربط والتوجيه لإضافة <strong>وكيل التسويق (MarketOS)</strong> و<strong>وكيل المبيعات (SalesOS)</strong> وبقية الوكلاء لاحقاً.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenStageModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تجهيز وكيل إضافي للمنظومة</span>
          </button>
        </div>
      </div>

      {/* Cluster Roadmap Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Agents (Starting Stage) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">الوكلاء المفعلون حالياً (المرحلة 1)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {stats.activeCount} <span className="text-xs font-sans text-slate-400">/ {stats.totalCount}</span>
            </div>
            <span className="text-[11px] text-emerald-400 block mt-0.5 font-medium">
              الوكيل المالي + نواة النظام
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Planned Agents (Future Phases) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">الوكلاء المخططون (المرحلة 2)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
              {stats.stagedCount} <span className="text-xs font-sans text-slate-400">وكلاء</span>
            </div>
            <span className="text-[11px] text-amber-300 block mt-0.5 font-medium">
              وكيل التسويق + وكيل المبيعات
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Dispatch Router Status */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">راوتر التوجيه الذكي (Kernel Router)</span>
            <div className="text-lg font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>نشط وموزع للمهام</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              يدعم قنوات الواتساب والويب هوك
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Scalability Factor */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">إمكانية التوسع (Multi-Agent Bus)</span>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              100% <span className="text-xs font-sans text-emerald-400">Modular</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              إضافة أي وكيل دون كسر المالية
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Intelligent Multi-Agent Routing Simulator */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">محاكي توجيه المهام بين الوكلاء (Multi-Agent Intent Dispatcher)</h3>
          </div>
          <span className="text-xs text-slate-400">
            جرب كيف يفهم راوتر Tariq-AgentOS نية الرسالة ويحدد الوكيل المسؤول
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="اكتب طلباً لتسويق، مبيعات، أو مالية (مثال: أريد خطة إعلانية، أو سجلت عميل مبيعات جديد)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSimulateRoute}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>محاكاة قرار الراوتر</span>
          </button>
        </div>

        {simulatedResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">قرار التوجيه:</span>
                <span className="font-bold text-white text-sm">
                  {simulatedResult.targetAgentName}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    simulatedResult.isTargetActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {simulatedResult.isTargetActive ? '🟢 مفعّل حالياً' : '⏳ مجدول للمرحلة القادمة'}
                </span>
              </div>
              <span className="text-[11px] text-cyan-400 font-mono">
                نسبة الثقة: {Math.round(simulatedResult.confidence * 100)}%
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed pt-1 border-t border-slate-800">
              {simulatedResult.reason}
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">سجل وكلاء المنظومة:</span>
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setFilterSpecialty('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterSpecialty === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع الوكلاء ({agents.length})
            </button>
            <button
              onClick={() => setFilterSpecialty('active')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterSpecialty === 'active' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              المفعلون حالياً ({stats.activeCount})
            </button>
            <button
              onClick={() => setFilterSpecialty('planned')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterSpecialty === 'planned' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              المخططون للمرحلة القادمة ({stats.stagedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Agents Cluster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAgents.map((ag) => {
          const isActive = ag.status === 'active';

          return (
            <div
              key={ag.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                isActive
                  ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-black/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              )}

              <div className="space-y-3.5 relative z-10">
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-500/30'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {ag.avatar}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{ag.name}</span>
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {ag.nameEn}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isActive ? '🟢 مفعّل' : '⏳ قيد التجهيز'}
                  </span>
                </div>

                {/* Phase Tag */}
                <div className="inline-block px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-300 font-medium">
                  {ag.phase || 'المرحلة 1'}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed min-h-[48px]">
                  {ag.description}
                </p>

                {/* Capabilities */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">القدرات والمهام:</span>
                  <div className="flex flex-wrap gap-1">
                    {ag.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60"
                      >
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trigger Keywords */}
                {ag.triggerKeywords && ag.triggerKeywords.length > 0 && (
                  <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-500">كلمات التوجيه:</span>
                    <span className="text-[10px] text-slate-300 truncate font-mono">
                      {ag.triggerKeywords.slice(0, 4).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2 relative z-10">
                {isActive ? (
                  <button
                    onClick={() => onNavigateTab(ag.specialty === 'finance' ? 'agent_chat' : 'cockpit')}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <span>فتح محادثة الوكيل المالي</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    <span>مجدول للإضافة والتفعيل لاحقاً</span>
                    <span className="text-amber-400 font-medium">المرحلة 2</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
