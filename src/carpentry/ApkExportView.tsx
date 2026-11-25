import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  GitBranch,
  Layers,
  Smartphone,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { AppLocale } from './types';

interface Props {
  locale: AppLocale;
}

interface ConfigPreviewFile {
  path: string;
  summaryAr: string;
  summaryEn: string;
  content: string;
}

const CAPACITOR_CONFIG_PREVIEW = `{
  "appId": "com.bolawood.carpentry3d",
  "appName": "BOLA WOOD 3D",
  "webDir": "dist",
  "android": {
    "allowMixedContent": true,
    "backgroundColor": "#F8F7F4",
    "webContentsDebuggingEnabled": false
  },
  "server": {
    "androidScheme": "https"
  }
}`;

const WORKFLOW_PREVIEW = `name: Build BOLA WOOD 3D Android APK (Identical App)

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: npm install --legacy-peer-deps
      - run: npm run build
      - run: npm install --no-save --legacy-peer-deps @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
      - run: rm -rf android && npx cap add android && npx cap sync android
      - working-directory: android
        run: chmod +x gradlew && ./gradlew assembleDebug
      # بيرفع bola-wood-3d.apk مباشرة في Actions Artifacts وفي GitHub Releases`;

const APK_FILES: ConfigPreviewFile[] = [
  {
    path: '.github/workflows/build-apk.yml',
    summaryAr:
      'ملف البناء الأوتوماتيك على GitHub — بياخد نفس التطبيق اللي قدامك بالظبط ويطلّعه ملف bola-wood-3d.apk جاهز للتثبيت',
    summaryEn:
      'GitHub Actions workflow — packages this exact React + Three.js app into bola-wood-3d.apk and publishes to Releases',
    content: WORKFLOW_PREVIEW,
  },
  {
    path: 'capacitor.config.json',
    summaryAr:
      'إعدادات تطبيق الأندرويد (اسم التطبيق: BOLA WOOD 3D — الحزمة: com.bolawood.carpentry3d)',
    summaryEn:
      'Capacitor Android config (App Name: BOLA WOOD 3D — Package: com.bolawood.carpentry3d)',
    content: CAPACITOR_CONFIG_PREVIEW,
  },
];

export const ApkExportView: React.FC<Props> = ({ locale }) => {
  const isRtl = locale === 'ar';
  const [selectedPath, setSelectedPath] = useState(APK_FILES[0].path);
  const [copied, setCopied] = useState(false);

  const activeFile =
    APK_FILES.find((f) => f.path === selectedPath) ?? APK_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 100% Identical APK Guarantee Banner */}
      <section className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                {isRtl
                  ? 'تطبيق BOLA WOOD 3D للأندرويد — مطابق 100% (bola-wood-3d.apk)'
                  : 'BOLA WOOD 3D — 100% Identical Android APK (bola-wood-3d.apk)'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {isRtl
                  ? 'دلوقتي الـ APK بيتبني مباشرة من نفس شاشة البرنامج دي بالظبط بـ Capacitor 6 — نفس المجسم الـ 3D والتفكيك الواسع، نفس الـ 12 صورة حقيقية، نفس تاب «صمّم من صورة»، نفس تصميم الأوضة 3D و 2D بالباب والشباك، ونفس الإدخال اليدوي للمقاسات والأسعار.'
                  : 'This APK packages the exact same web app with Capacitor 6 — identical 3D viewport, 12 studio photos, Photo-to-Design, Room 3D & 2D Architect, Cut List, and Sheet Optimizer.'}
              </p>
            </div>
          </div>
        </div>

        {/* Feature parity checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {isRtl ? 'نفس المجسم الـ 3D والتفكيك الواسع' : 'Exact Three.js 3D & Explode'}
            </span>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {isRtl ? 'الـ 12 صورة والألواح 122×244 جوه الـ APK' : 'All 12 Photos & Sheets Bundled'}
            </span>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {isRtl ? 'صمّم من صورة + أوضة بالباب والشباك' : 'Photo & Architectural Room 3D'}
            </span>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {isRtl ? 'شغال أوفلاين بالكامل في الورشة' : '100% Offline in Workshop'}
            </span>
          </div>
        </div>

        {/* 3 Clear Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3.5">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? '1. ارفع التحديث الجديد على GitHub' : '1. Push Update to GitHub'}
            </p>
            <p className="text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
              {isRtl
                ? 'اضغط زر GitHub فوق في AI Studio واعمل Export / Push عشان النسخة الجديدة تتحدث على مشروعك.'
                : 'Use the GitHub export button in AI Studio to push this updated project.'}
            </p>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3.5">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? '2. استنى ~3 دقايق على GitHub Actions' : '2. Wait ~3 Minutes in Actions'}
            </p>
            <p className="text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
              {isRtl
                ? 'المسار الوحيد اللي شغال دلوقتي هو Build BOLA WOOD 3D Android APK (Identical App) — هيجهزلك الـ APK أوتوماتيك.'
                : 'The unified Build BOLA WOOD 3D Android APK workflow builds your APK automatically.'}
            </p>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3.5">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? '3. امسح القديم وثبّت bola-wood-3d.apk' : '3. Install bola-wood-3d.apk'}
            </p>
            <p className="text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
              {isRtl
                ? 'امسح التطبيق القديم من موبايلك، ونزّل bola-wood-3d.apk من قسم Releases (أو من Actions Artifacts) وثبّته باسم BOLA WOOD 3D!'
                : 'Uninstall the old APK on your phone, then download and install bola-wood-3d.apk from GitHub Releases.'}
            </p>
          </div>
        </div>

        <div
          dir="ltr"
          className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-600 dark:text-stone-400"
        >
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            .github/workflows/build-apk.yml
          </span>
          <span className="text-stone-400">•</span>
          <span>Package: com.bolawood.carpentry3d</span>
          <span className="text-stone-400">•</span>
          <span>Output: bola-wood-3d.apk</span>
        </div>
      </section>

      {/* Build Config Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] overflow-hidden min-h-[380px]">
        <aside className="border-b lg:border-b-0 lg:border-e border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#111315] p-3 flex flex-col gap-1">
          <p className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300 px-2 pb-2 border-b border-stone-200 dark:border-stone-800">
            {isRtl ? 'ملفات بناء الـ APK المطابق' : 'Identical APK Config Files'}
          </p>
          {APK_FILES.map((file) => {
            const active = file.path === activeFile.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 text-start transition-colors ${
                  active
                    ? 'bg-amber-700 text-white font-semibold'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span dir="ltr" className="truncate">
                  {file.path}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p
                dir="ltr"
                className="font-mono text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100"
              >
                {activeFile.path}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isRtl ? activeFile.summaryAr : activeFile.summaryEn}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[36px] px-3 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1.5"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copied
                  ? isRtl
                    ? 'اتنسخ!'
                    : 'Copied'
                  : isRtl
                  ? 'نسخ'
                  : 'Copy'}
              </span>
            </button>
          </div>
          <pre
            dir="ltr"
            className="flex-1 overflow-auto bg-[#14171D] text-stone-100 p-4 font-mono text-xs leading-6 max-h-[420px]"
          >
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
