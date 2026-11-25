import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  GitBranch,
  Smartphone,
} from 'lucide-react';
import {
  exportMarketPulseZip,
  FLUTTER_MARKET_FILES,
} from '../flutterMarketProject';
import { MarketLocale } from '../types';

interface Props {
  locale: MarketLocale;
}

export const ApkCenterView: React.FC<Props> = ({ locale }) => {
  const isAr = locale === 'ar';
  const [selectedPath, setSelectedPath] = useState<string>('lib/main.dart');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeFile =
    FLUTTER_MARKET_FILES.find((f) => f.path === selectedPath) ??
    FLUTTER_MARKET_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportMarketPulseZip();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header & 1-Tap ZIP Download */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isAr
              ? 'ملف APK الحقيقي للأندرويد (Flutter & GitHub Actions)'
              : 'Native Android APK Center (Flutter & GitHub Actions)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {isAr
              ? 'تطبيق أندرويد أصلي مكتوب بـ Dart & Kotlin بيشتغل أونلاين وأوفلاين — جاهز يتحول لملف APK أوتوماتيك على GitHub.'
              : 'Standalone Dart & Kotlin Android app with live quotes & Hive offline cache — auto-builds via GitHub Actions.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>
            {exporting
              ? isAr
                ? 'جاري تجهيز الملف...'
                : 'Packaging...'
              : isAr
                ? 'تحميل مشروع Flutter Android (ZIP)'
                : 'Download Flutter Android ZIP'}
          </span>
        </button>
      </div>

      {/* 3-Step Automated GitHub Actions APK Guide */}
      <section className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/30 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-teal-900 dark:text-teal-200">
            <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              {isAr
                ? '3 خطوات لتنزيل ملف marketpulse-global-release.apk على تليفونك'
                : '3 Steps to Build & Download marketpulse-global-release.apk'}
            </span>
          </div>
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-teal-700 dark:text-teal-300"
          >
            <GitBranch className="w-3.5 h-3.5" />
            .github/workflows/build-marketpulse-apk.yml
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-white/90 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col gap-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isAr ? '1. صدّر المشروع لـ GitHub' : '1. Export to GitHub'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'ارفع المشروع لحسابك على GitHub (أو نزّل ملف الـ ZIP من الزرار فوق).'
                : 'Export this repository to GitHub (or download the Flutter ZIP).'}
            </p>
          </div>
          <div className="rounded-lg bg-white/90 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col gap-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isAr ? '2. افتح تبويب Actions' : '2. Open GitHub Actions'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'شغّل Build MarketPulse Global APK — هيبني التطبيق أوتوماتيك خلال 3–5 دقايق.'
                : 'Run Build MarketPulse Global APK — compiles automatically in ~4 mins.'}
            </p>
          </div>
          <div className="rounded-lg bg-white/90 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col gap-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isAr ? '3. نزّل الـ APK وثبّته' : '3. Download & Install APK'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'من Artifacts نزّل marketpulse-global-release.apk وثبّته كبرنامج أندرويد حقيقي.'
                : 'Download marketpulse-global-release.apk from Artifacts and install on Android.'}
            </p>
          </div>
        </div>
      </section>

      {/* Code Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
        <aside className="border-b lg:border-b-0 lg:border-e border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1120] p-3 flex flex-col gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 px-2 pb-1">
            marketpulse_global/
          </span>
          {FLUTTER_MARKET_FILES.map((file) => {
            const active = file.path === activeFile.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 text-start transition-colors ${
                  active
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span dir="ltr" className="truncate">
                  {file.path.split('/').pop()}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p
                dir="ltr"
                className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                {activeFile.path}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? activeFile.summaryAr : activeFile.summaryEn}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copied
                  ? isAr
                    ? 'اتنسخ'
                    : 'Copied'
                  : isAr
                    ? 'نسخ الكود'
                    : 'Copy'}
              </span>
            </button>
          </div>

          <pre
            dir="ltr"
            className="overflow-auto bg-[#090E1A] text-slate-100 p-4 font-mono text-xs leading-6 max-h-[520px]"
          >
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
