import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Layers,
  Pin,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  LINE_COLOR_STYLES,
  LineCategory,
  LineColorKey,
  TrackerState,
  WorkLine,
  Worker,
} from './types';

interface WorkersLinesViewProps {
  workers: Worker[];
  lines: WorkLine[];
  fullState: TrackerState;
  onAddWorker: (worker: Omit<Worker, 'id' | 'active'>) => void;
  onBulkAddWorkers: (names: string[]) => void;
  onFillUpTo40Workers: () => void;
  onUpdateWorker: (id: string, patch: Partial<Omit<Worker, 'id'>>) => void;
  onDeleteWorker: (id: string) => void;
  onAddLine: (line: Omit<WorkLine, 'id'>) => void;
  onUpdateLine: (id: string, patch: Partial<Omit<WorkLine, 'id'>>) => void;
  onDeleteLine: (id: string) => void;
  onImportState: (imported: TrackerState) => void;
}

const LINE_COLORS: Array<{ key: LineColorKey; label: string }> = [
  { key: 'teal', label: 'فيروزي' },
  { key: 'blue', label: 'أزرق' },
  { key: 'emerald', label: 'أخضر زمردي' },
  { key: 'indigo', label: 'نيلي' },
  { key: 'cyan', label: 'سماوي' },
  { key: 'violet', label: 'بنفسجي' },
  { key: 'amber', label: 'كهرماني' },
  { key: 'orange', label: 'برتقالي' },
  { key: 'rose', label: 'أحمر' },
  { key: 'slate', label: 'رمادي' },
];

export const WorkersLinesView: React.FC<WorkersLinesViewProps> = ({
  workers,
  lines,
  fullState,
  onAddWorker,
  onBulkAddWorkers,
  onFillUpTo40Workers,
  onUpdateWorker,
  onDeleteWorker,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  onImportState,
}) => {
  // Worker search & add
  const [workerSearch, setWorkerSearch] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('عامل إنتاج');
  const [defaultLineId, setDefaultLineId] = useState('antinal');
  const [fixedLineId, setFixedLineId] = useState('');

  // Bulk add
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Inline edit worker
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerRole, setEditWorkerRole] = useState('');
  const [editWorkerDefaultLine, setEditWorkerDefaultLine] = useState('');
  const [editWorkerFixedLine, setEditWorkerFixedLine] = useState('');
  const [confirmDeleteWorkerId, setConfirmDeleteWorkerId] = useState<string | null>(null);

  // Add custom line form
  const [newLineName, setNewLineName] = useState('');
  const [newLineShort, setNewLineShort] = useState('');
  const [newLineCapacity, setNewLineCapacity] = useState('12');
  const [newLineCategory, setNewLineCategory] = useState<LineCategory>('production');
  const [newLineColor, setNewLineColor] = useState<LineColorKey>('emerald');

  // Inline edit ANY line
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editLineShort, setEditLineShort] = useState('');
  const [editLineCap, setEditLineCap] = useState('0');
  const [editLineCat, setEditLineCat] = useState<LineCategory>('production');
  const [editLineColor, setEditLineColor] = useState<LineColorKey>('teal');
  const [confirmDeleteLineId, setConfirmDeleteLineId] = useState<string | null>(null);

  // Backup feedback
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const workLinesOnly = lines.filter((l) => l.category !== 'absence');
  const productionLinesOnly = lines.filter((l) => l.category === 'production');
  const filteredWorkers = workers.filter((w) => {
    const q = workerSearch.trim().toLowerCase();
    if (!q) return true;
    return w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q);
  });

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onAddWorker({
      name: cleanName,
      role: role.trim() || 'عامل إنتاج',
      defaultLineId: defaultLineId || undefined,
      fixedLineId: fixedLineId || undefined,
    });
    setName('');
    setFixedLineId('');
  };

  const handleBulkSubmit = () => {
    const names = bulkText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    onBulkAddWorkers(names);
    setBulkText('');
    setShowBulk(false);
  };

  const startEditWorker = (w: Worker) => {
    setEditingWorkerId(w.id);
    setEditWorkerName(w.name);
    setEditWorkerRole(w.role);
    setEditWorkerDefaultLine(w.defaultLineId ?? '');
    setEditWorkerFixedLine(w.fixedLineId ?? '');
    setConfirmDeleteWorkerId(null);
  };

  const saveEditWorker = (id: string) => {
    const cleanName = editWorkerName.trim();
    if (!cleanName) return;
    onUpdateWorker(id, {
      name: cleanName,
      role: editWorkerRole.trim() || 'عامل إنتاج',
      defaultLineId: editWorkerDefaultLine || undefined,
      fixedLineId: editWorkerFixedLine || undefined,
    });
    setEditingWorkerId(null);
  };

  const handleAddLineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newLineName.trim();
    if (!cleanName) return;
    const cap = Math.max(0, parseInt(newLineCapacity, 10) || 0);
    onAddLine({
      name: cleanName,
      shortName: newLineShort.trim() || cleanName.slice(0, 12),
      category: newLineCategory,
      color: newLineColor,
      requiredWorkers: newLineCategory === 'production' ? cap : 0,
    });
    setNewLineName('');
    setNewLineShort('');
    setNewLineCapacity('12');
  };

  const startEditLine = (line: WorkLine) => {
    setEditingLineId(line.id);
    setEditLineName(line.name);
    setEditLineShort(line.shortName);
    setEditLineCap(String(line.requiredWorkers ?? 0));
    setEditLineCat(line.category);
    setEditLineColor(line.color);
    setConfirmDeleteLineId(null);
  };

  const saveEditLine = (line: WorkLine) => {
    const cleanName = editLineName.trim();
    if (!cleanName) return;
    const cap = Math.max(0, parseInt(editLineCap, 10) || 0);
    onUpdateLine(line.id, {
      name: cleanName,
      shortName: editLineShort.trim() || cleanName.slice(0, 12),
      category: line.isProtected ? line.category : editLineCat,
      color: editLineColor,
      requiredWorkers: line.category === 'absence' ? 0 : cap,
    });
    setEditingLineId(null);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(fullState, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة-احتياطية-خطوط-الإنتاج-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice('تم حفظ النسخة الاحتياطية على جهازك بنجاح.');
    window.setTimeout(() => setBackupNotice(null), 3000);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as TrackerState;
        if (
          parsed &&
          Array.isArray(parsed.workers) &&
          Array.isArray(parsed.lines) &&
          parsed.weeks &&
          typeof parsed.weeks === 'object'
        ) {
          onImportState(parsed);
          setBackupNotice('تم استعادة كل الأسماء والأسابيع المحفوظة بنجاح.');
        } else {
          setBackupNotice('الملف غير مطابق لتنسيق النسخة الاحتياطية.');
        }
      } catch {
        setBackupNotice('تعذّر قراءة الملف. تأكد إنه ملف JSON من البرنامج.');
      }
      window.setTimeout(() => setBackupNotice(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Manage Production Lines & Required Headcounts */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              إدارة خطوط الإنتاج وعدد العمال المطلوب ({lines.length})
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تقدر تعدّل اسم أو عدد العمال المطلوب لأي خط إنتاج، أو تزوّد خطوط جديدة، أو تمسح أي خط بسهولة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {lines.map((line) => {
            const styles = LINE_COLOR_STYLES[line.color];
            const isEditing = editingLineId === line.id;
            const isConfirmDel = confirmDeleteLineId === line.id;
            const catLabel =
              line.category === 'production'
                ? 'خط إنتاج'
                : line.category === 'department'
                ? 'قسم آخر'
                : 'غياب / إجازة';

            if (isEditing) {
              return (
                <div
                  key={line.id}
                  className="rounded-xl border border-teal-400 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/25 p-3 space-y-2 md:col-span-2 lg:col-span-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                    <input
                      type="text"
                      value={editLineName}
                      onChange={(e) => setEditLineName(e.target.value)}
                      placeholder="اسم الخط"
                      className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 lg:col-span-2"
                    />
                    <input
                      type="text"
                      value={editLineShort}
                      onChange={(e) => setEditLineShort(e.target.value)}
                      placeholder="الاسم المختصر"
                      className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                    {line.category !== 'absence' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">العدد:</span>
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={editLineCap}
                          onChange={(e) => setEditLineCap(e.target.value)}
                          className="w-full min-h-[38px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}
                    {!line.isProtected && (
                      <select
                        value={editLineCat}
                        onChange={(e) => setEditLineCat(e.target.value as LineCategory)}
                        className="min-h-[38px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      >
                        <option value="production">خط إنتاج</option>
                        <option value="department">قسم آخر</option>
                      </select>
                    )}
                    <select
                      value={editLineColor}
                      onChange={(e) => setEditLineColor(e.target.value as LineColorKey)}
                      className="min-h-[38px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {LINE_COLORS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingLineId(null)}
                      className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditLine(line)}
                      className="min-h-[34px] px-3.5 rounded-lg bg-teal-700 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>حفظ التعديل</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={line.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-3 h-3 rounded-sm shrink-0 ${styles.barBg}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {line.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {catLabel}
                      {line.category !== 'absence' && (line.requiredWorkers ?? 0) > 0
                        ? ` · يحتاج ${line.requiredWorkers} عامل`
                        : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isConfirmDel ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteLine(line.id);
                          setConfirmDeleteLineId(null);
                        }}
                        className="min-h-[30px] px-2 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
                      >
                        حذف
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLineId(null)}
                        className="min-h-[30px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]"
                      >
                        لأ
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditLine(line)}
                        aria-label={`تعديل ${line.name}`}
                        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!line.isProtected && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLineId(line.id)}
                          aria-label={`حذف ${line.name}`}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Production Line / Department Form */}
        <form
          onSubmit={handleAddLineSubmit}
          className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5"
        >
          <input
            type="text"
            value={newLineName}
            onChange={(e) => setNewLineName(e.target.value)}
            placeholder="اسم الخط الجديد (مثلاً: خط شراب جديد)..."
            className="min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 lg:col-span-2"
          />
          <input
            type="text"
            value={newLineShort}
            onChange={(e) => setNewLineShort(e.target.value)}
            placeholder="مختصر للجدول (اختياري)"
            className="min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={200}
              value={newLineCapacity}
              onChange={(e) => setNewLineCapacity(e.target.value)}
              placeholder="العدد"
              title="عدد العمال المطلوب لتشغيل الخط"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">عامل</span>
          </div>
          <select
            value={newLineCategory}
            onChange={(e) => setNewLineCategory(e.target.value as LineCategory)}
            className="min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="production">خط إنتاج</option>
            <option value="department">قسم تاني</option>
          </select>
          <div className="flex items-center gap-2">
            <select
              aria-label="لون الخط الجديد"
              value={newLineColor}
              onChange={(e) => setNewLineColor(e.target.value as LineColorKey)}
              className="min-h-[42px] px-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            >
              {LINE_COLORS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خط</span>
            </button>
          </div>
        </form>
      </section>

      {/* Section 1.5: Fixed Key Line Operators (Outside Fair Rotation When Their Line Runs) */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Pin className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              العمالة الأساسية على الخطوط (خارج التوزيع العادل)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حدّد مشغّلي الماكينات أو العمالة الأساسية لكل خط — أي عامل هنا ينزل على خطه تلقائي كل يوم طالما خطه شغال، ولو خطه واقف يدخل التوزيع العادل عادي
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {productionLinesOnly.map((line) => {
            const styles = LINE_COLOR_STYLES[line.color];
            const pinnedWorkers = workers.filter((w) => w.fixedLineId === line.id);
            const availableToPin = workers.filter((w) => w.fixedLineId !== line.id);

            return (
              <div
                key={line.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3.5 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-3 h-3 rounded-sm shrink-0 ${styles.barBg}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {line.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0 tabular-nums">
                      {pinnedWorkers.length} أساسي
                    </span>
                  </div>

                  {pinnedWorkers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {pinnedWorkers.map((w) => (
                        <span
                          key={w.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          <span>{w.name}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateWorker(w.id, { fixedLineId: undefined })}
                            aria-label={`إلغاء تثبيت ${w.name} من ${line.name}`}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      مفيش عمالة أساسية مثبّتة على هذا الخط بعد
                    </p>
                  )}
                </div>

                <select
                  aria-label={`إضافة عامل أساسي على ${line.name}`}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    onUpdateWorker(e.target.value, { fixedLineId: line.id });
                  }}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="">+ إضافة عامل أساسي للخط...</option>
                  {availableToPin.map((w) => {
                    const prevLine = w.fixedLineId
                      ? lines.find((l) => l.id === w.fixedLineId)
                      : undefined;
                    return (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role}
                        {prevLine ? ` · أساسي ${prevLine.shortName}` : ''})
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Add & Edit 40 Workers */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                جدول أسماء العمال ({workers.length} اسم)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                عدّل أي اسم أو أضف أسماء فردي أو جماعي مرة واحدة بدون ما تفقد أي سجل سابق
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {workers.length < 40 && (
              <button
                type="button"
                onClick={onFillUpTo40Workers}
                className="min-h-[38px] px-3.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30 text-xs font-bold text-teal-800 dark:text-teal-200 whitespace-nowrap"
              >
                إكمال الجدول إلى 40 اسم
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowBulk((v) => !v)}
              className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {showBulk ? 'إغلاق الإضافة الجماعية' : 'إضافة عدة أسماء مرة واحدة'}
            </button>
          </div>
        </div>

        {/* Single Add Form */}
        <form
          onSubmit={handleAddSingle}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم العامل الجديد..."
            className="min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600 lg:col-span-2"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="الوظيفة (مشغل ماكينة / عامل)"
            className="min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <select
            value={defaultLineId}
            onChange={(e) => setDefaultLineId(e.target.value)}
            className="min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="">بدون خط افتراضي</option>
            {workLinesOnly.map((l) => (
              <option key={l.id} value={l.id}>
                افتراضي: {l.name}
              </option>
            ))}
          </select>
          <select
            value={fixedLineId}
            onChange={(e) => setFixedLineId(e.target.value)}
            className="min-h-[42px] px-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/70 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="">يدخل التوزيع العادل</option>
            {productionLinesOnly.map((l) => (
              <option key={l.id} value={l.id}>
                أساسي ثابت: {l.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة العامل</span>
          </button>
        </form>

        {/* Bulk Add Textarea */}
        {showBulk && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <label
              htmlFor="bulk-worker-names"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              اكتب أو الصق الأسماء (كل اسم في سطر لوحده):
            </label>
            <textarea
              id="bulk-worker-names"
              rows={5}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'أحمد علي\nمحمود إبراهيم\nسعيد رمضان'}
              className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulk(false)}
                className="min-h-[38px] px-3 rounded-lg text-xs text-slate-600 dark:text-slate-400"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                className="min-h-[38px] px-4 rounded-xl bg-teal-700 text-white text-xs font-bold"
              >
                إضافة كل الأسماء
              </button>
            </div>
          </div>
        )}

        {/* Search inside 40 workers */}
        {workers.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              placeholder="بحث سريع في الأسماء..."
              className="w-full min-h-[38px] pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Workers List with Row Numbers & Inline Edit */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[540px] overflow-y-auto">
          {filteredWorkers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              لا توجد أسماء مطابقة — أضف عامل جديد أو اضغط «إكمال الجدول إلى 40 اسم».
            </div>
          ) : (
            filteredWorkers.map((worker) => {
              const rowNumber = workers.findIndex((w) => w.id === worker.id) + 1;
              const isEditing = editingWorkerId === worker.id;
              const isConfirmingDel = confirmDeleteWorkerId === worker.id;
              const defLine = lines.find((l) => l.id === worker.defaultLineId);
              const fixedLine = worker.fixedLineId
                ? lines.find((l) => l.id === worker.fixedLineId)
                : undefined;

              if (isEditing) {
                return (
                  <div
                    key={worker.id}
                    className="p-3.5 bg-teal-50/40 dark:bg-teal-950/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={editWorkerName}
                      onChange={(e) => setEditWorkerName(e.target.value)}
                      className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={editWorkerRole}
                      onChange={(e) => setEditWorkerRole(e.target.value)}
                      className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                    />
                    <select
                      value={editWorkerDefaultLine}
                      onChange={(e) => setEditWorkerDefaultLine(e.target.value)}
                      className="min-h-[38px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="">بدون خط افتراضي</option>
                      {workLinesOnly.map((l) => (
                        <option key={l.id} value={l.id}>
                          افتراضي: {l.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editWorkerFixedLine}
                      onChange={(e) => setEditWorkerFixedLine(e.target.value)}
                      className="min-h-[38px] px-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                    >
                      <option value="">يدخل التوزيع العادل</option>
                      {productionLinesOnly.map((l) => (
                        <option key={l.id} value={l.id}>
                          أساسي ثابت: {l.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => saveEditWorker(worker.id)}
                        className="min-h-[36px] px-3 rounded-lg bg-teal-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حفظ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingWorkerId(null)}
                        className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={worker.id}
                  className="px-4 py-2.5 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-6 text-center tabular-nums shrink-0">
                      {rowNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {worker.name}
                        </span>
                        {fixedLine && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            <Pin className="w-3 h-3" />
                            <span>أساسي على {fixedLine.shortName} (خارج التوزيع)</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {worker.role}
                        {defLine ? ` · افتراضي: ${defLine.name}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isConfirmingDel ? (
                      <>
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold ml-1">
                          متأكد؟
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteWorker(worker.id);
                            setConfirmDeleteWorkerId(null);
                          }}
                          className="min-h-[34px] px-3 rounded-lg bg-rose-600 text-white text-xs font-bold"
                        >
                          حذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteWorkerId(null)}
                          className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                        >
                          تراجع
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditWorker(worker)}
                          className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteWorkerId(worker.id)}
                          aria-label={`حذف ${worker.name}`}
                          className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Section 3: Backup & Restore JSON */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            حفظ نسخة احتياطية واستعادة البيانات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            البيانات بتتحفظ تلقائياً على جهازك — وتقدر تنزّل نسخة احتياطية أو تنقلها لموبايل تاني في أي وقت
          </p>
          {backupNotice && (
            <p className="text-xs font-bold text-teal-700 dark:text-teal-400 mt-1.5">
              {backupNotice}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>تحميل نسخة احتياطية</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>استعادة نسخة</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJson}
            className="hidden"
          />
        </div>
      </section>
    </div>
  );
};
