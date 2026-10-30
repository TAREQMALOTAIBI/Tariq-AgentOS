import React, { useState } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Smartphone, 
  Laptop, 
  ArrowUpRight, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  Calendar,
  Layers
} from 'lucide-react';
import type { FinancialTransaction, BudgetCategory } from '../types/index';
import { CATEGORY_LABELS_AR } from '../utils/finance-engine';
import { formatSafeDate, formatSafeTime } from '../utils/formatters';

interface FinancialLedgerProps {
  transactions: FinancialTransaction[];
  budgets: Array<BudgetCategory & { remaining: number; percentageUsed: number; isOverBudget: boolean; isNearThreshold: boolean }>;
  onOpenAddModal: () => void;
}

export const FinancialLedgerView: React.FC<FinancialLedgerProps> = ({
  transactions,
  budgets,
  onOpenAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'telegram' | 'web_frontend'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Filtered transactions
  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.merchantOrParty.toLowerCase().includes(search.toLowerCase()) ||
      tx.amount.toString().includes(search);

    const matchesSource = sourceFilter === 'all' 
      ? true 
      : sourceFilter === 'telegram' 
      ? (tx.source === 'telegram' || tx.source === 'whatsapp')
      : tx.source === sourceFilter;
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;

    return matchesSearch && matchesSource && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>سجل المعاملات والتحليلات المالية المركزية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            دفتر موحد تتزامن فيه قيود بوتات تليجرام والمدخلات اليدوية عبر وكيل FinOS الذكي
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة معاملة جديدة</span>
        </button>
      </div>

      {/* Budgets Progress Section */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">مراقبة ميزانيات الأقسام (تحديث لحظي)</h3>
          </div>
          <span className="text-xs text-slate-400">
            {budgets.length} بنود ميزانية مرصودة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {budgets.map((b) => {
            const label = CATEGORY_LABELS_AR[b.category] || b.category;
            const isAlert = b.isOverBudget || b.isNearThreshold;

            return (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      b.isOverBudget
                        ? 'bg-rose-500/20 text-rose-300'
                        : b.isNearThreshold
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {b.percentageUsed}% مستهلك
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.isOverBudget
                        ? 'bg-rose-500'
                        : b.isNearThreshold
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>مصروف: <strong className="font-mono text-white">{b.spent.toLocaleString()}</strong> ر.س</span>
                  <span>المخصص: <strong className="font-mono text-slate-400">{b.allocated.toLocaleString()}</strong> ر.س</span>
                </div>

                {isAlert && (
                  <div className="text-[10px] text-amber-400/90 flex items-center gap-1 pt-1 border-t border-slate-900">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>
                      {b.isOverBudget ? 'تجاوز الحد المخصص!' : 'اقترب من حد الإنفاق الحرج'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions Table Section */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالوصف، الطرف، أو المبلغ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Channel filter */}
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  sourceFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                كل القنوات
              </button>
              <button
                onClick={() => setSourceFilter('telegram')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'telegram' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>✈️ تليجرام</span>
              </button>
              <button
                onClick={() => setSourceFilter('web_frontend')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'web_frontend' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>النظام</span>
              </button>
            </div>

            {/* Type filter */}
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'expense' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                مصروف
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'income' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                إيراد
              </button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">رقم القيد</th>
                <th className="py-3 px-4">القناة والمصدر</th>
                <th className="py-3 px-4">البيان والوصف</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">ملاحظات FinOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filtered.length > 0 ? (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 font-semibold">
                      #{tx.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {tx.source === 'telegram' || tx.source === 'whatsapp' ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center gap-1 border border-sky-500/30">
                            <span>✈️</span>
                            <span>تليجرام</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold flex items-center gap-1">
                            <Laptop className="w-3 h-3" />
                            <span>واجهة النظام</span>
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-400 font-bold" title="متزامن">
                          ✓
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{tx.merchantOrParty}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{tx.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                        {CATEGORY_LABELS_AR[tx.category] || tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}>
                        {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString()} {tx.currency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {formatSafeDate(tx.timestamp)} • {formatSafeTime(tx.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 max-w-[200px] truncate">
                      {tx.agentNotes || 'تم التحقق من القيد'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    لا توجد معاملات مطابقة لمعايير البحث الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
