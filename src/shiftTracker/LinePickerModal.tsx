import React, { useState } from 'react';
import { Check, Clock, Split, Trash2, X } from 'lucide-react';
import {
  AssignmentEntry,
  LINE_COLOR_STYLES,
  WorkLine,
} from './types';

interface LinePickerModalProps {
  workerName: string;
  dayLabel: string;
  dateLabel: string;
  currentEntry?: AssignmentEntry;
  lines: WorkLine[];
  onSelect: (entry: AssignmentEntry | null) => void;
  onClose: () => void;
}

const OVERTIME_OPTIONS = [0, 1, 2, 3, 4];

export const LinePickerModal: React.FC<LinePickerModalProps> = ({
  workerName,
  dayLabel,
  dateLabel,
  currentEntry,
  lines,
  onSelect,
  onClose,
}) => {
  const [note, setNote] = useState(currentEntry?.note ?? '');
  const [overtimeHours, setOvertimeHours] = useState<number>(
    currentEntry?.overtimeHours ?? 0
  );
  const [splitMode, setSplitMode] = useState<boolean>(
    Boolean(currentEntry?.secondLineId)
  );
  const [primaryLineId, setPrimaryLineId] = useState<string>(
    currentEntry?.lineId ?? ''
  );
  const [secondLineId, setSecondLineId] = useState<string>(
    currentEntry?.secondLineId ?? ''
  );

  const productionLines = lines.filter((l) => l.category === 'production');
  const departmentLines = lines.filter((l) => l.category === 'department');
  const absenceLines = lines.filter((l) => l.category === 'absence');
  const workLinesOnly = lines.filter((l) => l.category !== 'absence');

  const commitSelection = (lineId: string, secId?: string) => {
    const cleanNote = note.trim();
    const isAbsence = absenceLines.some((a) => a.id === lineId);
    onSelect({
      lineId,
      ...(!isAbsence && secId && secId !== lineId ? { secondLineId: secId } : {}),
      ...(!isAbsence && overtimeHours > 0 ? { overtimeHours } : {}),
      ...(cleanNote ? { note: cleanNote } : {}),
    });
  };

  const handleLineClick = (lineId: string) => {
    if (!splitMode) {
      commitSelection(lineId);
      return;
    }
    setPrimaryLineId(lineId);
    if (secondLineId === lineId) setSecondLineId('');
  };

  const renderGroup = (title: string, items: WorkLine[]) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((line) => {
          const styles = LINE_COLOR_STYLES[line.color];
          const isSelected = splitMode
            ? primaryLineId === line.id
            : currentEntry?.lineId === line.id;
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => handleLineClick(line.id)}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-semibold flex items-center justify-between gap-2 transition-colors text-start ${
                isSelected
                  ? styles.activeBtn
                  : `${styles.cellBg} ${styles.cellText} ${styles.cellBorder} hover:opacity-90`
              }`}
            >
              <span className="truncate">{line.name}</span>
              {isSelected && <Check className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 pb-safe max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {workerName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {dayLabel} · {dateLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overtime + Split Shift Quick Bar */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>ساعات إضافي (أوفر تايم):</span>
            </span>
            <div className="flex items-center gap-1">
              {OVERTIME_OPTIONS.map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setOvertimeHours(hrs)}
                  className={`min-h-[32px] min-w-[38px] px-2 rounded-lg border text-xs font-mono font-bold tabular-nums transition-colors ${
                    overtimeHours === hrs
                      ? 'bg-teal-700 border-teal-700 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {hrs === 0 ? '0' : `+${hrs}`}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Split className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>اشتغل على خطين في نفس اليوم (نص + نص)</span>
            </span>
            <button
              type="button"
              onClick={() => setSplitMode((v) => !v)}
              className={`min-h-[32px] px-3 rounded-lg border text-xs font-bold transition-colors ${
                splitMode
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {splitMode ? 'مُفعّل' : 'تفعيل'}
            </button>
          </div>
        </div>

        {/* Optional quick note */}
        <div className="space-y-1">
          <label
            htmlFor="assignment-note"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            ملاحظة اختيارية (مثلاً: استئذان ساعة، تبديل وردية)
          </label>
          <input
            id="assignment-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اكتب ملاحظة لو حابب..."
            className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600"
          />
        </div>

        {splitMode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                1. الخط الأول (نص يوم — 0.5):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {workLinesOnly.map((line) => {
                  const styles = LINE_COLOR_STYLES[line.color];
                  const active = primaryLineId === line.id;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => handleLineClick(line.id)}
                      className={`min-h-[42px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 ${
                        active
                          ? styles.activeBtn
                          : `${styles.cellBg} ${styles.cellText} ${styles.cellBorder}`
                      }`}
                    >
                      <span className="truncate">{line.name}</span>
                      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                2. الخط التاني (نص يوم — 0.5):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {workLinesOnly
                  .filter((l) => l.id !== primaryLineId)
                  .map((line) => {
                    const styles = LINE_COLOR_STYLES[line.color];
                    const active = secondLineId === line.id;
                    return (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() => setSecondLineId(line.id)}
                        className={`min-h-[42px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 ${
                          active
                            ? styles.activeBtn
                            : `${styles.cellBg} ${styles.cellText} ${styles.cellBorder}`
                        }`}
                      >
                        <span className="truncate">{line.name}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {renderGroup('خطوط الإنتاج والعمل', productionLines)}
            {renderGroup('الذهاب لأقسام تانية', departmentLines)}
            {renderGroup('الغياب والإجازات', absenceLines)}
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          {currentEntry ? (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="min-h-[42px] px-3.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح التسجيل</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {splitMode ? 'اختر الخط الأول والتاني واضغط حفظ' : 'اضغط على الخط للتسجيل فوراً'}
            </span>
          )}

          <div className="flex items-center gap-2">
            {splitMode && (
              <button
                type="button"
                disabled={!primaryLineId || !secondLineId}
                onClick={() => commitSelection(primaryLineId, secondLineId)}
                className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-45 text-white text-xs font-bold"
              >
                حفظ (نص + نص)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
