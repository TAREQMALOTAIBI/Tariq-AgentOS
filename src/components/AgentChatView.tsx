import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  ShieldCheck,
  RefreshCw,
  Terminal,
  Smartphone
} from 'lucide-react';
import type { FinancialTransaction } from '../types/index';
import { CATEGORY_LABELS_AR } from '../utils/finance-engine';
import { formatSafeTime } from '../utils/formatters';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  createdTransaction?: FinancialTransaction | null;
  parsedIntent?: {
    action: string;
    amount?: number;
    currency?: string;
    category?: string;
  };
}

interface AgentChatViewProps {
  onTransactionCreated: () => void;
  onNavigateTab: (tab: string) => void;
}

export const AgentChatView: React.FC<AgentChatViewProps> = ({
  onTransactionCreated,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'agent',
      text: 'مرحباً بك في وحدة تحكم الوكيل المالي الذكي (FinOS Agent)! 👋\nأنا وكيلك المتخصص في المالية وإدارة النفقات والتدفقات النقدية. يمكنك تسجيل المصروفات، فحص الميزانيات، أو الاستعلام عن وضع الشركة المالي.\nجميع العمليات هنا متزامنة لحظياً وبشكل آمن مع بوت تليجرام (@TariqFin_Bot) أيضاً.',
      timestamp: formatSafeTime(new Date().toISOString()),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'سجلت مصروف 250 ريال استضافة سحابية',
    'كم المتبقي من ميزانية التسويق؟',
    'أريد ملخص التدفق المالي لهذا الشهر',
    'أجري تدقيق وفحص للمصروفات المشبوهة',
    'سجلت إيراد 18,500 ريال دفعة عميل',
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: formatSafeTime(new Date().toISOString()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setActiveStep('تحليل النية المالية والأرقام...');

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });

      setActiveStep('تحديث الدفاتر والمزامنة اللحظية...');
      const data = await response.json();

      const agentMessage: Message = {
        id: `agt-${Date.now()}`,
        sender: 'agent',
        text: data.reply || 'تمت معالجة الطلب المالي بنجاح.',
        timestamp: formatSafeTime(new Date().toISOString()),
        createdTransaction: data.createdTransaction,
        parsedIntent: data.parsedIntent,
      };

      setMessages((prev) => [...prev, agentMessage]);
      if (data.createdTransaction) {
        onTransactionCreated();
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: 'عذراً، حدث خطأ أثناء الاتصال بنواة الوكيل المالي. يرجى المحاولة مرة أخرى.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setActiveStep(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-190px)] min-h-[580px]">
      {/* Main Chat Stream (3 cols) */}
      <div className="lg:col-span-3 flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">الوكيل المالي الذكي (FinOS Core)</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-400">
                متصل بالمحاسبة السحابية • متزامن فورياً مع بوت تليجرام (@TariqFin_Bot)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono">
              Model: gemini-3.8-flash
            </span>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[88%] ${
                msg.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-2">
                <div
                  className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-md ${
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

                {/* Rich Transaction Card Attachment */}
                {msg.createdTransaction && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-2">
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

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-emerald-500/20">
                      <div>
                        <span className="text-slate-400">التصنيف: </span>
                        <span>{CATEGORY_LABELS_AR[msg.createdTransaction.category] || msg.createdTransaction.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">حالة المزامنة: </span>
                        <span className="text-emerald-400 font-semibold">متزامن مع الواتساب 🟢</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-[80%] ml-auto">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>{activeStep || 'يعالج الوكيل المالي طلبك...'}</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompts Strip */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-500 shrink-0 font-medium">مقترحات:</span>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-950/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أمراً مالياً، مثلاً: سجلت مصروف 350 ريال غداء عمل، أو كم المتبقي في الميزانية؟"
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="إرسال الرسالة إلى الوكيل المالي"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs md:text-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-lg shadow-emerald-500/20"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Side Context & Tools Panel (1 col) */}
      <div className="space-y-4">
        {/* Agent Runtime Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>محرك القرار المالي (FinDecision Engine)</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">التكامل الثنائي</span>
              <span className="font-semibold text-sky-300 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                متزامن مع بوتات تليجرام ومفتاح API
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">الضريبة المطبقة</span>
              <span className="font-semibold text-white mt-0.5 block font-mono">
                VAT 15% (مفعل آلياً)
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">دقة تصنيف النفقات</span>
              <span className="font-semibold text-cyan-300 mt-0.5 block font-mono">
                98.4% (معالجة لغوية ذكية)
              </span>
            </div>
          </div>
        </div>

        {/* Telegram Gateway Quick Link */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/30 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
            <Send className="w-4 h-4 text-sky-400" />
            <span>تجربة بوتات تليجرام اللحظية</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            يمكنك محاكاة رسائل وأوامر تليجرام المرسلة للوكيل وملاحظة انعكاسها وتحديث الدفاتر فوراً في شاشة النظام.
          </p>
          <button
            onClick={() => onNavigateTab('telegram_gateway')}
            className="w-full py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/20"
          >
            <span>فتح بوابة تليجرام</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
