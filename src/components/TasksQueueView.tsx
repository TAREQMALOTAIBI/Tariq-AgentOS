import React, { useState } from 'react';
import { 
  Layers, 
  Play, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Zap,
  Calendar,
  Sparkles
} from 'lucide-react';
import type { AgentTask } from '../types/index';

interface TasksQueueProps {
  tasks: AgentTask[];
  onTriggerTask: (taskId: string) => Promise<void>;
}

export const TasksQueueView: React.FC<TasksQueueProps> = ({
  tasks,
  onTriggerTask,
}) => {
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRun = async (taskId: string) => {
    setRunningTaskId(taskId);
    setSuccessMessage(null);
    try {
      await onTriggerTask(taskId);
      setSuccessMessage('تم تشغيل المهمة بنجاح وتحديث النتائج في خلفية Tariq-AgentOS.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>طابور المهام المتعددة لنظام التشغيل (Agent Multi-Tasking Queue)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            جدولة وتنفيذ المهام التلقائية وغير المتزامنة بين وكيل المالية والأنظمة المرتبطة
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>منسق المهام يعمل بكفاءة 100%</span>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => {
          const isRunning = runningTaskId === task.id || task.status === 'running';

          return (
            <div
              key={task.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{task.title}</h3>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      {task.titleEn}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      isRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : task.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {isRunning ? 'قيد التنفيذ...' : task.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {task.details}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>آخر تشغيل: {new Date(task.lastRun).toLocaleTimeString('ar-SA')}</span>
                  <span>المجدول: {task.nextRun}</span>
                </div>

                <button
                  onClick={() => handleRun(task.id)}
                  disabled={isRunning}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>جاري المعالجة بواسطة الوكيل...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تشغيل المهمة الآن على الوكيل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
