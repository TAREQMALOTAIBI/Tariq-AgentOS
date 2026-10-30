import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Key, 
  CheckCheck, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Code2, 
  Sparkles, 
  CheckCircle2,
  Lock,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Layers,
  Bot,
  Zap,
  Globe,
  HelpCircle,
  Hash,
  Terminal,
  Bookmark,
  Share2,
  ChevronRight,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import type { ApiKeyItem, SyncedMessage } from '../types/index';
import { formatSafeTime } from '../utils/formatters';
import { 
  createTelegramClickUrl,
  TELEGRAM_AGENT_PRESETS,
  CHAT_ARCHITECTURE_COMPARISON,
  type TelegramAgentPreset,
  type ArchitectureModeComparison
} from '../utils/agent-router';

interface TelegramSimulatorProps {
  apiKeys: ApiKeyItem[];
  messages: SyncedMessage[];
  onMessageSent: () => void;
  onNavigateTab: (tab: string) => void;
}

export const TelegramSimulatorView: React.FC<TelegramSimulatorProps> = ({
  apiKeys,
  messages,
  onMessageSent,
  onNavigateTab,
}) => {
  const activeKeys = apiKeys.filter((k) => k.status === 'active');
  const [selectedKey, setSelectedKey] = useState<string>(
    activeKeys[0]?.fullKey || 'agt_live_tg_99a8b7c6d5e4f3a2b1c0'
  );
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [useInvalidKey, setUseInvalidKey] = useState(false);

  // Active Selected Telegram Preset Agent
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fin-agent-01');

  // Architecture view mode: dedicated bots, forum topics, unified bot, or comparison
  const [chatArchMode, setChatArchMode] = useState<'dedicated_bots' | 'forum_topics' | 'unified_bot' | 'comparison'>('dedicated_bots');

  // Selected Forum Topic in Supergroup mode
  const [selectedTopicId, setSelectedTopicId] = useState<number>(101);

  // Telegram bot usernames state per preset
  const [telegramHandles, setTelegramHandles] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    TELEGRAM_AGENT_PRESETS.forEach((p) => {
      map[p.id] = p.botUsername;
    });
    return map;
  });

  // Custom editable text for each preset agent
  const [presetTexts, setPresetTexts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    TELEGRAM_AGENT_PRESETS.forEach((p) => {
      map[p.id] = p.sampleMessage;
    });
    return map;
  });

  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastRequestPayload, setLastRequestPayload] = useState<any>(null);
  const [lastResponsePayload, setLastResponsePayload] = useState<any>(null);
  const [lastHttpStatus, setLastHttpStatus] = useState<number | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages originating from or responding to Telegram
  const telegramMessages = messages.filter((m) => m.channel === 'telegram' || m.channel === 'whatsapp');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [telegramMessages, isSending]);

  // Current active preset agent
  const activePreset = TELEGRAM_AGENT_PRESETS.find((p) => p.id === selectedPresetId) || TELEGRAM_AGENT_PRESETS[0];

  const handleSendMessage = async (customText?: string, overrideThreadId?: number) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSending) return;

    setIsSending(true);
    const effectiveKey = useInvalidKey
      ? 'agt_live_tg_INVALID_EXPIRED_KEY_401'
      : customKeyInput.trim() || selectedKey;

    const threadId = overrideThreadId !== undefined 
      ? overrideThreadId 
      : chatArchMode === 'forum_topics' 
      ? selectedTopicId 
      : activePreset.topicThreadId;

    // Standard Telegram Update payload structure
    const payload = {
      update_id: Math.floor(Math.random() * 900000) + 100000,
      message: {
        message_id: Math.floor(Math.random() * 5000) + 10,
        from: {
          id: 519049504,
          is_bot: false,
          first_name: 'طارق',
          username: 'tariq_admin',
          language_code: 'ar'
        },
        chat: {
          id: -100987654321,
          first_name: 'طارق',
          username: 'tariq_admin',
          type: chatArchMode === 'forum_topics' ? 'supergroup' : 'private',
          title: chatArchMode === 'forum_topics' ? 'Tariq OS Enterprise Group' : undefined
        },
        message_thread_id: chatArchMode === 'forum_topics' ? threadId : undefined,
        text: textToSend,
        date: Math.floor(Date.now() / 1000),
      },
      botUsername: telegramHandles[selectedPresetId] || activePreset.botUsername,
      // Plain compatibility fields
      from: '@tariq_admin',
      senderName: 'طارق (المشرف عبر تليجرام)',
      text: textToSend,
      threadId: threadId,
    };

    setLastRequestPayload(payload);

    try {
      const startTime = performance.now();
      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveKey}`,
        },
        body: JSON.stringify(payload),
      });

      const latency = Math.round(performance.now() - startTime);
      setLastHttpStatus(res.status);
      setLastLatencyMs(latency);

      const data = await res.json();
      setLastResponsePayload(data);

      if (res.ok) {
        setInputMessage('');
        onMessageSent();
      }
    } catch (err: any) {
      console.error('Telegram webhook delivery error:', err);
      setLastHttpStatus(500);
      setLastResponsePayload({ error: err.message || 'فشل الاتصال بالخادم' });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = (presetId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedPresetId(presetId);
    setTimeout(() => setCopiedPresetId(null), 2000);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Telegram Hub Header */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-sky-950/80 via-slate-900 to-slate-900 border border-sky-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl shadow-black/40">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-sky-500/20 shrink-0 border border-sky-400/40">
            ✈️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-white">
                بوابة تليجرام الرسمية • منظومة بوتات ومواضيع الوكلاء (Tariq-AgentOS)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                Telegram Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              تواصل حصري عبر تليجرام مجاناً 100%: لكل وكيل بوت مستقل خاص به (@TariqFin_Bot) أو مواضيع مخصصة (Forum Topics) داخل مجموعة واحدة، مع دعم الأوامر المدمجة والمزامنة اللحظية مع الدفاتر.
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('ledger')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>عرض الدفاتر</span>
          </button>
          <button
            onClick={() => onNavigateTab('security_keys')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-all cursor-pointer"
          >
            <Key className="w-4 h-4 text-sky-400" />
            <span>مفاتيح API</span>
          </button>
        </div>
      </div>

      {/* Architecture Tabs Navigation: Dedicated Bots vs Forum Topics vs Unified Bot vs Comparison */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setChatArchMode('dedicated_bots')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              chatArchMode === 'dedicated_bots'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>بوت مستقل لكل وكيل (Dedicated Bots)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-black/20 text-white">
              موصى به
            </span>
          </button>

          <button
            onClick={() => setChatArchMode('forum_topics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              chatArchMode === 'forum_topics'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>مواضيع المجموعات الفائقة (Forum Topics)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-black/20 text-white">
              للشركات
            </span>
          </button>

          <button
            onClick={() => setChatArchMode('comparison')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              chatArchMode === 'comparison'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>مقارنة أساليب محادثات تليجرام</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>التزامن اللحظي مع النواة: <strong className="text-emerald-300 font-mono">14ms</strong></span>
        </div>
      </div>

      {/* Mode 1: Dedicated Bots per Agent */}
      {chatArchMode === 'dedicated_bots' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-xs font-bold text-white">كل وكيل يملك حساب بوت تليجرام مستقل ومحادثة نظيفة خاصة به</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  اضغط على أي وكيل لفتح محادثته الحقيقية مباشرة في تليجرام، أو محاكاة رسائله وأوامره لحظياً أدناه.
                </p>
              </div>
            </div>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 bg-sky-950/60 px-3 py-1.5 rounded-lg border border-sky-500/30"
            >
              <span>إنشاء بوت عبر @BotFather</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Agent Preset Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {TELEGRAM_AGENT_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const directLink = createTelegramClickUrl(telegramHandles[preset.id] || preset.botUsername);

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-900 border-sky-500 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{preset.avatar}</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{preset.name}</h4>
                          <span className="text-[10px] text-sky-400 font-mono">
                            @{telegramHandles[preset.id] || preset.botUsername}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          preset.activeNow
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {preset.activeNow ? '🟢 نشط' : '⏳ المرحلة 2'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Commands tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {preset.commands.slice(0, 3).map((cmd) => (
                        <span
                          key={cmd.command}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300 font-mono"
                        >
                          {cmd.command}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <a
                      href={directLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-sky-500/20"
                    >
                      <span>فتح في تليجرام</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(preset.id, directLink);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="نسخ رابط البوت"
                    >
                      {copiedPresetId === preset.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Supergroup Forum Topics Mode */}
      {chatArchMode === 'forum_topics' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="text-xs font-bold text-white">مجموعة عمل فائقة واحدة مقسمة إلى مواضيع (Forum Topics)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  في تليجرام، يمكنك إنشاء مجموعة للشركة وتفعيل "Topics" ليكون لكل وكيل موضوع مستقل يرسل فيه تحديثاته وتقاريره مع الفريق.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              Supergroup Thread IDs: 101, 102, 103
            </div>
          </div>

          {/* Topics Selector Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => {
                setSelectedTopicId(101);
                setSelectedPresetId('fin-agent-01');
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedTopicId === 101
                  ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <span>الموضوع #1: المالية والمصروفات</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  Thread ID: 101
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                يتولاه الوكيل المالي النشط (FinOS) لتسجيل فواتير المشتريات ومصروفات الشركة والتقارير.
              </p>
            </div>

            <div
              onClick={() => {
                setSelectedTopicId(102);
                setSelectedPresetId('mkt-agent-02');
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedTopicId === 102
                  ? 'bg-slate-900 border-sky-500 shadow-md shadow-sky-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-sky-400" />
                  <span>الموضوع #2: التسويق والإعلانات</span>
                </span>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-500/30">
                  Thread ID: 102
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مخصص لحملات سناب وتيك توك وجوجل، وتنسيق الميزانيات المطلوبة مع الوكيل المالي.
              </p>
            </div>

            <div
              onClick={() => {
                setSelectedTopicId(103);
                setSelectedPresetId('sales-agent-03');
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedTopicId === 103
                  ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-indigo-400" />
                  <span>الموضوع #3: المبيعات والصفقات</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/30">
                  Thread ID: 103
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مخصص لعروض الأسعار ومتابعة العملاء وتمرير تحصيلات العقود للوكيل المالي.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Architecture Comparison */}
      {chatArchMode === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CHAT_ARCHITECTURE_COMPARISON.map((comp) => (
            <div
              key={comp.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{comp.icon}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {comp.badge}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{comp.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{comp.howItWorks}</p>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">التكلفة المالية:</span>
                    <strong className="text-emerald-400">{comp.costProfile}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">تجربة المستخدم:</span>
                    <span className="text-slate-200">{comp.userExperience}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 block">الميزات الرئيسية:</span>
                  {comp.pros.map((pro, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] text-sky-300 block font-medium">💡 التوصية:</span>
                <p className="text-xs text-slate-400 mt-0.5">{comp.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Interactive Dual Workspace: Live Telegram Chat Simulator & Webhook Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Telegram Chat Client Simulator */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          {/* Telegram Header Bar */}
          <div className="px-4 py-3 bg-[#1e2c3a] border-b border-slate-800 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-xl shadow-md border border-white/20">
                {activePreset.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{activePreset.name}</h3>
                  <span className="px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200 text-[10px] font-bold">
                    bot
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-sky-300">
                  <span className="font-mono">@{telegramHandles[selectedPresetId] || activePreset.botUsername}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    online
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={createTelegramClickUrl(telegramHandles[selectedPresetId] || activePreset.botUsername)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium border border-sky-500/30 flex items-center gap-1 transition-colors"
              >
                <span>فتح التطبيق</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Telegram Commands Bar */}
          <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0 font-medium">
              <Terminal className="w-3 h-3 text-sky-400" />
              <span>أوامر سريعة:</span>
            </span>
            {activePreset.commands.map((cmd) => (
              <button
                key={cmd.command}
                onClick={() => handleSendMessage(cmd.command)}
                disabled={isSending}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-sky-950 hover:text-sky-300 hover:border-sky-500/40 border border-slate-800 text-[11px] font-mono text-slate-300 transition-all cursor-pointer shrink-0"
                title={cmd.description}
              >
                {cmd.command}
              </button>
            ))}
            <button
              onClick={() => handleSendMessage('/summary')}
              disabled={isSending}
              className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-sky-950 hover:text-sky-300 hover:border-sky-500/40 border border-slate-800 text-[11px] font-mono text-slate-300 transition-all cursor-pointer shrink-0"
            >
              /summary
            </button>
          </div>

          {/* Telegram Messages Scroll Area */}
          <div className="h-[380px] overflow-y-auto p-4 space-y-3 bg-[#0e1621] bg-opacity-95">
            {telegramMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <span className="text-4xl mb-2">✈️</span>
                <p className="text-xs">لا توجد رسائل تليجرام بعد. جرب إرسال أمر مالي أو الضغط على الأوامر السريعة بالأعلى.</p>
              </div>
            ) : (
              telegramMessages.map((msg) => {
                const isUser = !msg.sender.isAgent;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md relative text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#2b5278] text-white rounded-br-none border border-sky-400/20'
                          : 'bg-[#182533] text-slate-100 rounded-bl-none border border-slate-700/60'
                      }`}
                    >
                      {/* Sender Info Banner */}
                      <div className="flex items-center justify-between gap-2 text-[10px] mb-1 pb-1 border-b border-white/10">
                        <span className="font-bold text-sky-300">
                          {isUser ? msg.sender.name : activePreset.name}
                        </span>
                        {msg.telegramThreadId && (
                          <span className="font-mono text-[9px] px-1 rounded bg-black/30 text-slate-400">
                            Topic #{msg.telegramThreadId}
                          </span>
                        )}
                      </div>

                      {/* Content text */}
                      <div className="whitespace-pre-line break-words text-slate-100">
                        {msg.content}
                      </div>

                      {/* Financial Parsed Action Banner */}
                      {msg.parsedAction && (
                        <div className="mt-2 p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            تم توثيق {msg.parsedAction.actionType === 'record_expense' ? 'المصروف' : 'الإيراد'} بقيمة{' '}
                            <strong className="font-mono">{msg.parsedAction.amount?.toLocaleString()} {msg.parsedAction.currency}</strong>
                          </span>
                        </div>
                      )}

                      {/* Time & Delivery ticks */}
                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400 font-mono">
                        <span>{formatSafeTime(msg.timestamp)}</span>
                        {isUser && <CheckCheck className="w-3 h-3 text-sky-400" />}
                      </div>
                    </div>

                    {/* Telegram Inline Keyboard (Simulated reply buttons for agent responses) */}
                    {!isUser && (
                      <div className="mt-1.5 flex flex-wrap gap-1 max-w-[85%]">
                        <button
                          onClick={() => handleSendMessage('/budget')}
                          className="px-2.5 py-1 rounded-lg bg-[#243447] hover:bg-[#2e425a] text-sky-300 text-[10px] font-semibold border border-sky-500/20 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>📊 تفاصيل الميزانية</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage('/summary')}
                          className="px-2.5 py-1 rounded-lg bg-[#243447] hover:bg-[#2e425a] text-sky-300 text-[10px] font-semibold border border-sky-500/20 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>💼 ملخص التدفق المالي</span>
                        </button>
                        <button
                          onClick={() => onNavigateTab('ledger')}
                          className="px-2.5 py-1 rounded-lg bg-[#243447] hover:bg-[#2e425a] text-emerald-300 text-[10px] font-semibold border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>📒 فتح الدفتر</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-sky-300 p-2 rounded-xl bg-slate-900/60 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>الوكيل يكتب رداً (Typing)...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Telegram Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="اكتب رسالة أو أمراً (مثال: /expense 250 برمجيات أو كم متبقي في الميزانية؟)..."
              disabled={isSending}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />

            <button
              type="submit"
              disabled={isSending || !inputMessage.trim()}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all flex items-center justify-center cursor-pointer shadow-md shadow-sky-500/20"
              title="إرسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column (5 cols): Webhook Security, BotFather Guide & Raw JSON Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {/* Security & API Key Validation Panel */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Lock className="w-4 h-4 text-sky-400" />
                <span>مصادقة الـ Webhook ومفتاح API</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Bearer Auth
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 block">المفتاح المعتمد للتحقق من هوية البوت:</label>
              <select
                value={selectedKey}
                onChange={(e) => {
                  setSelectedKey(e.target.value);
                  setUseInvalidKey(false);
                }}
                disabled={useInvalidKey}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              >
                {activeKeys.map((k) => (
                  <option key={k.id} value={k.fullKey}>
                    {k.name} ({k.keyPreview})
                  </option>
                ))}
              </select>

              {/* Security Test Toggle (Verify 401 Unauthorized handling) */}
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useInvalidKey}
                    onChange={(e) => setUseInvalidKey(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>اختبار رفض المفاتيح غير المصرح بها (محاكاة 401)</span>
                </label>
              </div>
            </div>
          </div>

          {/* BotFather Quick Setup Checklist */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Bot className="w-4 h-4 text-sky-400" />
                <span>خطوات تشغيل بوت تليجرام حقيقي (@BotFather)</span>
              </div>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
              >
                <span>فتح BotFather</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                <span>أرسل <code className="text-sky-300 font-mono">/newbot</code> في محادثة @BotFather.</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                <span>اختر اسماً للبوت، مثلاً: <code className="text-white font-mono">TariqFin_Bot</code>.</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                <span>انسخ التوكن الناتج وضعه في مفاتيح API الخاصة بـ Tariq-AgentOS.</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                <span>اضبط الـ Webhook ليوجه إلى: <code className="text-emerald-400 font-mono">/api/telegram/webhook</code>.</span>
              </div>
            </div>
          </div>

          {/* Webhook Payload Diagnostics */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>فحص استجابة الـ Webhook اللحظية</span>
              </div>

              {lastHttpStatus !== null && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      lastHttpStatus === 200 || lastHttpStatus === 201
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    HTTP {lastHttpStatus}
                  </span>
                  {lastLatencyMs !== null && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {lastLatencyMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>

            <div
              dir="ltr"
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-[160px] overflow-y-auto"
            >
              <pre>
                {lastResponsePayload
                  ? JSON.stringify(lastResponsePayload, null, 2)
                  : '// إرسال أي رسالة سيعرض نتيجة الـ Webhook والتوقيت هنا'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
