import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  Moon,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import type { UserProfile, WorkShift } from '../../types/workApp';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileTabProps {
  profile: UserProfile;
  theme: 'light' | 'dark';
  onUpdateProfile: (patch: Partial<UserProfile>, silent?: boolean) => void;
  onToggleTheme: () => void;
  onExportBackup: () => void;
  onImportBackup: (rawJson: string) => void;
  onResetAll: () => void;
}

/** تصغير وضغط الصورة الشخصية على الجهاز عشان تتحفظ أوفلاين من غير ما تاخد مساحة كبيرة */
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode_failed'));
      img.onload = () => {
        const size = 280;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  theme,
  onUpdateProfile,
  onToggleTheme,
  onExportBackup,
  onImportBackup,
  onResetAll,
}) => {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [avatarError, setAvatarError] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setAvatarError(false);
      setDraft((prev) => ({ ...prev, avatarDataUrl: dataUrl }));
      onUpdateProfile({ avatarDataUrl: dataUrl });
    } catch {
      // Ignore invalid image file
    } finally {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setDraft((prev) => ({ ...prev, avatarDataUrl: null }));
    onUpdateProfile({ avatarDataUrl: null });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(draft);
  };

  const handleBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportBackup(String(reader.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          بياناتي والنسخة الاحتياطية
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          اكتب بياناتك وحط صورتك الشخصية براحتك، وتقدر تاخد نسخة احتياطية تحفظ شغلك كله.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6"
        >
          {/* الصورة الشخصية */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {draft.avatarDataUrl && !avatarError ? (
                <img
                  src={draft.avatarDataUrl}
                  alt={draft.name || 'صورتك الشخصية'}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  صورتك الشخصية
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  اختار صورة من موبايلك وهتتحفظ جوه البرنامج أوفلاين.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="min-h-[42px] px-4 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>اختار صورة</span>
                </button>
                {draft.avatarDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>امسح الصورة</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* مربعات فاضية تمامًا للمستخدم يكتب بياناته بحرية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                اسمك بالكامل
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="اكتب اسمك هنا..."
                className="w-full min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                وظيفتك
              </label>
              <input
                type="text"
                value={draft.jobTitle}
                onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
                placeholder="شغال إيه؟"
                className="w-full min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                اسم الشركة أو المصنع
              </label>
              <input
                type="text"
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                placeholder="اسم مكان شغلك..."
                className="w-full min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                القسم أو الإدارة
              </label>
              <input
                type="text"
                value={draft.department}
                onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                placeholder="اسم القسم..."
                className="w-full min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                الكود الوظيفي
              </label>
              <input
                type="text"
                value={draft.employeeCode}
                onChange={(e) => setDraft({ ...draft, employeeCode: e.target.value })}
                placeholder="كودك في الشركة..."
                className="w-full min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الموبايل
              </label>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="01xxxxxxxxx"
                className="w-full min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                الإيميل (اختياري)
              </label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ التعيين (اختياري)
              </label>
              <input
                type="date"
                value={draft.hireDate}
                onChange={(e) => setDraft({ ...draft, hireDate: e.target.value })}
                className="w-full min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                الوردية اللي بتشتغلها أغلب الوقت
              </label>
              <select
                value={draft.defaultShift}
                onChange={(e) =>
                  setDraft({ ...draft, defaultShift: e.target.value as WorkShift })
                }
                className="w-full min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              >
                <option value="day">وردية نهارية</option>
                <option value="night">وردية ليلية</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>احفظ بياناتي</span>
            </button>
          </div>
        </form>

        {/* التثبيت والشكل والنسخ الاحتياطي */}
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              تثبيت على الموبايل أو عمل APK
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              البرنامج بيشتغل معاك أوفلاين من غير نت، والعداد بيفضل شغال حتى لو قفلته، وتقدر تثبته على موبايلك أو تبني منه APK من جيت هب.
            </p>
            <PWAInstallButton />
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              شكل البرنامج
            </h2>
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between cursor-pointer"
            >
              <span>{theme === 'dark' ? 'خلّيه فاتح (نهاري)' : 'خلّيه غامق (ليلي)'}</span>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              النسخة الاحتياطية ونقل بياناتك
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              كل شغلك محفوظ على موبايلك أوفلاين. تقدر تنزل نسخة احتياطية وترجعها على أي موبايل تاني في أي وقت.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={onExportBackup}
                className="w-full min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>نزّل نسخة احتياطية</span>
              </button>

              <input
                ref={backupInputRef}
                type="file"
                accept="application/json"
                onChange={handleBackupFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="w-full min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>رجّع من نسخة محفوظة</span>
              </button>

              <button
                type="button"
                onClick={onResetAll}
                className="w-full min-h-[44px] px-4 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>امسح كل البيانات وابدأ من جديد</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
