import React, { useState } from 'react';
import { X, Key, ShieldCheck, Check, Copy } from 'lucide-react';
import type { ApiKeyItem } from '../types/index';

interface NewKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, scopes: string[]) => Promise<ApiKeyItem>;
}

export const NewKeyModal: React.FC<NewKeyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('بوت تليجرام - خادم الإنتاج (@TariqFin_Bot)');
  const [createdKey, setCreatedKey] = useState<ApiKeyItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newKey = await onSubmit(name.trim(), [
        'telegram:receive',
        'telegram:send',
        'finance:read',
        'finance:write',
      ]);
      setCreatedKey(newKey);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (createdKey?.fullKey) {
      navigator.clipboard.writeText(createdKey.fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedKey(null);
    setName('بوت تليجرام - خادم الإنتاج (@TariqFin_Bot)');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">توليد مفتاح API جديد لبوتات تليجرام</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-xs space-y-4">
          {createdKey ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sky-300 space-y-2">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  تم إنشاء المفتاح المشفر بنجاح!
                </span>
                <p className="text-[11px] text-slate-300">
                  انسخ هذا المفتاح الآن واحتفظ به في مكان آمن لاستخدامه في ترويسة طلبات Telegram Webhook.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">المفتاح السري الكامل:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdKey.fullKey}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'تم!' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  إغلاق وتم
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">اسم المفتاح أو الغرض منه:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: Telegram Bot Webhook Production"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <span className="block text-slate-300 font-semibold mb-1.5">الصلاحيات الممنوحة (Scopes):</span>
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-sky-400">✓</span>
                    <span>telegram:receive (استقبال الرسائل والأوامر من تليجرام)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-sky-400">✓</span>
                    <span>telegram:send (إرسال الردود المالية المؤكدة)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-sky-400">✓</span>
                    <span>finance:write (قيد المعاملات وتحديث الميزانيات)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'جاري التوليد...' : 'توليد المفتاح المشفر'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
