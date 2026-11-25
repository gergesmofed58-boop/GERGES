import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FolderOpen,
  GitBranch,
  Search,
  Smartphone,
} from 'lucide-react';
import {
  exportFlutterProjectZip,
  FLUTTER_PROJECT_FILES,
} from '../../data/flutter';
import { getT } from '../../data/translations';
import { AppLocale } from '../../types/router';

interface Props {
  locale: AppLocale;
}

export const FlutterCodeExplorer: React.FC<Props> = ({ locale }) => {
  const t = getT(locale);
  const isRtl = locale === 'ar';
  const [selectedPath, setSelectedPath] = useState<string>('pubspec.yaml');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FLUTTER_PROJECT_FILES;
    return FLUTTER_PROJECT_FILES.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.summaryEn.toLowerCase().includes(q) ||
        f.summaryAr.toLowerCase().includes(q)
    );
  }, [search]);

  const groupedByFolder = useMemo(() => {
    const map = new Map<string, typeof FLUTTER_PROJECT_FILES>();
    for (const file of filteredFiles) {
      const group = map.get(file.folder) ?? [];
      group.push(file);
      map.set(file.folder, group);
    }
    return Array.from(map.entries());
  }, [filteredFiles]);

  const activeFile =
    FLUTTER_PROJECT_FILES.find((f) => f.path === selectedPath) ??
    FLUTTER_PROJECT_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportFlutterProjectZip();
    } finally {
      setExporting(false);
    }
  };

  const lines = activeFile.content.split('\n');

  return (
    <div className="max-w-[1380px] mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.codeTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t.codeSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? t.exporting : t.exportAndroidZip}</span>
        </button>
      </div>

      {/* Automated Real APK Build Pipeline Guide */}
      <section className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/30 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-teal-900 dark:text-teal-200">
            <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              {isRtl
                ? 'إزاي تطلّع ملف APK حقيقي لموبايلك أوتوماتيك من GitHub؟'
                : 'How to Build the Real Standalone Android APK via GitHub Actions'}
            </span>
          </div>
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-teal-700 dark:text-teal-300"
          >
            <GitBranch className="w-3.5 h-3.5" />
            .github/workflows/build-router-apk.yml
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="rounded-xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col gap-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isRtl ? '1. صدّر المشروع على GitHub' : '1. Export to GitHub'}
            </span>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              {isRtl
                ? 'ارفع المشروع لحسابك على GitHub (أو حمّل ملف الـ ZIP من الزرار فوق وفكّه).'
                : 'Push this repo to GitHub (or download the Flutter Android ZIP above).'}
            </p>
          </div>
          <div className="rounded-xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col gap-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isRtl ? '2. افتح تبويب Actions' : '2. Open GitHub Actions'}
            </span>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              {isRtl
                ? 'هتلاقي ووركفلو جاهز اسمه Build MikroBox Android APK بيشتغل لوحده ويبني التطبيق بـ Flutter 3.32.5.'
                : 'The included Build MikroBox Android APK workflow runs Flutter 3.32.5 automatically.'}
            </p>
          </div>
          <div className="rounded-xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col gap-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isRtl ? '3. نزّل ملف الـ APK وثبّته فوراً' : '3. Download & Install APK'}
            </span>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              {isRtl
                ? 'بعد 4 دقايق افتح قسم Releases (أو Artifacts) واضغط على mikrobox-router-release.apk لتحميله وتثبيته مباشرة على موبايلك.'
                : 'After ~4 mins, open Releases (or Artifacts) and tap mikrobox-router-release.apk to install directly on Android.'}
            </p>
          </div>
        </div>
      </section>

      {/* IDE Two-Pane Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden min-h-[680px]">
        {/* Left Sidebar: Flutter File Tree */}
        <aside className="border-b lg:border-b-0 lg:border-e border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-[#0B1120]/60">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                mikrobox_router/
              </span>
              <span className="font-mono tabular-nums text-slate-500">
                {FLUTTER_PROJECT_FILES.length} {t.filesCount}
              </span>
            </div>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchFiles}
                className="w-full h-9 ps-8 pe-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3 max-h-[320px] lg:max-h-[620px]">
            {groupedByFolder.map(([folder, files]) => (
              <div key={folder} className="flex flex-col gap-0.5">
                <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  <FolderOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span dir="ltr">{folder === 'root' ? '/' : folder}</span>
                </div>
                {files.map((file) => {
                  const active = file.path === activeFile.path;
                  const shortName = file.path.split('/').pop() ?? file.path;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedPath(file.path)}
                      className={`w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors text-start ${
                        active
                          ? 'bg-teal-600 text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span dir="ltr" className="truncate">
                        {shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Right Code Viewport */}
        <div className="flex flex-col min-w-0">
          {/* File Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827]">
            <div className="min-w-0">
              <p
                dir="ltr"
                className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                {activeFile.path}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl ? activeFile.summaryAr : activeFile.summaryEn}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? t.copied : t.copyFile}</span>
            </button>
          </div>

          {/* Code Display (always LTR for Dart syntax readability) */}
          <div
            dir="ltr"
            className="flex-1 overflow-auto bg-[#0F172A] text-slate-100 p-4 font-mono text-xs leading-6 max-h-[620px]"
          >
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="select-none pe-4 text-right text-slate-500 tabular-nums align-top w-10">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre text-slate-100">{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
