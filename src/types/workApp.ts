export type AppTab = 'home' | 'attendance' | 'salary' | 'leaves' | 'profile';

export type WorkShift = 'day' | 'night';

export type DayRecordStatus =
  | 'present'
  | 'overtime'
  | 'holiday'
  | 'late'
  | 'absent'
  | 'leave';

export interface AttendanceRecord {
  id: string;
  monthKey: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  shift: WorkShift;
  checkIn: string | null; // HH:mm
  checkOut: string | null; // HH:mm
  workedHours: number;
  overtimeHours: number;
  lateMinutes: number;
  status: DayRecordStatus;
  notes: string;
}

export type LeaveCategory = 'annual' | 'casual' | 'sick' | 'compensatory';

export interface LeaveRecord {
  id: string;
  type: LeaveCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number;
  notes: string;
  createdAt: string;
}

export interface LeaveQuotas {
  annual: number;
  casual: number;
  sick: number;
  compensatory: number;
}

export type AdjustmentKind = 'bonus' | 'deduction';

export interface MonthlyAdjustment {
  id: string;
  monthKey: string;
  title: string;
  amount: number;
  kind: AdjustmentKind;
  createdAt: string;
}

export interface SalaryConfig {
  basicSalary: number; // المرتب الأساسي الشهري
  monthlyIncentive: number; // الحافز الشهري (بند مستقل)
  incentiveDeduction: number; // خصم أو جزاء من الحافز
  includeIncentiveInDeductions: boolean; // إدخال الحافز في حساب التأمينات والضرايب والاستقطاعات
  monthWorkDays: number; // عدد أيام الحساب في الشهر (عادة 30 أو 26)
  dailyShiftHours: number; // ساعات الوردية اليومية (عادة 8)
  dayShiftAllowance: number; // بدل الوردية النهارية (لليوم الواحد)
  nightShiftAllowance: number; // بدل الوردية الليلية (لليوم الواحد)
  fixedAllowances: number; // بدلات ثابتة (مواصلات/وجبة/طبيعة شغل)
  dayOvertimeMultiplier: number; // معامل الإضافي النهاري (1.35)
  nightOvertimeMultiplier: number; // معامل الإضافي الليلي (1.70)
  holidayMultiplier: number; // معامل شغل الأعياد والإجازات الرسمية (2.0)
  enableSocialInsurance: boolean; // تفعيل التأمينات الاجتماعية
  socialInsuranceRate: number; // نسبة حصة الموظف (افتراضيًا 11%)
  insuredWageOverride: number | null; // أجر الاشتراك التأميني لو محدد في الشركة
  enableIncomeTax: boolean; // تفعيل ضريبة كسب العمل المصرية
  enableMartyrsFund: boolean; // صندوق تكريم الشهداء 0.05%
  paydayDay: number; // يوم القبض في الشهر (1-31) للعد التنازلي
}

export interface UserProfile {
  name: string;
  jobTitle: string;
  companyName: string;
  department: string;
  employeeCode: string;
  phone: string;
  email: string;
  hireDate: string;
  defaultShift: WorkShift;
  avatarDataUrl: string | null;
}

export interface TaxBracketBreakdown {
  label: string;
  ratePercent: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface ComputedPayroll {
  dailyRate: number;
  hourlyRate: number;
  dayOvertimeRate: number;
  nightOvertimeRate: number;
  holidayHourlyRate: number;

  workedDays: number;
  dayShiftCount: number;
  nightShiftCount: number;
  holidayDays: number;
  holidayHours: number;
  absentDays: number;
  totalWorkedHours: number;
  dayOvertimeHours: number;
  nightOvertimeHours: number;
  totalAllWorkedHours: number;
  totalLateMinutes: number;

  basicSalary: number;
  monthlyIncentive: number;
  fixedAllowances: number;
  dayShiftAllowanceTotal: number;
  nightShiftAllowanceTotal: number;
  totalShiftAllowance: number;
  dayOvertimePay: number;
  nightOvertimePay: number;
  totalOvertimePay: number;
  holidayWorkPay: number;
  customBonusesTotal: number;
  grossSalary: number;

  insuredWage: number;
  socialInsuranceEmployee: number;
  annualTaxableIncome: number;
  annualPersonalExemption: number;
  annualIncomeTax: number;
  monthlyIncomeTax: number;
  taxBrackets: TaxBracketBreakdown[];
  martyrsFundDeduction: number;
  incentiveDeduction: number;
  lateDeduction: number;
  absenceDeduction: number;
  customDeductionsTotal: number;
  totalDeductions: number;

  netSalary: number;
}

export interface ToastNotice {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'warning';
}
