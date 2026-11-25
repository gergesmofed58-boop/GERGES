import React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cable,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';

interface Props {
  store: NetPulseStore;
}

export const DashboardTab: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';
  const caps = store.activeDriverSpec.capabilities;

  const totalUsedGb = store.totalUsedGb;
  const totalAllocatedGb = store.billingCycle.monthlyPackageGb;
  const poolPct = Math.min(
    100,
    Math.round((totalUsedGb / Math.max(1, totalAllocatedGb)) * 100)
  );
  const blockedCount = store.devices.filter((d) => d.isBlocked).length;
  const onlineCount = store.devices.length - blockedCount;

  // Build crisp SVG sparkline polyline from bandwidthHistory
  const maxVal = Math.max(40, ...store.bandwidthHistory);
  const points = store.bandwidthHistory
    .map((val, idx) => {
      const x = (idx / Math.max(1, store.bandwidthHistory.length - 1)) * 280;
      const y = 44 - (val / maxVal) * 38;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const capabilityItems = [
    { label: t.capBandwidth, native: caps.supportsBandwidthLimit },
    { label: t.capQuota, native: caps.supportsQuotaTracking },
    { label: t.capBlock, native: caps.supportsBlockDevice },
    { label: t.capGuest, native: caps.supportsGuestWifi },
    { label: t.capReboot, native: caps.supportsReboot },
  ];

  // Security Audit Checks
  const hasDefaultPwd = Boolean(store.activeProfile?.usesDefaultCredentials);
  const wpsOpen = store.mainWifi.wpsEnabled;
  const weakEnc = store.mainWifi.encryption === 'WPA';
  const hasUnknown = store.unknownDevices.length > 0;
  const auditIssuesCount =
    Number(hasDefaultPwd) +
    Number(wpsOpen) +
    Number(weakEnc) +
    Number(hasUnknown);

  // VDSL Line health rating based on SNR Margin
  const snr = store.vdslStats.downstreamSnrDb;
  const vdslHealth =
    snr >= 12
      ? { label: t.vdslExcellent, cls: 'text-emerald-700 dark:text-emerald-400' }
      : snr >= 8
        ? { label: t.vdslGood, cls: 'text-teal-700 dark:text-teal-400' }
        : { label: t.vdslWeak, cls: 'text-red-600 dark:text-red-400' };

  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Intrusion Defense Shield (Auto-Block Unknown MACs / Whitelist Lock) */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <ShieldCheck
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                store.autoBlockIntruders
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-teal-600 dark:text-teal-400'
              }`}
            />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isRtl
                  ? 'درع منع اختراق الشبكة (حظر تلقائي لأي جهاز غريب)'
                  : 'Intruder Defense Shield (Auto-Block Unknown MACs)'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                {store.autoBlockIntruders
                  ? isRtl
                    ? 'مفعّل — أي جهاز غير معتمد هيحاول يدخل الواي فاي هيتحظر فوراً على الجدار الناري.'
                    : 'Active — any unverified MAC joining Wi-Fi is instantly quarantined.'
                  : isRtl
                    ? 'فعّل الدرع عشان يحظر أي مخترق تلقائياً قبل ما يسحب ميجا واحدة.'
                    : 'Enable to automatically firewall-block unknown devices upon join.'}
              </p>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={store.autoBlockIntruders}
              onChange={(e) => store.setAutoBlockIntruders(e.target.checked)}
              className="w-5 h-5 accent-teal-600"
              aria-label="Toggle auto-block intruders"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={store.simulateUnknownDeviceJoin}
            className="flex-1 min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {isRtl ? 'اختبار محاولة اختراق' : 'Test Intrusion'}
          </button>
          {store.unknownDevices.length > 0 && (
            <button
              type="button"
              onClick={store.blockAllIntruders}
              className="flex-1 min-h-[38px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {isRtl
                ? `حظر كل المتطفلين (${store.unknownDevices.length})`
                : `Block All (${store.unknownDevices.length})`}
            </button>
          )}
        </div>

        {store.intrusionLogs.length > 0 && (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 pt-1">
            {store.intrusionLogs.slice(0, 3).map((ev) => (
              <div
                key={ev.id}
                className="py-1.5 flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {ev.hostname}
                  </span>
                  <span className="mx-1 text-slate-400">·</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {ev.mac}
                  </span>
                </div>
                <span
                  className={`font-semibold whitespace-nowrap shrink-0 ${
                    ev.action === 'detected'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {ev.action === 'auto_blocked'
                    ? isRtl
                      ? 'محظور تلقائياً'
                      : 'Auto-Blocked'
                    : ev.action === 'manual_blocked'
                      ? isRtl
                        ? 'تم الحظر'
                        : 'Blocked'
                      : isRtl
                        ? 'مكتشف الآن'
                        : 'Detected'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unknown New Device Alert */}
      {store.unknownDevices.length > 0 && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-xs font-bold text-red-800 dark:text-red-200">
                {t.unknownAlertTitle} ({store.unknownDevices.length})
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed">
                {store.unknownDevices[0].hostname}
                <span className="mx-1.5">·</span>
                <span className="font-mono tabular-nums">
                  {store.unknownDevices[0].ip}
                </span>
                <span className="mx-1.5">·</span>
                <span className="font-mono tabular-nums">
                  {store.unknownDevices[0].mac}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                store.toggleBlockDevice(store.unknownDevices[0].id)
              }
              className="flex-1 min-h-[40px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {t.blockNow}
            </button>
            <button
              type="button"
              onClick={() =>
                store.trustUnknownDevice(store.unknownDevices[0].id)
              }
              className="flex-1 min-h-[40px] rounded-xl bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 text-slate-800 dark:text-slate-100 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors whitespace-nowrap"
            >
              {t.trustDevice}
            </button>
          </div>
        </div>
      )}

      {/* Primary Focal Card: Live Bandwidth & Sparkline */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.connectedTo}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {store.activeProfile?.label}
            </p>
          </div>
          <div className="text-end shrink-0">
            <p className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
              {store.activeProfile?.gatewayIp}
            </p>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
              {store.activeDriverSpec.authStrategy}
            </p>
          </div>
        </div>

        {/* Down / Up / Today GB live numbers */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-0.5 pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="truncate">{t.liveDownload}</span>
            </span>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {store.totalDownloadMbps.toFixed(1)}
              <span className="text-[10px] font-normal text-slate-500 ms-1">
                Mbps
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-0.5 pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate">{t.liveUpload}</span>
            </span>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {store.totalUploadMbps.toFixed(1)}
              <span className="text-[10px] font-normal text-slate-500 ms-1">
                Mbps
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-0.5 pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {t.todayTotalLabel}
            </span>
            <p className="text-lg font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
              {store.totalTodayGb.toFixed(2)}
              <span className="text-[10px] font-normal text-slate-500 ms-1">
                GB
              </span>
            </p>
          </div>
        </div>

        {/* Crisp Sparkline */}
        <div className="w-full h-12 overflow-hidden">
          <svg
            viewBox="0 0 280 48"
            className="w-full h-full"
            preserveAspectRatio="none"
            aria-label="Live throughput graph"
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-600 dark:text-teal-400"
              points={points}
            />
          </svg>
        </div>

        {/* Compact Summary Row */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => store.setActiveTab('devices')}
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
          >
            {t.connectedClients}:{' '}
            <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
              {onlineCount}
            </span>
            <span className="mx-1.5">·</span>
            <span>
              {t.blockedCount}:{' '}
              <span className="font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                {blockedCount}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => store.setActiveTab('quotas')}
            className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400"
          >
            {totalUsedGb.toFixed(1)} / {totalAllocatedGb} GB ({poolPct}%)
          </button>
        </div>
      </section>

      {/* Live Router CPU / RAM / Uptime Telemetry (MikroTik WinBox style) */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t.routerHealthTitle}</span>
          </h3>
          <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
            {store.systemHealth.uptimeLabel}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">CPU</span>
            <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
              {store.systemHealth.cpuLoadPct}%
            </span>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-teal-600 dark:bg-teal-400 transition-all duration-300"
                style={{ width: `${store.systemHealth.cpuLoadPct}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">RAM</span>
            <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
              {store.systemHealth.ramUsedPct}%
            </span>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-300"
                style={{ width: `${store.systemHealth.ramUsedPct}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isRtl ? 'الحرارة' : 'Temp'}
            </span>
            <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
              {store.systemHealth.temperatureC}°C
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
              {isRtl ? 'مستقر' : 'Healthy'}
            </span>
          </div>
        </div>
      </section>

      {/* VDSL / Telephone Line Diagnostics (WE / Vodafone / Orange / STC / Demo) */}
      {caps.supportsVdslStats && (
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Cable className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {t.vdslTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={store.refreshVdslStats}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label="Refresh VDSL line metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {store.vdslStats.lineType}
            </span>
            <span className={`font-semibold ${vdslHealth.cls}`}>
              {vdslHealth.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 dark:text-slate-400">
                {t.vdslDownSnr} / {t.vdslUpSnr}
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                {store.vdslStats.downstreamSnrDb} dB ·{' '}
                {store.vdslStats.upstreamSnrDb} dB
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 dark:text-slate-400">
                {t.vdslAtten}
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                ↓{store.vdslStats.downstreamAttenuationDb} dB · ↑
                {store.vdslStats.upstreamAttenuationDb} dB
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 dark:text-slate-400">
                {t.vdslActual}
              </span>
              <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                {store.vdslStats.actualDownMbps} /{' '}
                {store.vdslStats.actualUpMbps} Mbps
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 dark:text-slate-400">
                {t.vdslMaxRate}
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                {store.vdslStats.maxAttainableDownMbps} Mbps · CRC:{' '}
                {store.vdslStats.crcErrors}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Router Security Audit Card */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t.securityAuditTitle}</span>
          </h3>
          <span
            className={`text-xs font-semibold ${
              auditIssuesCount === 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {auditIssuesCount === 0
              ? t.securityAuditGood
              : `${auditIssuesCount} ${isRtl ? 'ملاحظات' : 'issues'}`}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Default Password check */}
          <div className="py-2 first:pt-0 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t.auditDefaultPwd}
              </p>
              <p
                className={`text-[11px] ${
                  hasDefaultPwd
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {hasDefaultPwd ? t.auditDefaultPwdRisk : t.auditDefaultPwdOk}
              </p>
            </div>
            {hasDefaultPwd ? (
              <button
                type="button"
                onClick={store.rotateDefaultAdminPassword}
                className="min-h-[34px] px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold whitespace-nowrap shrink-0"
              >
                {t.fixNow}
              </button>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* WPS check */}
          <div className="py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t.auditWps}
              </p>
              <p
                className={`text-[11px] ${
                  wpsOpen
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {wpsOpen ? t.auditWpsRisk : t.auditWpsOk}
              </p>
            </div>
            {wpsOpen ? (
              <button
                type="button"
                onClick={() =>
                  store.setMainWifi((prev) => ({ ...prev, wpsEnabled: false }))
                }
                className="min-h-[34px] px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold whitespace-nowrap shrink-0"
              >
                {t.fixNow}
              </button>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* Encryption check */}
          <div className="py-2 last:pb-0 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t.auditEnc}
              </p>
              <p
                className={`text-[11px] ${
                  weakEnc
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {weakEnc ? t.auditEncRisk : t.auditEncOk}
              </p>
            </div>
            {weakEnc ? (
              <button
                type="button"
                onClick={() =>
                  store.setMainWifi((prev) => ({
                    ...prev,
                    encryption: 'WPA2/WPA3',
                  }))
                }
                className="min-h-[34px] px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold whitespace-nowrap shrink-0"
              >
                {t.fixNow}
              </button>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
          </div>
        </div>
      </section>

      {/* Quota Groups Quick Overview */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t.groupsOverview}
          </h3>
          <button
            type="button"
            onClick={() => store.setActiveTab('quotas')}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-0.5 hover:underline"
          >
            <span>{t.manageAll}</span>
            <Chevron className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {store.groups.map((grp) => {
            const members = store.devices.filter((d) => d.groupId === grp.id);
            const used = members.reduce((acc, d) => acc + d.quotaUsedGb, 0);
            const pct = Math.min(
              100,
              Math.round((used / Math.max(1, grp.allocatedGb)) * 100)
            );
            const barColor =
              pct >= 100
                ? 'bg-red-600'
                : pct >= 80
                  ? 'bg-amber-500'
                  : 'bg-teal-600 dark:bg-teal-500';
            return (
              <div
                key={grp.id}
                className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {isRtl ? grp.nameAr : grp.nameEn}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {members.length} {t.devicesInGroup}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                    {used.toFixed(1)} / {grp.allocatedGb} GB
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Router Capabilities Matrix (Native vs App-Level) */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t.capabilitiesTitle}</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {store.activeDriverSpec.parserType}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {capabilityItems.map((item) => (
            <div
              key={item.label}
              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {item.label}
              </span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  item.native
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {item.native ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>{item.native ? t.nativeSupport : t.appLevelSupport}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
