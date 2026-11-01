import React, { useState } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Code2, 
  Lock, 
  AlertTriangle,
  ExternalLink,
  Activity
} from 'lucide-react';
import type { ApiKeyItem, SystemAuditLog } from '../types/index';
import { formatSafeDate, formatSafeTime } from '../utils/formatters';

interface ApiKeysViewProps {
  apiKeys: ApiKeyItem[];
  auditLogs: SystemAuditLog[];
  onGenerateKey: () => void;
  onRevokeKey: (id: string) => void;
}

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({
  apiKeys,
  auditLogs,
  onGenerateKey,
  onRevokeKey,
}) => {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleCopy = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const sampleKey = apiKeys.find((k) => k.status === 'active')?.fullKey || 'agt_live_tg_99a8b7c6d5e4f3a2b1c0';

  const curlExample = `curl -X POST https://your-domain.run.app/api/telegram/webhook \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "update_id": 10001,
    "message": {
      "message_id": 42,
      "from": { "id": 1234567, "username": "tariq_admin", "first_name": "طارق" },
      "chat": { "id": -100987654321, "type": "supergroup" },
      "message_thread_id": 101,
      "text": "/expense 150 ريال غداء عمل"
    }
  }'`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <span>إدارة مفاتيح API وبوابة الأمان</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            توليد وإدارة مفاتيح الوصول لبوابات بوتات تليجرام والتحقق المشفر من هوية الأنظمة المتصلة
          </p>
        </div>

        <button
          onClick={onGenerateKey}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>توليد مفتاح API جديد</span>
        </button>
      </div>

      {/* Keys List */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>مفاتيح API النشطة لبوتات تليجرام والويب هوك</span>
        </h3>

        <div className="space-y-3">
          {apiKeys.map((k) => (
            <div
              key={k.id}
              className={`p-4 rounded-xl bg-slate-950 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                k.status === 'active' ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/40 opacity-60'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-xs font-bold text-white">{k.name}</h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      k.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {k.status === 'active' ? 'نشط ومصرح' : 'ملغى ومبطل'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {k.fullKey ? k.fullKey : k.keyPreview}
                  </code>
                  {k.fullKey && (
                    <button
                      onClick={() => handleCopy(k.id, k.fullKey!)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="نسخ المفتاح الكامل"
                    >
                      {copiedKeyId === k.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>الطلبات المعالجة: <strong className="text-slate-200 font-mono">{k.requestsCount}</strong></span>
                  <span>•</span>
                  <span>تاريخ الإنشاء: {formatSafeDate(k.createdAt)}</span>
                  <span>•</span>
                  <span>آخر استخدام: {k.lastUsedAt ? formatSafeTime(k.lastUsedAt) : 'لم يستخدم بعد'}</span>
                </div>
              </div>

              {/* Actions & Scopes */}
              <div className="flex items-center gap-2 shrink-0">
                {k.status === 'active' && (
                  <button
                    onClick={() => onRevokeKey(k.id)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/20"
                    title="إبطال وإلغاء المفتاح فوراً"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>إبطال</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Code Sample & Documentation */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">طريقة ربط بوتات تليجرام بالوكلاء (Telegram Webhook API)</h3>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(curlExample);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 border border-slate-700 cursor-pointer"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCurl ? 'تم النسخ!' : 'نسخ كود cURL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          قم بتعيين عنوان الـ Webhook لبوت تليجرام باستخدام الأمر الرسمي <code dir="ltr" className="text-sky-300 font-mono">setWebhook</code> مع إرسال مفتاح الـ API في الترويسة <code dir="ltr" className="text-sky-300 font-mono">Authorization: Bearer agt_live_tg_...</code>.
        </p>

        <div dir="ltr" className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto text-sky-400 text-left">
          <pre>{curlExample}</pre>
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">سجل التدقيق الأمني للطلبات اللحظية (Security Audit Logs)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {auditLogs.length} طلبات مسجلة
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">الوقت</th>
                <th className="py-2.5 px-3">القناة</th>
                <th className="py-2.5 px-3">الحدث الأمني</th>
                <th className="py-2.5 px-3">عنوان IP</th>
                <th className="py-2.5 px-3">الحالة</th>
                <th className="py-2.5 px-3">زمن المعالجة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/60">
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {formatSafeTime(log.timestamp)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase font-sans ${
                        log.channel === 'telegram' ? 'bg-sky-500/20 text-sky-300' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {log.channel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 font-sans text-xs">
                    {log.event}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{log.ip}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        log.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {log.status === 'success' ? 'مصرح به' : 'مرفوض 401'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400 text-[11px]">{log.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
