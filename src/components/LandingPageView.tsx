import React from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  MessageSquare,
  Cpu,
  Layers,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { Logo } from './Logo';
import type { AgentProfile } from '../types/index';

interface LandingPageViewProps {
  agents: AgentProfile[];
  onEnterChat: (agentId?: string) => void;
  onOpenFabricModal: () => void;
  systemStatus: {
    systemLoad?: string;
    activeAgentsCount?: number;
    syncLatencyMs?: number;
  };
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  agents,
  onEnterChat,
  onOpenFabricModal,
  systemStatus,
}) => {
  const finAgent = agents.find((a) => a.specialty === 'finance') || agents[0];

  return (
    <div className="space-y-16 py-4 md:py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950 p-6 md:p-12 shadow-2xl shadow-emerald-950/30">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -z-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Logo Emblem Showcase */}
          <div className="flex justify-center mb-1">
            <div className="relative group cursor-pointer" onClick={() => onEnterChat()}>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-40 blur-xl group-hover:opacity-75 transition duration-500" />
              <Logo size="lg" showText={false} className="relative transform group-hover:scale-105 transition-transform duration-300" />
            </div>
          </div>

          {/* Top Kicker */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Tariq-AgentOS v2.4 · نظام تشغيل الوكلاء الذاتيين المتعددين</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.2]">
            أدر أعمالك بذكاء عبر{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              منظومة وكلاء متخصصة
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            منصة ذكية موحدة مع إمكانية التبديل والمحادثة الفورية مع وكلاء الذكاء الاصطناعي
          </p>

          {/* Hero CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onEnterChat('fin-agent-01')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm md:text-base transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 text-slate-950" />
              <span>دخول المحادثة واختيار الوكيل</span>
              <ArrowLeft className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onOpenFabricModal}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 font-semibold text-sm transition-all shadow-lg shadow-purple-950/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>📜 نمط Fabric</span>
            </button>

            <a
              href={`tg://resolve?domain=${finAgent?.telegramBotUsername || 'Financial_Analyst_511_bot'}&start=landing`}
              className="w-full sm:w-auto px-5 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>فتح في تليجرام</span>
            </a>
          </div>

          {/* Quick System Indicators */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>محادثات فورية ذكية</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>تحليل فواتير ومستندات PDF</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>مزامنة تليجرام ثنائية الاتجاه</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>استجابة فائقة السرعة ({systemStatus.syncLatencyMs || 14}ms)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Showcase Section (اختر وكيلك) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Bot className="w-4 h-4" />
              <span>شبكة الوكلاء الذكية (Cluster Agents)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              اختر الوكيل المناسب لمهمتك وابدأ المحادثة
            </h2>
          </div>
          <button
            onClick={() => onEnterChat()}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>استعراض كافة الوكلاء في الشات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Financial Agent */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/50 hover:border-emerald-400 transition-all shadow-xl shadow-black/40 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-inner">
                  💼
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🟢 نشط بتليجرام
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  وكيل التحليل المالي (@Financial_Analyst_511_bot)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة العمليات المالية والتدفقات النقدية والميزانيات وفواتير تليجرام وحساب ضريبة 15%.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>إرفاق وتحليل فواتير PDF واستخراج الضريبة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>تسجيل المصروفات والإيرادات والميزانية</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>أوامر تليجرام (/budget, /expense)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>حساب ضريبة القيمة المضافة 15%</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                onClick={() => onEnterChat('fin-agent-01')}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <span>محادثة الوكيل المالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Marketing Agent */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-sky-500/50 transition-all shadow-xl shadow-black/40 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-2xl shadow-inner">
                  📢
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  ⚡ جاهز للشات
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                  وكيل التسويق الرقمي (MarketOS)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة الحملات الإعلانية وتحليل العائد (ROAS) وكتابة النصوص الإعلانية لسناب وتيك توك.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-sky-400">✓</span>
                  <span>تخطيط حملات سناب وتيك توك</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sky-400">✓</span>
                  <span>حساب وتحسين العائد الإعلاني ROAS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sky-400">✓</span>
                  <span>تنسيق الميزانية مع الوكيل المالي</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                onClick={() => onEnterChat('mkt-agent-02')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 hover:border-sky-400"
              >
                <span>محادثة وكيل التسويق</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. Sales Agent */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all shadow-xl shadow-black/40 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
                  🎯
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ⚡ جاهز للشات
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  وكيل المبيعات والصفقات (SalesOS)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة مسار الصفقات وتأهيل العملاء وصياغة عروض الأسعار والتعامل مع الاعتراضات.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">✓</span>
                  <span>تأهيل العملاء المحتملين (BANT)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">✓</span>
                  <span>صياغة عروض الأسعار التنافسية</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">✓</span>
                  <span>تحويل العقود إلى إيرادات للمالية</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                onClick={() => onEnterChat('sales-agent-03')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 hover:border-amber-400"
              >
                <span>محادثة وكيل المبيعات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Kernel Dispatcher */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all shadow-xl shadow-black/40 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl shadow-inner">
                  ⚡
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  🧠 نواة النظام
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                  منسق المهام المركزي (Dispatcher)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  توزيع الأحمال وتوجيه الرسائل للوكيل المتخصص وتنسيق المهام المشتركة بين الأقسام.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-400">✓</span>
                  <span>التوجيه الذكي للوكيل المختص</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-400">✓</span>
                  <span>رؤية شمولية لخطة العمل</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-400">✓</span>
                  <span>معالجة المهام متعددة الخطوات</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                onClick={() => onEnterChat('orch-agent-04')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-purple-500 hover:text-white text-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 hover:border-purple-400"
              >
                <span>محادثة منسق المهام</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 w-fit border border-sky-500/20">
            <Send className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">مزامنة تليجرام الفورية</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            ربط حي مع بوتات تليجرام والمجموعات الفائقة (Forum Topics). يمكنك إدارة النفقات والمهام مباشرة من هاتفك عبر تطبيق تليجرام.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">نمط Fabric المعتمد</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            موجهات ذكية مدمجة مستوحاة من نمط Fabric لتحليل السيولة، اكتشاف الهدر المالي، وتقديم توصيات استثمارية استباقية.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">جاهزية سحابية Cloud Run</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            معمارية معتمدة على الحاويات جاهزة للنشر على Google Cloud Run، مع أمان مشفر بمفاتيح API وموثوقية عمل دائمة 99.98%.
          </p>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="p-8 md:p-10 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 text-center space-y-4 shadow-2xl">
        <h3 className="text-xl md:text-2xl font-bold text-white">
          جاهز لبدء محادثتك مع الوكلاء؟
        </h3>
        <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto">
          اختر الوكيل المتخصص الآن وابدأ فوراً في إدارة النفقات، تخطيط الحملات، أو إغلاق الصفقات بذكاء واحترافية.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onEnterChat('fin-agent-01')}
            className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer inline-flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-slate-950" />
            <span>فتح نافذة المحادثة الآن</span>
            <ArrowLeft className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </section>
    </div>
  );
};
