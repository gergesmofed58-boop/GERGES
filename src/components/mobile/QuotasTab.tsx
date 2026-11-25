import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  Gauge,
  RotateCcw,
  ShieldBan,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';
import { DeviceGroupId } from '../../types/router';

interface Props {
  store: NetPulseStore;
}

type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export const QuotasTab: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';
  const [subView, setSubView] = useState<'groups' | 'devices' | 'reports'>(
    'devices'
  );
  const [expandedGroup, setExpandedGroup] = useState<
    Exclude<DeviceGroupId, 'unassigned'> | null
  >(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('weekly');

  const chartBars = useMemo(() => {
    if (period === 'daily') {
      return [
        { label: '00h', gb: 0.9 },
        { label: '04h', gb: 0.4 },
        { label: '08h', gb: 1.8 },
        { label: '12h', gb: 2.6 },
        { label: '16h', gb: 3.4 },
        { label: '20h', gb: 4.1 },
      ];
    }
    if (period === 'weekly') {
      return isRtl
        ? [
            { label: 'سبت', gb: 14.2 },
            { label: 'أحد', gb: 11.8 },
            { label: 'إثنين', gb: 13.5 },
            { label: 'ثلاثاء', gb: 16.4 },
            { label: 'أربعاء', gb: 12.1 },
            { label: 'خميس', gb: 19.6 },
            { label: 'جمعة', gb: 21.8 },
          ]
        : [
            { label: 'Sat', gb: 14.2 },
            { label: 'Sun', gb: 11.8 },
            { label: 'Mon', gb: 13.5 },
            { label: 'Tue', gb: 16.4 },
            { label: 'Wed', gb: 12.1 },
            { label: 'Thu', gb: 19.6 },
            { label: 'Fri', gb: 21.8 },
          ];
    }
    return isRtl
      ? [
          { label: 'أسبوع 1', gb: 42 },
          { label: 'أسبوع 2', gb: 48 },
          { label: 'أسبوع 3', gb: 39 },
          { label: 'أسبوع 4', gb: 51 },
        ]
      : [
          { label: 'Wk 1', gb: 42 },
          { label: 'Wk 2', gb: 48 },
          { label: 'Wk 3', gb: 39 },
          { label: 'Wk 4', gb: 51 },
        ];
  }, [period, isRtl]);

  const maxBarGb = Math.max(...chartBars.map((b) => b.gb), 1);

  const topConsumers = useMemo(
    () => [...store.devices].sort((a, b) => b.quotaUsedGb - a.quotaUsedGb),
    [store.devices]
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {t.quotasTitle}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.quotasSubtitle}
        </p>
      </div>

      {/* Billing Cycle & Daily Safe Budget Summary Card */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <CalendarClock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t.billingTitle}</span>
          </div>
          <span className="font-mono tabular-nums text-xs font-semibold text-teal-700 dark:text-teal-400">
            {store.billingStats.dailySafeBudgetGb} {t.gbPerDay}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.daysRemaining}
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
              {store.billingStats.daysLeft}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.remainingGbLabel}
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
              {store.billingStats.remainingGb} GB
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.dailySafeBudget}
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-teal-700 dark:text-teal-400">
              {store.billingStats.dailySafeBudgetGb} GB
            </span>
          </div>
        </div>

        {/* Editable Renewal Day & Monthly Cap */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.renewalDayLabel}
            </label>
            <input
              type="number"
              min={1}
              max={28}
              value={store.billingCycle.renewalDay}
              onChange={(e) =>
                store.setBillingCycle((prev) => ({
                  ...prev,
                  renewalDay: Math.max(
                    1,
                    Math.min(28, Number(e.target.value) || 1)
                  ),
                }))
              }
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.monthlyPackageLabel}
            </label>
            <input
              type="number"
              min={20}
              max={2000}
              step={10}
              value={store.billingCycle.monthlyPackageGb}
              onChange={(e) =>
                store.setBillingCycle((prev) => ({
                  ...prev,
                  monthlyPackageGb: Math.max(20, Number(e.target.value) || 100),
                }))
              }
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Segmented Switch: Groups | Devices | Reports */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setSubView('groups')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            subView === 'groups'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t.viewGroups}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('devices')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            subView === 'devices'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>{t.viewDevices}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('reports')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
            subView === 'reports'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{t.usageAnalyticsTitle}</span>
        </button>
      </div>

      {/* Groups View */}
      {subView === 'groups' && (
        <div className="flex flex-col gap-3">
          {store.groups.map((grp) => {
            const members = store.devices.filter((d) => d.groupId === grp.id);
            const usedGb = members.reduce((acc, d) => acc + d.quotaUsedGb, 0);
            const pct = Math.min(
              100,
              Math.round((usedGb / Math.max(1, grp.allocatedGb)) * 100)
            );
            const isExceeded = pct >= 100;
            const isWarning = pct >= 80 && pct < 100;
            const isEditing = expandedGroup === grp.id;

            return (
              <div
                key={grp.id}
                className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {isRtl ? grp.nameAr : grp.nameEn}
                      </h3>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {members.length} {t.devicesInGroup}
                      </span>
                    </div>
                    <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 mt-0.5">
                      {usedGb.toFixed(1)} GB {t.usedOf} {grp.allocatedGb} GB (
                      {pct}%)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isEditing ? null : grp.id)}
                    className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{t.editPolicy}</span>
                  </button>
                </div>

                {/* Progress Bar with 80% threshold marker */}
                <div className="relative w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-red-600'
                        : isWarning
                          ? 'bg-amber-500'
                          : 'bg-teal-600 dark:bg-teal-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-px bg-slate-400/70 dark:bg-slate-500"
                    style={{ insetInlineStart: '80%' }}
                    aria-hidden="true"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`flex items-center gap-1 font-semibold ${
                      isExceeded
                        ? 'text-red-600 dark:text-red-400'
                        : isWarning
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isExceeded ? (
                      <ShieldBan className="w-3.5 h-3.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isExceeded
                        ? t.exceeded100
                        : isWarning
                          ? t.warning80
                          : t.nominalUsage}
                    </span>
                  </span>
                  {grp.speedLimitEnabled && (
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      ↓{grp.downloadLimitMbps}M / ↑{grp.uploadLimitMbps}M
                    </span>
                  )}
                </div>

                {/* Rule Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1120] cursor-pointer min-h-[42px]">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                      {t.speedRuleToggle}
                    </span>
                    <input
                      type="checkbox"
                      checked={grp.speedLimitEnabled}
                      onChange={(e) =>
                        store.updateGroupPolicy(grp.id, {
                          speedLimitEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-teal-600 shrink-0"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1120] cursor-pointer min-h-[42px]">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                      {t.autoBlockToggle}
                    </span>
                    <input
                      type="checkbox"
                      checked={grp.autoBlockOnQuotaExceeded}
                      onChange={(e) =>
                        store.updateGroupPolicy(grp.id, {
                          autoBlockOnQuotaExceeded: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-teal-600 shrink-0"
                    />
                  </label>
                </div>

                {/* Inline Quota & Speed Policy Editor */}
                {isEditing && (
                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          {t.allocatedGb}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                          {grp.allocatedGb} GB
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={300}
                        step={5}
                        value={grp.allocatedGb}
                        onChange={(e) =>
                          store.updateGroupPolicy(grp.id, {
                            allocatedGb: Number(e.target.value),
                          })
                        }
                        className="w-full accent-teal-600"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          {t.downloadLimit}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                          {grp.downloadLimitMbps} Mbps
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={100}
                        step={1}
                        value={grp.downloadLimitMbps}
                        onChange={(e) =>
                          store.updateGroupPolicy(grp.id, {
                            downloadLimitMbps: Number(e.target.value),
                            uploadLimitMbps: Math.max(
                              1,
                              Math.round(Number(e.target.value) * 0.3)
                            ),
                          })
                        }
                        className="w-full accent-teal-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Devices Quota View */}
      {subView === 'devices' && (
        <div className="flex flex-col gap-3">
          {/* Smart Subscriber GB Distribution Header */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {isRtl
                    ? 'توزيع الجيجات على المشتركين'
                    : 'Subscriber GB Quota Distribution'}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {isRtl ? 'الموزّع:' : 'Allocated:'}{' '}
                  <span
                    className={
                      store.totalAllocatedToDevicesGb >
                      store.billingCycle.monthlyPackageGb
                        ? 'font-bold text-amber-600 dark:text-amber-400'
                        : 'font-bold text-teal-700 dark:text-teal-400'
                    }
                  >
                    {store.totalAllocatedToDevicesGb} GB
                  </span>{' '}
                  / {store.billingCycle.monthlyPackageGb} GB
                </p>
              </div>
              <button
                type="button"
                onClick={store.distributeQuotaEqually}
                className="min-h-[36px] px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                {isRtl ? 'توزيع بالتساوي' : 'Split Equally'}
              </button>
            </div>
          </section>

          {store.devices.map((device) => {
            const pct = Math.min(
              100,
              Math.round(
                (device.quotaUsedGb / Math.max(1, device.quotaLimitGb)) * 100
              )
            );
            const isExceeded = pct >= 100;
            const isWarning = pct >= 80 && pct < 100;

            return (
              <div
                key={device.id}
                className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {device.alias}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {device.quotaUsedGb.toFixed(1)} / {device.quotaLimitGb} GB
                      ({pct}%) ·{' '}
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">
                        {isRtl ? 'اليوم:' : 'Today:'}{' '}
                        {device.todayUsedGb.toFixed(2)} GB
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => store.resetDeviceQuota(device.id)}
                    className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{t.resetUsage}</span>
                  </button>
                </div>

                <div className="relative w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-red-600'
                        : isWarning
                          ? 'bg-amber-500'
                          : 'bg-teal-600 dark:bg-teal-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {t.dataQuotaGb}
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={150}
                    value={device.quotaLimitGb}
                    onChange={(e) =>
                      store.updateDevice(device.id, {
                        quotaLimitGb: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-teal-600"
                  />
                  <span className="text-xs font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 w-12 text-end">
                    {device.quotaLimitGb}G
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={device.speedLimitEnabled}
                      onChange={(e) =>
                        store.updateDevice(device.id, {
                          speedLimitEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {t.speedRuleToggle} ({device.downloadLimitMbps}M)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={device.autoBlockOnQuotaExceeded}
                      onChange={(e) =>
                        store.updateDevice(device.id, {
                          autoBlockOnQuotaExceeded: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {t.autoBlockToggle}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Usage Analytics Reports & CSV Export */}
      {subView === 'reports' && (
        <div className="flex flex-col gap-3">
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(
                  [
                    { id: 'daily', label: t.periodDaily },
                    { id: 'weekly', label: t.periodWeekly },
                    { id: 'monthly', label: t.periodMonthly },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPeriod(item.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      period === item.id
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={store.exportUsageCsv}
                className="min-h-[36px] px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.exportCsvBtn}</span>
              </button>
            </div>

            {/* Clean Bar Chart */}
            <div className="flex items-end justify-between gap-2 h-36 pt-4">
              {chartBars.map((bar) => {
                const hPct = Math.max(12, Math.round((bar.gb / maxBarGb) * 100));
                return (
                  <div
                    key={bar.label}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"
                  >
                    <span className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                      {bar.gb}G
                    </span>
                    <div
                      className="w-full max-w-[30px] rounded-t-md bg-teal-600 dark:bg-teal-500 transition-all duration-300"
                      style={{ height: `${hPct}%` }}
                    />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Consuming Devices Breakdown */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {isRtl ? 'الأكثر استهلاكاً للجيجات' : 'Top Consuming Devices'}
            </h3>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {topConsumers.slice(0, 5).map((d, idx) => (
                <div
                  key={d.id}
                  className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono tabular-nums text-slate-400 w-4">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {d.alias}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap font-mono tabular-nums">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isRtl ? 'اليوم' : 'Today'} {d.todayUsedGb.toFixed(2)}G
                    </span>
                    <span className="font-bold text-teal-700 dark:text-teal-400">
                      {d.quotaUsedGb.toFixed(1)} GB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
