import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Terminal,
  ShieldCheck,
  FileCode2,
  BookOpen,
} from 'lucide-react';
import {
  FABRIC_FINANCIAL_ANALYSIS_PATTERN,
  FABRIC_PATTERN_METADATA,
} from '../utils/fabric-patterns';

interface FabricPatternModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FabricPatternModal: React.FC<FabricPatternModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'guide'>('prompt');

  if (!isOpen) return null;

  const handleCopyFull = () => {
    navigator.clipboard.writeText(FABRIC_FINANCIAL_ANALYSIS_PATTERN);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  const cliCode = `mkdir -p ~/.config/fabric/patterns/analyze_financial
cat << 'EOF' > ~/.config/fabric/patterns/analyze_financial/system.md
${FABRIC_FINANCIAL_ANALYSIS_PATTERN}
EOF

# تجربة تشغيل النمط على أي ملف مالي:
cat financial_report.txt | fabric --pattern analyze_financial`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCode);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-950 border-b border-purple-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl shrink-0 text-purple-300">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  نمط التحليل المالي (Fabric Pattern: <code className="text-purple-300 font-mono">analyze_financial</code>)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-bold border border-purple-500/40">
                  Daniel Miessler Fabric Architecture
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                مستوحى ومبني وفق معايير مشروع <strong>Fabric</strong> المفتوح المصدر لـ Daniel Miessler لاستخدامه كـ System Prompt لوكلائك.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Navigation Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'prompt'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>محتوى النمط (System Prompt)</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>طريقة التثبيت والاستخدام في Fabric CLI</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/danielmiessler/fabric"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <span>مستودع Fabric الرسمي</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={handleCopyFull}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {copiedFull ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم نسخ النمط بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ النمط كاملاً (Copy Prompt)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 font-sans text-xs">
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>تم تفعيل هذا النمط رسمياً في Tariq-AgentOS:</strong>
                  يستخدم وكيل التحليل المالي (<code className="text-white font-mono">@Financial_Analyst_511_bot</code>) في تليجرام وفي لوحة التشغيل هذا النمط كـ System Prompt دقيق لمعالجة الأسئلة المالية وكشف تسريبات النقد وتحليل القوائم المالية.
                </div>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto" dir="ltr">
                <button
                  onClick={handleCopyFull}
                  className="absolute top-3 right-3 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                >
                  {copiedFull ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Pattern</span>
                    </>
                  )}
                </button>
                <pre className="whitespace-pre-wrap">{FABRIC_FINANCIAL_ANALYSIS_PATTERN}</pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>1. تشغيل النمط عبر أداة Fabric في الطرفية (CLI)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  إذا كنت قد قمت بتثبيت مشروع <strong>Fabric</strong> على جهازك، يمكنك إنشاء مجلد للنمط داخل مسار أنماط Fabric وحفظه في ملف <code className="text-purple-300 font-mono">system.md</code>:
                </p>

                <div className="relative rounded-lg bg-black p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto" dir="ltr">
                  <button
                    onClick={handleCopyCli}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCli ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                  <pre className="whitespace-pre-wrap">{cliCode}</pre>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>2. استخدامه كـ System Prompt في أي نموذج أو وكيل مخصص</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>
                    <strong>Custom GPT / Claude Project:</strong> انسخ نص النمط كاملاً وضعه في حقل <strong>Instructions</strong> أو <strong>System Prompt</strong>.
                  </li>
                  <li>
                    <strong>LangChain / CrewAI / AutoGen:</strong> عيّن النمط كـ <code className="text-purple-300 font-mono">role_description</code> أو <code className="text-purple-300 font-mono">system_message</code> لوكيلك المالي.
                  </li>
                  <li>
                    <strong>منظومة Tariq-AgentOS:</strong> النمط مدمج ومفعل افتراضياً لوكيل التحليل المالي المتصل بـ <code className="text-white font-mono">@Financial_Analyst_511_bot</code>.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>المؤلف الأصلي لمعمارية الأنماط: <strong>Daniel Miessler</strong> (Fabric Project)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
