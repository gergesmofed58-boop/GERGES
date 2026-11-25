import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatArabicMonthLabel, shiftMonthKey } from '../../utils/payrollEngine';

interface MonthBarProps {
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
  totalHoursLabel?: string;
}

export const MonthBar: React.FC<MonthBarProps> = ({
  selectedMonth,
  onSelectMonth,
  totalHoursLabel,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, -1))}
          className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="الشهر اللي فات"
          title="الشهر اللي فات"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <label className="relative inline-flex items-center gap-2 px-3 min-h-[40px] rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer">
          <Calendar className="w-4 h-4 text-[#0F5C7E] dark:text-sky-400 shrink-0" />
          <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
            {formatArabicMonthLabel(selectedMonth)}
          </span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) onSelectMonth(e.target.value);
            }}
            aria-label="اختار الشهر"
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>

        <button
          type="button"
          onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, 1))}
          className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="الشهر الجاي"
          title="الشهر الجاي"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {totalHoursLabel && (
        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium px-1">
          {totalHoursLabel}
        </div>
      )}
    </div>
  );
};
