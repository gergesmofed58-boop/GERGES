import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDriveDownload,
  KeyRound,
  Lock,
  Moon,
  Router,
  ShieldAlert,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { ROUTER_DRIVER_SPECS } from '../../data/routerDriversData';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';

interface Props {
  store: NetPulseStore;
}

export const DriverInspectorPanel: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';
  const caps = store.activeDriverSpec.capabilities;

  const capabilityRows = [
    { key: 'supportsBandwidthLimit', label: t.capBandwidth, value: caps.supportsBandwidthLimit },
    { key: 'supportsQuotaTracking', label: t.capQuota, value: caps.supportsQuotaTracking },
    { key: 'supportsBlockDevice', label: t.capBlock, value: caps.supportsBlockDevice },
    { key: 'supportsGuestWifi', label: t.capGuest, value: caps.supportsGuestWifi },
    { key: 'supportsReboot', label: t.capReboot, value: caps.supportsReboot },
  ];

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5">
      {/* Test Bench Controls */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t.workspaceControls}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isRtl
                ? 'اختبر تغيير اللغة (RTL/LTR)، المظهر، ودخول الأجهزة المجهولة واستهلاك الباقة مباشرة.'
                : 'Test RTL/LTR switching, Dark/Light themes, router drivers, and live quota rules.'}
            </p>
          </div>

          {/* Language & Theme Segmented Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => store.setLocale('ar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  store.locale === 'ar'
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                type="button"
                onClick={() => store.setLocale('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  store.locale === 'en'
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                English (LTR)
              </button>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => store.setTheme('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  store.theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t.lightMode}</span>
              </button>
              <button
                type="button"
                onClick={() => store.setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  store.theme === 'dark'
                    ? 'bg-[#111827] text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t.darkMode}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Test Scenario Triggers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => store.setIsConnected(!store.isConnected)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              {store.isConnected ? t.openLoginScreen : t.openDashboard}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              store.setIsConnected(true);
              store.simulateUnknownDeviceJoin();
            }}
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{t.simUnknownDevice}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              store.setIsConnected(true);
              store.simulateAdvanceTraffic();
            }}
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{t.simAdvanceUsage}</span>
          </button>

          <button
            type="button"
            onClick={() => store.setIsAppLocked(true)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>{t.testLockNow}</span>
          </button>
        </div>
      </section>

      {/* Active RouterDriver Adapter & Capabilities Matrix */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Router className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.activeDriverTitle}
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {store.activeDriverSpec.authStrategy} · {store.activeDriverSpec.parserType}
          </span>
        </div>

        {/* Driver switcher buttons */}
        <div className="flex flex-wrap gap-1.5">
          {ROUTER_DRIVER_SPECS.map((spec) => {
            const active = spec.id === store.activeDriverSpec.id;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => store.switchDriverLive(spec.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isRtl ? spec.nameAr : spec.nameEn}
              </button>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {isRtl ? store.activeDriverSpec.notesAr : store.activeDriverSpec.notesEn}
        </p>

        {/* Capability Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 border-t border-slate-100 dark:border-slate-800 pt-3">
          {capabilityRows.map((row) => (
            <div
              key={row.key}
              className="py-2 flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {row.label}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {row.key}
                </span>
              </div>
              <span
                className={`flex items-center gap-1 font-semibold whitespace-nowrap ${
                  row.value
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {row.value ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>{row.value ? t.nativeSupport : t.appLevelSupport}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Live On-Device Storage Preview (flutter_secure_storage + Hive) */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.localStorageTitle}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Zero Cloud Sync
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* flutter_secure_storage preview */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{t.secureVaultLabel}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {store.profiles.slice(0, 3).map((prof) => (
                <div
                  key={prof.id}
                  className="py-2 flex items-center justify-between text-xs gap-2"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {prof.label}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {prof.username} · {prof.passwordMasked}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hive local box preview */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <HardDriveDownload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{t.hiveDbLabel}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {store.devices.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  className="py-2 flex items-center justify-between text-xs gap-2"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {d.alias}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {d.quotaUsedGb.toFixed(1)}/{d.quotaLimitGb} GB
                    {d.isBlocked ? ' · BLOCKED' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
