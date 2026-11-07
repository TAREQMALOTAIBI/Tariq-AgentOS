import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw,
  HelpCircle,
  MessageSquare,
  Zap,
  TrendingUp,
  RotateCcw,
  Wifi
} from 'lucide-react';
import type { AgentProfile, FinancialTransaction, SyncedMessage } from '../types/index';
import { formatSafeTime } from '../utils/formatters';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  createdTransaction?: FinancialTransaction | null;
  agentId?: string;
  agentName?: string;
  channel?: 'web' | 'telegram';
}

interface AgentChatStudioProps {
  agents: AgentProfile[];
  initialAgentId?: string;
  onBackToLanding: () => void;
  onOpenFabricModal: () => void;
  onTransactionCreated?: () => void;
}

export const AgentChatStudio: React.FC<AgentChatStudioProps> = ({
  agents,
  initialAgentId = 'fin-agent-01',
  onBackToLanding,
  onOpenFabricModal,
  onTransactionCreated,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgentId);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Per-agent message history stores
  const [conversations, setConversations] = useState<Record<string, Message[]>>({
    'fin-agent-01': [
      {
        id: 'fin-welcome',
        sender: 'agent',
        text: 'مرحباً بك! أنا وكيل التحليل المالي (@yosef0bot) في Tariq-AgentOS. 👋\nأنا متصل حياً بتطبيق تليجرام وأساعدك في تسجيل ومتابعة المصروفات والإيرادات، فحص الميزانيات، وحساب ضريبة القيمة المضافة (VAT 15%).\nالمحادثة متزامنة لحظياً: أي رسالة هنا ستظهر في تليجرام وأي رسالة من تليجرام ستصل هنا فوراً!',
        timestamp: formatSafeTime(new Date().toISOString()),
        agentId: 'fin-agent-01',
        agentName: 'وكيل التحليل المالي (@yosef0bot)',
      },
    ],
    'mkt-agent-02': [
      {
        id: 'mkt-welcome',
        sender: 'agent',
        text: 'أهلاً بك! أنا وكيل التسويق الرقمي (MarketOS). 📢\nمهمتي مساعدتك في تخطيط الحملات الإعلانية على سناب شات، تيك توك وجوجل، تحسين العائد على الإنفاق (ROAS)، وصياغة نصوص إعلانية مقنعة.\nكيف يمكنني مساعدتك في نمو نشاطك اليوم؟',
        timestamp: formatSafeTime(new Date().toISOString()),
        agentId: 'mkt-agent-02',
        agentName: 'وكيل التسويق الرقمي (MarketOS)',
      },
    ],
    'sales-agent-03': [
      {
        id: 'sales-welcome',
        sender: 'agent',
        text: 'مرحباً بك! أنا وكيل المبيعات والصفقات (SalesOS). 🎯\nأنا متخصص في تأهيل العملاء المحتملين (Leads)، إدارة خط الصفقات (Pipeline)، صياغة عروض الأسعار، والتعامل مع الاعتراضات لإغلاق العقود بنجاح.\nما هي الصفقة أو العرض الذي نعمل عليه الآن؟',
        timestamp: formatSafeTime(new Date().toISOString()),
        agentId: 'sales-agent-03',
        agentName: 'وكيل المبيعات والصفقات (SalesOS)',
      },
    ],
    'orch-agent-04': [
      {
        id: 'orch-welcome',
        sender: 'agent',
        text: 'أهلاً بك في النواة المركزية! أنا منسق المهام والراوتر الذكي (Kernel Dispatcher). ⚡\nأقوم بتحليل أهدافك العامة وتوزيعها بذكاء بين الوكيل المالي، التسويقي، والمبيعات لضمان سير أعمالك بتناغم تام.\nاطرح فكرتك وسأوجهها للوكيل الأنسب!',
        timestamp: formatSafeTime(new Date().toISOString()),
        agentId: 'orch-agent-04',
        agentName: 'منسق المهام المركزي (Dispatcher)',
      },
    ],
  });

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const currentMessages = conversations[selectedAgentId] || [];

  // Poll for incoming messages from Telegram so they appear in the Web chat live
  useEffect(() => {
    let isMounted = true;
    const syncTelegramMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.messages || !isMounted) return;

        const tgMessages: SyncedMessage[] = data.messages.filter((m: SyncedMessage) => m.channel === 'telegram');
        if (tgMessages.length === 0) return;

        setConversations((prev) => {
          const currentFinMsgs = prev['fin-agent-01'] || [];
          const existingIds = new Set(currentFinMsgs.map((m) => m.id));
          const newEntries: Message[] = [];

          for (const tgMsg of tgMessages) {
            if (!existingIds.has(tgMsg.id)) {
              newEntries.push({
                id: tgMsg.id,
                sender: tgMsg.sender.isAgent ? 'agent' : 'user',
                text: tgMsg.sender.isAgent ? tgMsg.content : `📱 [من تليجرام]: ${tgMsg.content}`,
                timestamp: formatSafeTime(tgMsg.timestamp),
                agentId: 'fin-agent-01',
                agentName: 'وكيل التحليل المالي (@yosef0bot)',
                channel: 'telegram',
                createdTransaction: tgMsg.parsedAction
                  ? {
                      id: tgMsg.parsedAction.transactionId || `tx-tg`,
                      timestamp: tgMsg.timestamp,
                      type: tgMsg.parsedAction.actionType === 'record_expense' ? 'expense' : 'income',
                      amount: tgMsg.parsedAction.amount || 0,
                      currency: tgMsg.parsedAction.currency || 'SAR',
                      category: tgMsg.parsedAction.category || 'general',
                      merchantOrParty: 'تليجرام',
                      description: tgMsg.content,
                      source: 'telegram',
                      status: 'cleared',
                      synced: true,
                    }
                  : undefined,
              });
            }
          }

          if (newEntries.length === 0) return prev;
          return {
            ...prev,
            'fin-agent-01': [...currentFinMsgs, ...newEntries],
          };
        });
      } catch {
        // Ignore network hiccups
      }
    };

    const interval = setInterval(syncTelegramMessages, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Dynamic starter prompts based on agent
  const getPromptSuggestions = (agentId: string) => {
    switch (agentId) {
      case 'fin-agent-01':
        return [
          'سجلت مصروف 350 ريال استضافة سحابية',
          'كم المتبقي من الميزانية لهذا الشهر؟',
          'أحسب ضريبة 15% على فاتورة 1,200 ريال',
          'أريد ملخص التدفق النقدي وصافي السيولة',
        ];
      case 'mkt-agent-02':
        return [
          'خطط لحملة إعلانية على تيك توك بميزانية 4000 ريال',
          'كيف أحسب وأحسن العائد على الإنفاق الإعلاني (ROAS)؟',
          'اقترح 3 أفكار إعلانات ذات خطاف قوي (Hook)',
          'ما هي أفضل استراتيجية لتسويق متجر إلكتروني محلي؟',
        ];
      case 'sales-agent-03':
        return [
          'صياغة نموذج عرض سعر رسمي لخدمة استشارية',
          'كيف أتعامل مع اعتراض العميل: "السعر مرتفع جداً"؟',
          'معايير تأهيل العملاء المحتملين وفق BANT',
          'نصائح لإغلاق الصفقات المترددة قبل نهاية الشهر',
        ];
      case 'orch-agent-04':
      default:
        return [
          'وجّه طلبي: أريد زيادة المبيعات وضبط المصروفات',
          'ما هي خطة العمل المقترحة للأسبوع القادم؟',
          'كيف يتم تنسيق ميزانية التسويق مع الوكيل المالي؟',
          'تحليل شامل لجاهزية عمليات الشركة',
        ];
    }
  };

  const suggestions = getPromptSuggestions(selectedAgentId);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: formatSafeTime(new Date().toISOString()),
    };

    // Update conversation for active agent
    setConversations((prev) => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] || []), userMessage],
    }));

    setInput('');
    setIsLoading(true);
    setLoadingStep('تحليل الاستفسار وتوليد الرد الذكي...');

    try {
      const historyPayload = currentMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          agentId: selectedAgentId,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      const agentMessage: Message = {
        id: `agt-${Date.now()}`,
        sender: 'agent',
        text: data.reply || 'تمت المعالجة بنجاح.',
        timestamp: formatSafeTime(new Date().toISOString()),
        createdTransaction: data.createdTransaction,
        agentId: selectedAgentId,
        agentName: activeAgent.name,
      };

      setConversations((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), agentMessage],
      }));

      if (data.createdTransaction && onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (err) {
      console.error('Chat error:', err);
      setConversations((prev) => ({
        ...prev,
        [selectedAgentId]: [
          ...(prev[selectedAgentId] || []),
          {
            id: `err-${Date.now()}`,
            sender: 'agent',
            text: 'حدث خطأ مؤقت أثناء الاتصال بالوكيل. يرجى إعادة المحاولة.',
            timestamp: formatSafeTime(new Date().toISOString()),
            agentId: selectedAgentId,
            agentName: activeAgent.name,
          },
        ],
      }));
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  const handleClearHistory = () => {
    const defaultWelcome = conversations[selectedAgentId]?.[0];
    setConversations((prev) => ({
      ...prev,
      [selectedAgentId]: defaultWelcome ? [defaultWelcome] : [],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Header / Navigation Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLanding}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="العودة لصفحة الهبوط"
          >
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span>العودة للرئيسية</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xl">{activeAgent.avatar}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white leading-tight">{activeAgent.name}</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="متصل"></span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">{activeAgent.role}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeAgent.telegramBotUsername && (
            <a
              href={`tg://resolve?domain=${activeAgent.telegramBotUsername}&start=studio_${activeAgent.id}`}
              className="px-3 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>فتح في تليجرام (@{activeAgent.telegramBotUsername})</span>
            </a>
          )}

          <button
            onClick={onOpenFabricModal}
            className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="عرض نمط Fabric المالي"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">نمط Fabric</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer border border-slate-700"
            title="مسح سجل المحادثة للوكيل الحالي"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Agent Selector Ribbon (اختر من بين الوكلاء) */}
      <div className="p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 flex items-center justify-between">
          <span>اختر الوكيل للتفاعل معه فوراً:</span>
          <span className="text-emerald-400 font-mono text-[10px]">4 وكلاء متاحين</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          {agents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`p-2.5 rounded-xl text-right transition-all flex items-center gap-2.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                    isSelected ? 'bg-emerald-500/25 border border-emerald-400/40' : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {agent.avatar}
                </div>
                <div className="truncate min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">{agent.name.split('(')[0].trim()}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {agent.specialty === 'finance'
                      ? 'المالية وتليجرام'
                      : agent.specialty === 'marketing'
                      ? 'التسويق وROAS'
                      : agent.specialty === 'sales'
                      ? 'الصفقات والعملاء'
                      : 'توجيه المهام'}
                  </span>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="flex flex-col rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl h-[calc(100vh-280px)] min-h-[480px]">
        {/* Telegram Live Two-Way Sync Banner */}
        <div className="px-4 py-2 bg-sky-950/50 border-b border-sky-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="text-[11px] font-medium">
              المزامنة اللحظية مع تليجرام نشطة: أي رسالة تكتبها هنا تُرسل لمحادثتك في تليجرام فوراً، والعكس صحيح.
            </span>
          </div>
          {activeAgent.telegramBotUsername && (
            <a
              href={`tg://resolve?domain=${activeAgent.telegramBotUsername}&start=sync`}
              className="text-[11px] text-sky-400 hover:text-sky-200 font-semibold underline cursor-pointer"
            >
              فتح @{activeAgent.telegramBotUsername}
            </a>
          )}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          {currentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${
                msg.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <span>{activeAgent.avatar}</span>}
              </div>

              {/* Message Content Bubble */}
              <div className="space-y-2">
                <div
                  className={`p-3.5 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`block text-[10px] mt-2 font-mono ${
                      msg.sender === 'user' ? 'text-blue-200 text-left' : 'text-slate-500 text-right'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {/* Rich Financial Transaction Card if applicable */}
                {msg.createdTransaction && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>قيد مالي مؤكد #{msg.createdTransaction.id}</span>
                      </div>
                      <span className="font-mono text-white text-sm">
                        {msg.createdTransaction.type === 'expense' ? '-' : '+'}
                        {msg.createdTransaction.amount.toLocaleString()} {msg.createdTransaction.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span>التصنيف: {msg.createdTransaction.category}</span>
                      <span className="text-emerald-400 font-mono">متزامن مع الدفاتر</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] ml-auto items-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs">
                <span>{activeAgent.avatar}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>{loadingStep || 'جارٍ التفكير وتوليد الرد...'}</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Dynamic Prompt Suggestions Chips */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">اقتراحات سريعة:</span>
          {suggestions.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 text-[11px] whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`تحدث مع ${activeAgent.name.split('(')[0].trim()}...`}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
          />

          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs md:text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-slate-950" />
            <span className="hidden sm:inline">إرسال</span>
          </button>
        </div>
      </div>
    </div>
  );
};
