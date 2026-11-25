import React, { useState } from 'react';
import { Check, Copy, Download, Smartphone, WifiOff, X } from 'lucide-react';
import {
  useOfflineServiceWorker,
  useOnlineStatus,
  usePWAInstall,
} from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    return null;
  }

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard fallback not needed
    }
  };

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'min-h-[40px] px-3 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors'
            : 'w-full min-h-[46px] px-4 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{isInstallable ? 'ثبّت البرنامج' : 'تثبيت على الموبايل'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-apk-guide-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2
                id="pwa-apk-guide-title"
                className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4 text-[#0F5C7E] dark:text-sky-400" />
                <span>تثبيت البرنامج على موبايلك أو عمل ملف APK</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-w-[44px] min-h-[44px] -ml-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="قفل"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. التثبيت المباشر على الموبايل دلوقتي
                </h3>
                {isIOS ? (
                  <p>
                    افتح الرابط من متصفح <strong>سفاري</strong>، اضغط زر{' '}
                    <strong>المشاركة</strong> تحت، وبعدها اختار{' '}
                    <strong>إضافة إلى الشاشة الرئيسية</strong>.
                  </p>
                ) : (
                  <p>
                    افتح الرابط من متصفح <strong>كروم</strong> على موبايلك الأندرويد، اضغط التلات نقط فوق (⋮)، واختار{' '}
                    <strong>تثبيت التطبيق</strong> عشان ينزل بأيقونة على الشاشة ويشتغل معاك أوفلاين من غير نت.
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. استخراج ملف APK حقيقي أوفلاين من جيت هب
                </h3>
                <p>
                  المشروع جاهز فيه ملف البناء التلقائي. أول ما ترفعه على حسابك في <strong>GitHub</strong>، افتح قسم <strong>Actions</strong> وهتلاقي ملف <strong>shoghli-moratabi.apk</strong> جاهز للتحميل وتثبته مباشرة على موبايلك من غير نت.
                </p>

                {appUrl && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <span className="flex-1 font-mono text-[11px] text-slate-700 dark:text-slate-200 truncate" dir="ltr">
                      {appUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="min-h-[36px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>اتنسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>انسخ الرابط</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full min-h-[46px] rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                تمام
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const {
    offlineReady,
    needRefresh,
    applyUpdate,
    dismissOfflineReady,
    dismissNeedRefresh,
  } = useOfflineServiceWorker();

  if (!isOnline) {
    return (
      <div
        role="status"
        className="fixed bottom-20 lg:bottom-5 left-4 right-4 sm:right-auto z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg"
      >
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>أنت أوفلاين دلوقتي — البرنامج شغال وبيحسب المرتب الصافي وبيحفظ شغلك من غير نت</span>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div
        role="status"
        className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
      >
        <span>فيه تحديث جديد للبرنامج</span>
        <button
          type="button"
          onClick={applyUpdate}
          className="px-3 py-1 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white font-bold cursor-pointer"
        >
          حدّث دلوقتي
        </button>
        <button
          type="button"
          onClick={dismissNeedRefresh}
          className="p-1 text-slate-300 hover:text-white cursor-pointer"
          aria-label="قفل"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div
        role="status"
        className="fixed bottom-20 lg:bottom-5 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
      >
        <Check className="w-4 h-4 shrink-0" />
        <span>البرنامج اتحفظ على موبايلك — شغال أوفلاين من غير نت</span>
        <button
          type="button"
          onClick={dismissOfflineReady}
          className="p-1 text-emerald-100 hover:text-white cursor-pointer mr-auto"
          aria-label="قفل"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return null;
};
