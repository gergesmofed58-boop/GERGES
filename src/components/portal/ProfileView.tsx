import React from 'react';
import { RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';
import type { EmployeeProfile, UserRole } from '../../types/portal';
import { ImageWithFallback } from './ImageWithFallback';

interface ProfileViewProps {
  profile: EmployeeProfile;
  role: UserRole;
  onSetRole: (role: UserRole) => void;
  onResetDemo: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  role,
  onSetRole,
  onResetDemo,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          الملف الوظيفي وإعدادات الصلاحيات
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          بيانات الموظف المعتمدة لدى شؤون العاملين، جدول الوردية، والتبديل بين صلاحية الموظف ومدير الموارد البشرية.
        </p>
      </div>

      {/* Employee Identity Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
            <ImageWithFallback
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>الكود الوظيفي</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                {profile.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>{profile.department}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {profile.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{profile.title}</p>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              {profile.plantLocation} · تاريخ التعيين:{' '}
              <span className="font-mono tabular-nums">{profile.hireDate}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Employment Details & Serky Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              البيانات الوظيفية والتأمينات
            </h3>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400 text-xs">المدير المباشر</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100 text-left">
                {profile.directManager}
              </dd>
            </div>
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400 text-xs">نظام الوردية</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100 text-left">
                {profile.shiftPattern}
              </dd>
            </div>
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400 text-xs">الرقم التأميني</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {profile.socialInsuranceNo}
              </dd>
            </div>
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400 text-xs">بطاقة التأمين الطبي</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {profile.medicalCardNo}
              </dd>
            </div>
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400 text-xs">البريد المؤسسي</dt>
              <dd className="font-mono text-xs text-slate-700 dark:text-slate-300">
                {profile.email}
              </dd>
            </div>
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400 text-xs">رقم الهاتف المسجل</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {profile.phone}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                تبديل صلاحيات البوابة (تجربة الموظف / الموارد البشرية)
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                يمكنك تجربة التطبيق كموظف لتسجيل البصمة ومتابعة السركي وطلب الإجازات، أو التبديل إلى وضع مدير الموارد البشرية لاعتماد إجازات الفريق وتدقيق السركي ونشر أخبار وتعميمات الشركة.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSetRole('employee')}
                  className={`p-4 rounded-xl border text-right transition-colors cursor-pointer ${
                    role === 'employee'
                      ? 'border-[#0F5C7E] bg-sky-50/60 dark:bg-sky-950/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <UserCheck className="w-5 h-5 text-[#0F5C7E] dark:text-sky-400 mb-2" />
                  <div className="text-sm font-bold">وضع الموظف</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    الخدمة الذاتية، البصمة، السركي، وتقديم الإجازات
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSetRole('hr')}
                  className={`p-4 rounded-xl border text-right transition-colors cursor-pointer ${
                    role === 'hr'
                      ? 'border-[#0F5C7E] bg-sky-50/60 dark:bg-sky-950/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-[#0F5C7E] dark:text-sky-400 mb-2" />
                  <div className="text-sm font-bold">مدير الموارد البشرية</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    اعتماد الإجازات، تدقيق السركي، ونشر أخبار الشركة
                  </div>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>قيمة ساعة الإضافي المعتمدة في السركي</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                    {profile.overtimeHourlyRate} ج.م / ساعة
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>بدل الورديات والانتظام الشهري</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                    {profile.shiftAllowanceMonthly.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              تُحفظ جميع تعديلاتك تلقائيًا على هذا المتصفح.
            </span>
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-400 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة البيانات الأولية</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
