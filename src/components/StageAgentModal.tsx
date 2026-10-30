import React, { useState } from 'react';
import { X, Bot, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import type { AgentProfile, AgentSpecialty } from '../types/index';

interface StageAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newAgent: Partial<AgentProfile>) => Promise<void>;
}

export const StageAgentModal: React.FC<StageAgentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [specialty, setSpecialty] = useState<AgentSpecialty>('marketing');
  const [avatar, setAvatar] = useState('📢');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('المرحلة 2 (مخطط للإضافة والتفعيل لاحقاً)');
  const [triggerKeywords, setTriggerKeywords] = useState('تسويق, اعلانات, حملة, roas');
  const [capabilities, setCapabilities] = useState('إدارة الحملات الإعلانية, تحليل العائد, تتبع الروابط');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم الوكيل');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        id: `agent-${Date.now().toString(36)}`,
        name: name.trim(),
        nameEn: nameEn.trim() || name.trim(),
        role: role.trim() || 'إدارة وتنسيق المهام المتخصصة',
        roleEn: 'Specialist Agent',
        description: description.trim() || 'وكيل ذكاء اصطناعي متخصص في منظومة Tariq-AgentOS.',
        status: 'planned',
        avatar: avatar || '🤖',
        isSpecialist: true,
        specialty,
        phase,
        triggerKeywords: triggerKeywords.split(',').map((s) => s.trim()).filter(Boolean),
        capabilities: capabilities.split(',').map((s) => s.trim()).filter(Boolean),
        metrics: {
          tasksCompleted: 0,
          uptime: 'جاهز للإطلاق',
          memoryMb: 0,
          tokensUsed: 0,
          avgLatencyMs: 0,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الوكيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">تجهيز وكيل ذكي جديد لمنظومة Tariq-AgentOS</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="block text-slate-300 font-semibold mb-1.5">اسم الوكيل (بالعربية):</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: وكيل التسويق الرقمي (MarketOS)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">الأيقونة:</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-center text-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">المجال / التخصص:</label>
              <select
                value={specialty}
                onChange={(e) => {
                  const s = e.target.value as AgentSpecialty;
                  setSpecialty(s);
                  if (s === 'marketing') {
                    setAvatar('📢');
                    setRole('إدارة الحملات الإعلانية وتحليل العائد');
                  } else if (s === 'sales') {
                    setAvatar('🎯');
                    setRole('إدارة الصفقات والعملاء المحتملين');
                  } else if (s === 'support') {
                    setAvatar('🎧');
                    setRole('خدمة العملاء والرد الفوري');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="marketing">التسويق والإعلانات (Marketing)</option>
                <option value="sales">المبيعات والصفقات (Sales)</option>
                <option value="support">خدمة العملاء (Support)</option>
                <option value="custom">تخصص مخصص (Custom)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">المرحلة المخططة:</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="المرحلة 2 (مخطط للإضافة والتفعيل لاحقاً)">المرحلة 2 (مخطط لاحقاً)</option>
                <option value="المرحلة 3 (مستقبلي)">المرحلة 3 (مستقبلي)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">الدور الرئيسي:</label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="مثال: إدارة حملات سناب شات وتيك توك وحساب عائد الإنفاق الإعلاني"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">الوصف والمهام:</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح مختصر لكيفية تفاعل هذا الوكيل داخل Tariq-AgentOS..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">الكلمات المفتاحية للتوجيه الآلي (مفصولة بفاصلة):</label>
            <input
              type="text"
              value={triggerKeywords}
              onChange={(e) => setTriggerKeywords(e.target.value)}
              placeholder="تسويق, اعلانات, حملة, roas"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ الوكيل في المنظومة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
