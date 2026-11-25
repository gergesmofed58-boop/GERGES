export type PortalTab = 'overview' | 'serky' | 'leaves' | 'news' | 'profile';

export type UserRole = 'employee' | 'hr';

export type ShiftType = 'morning' | 'evening' | 'night' | 'admin';

export type AttendanceStatus =
  | 'present'
  | 'overtime'
  | 'late'
  | 'leave'
  | 'weekend'
  | 'mission';

export interface SerkyEntry {
  id: string;
  monthKey: string; // e.g., '2026-11'
  date: string; // YYYY-MM-DD
  dayName: string;
  shift: ShiftType;
  checkIn: string | null; // HH:mm
  checkOut: string | null; // HH:mm
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  status: AttendanceStatus;
  notes: string;
  verifiedByHr: boolean;
}

export type LeaveType = 'annual' | 'casual' | 'sick' | 'compensatory';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveBalance {
  type: LeaveType;
  label: string;
  total: number;
  used: number;
  pending: number;
}

export interface LeaveRequest {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  isOwnRequest: boolean;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  substituteName: string;
  status: LeaveStatus;
  submittedAt: string;
  reviewedBy?: string;
  managerNote?: string;
}

export type NewsCategory = 'announcements' | 'hr' | 'events' | 'production';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string[];
  category: NewsCategory;
  author: string;
  department: string;
  publishedAt: string;
  readMinutes: number;
  pinned: boolean;
  imageUrl?: string;
  imageAlt?: string;
  acknowledgedByMe: boolean;
  likesCount: number;
  likedByMe: boolean;
  attachmentName?: string;
}

export interface EmployeeProfile {
  code: string;
  name: string;
  title: string;
  department: string;
  plantLocation: string;
  directManager: string;
  hireDate: string;
  shiftPattern: string;
  socialInsuranceNo: string;
  medicalCardNo: string;
  email: string;
  phone: string;
  avatarUrl: string;
  overtimeHourlyRate: number;
  shiftAllowanceMonthly: number;
}

export interface PortalNotification {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'warning';
}
