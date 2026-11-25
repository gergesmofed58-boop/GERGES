import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  LogIn,
  LogOut,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react';
import type {
  AttendanceStatus,
  EmployeeProfile,
  SerkyEntry,
  ShiftType,
  UserRole,
} from '../../types/portal';
import {
  ATTENDANCE_STATUS_META,
  MONTH_OPTIONS,
  SHIFT_LABELS,
} from '../../utils/portalLabels';

interface SerkyViewProps {
  profile: EmployeeProfile;
  role: UserRole;
  entries: SerkyEntry[];
  todayDate: string;
  todaySerkyEntry: SerkyEntry | null;
  onClockIn: () => void;
  onClockOut: () => void;
  onAddEntry: (payload: {
    date: string;
    shift: ShiftType;
    checkIn: string;
    checkOut: string;
    overtimeHours: number;
    lateMinutes: number;
    status: AttendanceStatus;
    notes: string;
  }) => void;
  onToggleVerify: (entryId: string) => void;
}

type StatusFilter = 'all' | 'present' | 'overtime' | 'late' | 'leave';

export const SerkyView: React.FC<SerkyViewProps> = ({
  profile,
  role,
  entries,
  todayDate,
  todaySerkyEntry,
  onClockIn,
  onClockOut,
  onAddEntry,
  onToggleVerify,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add/Correction form state
  const [formDate, setFormDate] = useState(todayDate);
  const [formShift, setFormShift] = useState<ShiftType>('morning');
  const [formCheckIn, setFormCheckIn] = useState('08:00');
  const [formCheckOut, setFormCheckOut] = useState('17:00');
  const [formOvertime, setFormOvertime] = useState('1');
  const [formLate, setFormLate] = useState('0');
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('overtime');
  const [formNotes, setFormNotes] = useState('');

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.monthKey === selectedMonth)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, selectedMonth]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthEntries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.date.includes(q) ||
        entry.dayName.includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        SHIFT_LABELS[entry.shift].includes(q)
      );
    });
  }, [monthEntries, statusFilter, searchQuery]);

  const summary = useMemo(() => {
    const workedDays = monthEntries.filter(
      (e) =>
        e.status === 'present' ||
        e.status === 'overtime' ||
        e.status === 'late' ||
        e.status === 'mission'
    ).length;
    const regularHours = monthEntries.reduce((s, e) => s + e.regularHours, 0);
    const overtimeHours = monthEntries.reduce((s, e) => s + e.overtimeHours, 0);
    const lateMinutes = monthEntries.reduce((s, e) => s + e.lateMinutes, 0);
    const leaveDays = monthEntries.filter((e) => e.status === 'leave').length;
    const overtimePay = overtimeHours * profile.overtimeHourlyRate;
    const estimatedExtras = overtimePay + profile.shiftAllowanceMonthly;

    return {
      workedDays,
      regularHours,
      overtimeHours,
      lateMinutes,
      leaveDays,
      estimatedExtras,
    };
  }, [monthEntries, profile.overtimeHourlyRate, profile.shiftAllowanceMonthly]);

  const handleExportCsv = () => {
    const headers = [
      'التاريخ',
      'اليوم',
      'الوردية',
      'وقت الحضور',
      'وقت الانصراف',
      'الساعات الأساسية',
      'ساعات الإضافي',
      'دقائق التأخير',
      'الحالة',
      'اعتماد الموارد البشرية',
      'ملاحظات',
    ];
    const rows = monthEntries.map((e) => [
      e.date,
      e.dayName,
      SHIFT_LABELS[e.shift],
      e.checkIn ?? '-',
      e.checkOut ?? '-',
      String(e.regularHours),
      String(e.overtimeHours),
      String(e.lateMinutes),
      ATTENDANCE_STATUS_META[e.status].label,
      e.verifiedByHr ? 'معتمد' : 'قيد المراجعة',
      e.notes.replace(/,/g, ' '),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `serky_${profile.code}_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEntry({
      date: formDate,
      shift: formShift,
      checkIn: formCheckIn,
      checkOut: formCheckOut,
      overtimeHours: Math.max(0, Number(formOvertime) || 0),
      lateMinutes: Math.max(0, Number(formLate) || 0),
      status: formStatus,
      notes: formNotes,
    });
    setSelectedMonth(formDate.slice(0, 7));
    setShowAddModal(false);
    setFormNotes('');
  };

  const isClockedIn = Boolean(todaySerkyEntry?.checkIn && !todaySerkyEntry?.checkOut);
  const isCompletedToday = Boolean(todaySerkyEntry?.checkIn && todaySerkyEntry?.checkOut);

  return (
    <div className="space-y-6">
      {/* Header & Primary Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            السركي الشهري وسجل الورديات
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            متابعة حركات البصمة اليومية، ساعات العمل الإضافي، التأخيرات، واعتماد كشف السركي للمرتبات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {!isClockedIn && !isCompletedToday && (
            <button
              type="button"
              onClick={onClockIn}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل حضور اليوم</span>
            </button>
          )}
          {isClockedIn && (
            <button
              type="button"
              onClick={onClockOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل انصراف اليوم</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{role === 'hr' ? 'إضافة قيد سركي' : 'طلب تصحيح بصمة'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Ledger Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 dark:divide-slate-800">
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">أيام العمل الفعلية</div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {summary.workedDays}{' '}
            <span className="text-xs font-normal font-sans text-slate-500">يوم</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">الساعات الأساسية</div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {summary.regularHours.toFixed(1)}{' '}
            <span className="text-xs font-normal font-sans text-slate-500">ساعة</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي الإضافي</div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400">
            {summary.overtimeHours.toFixed(1)}{' '}
            <span className="text-xs font-normal font-sans text-slate-500">ساعة</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي التأخير</div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {summary.lateMinutes}{' '}
            <span className="text-xs font-normal font-sans text-slate-500">دقيقة</span>
          </div>
        </div>
        <div className="p-4 sm:p-5 col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            بدلات وإضافي السركي التقديري
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {summary.estimatedExtras.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-normal font-sans text-slate-500">ج.م</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMonth(m.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedMonth === m.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Status Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'present', label: 'حضور' },
                { id: 'overtime', label: 'إضافي' },
                { id: 'late', label: 'تأخير' },
                { id: 'leave', label: 'إجازة' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-[#0F5C7E] dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالتاريخ أو الملاحظات..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0F5C7E]"
          />
        </div>
      </div>

      {/* High-Density Serky Data Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              لا توجد حركات سركي مطابقة لمعايير التصفية الحالية.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يمكنك مسح البحث أو اختيار شهر آخر أو إضافة حركة جديدة إلى السركي.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-lg bg-[#0F5C7E] text-white text-xs font-semibold hover:bg-[#0B4A66] transition-colors cursor-pointer"
            >
              عرض كل أيام الشهر
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">التاريخ واليوم</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الوردية</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الحضور</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الانصراف</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">أساسي</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">إضافي</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">تأخير</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الحالة</th>
                  <th className="py-3 px-4 font-semibold">ملاحظات السركي</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredEntries.map((entry) => {
                  const statusMeta = ATTENDANCE_STATUS_META[entry.status];
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {entry.dayName}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {entry.date}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {SHIFT_LABELS[entry.shift]}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {entry.checkIn ?? '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {entry.checkOut ?? '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {entry.regularHours > 0 ? `${entry.regularHours} س` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                        {entry.overtimeHours > 0 ? (
                          <span className="font-semibold text-sky-700 dark:text-sky-400">
                            +{entry.overtimeHours} س
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                        {entry.lateMinutes > 0 ? (
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {entry.lateMinutes} د
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {entry.notes}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {role === 'hr' ? (
                          <button
                            type="button"
                            onClick={() => onToggleVerify(entry.id)}
                            className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline ${
                              entry.verifiedByHr
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{entry.verifiedByHr ? 'معتمد' : 'اعتماد الآن'}</span>
                          </button>
                        ) : (
                          <span
                            className={`text-xs font-medium ${
                              entry.verifiedByHr
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {entry.verifiedByHr ? 'معتمد' : 'قيد المراجعة'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Correction Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="serky-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2
                id="serky-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {role === 'hr' ? 'إضافة / تعديل قيد في السركي' : 'طلب تصحيح بصمة أو تسجيل إضافي'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    نوع الوردية
                  </label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as ShiftType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  >
                    <option value="morning">وردية أولى (صباحية)</option>
                    <option value="evening">وردية ثانية (مسائية)</option>
                    <option value="night">وردية ثالثة (ليلية)</option>
                    <option value="admin">دوام إداري</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    وقت الحضور
                  </label>
                  <input
                    type="time"
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    وقت الانصراف
                  </label>
                  <input
                    type="time"
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    الحالة
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  >
                    <option value="present">حضور منتظم</option>
                    <option value="overtime">حضور + إضافي</option>
                    <option value="mission">مأمورية خارجية</option>
                    <option value="late">تأخير</option>
                    <option value="leave">إجازة معتمدة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ساعات الإضافي
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    value={formOvertime}
                    onChange={(e) => setFormOvertime(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    دقائق التأخير
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    value={formLate}
                    onChange={(e) => setFormLate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  البيان / سبب التصحيح أو الإضافي
                </label>
                <textarea
                  rows={2}
                  required
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: ساعات إضافية لإغلاق تشغيلة التصدير رقم 402..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  حفظ في السركي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
