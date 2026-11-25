import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EMPLOYEE_PROFILE,
  INITIAL_LEAVE_BALANCES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_NEWS_ARTICLES,
  INITIAL_SERKY_ENTRIES,
} from '../data/portalSeedData';
import type {
  AttendanceStatus,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  NewsArticle,
  NewsCategory,
  PortalNotification,
  SerkyEntry,
  ShiftType,
  UserRole,
} from '../types/portal';

const STORAGE_KEY = 'amoun_employee_portal_state_v1';

interface PersistedState {
  serkyEntries: SerkyEntry[];
  leaveRequests: LeaveRequest[];
  newsArticles: NewsArticle[];
  role: UserRole;
  theme: 'light' | 'dark';
}

const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getArabicDayName(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return 'يوم عمل';
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return ARABIC_DAYS[dateObj.getDay()] ?? 'يوم عمل';
}

function formatCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function calculateWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    // Friday (5) and Saturday (6) are weekend in Egypt
    if (day !== 5 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(count, 1);
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        serkyEntries:
          Array.isArray(parsed.serkyEntries) && parsed.serkyEntries.length > 0
            ? parsed.serkyEntries
            : INITIAL_SERKY_ENTRIES,
        leaveRequests:
          Array.isArray(parsed.leaveRequests) && parsed.leaveRequests.length > 0
            ? parsed.leaveRequests
            : INITIAL_LEAVE_REQUESTS,
        newsArticles:
          Array.isArray(parsed.newsArticles) && parsed.newsArticles.length > 0
            ? parsed.newsArticles
            : INITIAL_NEWS_ARTICLES,
        role: parsed.role === 'hr' ? 'hr' : 'employee',
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
      };
    }
  } catch {
    // Ignore storage read errors and use seed data
  }
  return {
    serkyEntries: INITIAL_SERKY_ENTRIES,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    newsArticles: INITIAL_NEWS_ARTICLES,
    role: 'employee',
    theme: 'light',
  };
}

export function usePortalStore() {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [notification, setNotification] = useState<PortalNotification | null>(null);

  const notify = useCallback(
    (message: string, tone: PortalNotification['tone'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setNotification({ id, message, tone });
    },
    []
  );

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => {
      setNotification((current) => (current?.id === notification.id ? null : current));
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  const setRole = useCallback(
    (role: UserRole) => {
      setState((prev) => ({ ...prev, role }));
      notify(
        role === 'hr'
          ? 'تم التبديل إلى وضع مدير الموارد البشرية — يمكنك الآن اعتماد الإجازات ونشر الأخبار وتدقيق السركي.'
          : 'تم التبديل إلى وضع الخدمة الذاتية للموظف.',
        'info'
      );
    },
    [notify]
  );

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  // Derive live leave balances dynamically from base balances + any newly added/updated own requests
  const leaveBalances: LeaveBalance[] = useMemo(() => {
    const baseByType: Record<LeaveType, { total: number; label: string; baselineUsed: number }> = {
      annual: { total: 21, label: 'إجازة اعتيادية', baselineUsed: 7 },
      casual: { total: 6, label: 'إجازة عارضة', baselineUsed: 1 },
      sick: { total: 15, label: 'إجازة مرضية', baselineUsed: 0 },
      compensatory: { total: 4, label: 'بدل راحة (إضافي)', baselineUsed: 1 },
    };

    return INITIAL_LEAVE_BALANCES.map((item) => {
      const ownRequests = state.leaveRequests.filter(
        (r) => r.isOwnRequest && r.type === item.type
      );
      const approvedDays = ownRequests
        .filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + r.daysCount, 0);
      const pendingDays = ownRequests
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + r.daysCount, 0);
      const meta = baseByType[item.type];
      return {
        type: item.type,
        label: meta.label,
        total: meta.total,
        used: meta.baselineUsed + approvedDays,
        pending: pendingDays,
      };
    });
  }, [state.leaveRequests]);

  const todayDate = useMemo(() => getTodayDateString(), []);

  const todaySerkyEntry = useMemo(
    () => state.serkyEntries.find((entry) => entry.date === todayDate) ?? null,
    [state.serkyEntries, todayDate]
  );

  const handleClockIn = useCallback(() => {
    const nowTime = formatCurrentTimeHHMM();
    const monthKey = todayDate.slice(0, 7);
    const dayName = getArabicDayName(todayDate);

    setState((prev) => {
      const existing = prev.serkyEntries.find((e) => e.date === todayDate);
      if (existing) {
        return prev;
      }
      const newEntry: SerkyEntry = {
        id: `srk-${todayDate}`,
        monthKey,
        date: todayDate,
        dayName,
        shift: 'morning',
        checkIn: nowTime,
        checkOut: null,
        regularHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        status: 'present',
        notes: 'بصمة حضور مباشرة عبر البوابة',
        verifiedByHr: false,
      };
      return {
        ...prev,
        serkyEntries: [newEntry, ...prev.serkyEntries],
      };
    });
    notify(`تم تسجيل حضورك اليوم الساعة ${nowTime} وإدراجه في السركي.`);
  }, [notify, todayDate]);

  const handleClockOut = useCallback(() => {
    const nowTime = formatCurrentTimeHHMM();
    setState((prev) => ({
      ...prev,
      serkyEntries: prev.serkyEntries.map((entry) => {
        if (entry.date !== todayDate) return entry;
        let regularHours = 8;
        let overtimeHours = 0;
        if (entry.checkIn) {
          const [inH, inM] = entry.checkIn.split(':').map(Number);
          const [outH, outM] = nowTime.split(':').map(Number);
          const diffHrs = Math.max(0.5, (outH * 60 + outM - (inH * 60 + inM)) / 60);
          const rounded = Math.round(diffHrs * 4) / 4;
          if (rounded > 8) {
            regularHours = 8;
            overtimeHours = Math.round((rounded - 8) * 4) / 4;
          } else {
            regularHours = rounded;
          }
        }
        return {
          ...entry,
          checkOut: nowTime,
          regularHours,
          overtimeHours,
          status: overtimeHours > 0 ? 'overtime' : entry.status,
          notes:
            overtimeHours > 0
              ? 'بصمة انصراف مباشرة مع احتساب ساعات إضافية'
              : 'تم إغلاق وردية اليوم عبر البوابة',
        };
      }),
    }));
    notify(`تم تسجيل انصرافك الساعة ${nowTime} وتحديث ساعات السركي.`);
  }, [notify, todayDate]);

  const addSerkyEntry = useCallback(
    (payload: {
      date: string;
      shift: ShiftType;
      checkIn: string;
      checkOut: string;
      overtimeHours: number;
      lateMinutes: number;
      status: AttendanceStatus;
      notes: string;
    }) => {
      const monthKey = payload.date.slice(0, 7);
      const dayName = getArabicDayName(payload.date);
      const regularHours =
        payload.status === 'leave' || payload.status === 'weekend' ? 0 : 8;

      setState((prev) => {
        const withoutSameDate = prev.serkyEntries.filter((e) => e.date !== payload.date);
        const created: SerkyEntry = {
          id: `srk-${payload.date}-${Date.now()}`,
          monthKey,
          date: payload.date,
          dayName,
          shift: payload.shift,
          checkIn:
            payload.status === 'leave' || payload.status === 'weekend'
              ? null
              : payload.checkIn || '08:00',
          checkOut:
            payload.status === 'leave' || payload.status === 'weekend'
              ? null
              : payload.checkOut || '16:00',
          regularHours,
          overtimeHours: payload.overtimeHours,
          lateMinutes: payload.lateMinutes,
          status: payload.status,
          notes: payload.notes.trim() || 'قيد مضاف عبر البوابة',
          verifiedByHr: prev.role === 'hr',
        };
        const sorted = [created, ...withoutSameDate].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
        return { ...prev, serkyEntries: sorted };
      });
      notify('تم حفظ حركة السركي بنجاح.');
    },
    [notify]
  );

  const toggleVerifySerkyEntry = useCallback(
    (entryId: string) => {
      setState((prev) => ({
        ...prev,
        serkyEntries: prev.serkyEntries.map((entry) =>
          entry.id === entryId
            ? { ...entry, verifiedByHr: !entry.verifiedByHr }
            : entry
        ),
      }));
      notify('تم تحديث حالة اعتماد القيد في السركي.', 'info');
    },
    [notify]
  );

  const submitLeaveRequest = useCallback(
    (payload: {
      type: LeaveType;
      startDate: string;
      endDate: string;
      substituteName: string;
      reason: string;
    }) => {
      const daysCount = calculateWorkingDays(payload.startDate, payload.endDate);
      const newReq: LeaveRequest = {
        id: `lv-${Math.floor(1050 + Math.random() * 8900)}`,
        employeeCode: EMPLOYEE_PROFILE.code,
        employeeName: EMPLOYEE_PROFILE.name,
        department: EMPLOYEE_PROFILE.department,
        isOwnRequest: true,
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
        daysCount,
        substituteName: payload.substituteName.trim() || 'يحدد بواسطة المشرف',
        reason: payload.reason.trim(),
        status: 'pending',
        submittedAt: todayDate,
      };
      setState((prev) => ({
        ...prev,
        leaveRequests: [newReq, ...prev.leaveRequests],
      }));
      notify(`تم إرسال طلب الإجازة (${daysCount} يوم عمل) للمراجعة والاعتماد.`);
    },
    [notify, todayDate]
  );

  const cancelLeaveRequest = useCallback(
    (requestId: string) => {
      setState((prev) => ({
        ...prev,
        leaveRequests: prev.leaveRequests.map((req) =>
          req.id === requestId && req.status === 'pending'
            ? { ...req, status: 'cancelled', managerNote: 'تم السحب بواسطة الموظف' }
            : req
        ),
      }));
      notify('تم إلغاء طلب الإجازة بنجاح.', 'info');
    },
    [notify]
  );

  const reviewLeaveRequest = useCallback(
    (requestId: string, decision: 'approved' | 'rejected', managerNote: string) => {
      setState((prev) => ({
        ...prev,
        leaveRequests: prev.leaveRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: decision,
                reviewedBy: 'إدارة الموارد البشرية',
                managerNote:
                  managerNote.trim() ||
                  (decision === 'approved'
                    ? 'تم الاعتماد وترحيل الأيام إلى السركي.'
                    : 'نعتذر لعدم الموافقة لظروف ضغط التشغيل الحالية.'),
              }
            : req
        ),
      }));
      notify(
        decision === 'approved'
          ? 'تم اعتماد طلب الإجازة بنجاح.'
          : 'تم تسجيل رفض الطلب مع الملاحظات الإدارية.',
        decision === 'approved' ? 'success' : 'warning'
      );
    },
    [notify]
  );

  const toggleNewsAcknowledge = useCallback(
    (articleId: string) => {
      setState((prev) => ({
        ...prev,
        newsArticles: prev.newsArticles.map((art) =>
          art.id === articleId
            ? { ...art, acknowledgedByMe: !art.acknowledgedByMe }
            : art
        ),
      }));
    },
    []
  );

  const toggleNewsLike = useCallback((articleId: string) => {
    setState((prev) => ({
      ...prev,
      newsArticles: prev.newsArticles.map((art) => {
        if (art.id !== articleId) return art;
        const likedByMe = !art.likedByMe;
        return {
          ...art,
          likedByMe,
          likesCount: art.likesCount + (likedByMe ? 1 : -1),
        };
      }),
    }));
  }, []);

  const toggleNewsPin = useCallback(
    (articleId: string) => {
      setState((prev) => ({
        ...prev,
        newsArticles: prev.newsArticles.map((art) =>
          art.id === articleId ? { ...art, pinned: !art.pinned } : art
        ),
      }));
      notify('تم تحديث حالة تثبيت الخبر في أعلى النشرة.', 'info');
    },
    [notify]
  );

  const publishNewsArticle = useCallback(
    (payload: {
      title: string;
      summary: string;
      bodyText: string;
      category: NewsCategory;
      department: string;
      pinned: boolean;
      attachmentName?: string;
    }) => {
      const paragraphs = payload.bodyText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const newArticle: NewsArticle = {
        id: `news-${Date.now()}`,
        title: payload.title.trim(),
        summary: payload.summary.trim(),
        content: paragraphs.length > 0 ? paragraphs : [payload.summary.trim()],
        category: payload.category,
        author: 'إدارة الموارد البشرية والاتصال',
        department: payload.department.trim() || 'الإدارة العامة',
        publishedAt: todayDate,
        readMinutes: Math.max(1, Math.ceil(payload.bodyText.length / 320)),
        pinned: payload.pinned,
        acknowledgedByMe: false,
        likesCount: 1,
        likedByMe: false,
        attachmentName: payload.attachmentName?.trim() || undefined,
      };

      setState((prev) => ({
        ...prev,
        newsArticles: [newArticle, ...prev.newsArticles],
      }));
      notify('تم نشر الخبر في بوابة أخبار الشركة بنجاح.');
    },
    [notify, todayDate]
  );

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      serkyEntries: INITIAL_SERKY_ENTRIES,
      leaveRequests: INITIAL_LEAVE_REQUESTS,
      newsArticles: INITIAL_NEWS_ARTICLES,
      role: 'employee',
      theme: state.theme,
    });
    notify('تمت استعادة البيانات الافتراضية للبوابة.', 'info');
  }, [notify, state.theme]);

  return {
    profile: EMPLOYEE_PROFILE,
    serkyEntries: state.serkyEntries,
    leaveRequests: state.leaveRequests,
    leaveBalances,
    newsArticles: state.newsArticles,
    role: state.role,
    theme: state.theme,
    todayDate,
    todaySerkyEntry,
    notification,
    dismissNotification: () => setNotification(null),
    setRole,
    toggleTheme,
    handleClockIn,
    handleClockOut,
    addSerkyEntry,
    toggleVerifySerkyEntry,
    submitLeaveRequest,
    cancelLeaveRequest,
    reviewLeaveRequest,
    toggleNewsAcknowledge,
    toggleNewsLike,
    toggleNewsPin,
    publishNewsArticle,
    resetDemoData,
  };
}
