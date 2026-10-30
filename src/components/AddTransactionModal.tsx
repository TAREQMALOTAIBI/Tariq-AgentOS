import React, { useState } from 'react';
import { X, DollarSign, ArrowUpRight, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { CATEGORY_LABELS_AR } from '../utils/finance-engine';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'expense' | 'income';
    amount: number;
    currency: string;
    category: string;
    merchantOrParty: string;
    description: string;
  }) => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [category, setCategory] = useState('marketing');
  const [merchantOrParty, setMerchantOrParty] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!merchantOrParty.trim()) {
      setError('يرجى تحديد الطرف أو المتجر أو العميل');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        currency,
        category,
        merchantOrParty: merchantOrParty.trim(),
        description: description.trim() || `${type === 'expense' ? 'مصروف' : 'إيراد'} مسجل يدوياً في FinOS`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ المعاملة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">تسجيل معاملة مالية جديدة في FinOS</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">نوع المعاملة:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>مصروف (Expense)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>إيراد (Income)</span>
              </button>
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">المبلغ:</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="مثال: 450.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">العملة:</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="SAR">SAR (ريال)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED (درهم)</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">التصنيف المحاسبي:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              {Object.entries(CATEGORY_LABELS_AR).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Merchant / Client */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">الطرف / المتجر / العميل:</label>
            <input
              type="text"
              required
              value={merchantOrParty}
              onChange={(e) => setMerchantOrParty(e.target.value)}
              placeholder="مثال: متجر جرير، أو شركة سحاب للتقنية"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">البيان أو الوصف (اختياري):</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية عن الفاتورة أو المصروف..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Submit Actions */}
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
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {isSubmitting ? 'جاري التوثيق والمزامنة...' : 'تأكيد وحفظ القيد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
