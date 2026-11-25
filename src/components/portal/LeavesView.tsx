import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  UserRole,
} from '../../types/portal';
import { calculateWorkingDays } from '../../hooks/usePortalStore';
import { LEAVE_STATUS_META, LEAVE_TYPE_LABELS } from '../../utils/portalLabels';

interface LeavesViewProps {
  role: UserRole;
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  showNewModal: boolean;
  onSetShowNewModal: (open: boolean) => void;
  onSubmitRequest: (payload: {
    type: LeaveType;
    startDate: string;
    endDate: string;
    substituteName: string;
    reason: string;
  }) => void;
  onCancelRequest: (requestId: string) => void;
  onReviewRequest: (
    requestId: string,
    decision: 'approved' | 'rejected',
    managerNote: string
  ) => void;
}

export const LeavesView: React.FC<LeavesViewProps> = ({
  role,
  balances,
  requests,
  showNewModal,
  onSetShowNewModal,
  onSubmitRequest,
  onCancelRequest,
  onReviewRequest,
}) => {
  const [scope, setScope] = useState<'mine' | 'team'>(role === 'hr' ? 'team' : 'mine');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New leave request form
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('2026-12-01');
  const [endDate, setEndDate] = useState('2026-12-02');
  const [substituteName, setSubstituteName] = useState('م. كريم حسام الدين');
  const [reason, setReason] = useState('');

  // HR Review Modal state
  const [reviewTarget, setReviewTarget] = useState<{
    request: LeaveRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [managerNote, setManagerNote] = useState('');

  const computedDays = useMemo(
    () => calculateWorkingDays(startDate, endDate),
    [startDate, endDate]
  );

  const selectedBalance = useMemo(
    () => balances.find((b) => b.type === leaveType),
    [balances, leaveType]
  );
  const availableForSelected = selectedBalance
    ? Math.max(0, selectedBalance.total - selectedBalance.used - selectedBalance.pending)
    : 0;
  const exceedsBalance = computedDays > availableForSelected;

  const visibleRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (role === 'employee' || scope === 'mine') {
        if (!req.isOwnRequest) return false;
      }
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        req.employeeName.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q) ||
        LEAVE_TYPE_LABELS[req.type].includes(q) ||
        req.startDate.includes(q)
      );
    });
  }, [requests, role, scope, statusFilter, searchQuery]);

  const pendingTeamCount = requests.filter((r) => r.status === 'pending').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (computedDays <= 0 || exceedsBalance) return;
    onSubmitRequest({
      type: leaveType,
      startDate,
      endDate,
      substituteName,
      reason,
    });
    setReason('');
    onSetShowNewModal(false);
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    onReviewRequest(reviewTarget.request.id, reviewTarget.decision, managerNote);
    setReviewTarget(null);
    setManagerNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            إدارة الإجازات والأرصدة
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            متابعة الرصيد السنوي المتاح، تقديم طلبات الإجازات، ومراجعة قرارات الاعتماد الإداري.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSetShowNewModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>تقديم طلب إجازة جديد</span>
        </button>
      </div>

      {/* 4-Column Balance Strip (Single Elevation, Clean Progress Bars) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
        {balances.map((item) => {
          const remaining = Math.max(0, item.total - item.used);
          const usedPercent = Math.min(100, Math.round((item.used / item.total) * 100));
          return (
            <div key={item.type} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {item.label}
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {remaining} / {item.total} يوم
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {remaining}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">يوم متبقي</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#0F5C7E] dark:bg-sky-500 rounded-full transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  مستخدم: <strong className="font-mono tabular-nums">{item.used}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  معلق: <strong className="font-mono tabular-nums">{item.pending}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {role === 'hr' && (
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setScope('team')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scope === 'team'
                    ? 'bg-white dark:bg-slate-900 text-[#0F5C7E] dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                قائمة اعتمادات الإدارة ({pendingTeamCount})
              </button>
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scope === 'mine'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                طلباتي الشخصية
              </button>
            </div>
          )}

          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'pending', label: 'قيد المراجعة' },
                { id: 'approved', label: 'مقبولة' },
                { id: 'rejected', label: 'مرفوضة' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو السبب أو التاريخ..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0F5C7E]"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {visibleRequests.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              لا توجد طلبات إجازة مطابقة حاليًا.
            </p>
            <button
              type="button"
              onClick={() => onSetShowNewModal(true)}
              className="px-4 py-2 rounded-lg bg-[#0F5C7E] text-white text-xs font-semibold hover:bg-[#0B4A66] transition-colors cursor-pointer"
            >
              تقديم طلب إجازة
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {role === 'hr' && scope === 'team' && (
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">الموظف</th>
                  )}
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">نوع الإجازة</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الفترة</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">المدة</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">القائم بالعمل</th>
                  <th className="py-3 px-4 font-semibold">السبب والملاحظات</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">الحالة</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {visibleRequests.map((req) => {
                  const statusMeta = LEAVE_STATUS_META[req.status];
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors align-top"
                    >
                      {role === 'hr' && scope === 'team' && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {req.employeeName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {req.department} ·{' '}
                            <span className="font-mono tabular-nums">{req.employeeCode}</span>
                          </div>
                        </td>
                      )}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {LEAVE_TYPE_LABELS[req.type]}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          رقم #{req.id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div>{req.startDate}</div>
                        <div className="text-slate-400">إلى {req.endDate}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {req.daysCount} يوم
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {req.substituteName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                        <div>{req.reason}</div>
                        {req.managerNote && (
                          <div className="mt-1 text-slate-500 dark:text-slate-400">
                            رد الإدارة: {req.managerNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {req.status === 'pending' && role === 'hr' && scope === 'team' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setReviewTarget({ request: req, decision: 'approved' })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>اعتماد</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setReviewTarget({ request: req, decision: 'rejected' })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </div>
                        ) : req.status === 'pending' && req.isOwnRequest ? (
                          <button
                            type="button"
                            onClick={() => onCancelRequest(req.id)}
                            className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            سحب الطلب
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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

      {/* New Leave Request Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2
                id="leave-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                تقديم طلب إجازة جديد
              </h2>
              <button
                type="button"
                onClick={() => onSetShowNewModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع الإجازة
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                >
                  <option value="annual">إجازة اعتيادية</option>
                  <option value="casual">إجازة عارضة</option>
                  <option value="sick">إجازة مرضية</option>
                  <option value="compensatory">بدل راحة (سهر/إضافي)</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  الرصيد المتاح للتقديم الآن:{' '}
                  <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {availableForSelected} يوم
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  عدد أيام العمل المحتسبة (باستثناء الجمعة والسبت)
                </span>
                <span
                  className={`font-mono tabular-nums font-bold text-sm ${
                    exceedsBalance
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-[#0F5C7E] dark:text-sky-400'
                  }`}
                >
                  {computedDays} يوم
                </span>
              </div>

              {exceedsBalance && (
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  المدة المطلوبة تتجاوز الرصيد المتاح حاليًا ({availableForSelected} يوم). يرجى تعديل التواريخ أو نوع الإجازة.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  الزميل القائم بالعمل أثناء الإجازة
                </label>
                <input
                  type="text"
                  required
                  value={substituteName}
                  onChange={(e) => setSubstituteName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  سبب الإجازة / ملاحظات للمشرف
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب الطلب باختصار..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onSetShowNewModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={exceedsBalance || computedDays <= 0}
                  className="px-5 py-2 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  إرسال الطلب للاعتماد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Decision Modal */}
      {reviewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {reviewTarget.decision === 'approved'
                  ? 'تأكيد اعتماد طلب الإجازة'
                  : 'تسجيل رفض طلب الإجازة'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmReview} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div>
                  الموظف: <strong>{reviewTarget.request.employeeName}</strong>
                </div>
                <div>
                  الفترة:{' '}
                  <span className="font-mono tabular-nums">
                    {reviewTarget.request.startDate} إلى {reviewTarget.request.endDate}
                  </span>{' '}
                  ({reviewTarget.request.daysCount} يوم عمل)
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ملاحظة إدارة الموارد البشرية (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  placeholder="أضف ملاحظة تظهر للموظف في سجل الطلبات..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer ${
                    reviewTarget.decision === 'approved'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {reviewTarget.decision === 'approved' ? 'اعتماد الطلب' : 'تأكيد الرفض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
