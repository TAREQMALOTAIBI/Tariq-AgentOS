import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Layers,
  Terminal,
  Smartphone,
  QrCode,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import type { ApiKeyItem, SyncedMessage } from '../types/index';
import { formatSafeTime } from '../utils/formatters';
import {
  createTelegramClickUrl,
  createTelegramNativeAppUrl,
  TELEGRAM_AGENT_PRESETS,
} from '../utils/agent-router';
import { FabricPatternModal } from './FabricPatternModal';

interface ConnectedBotInfo {
  agentId: string;
  botId: number;
  botUsername: string;
  botFirstName: string;
  connectedAt: string;
  pollingActive: boolean;
  messagesProcessed: number;
}

interface TelegramSimulatorProps {
  apiKeys: ApiKeyItem[];
  messages: SyncedMessage[];
  onMessageSent: () => void;
  onNavigateTab: (tab: string) => void;
}

const AGENT_START_PARAM: Record<string, string> = {
  'fin-agent-01': 'agent_finance',
  'mkt-agent-02': 'agent_marketing',
  'sales-agent-03': 'agent_sales',
  'central-kernel': 'agent_kernel',
};

export const TelegramSimulatorView: React.FC<TelegramSimulatorProps> = ({
  messages,
  onNavigateTab,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fin-agent-01');
  const [showQrForPreset, setShowQrForPreset] = useState<string | null>(null);
  const [connectedBots, setConnectedBots] = useState<ConnectedBotInfo[]>([]);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);

  const fetchConnectedBots = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/bots');
      if (res.ok) {
        const data = await res.json();
        setConnectedBots(data.bots || []);
      }
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    fetchConnectedBots();
    const timer = setInterval(fetchConnectedBots, 3000);
    return () => clearInterval(timer);
  }, [fetchConnectedBots]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendReportToTelegram = async () => {
    setIsSendingReport(true);
    setReportFeedback(null);
    try {
      const res = await fetch('/api/telegram/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'fin-agent-01' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setReportFeedback(`⚠️ ${data.error}`);
      } else {
        setReportFeedback(`✅ ${data.message}`);
      }
    } catch {
      setReportFeedback('⚠️ تعذر إرسال التقرير إلى تطبيق تليجرام');
    } finally {
      setIsSendingReport(false);
    }
  };

  const activeBotUsername = connectedBots[0]?.botUsername || 'yosef0bot';
  const telegramSyncedLogs = messages.filter(
    (m) => m.channel === 'telegram' && !m.sender.isAgent
  );

  return (
    <div className="space-y-6">
      {/* Top Agents Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/90 via-slate-900 to-slate-900 border border-sky-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl shadow-black/40">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white text-3xl shadow-lg shadow-sky-500/30 shrink-0 border border-sky-400/40">
            ✈️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-white">
                وكلاء Tariq-AgentOS في تطبيق تليجرام
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                متصل وجاهز للمحادثة المباشرة
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
              اختر الوكيل المطلوب بالأسفل لفتح محادثته مباشرة في تطبيق تليجرام. جميع أوامرك المالية والتسويقية وعمليات المبيعات تُعالج داخل تليجرام وتنعكس تلقائياً في دفاتر النظام.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsFabricModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-bold border border-purple-500/35 transition-all cursor-pointer shadow-md shadow-purple-500/10"
            title="عرض ونسخ نمط التحليل المالي المستوحى من مشروع Fabric لـ Daniel Miessler"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>📜 نمط Fabric للتحليل المالي</span>
          </button>
          <button
            onClick={handleSendReportToTelegram}
            disabled={isSendingReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
          >
            <span>📤 إرسال الملخص المالي إلى تليجرام</span>
          </button>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>طابور المهام</span>
          </button>
        </div>
      </div>

      {reportFeedback && (
        <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/30 text-xs text-sky-300">
          {reportFeedback}
        </div>
      )}

      {/* Agents Cards Grid (Only the Agents) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TELEGRAM_AGENT_PRESETS.map((preset) => {
          const startParam = AGENT_START_PARAM[preset.id] || 'agent_finance';
          const webUrl = createTelegramClickUrl(activeBotUsername, startParam);
          const nativeUrl = createTelegramNativeAppUrl(activeBotUsername, startParam);
          const showQr = showQrForPreset === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => setSelectedPresetId(preset.id)}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                selectedPresetId === preset.id
                  ? 'bg-slate-900/95 border-emerald-500/50 shadow-xl shadow-emerald-500/5'
                  : 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40'
              }`}
            >
              <div className="space-y-3.5">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-2xl shrink-0">
                      {preset.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{preset.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          🟢 متصل في تليجرام
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{preset.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQrForPreset(showQr ? null : preset.id);
                    }}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                    title="رمز QR لفتح محادثة الوكيل على الجوال"
                  >
                    <QrCode className="w-4 h-4 text-sky-400" />
                    <span>QR للجوال</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{preset.description}</p>

                {/* QR Code Drawer for Mobile Telegram App */}
                {showQr && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-sky-500/30 flex items-center gap-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(webUrl)}`}
                      alt={`QR Code for ${preset.name}`}
                      className="w-28 h-28 rounded-xl bg-white p-1.5 shrink-0"
                    />
                    <div className="space-y-1.5 text-xs">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-sky-400" />
                        <span>امسح الرمز لفتح محادثة {preset.name}</span>
                      </h4>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        يفتح هذا الرمز تطبيق تليجرام على هاتفك ويبدأ المحادثة مباشرة مع <strong>{preset.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Commands to use inside Telegram */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    أوامر الوكيل السريعة داخل تليجرام (اضغط لنسخ الأمر):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.commands.map((cmd) => {
                      const cmdKey = `${preset.id}-${cmd.command}`;
                      return (
                        <button
                          key={cmd.command}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(cmdKey, cmd.command);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-sky-950/80 border border-slate-800 hover:border-sky-500/40 text-[11px] font-mono text-sky-300 flex items-center gap-1.5 transition-all cursor-pointer"
                          title={cmd.description}
                        >
                          <span>{cmd.command}</span>
                          {copiedId === cmdKey ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Direct Launch Buttons in Telegram App */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={nativeUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="py-2.5 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>فتح محادثة الوكيل في تليجرام</span>
                </a>

                <a
                  href={webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  <span>فتح عبر الرابط المباشر (t.me)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Read-Only Synced Operations Log from Real Telegram App */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              سجل العمليات الواردة من الوكلاء في تليجرام
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            يتم تحديث هذا السجل تلقائياً عند مراسلة الوكلاء داخل تطبيق تليجرام
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
          {telegramSyncedLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-300 font-mono">{log.sender.handle}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{formatSafeTime(log.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-200 font-mono">{log.content}</p>
                {log.parsedAction && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-[11px] text-emerald-300 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>
                      قيد في الدفتر: {log.parsedAction.amount?.toLocaleString()} {log.parsedAction.currency}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 shrink-0 cursor-pointer"
              >
                <span>المهام</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <FabricPatternModal
        isOpen={isFabricModalOpen}
        onClose={() => setIsFabricModalOpen(false)}
      />
    </div>
  );
};
