import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Newspaper,
} from 'lucide-react';
import type {
  EmployeeProfile,
  LeaveBalance,
  LeaveRequest,
  NewsArticle,
  PortalTab,
  SerkyEntry,
  UserRole,
} from '../../types/portal';
import {
  ATTENDANCE_STATUS_META,
  LEAVE_STATUS_META,
  LEAVE_TYPE_LABELS,
  NEWS_CATEGORY_LABELS,
} from '../../utils/portalLabels';
import { ImageWithFallback } from './ImageWithFallback';

interface OverviewViewProps {
  profile: EmployeeProfile;
  role: UserRole;
  serkyEntries: SerkyEntry[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  newsArticles: NewsArticle[];
  todayDate: string;
  todaySerkyEntry: SerkyEntry | null;
  onClockIn: () => void;
  onClockOut: () => void;
  onNavigate: (tab: PortalTab) => void;
  onOpenNewLeave: () => void;
  onSelectNews: (articleId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  role,
  serkyEntries,
  leaveBalances,
  leaveRequests,
  newsArticles,
  todayDate,
  todaySerkyEntry,
  onClockIn,
  onClockOut,
  onNavigate,
  onOpenNewLeave,
  onSelectNews,
}) => {
  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setClockText(
        new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const currentMonthEntries = serkyEntries.filter((e) => e.monthKey === '2026-11');
  const workedDaysCount = currentMonthEntries.filter(
    (e) =>
      e.status === 'present' ||
      e.status === 'overtime' ||
      e.status === 'late' ||
      e.status === 'mission'
  ).length;
  const totalOvertimeHours = currentMonthEntries.reduce(
    (sum, e) => sum + e.overtimeHours,
    0
  );
  const annualBalance = leaveBalances.find((b) => b.type === 'annual');
  const annualRemaining = annualBalance
    ? Math.max(0, annualBalance.total - annualBalance.used)
    : 0;

  const pendingRequestsCount =
    role === 'hr'
      ? leaveRequests.filter((r) => r.status === 'pending').length
      : leaveRequests.filter((r) => r.isOwnRequest && r.status === 'pending').length;

  const recentSerky = serkyEntries.slice(0, 5);
  const featuredNews = newsArticles.find((a) => a.pinned) ?? newsArticles[0];
  const secondaryNews = newsArticles
    .filter((a) => a.id !== featuredNews?.id)
    .slice(0, 3);
  const recentLeaves = leaveRequests
    .filter((r) => (role === 'hr' ? true : r.isOwnRequest))
    .slice(0, 3);

  const isClockedIn = Boolean(todaySerkyEntry?.checkIn && !todaySerkyEntry?.checkOut);
  const isCompletedToday = Boolean(todaySerkyEntry?.checkIn && todaySerkyEntry?.checkOut);

  return (
    <div className="space-y-8">
      {/* Hero Banner & Daily Attendance Action (Single Dominant Focal Anchor) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{profile.department}</span>
              <span aria-hidden="true">·</span>
              <span>{profile.plantLocation}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{profile.code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
              مرحبًا، {profile.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {profile.title} — {profile.shiftPattern}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800 shrink-0">
            <div className="text-right sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                توقيت البصمة المباشرة · <span className="font-mono tabular-nums">{todayDate}</span>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                {clockText}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isCompletedToday
                  ? `حضور ${todaySerkyEntry?.checkIn} · انصراف ${todaySerkyEntry?.checkOut}`
                  : isClockedIn
                  ? `تم تسجيل الحضور الساعة ${todaySerkyEntry?.checkIn}`
                  : 'لم يتم تسجيل بصمة اليوم بعد'}
              </div>
            </div>

            {!isClockedIn && !isCompletedToday && (
              <button
                type="button"
                onClick={onClockIn}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C7E]"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل حضور اليوم</span>
              </button>
            )}

            {isClockedIn && (
              <button
                type="button"
                onClick={onClockOut}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الانصراف</span>
              </button>
            )}

            {isCompletedToday && (
              <button
                type="button"
                onClick={() => onNavigate('serky')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>مراجعة سركي اليوم</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column KPI Strip (Single Elevation, Hairline Dividers) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            أيام الحضور (نوفمبر 2026)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {workedDaysCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">يوم عمل مسجل</span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            إجمالي ساعات الإضافي
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400">
              {totalOvertimeHours.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ساعة · {(totalOvertimeHours * profile.overtimeHourlyRate).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            رصيد الإجازة الاعتيادية المتبقي
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {annualRemaining}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              من أصل {annualBalance?.total ?? 21} يومًا
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {role === 'hr' ? 'طلبات إجازة تنتظر الاعتماد' : 'طلبات إجازة قيد المراجعة'}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {pendingRequestsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {role === 'hr' ? 'طلب في قائمة الموارد البشرية' : 'طلب بانتظار موافقة المدير'}
            </span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Balanced Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Start Column: Recent Serky & Recent Leaves */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Recent Serky Ledger */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex-1">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  آخر حركات السركي الشهري
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  سجل البصمة وساعات الإضافي والتأخيرات المعتمدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('serky')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>فتح السركي الكامل</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold">التاريخ</th>
                    <th className="py-2.5 px-4 font-semibold">الحضور</th>
                    <th className="py-2.5 px-4 font-semibold">الانصراف</th>
                    <th className="py-2.5 px-4 font-semibold">الإضافي</th>
                    <th className="py-2.5 px-5 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentSerky.map((entry) => {
                    const meta = ATTENDANCE_STATUS_META[entry.status];
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.dayName}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {entry.date}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {entry.checkIn ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {entry.checkOut ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {entry.overtimeHours > 0 ? `+${entry.overtimeHours} س` : '—'}
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${meta.textClass}`}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Leave Requests Quick Strip */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {role === 'hr' ? 'أحدث طلبات الإجازات بالإدارة' : 'متابعة طلبات إجازاتي'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenNewLeave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>طلب جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('leaves')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>الكل</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentLeaves.map((req) => {
                const statusMeta = LEAVE_STATUS_META[req.status];
                return (
                  <div
                    key={req.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {LEAVE_TYPE_LABELS[req.type]}
                        {role === 'hr' && !req.isOwnRequest ? ` — ${req.employeeName}` : ''}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono tabular-nums">
                          {req.startDate} إلى {req.endDate}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{req.daysCount} يوم عمل</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap shrink-0 ${statusMeta.textClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* End Column: Featured Company News & Headlines */}
        <div className="lg:col-span-5 flex flex-col">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  أخبار الشركة والتعميمات
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  آخر البيانات الرسمية الصادرة للعاملين
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('news')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>جميع الأخبار</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {featuredNews && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectNews(featuredNews.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectNews(featuredNews.id);
                  }
                }}
                className="group cursor-pointer border-b border-slate-200 dark:border-slate-800 focus-visible:outline-2 focus-visible:outline-[#0F5C7E]"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <ImageWithFallback
                    src={featuredNews.imageUrl}
                    alt={featuredNews.imageAlt || featuredNews.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                    <div className="flex items-center gap-2 text-xs text-slate-200 mb-1.5">
                      <span>خبر مثبت</span>
                      <span aria-hidden="true">·</span>
                      <span>{NEWS_CATEGORY_LABELS[featuredNews.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{featuredNews.publishedAt}</span>
                    </div>
                    <h3 className="text-base font-bold leading-snug text-balance">
                      {featuredNews.title}
                    </h3>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {featuredNews.summary}
                  </p>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
              {secondaryNews.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectNews(item.id)}
                  className="w-full text-right px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors block cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{NEWS_CATEGORY_LABELS[item.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.publishedAt}</span>
                    {item.acknowledgedByMe && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          تم الاطلاع
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                    {item.title}
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Service Shortcuts Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('serky')}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0F5C7E] dark:text-sky-400" />
                <span>السركي</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('leaves')}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-[#0F5C7E] dark:text-sky-400" />
                <span>الإجازات</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('news')}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Newspaper className="w-3.5 h-3.5 text-[#0F5C7E] dark:text-sky-400" />
                <span>التعميمات</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
