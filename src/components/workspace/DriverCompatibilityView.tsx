import React from 'react';
import { AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import { ROUTER_DRIVER_SPECS } from '../../data/routerDriversData';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';
import { RouterDriverType } from '../../types/router';

interface Props {
  store: NetPulseStore;
  onSelectForPreview: (driverType: RouterDriverType) => void;
}

export const DriverCompatibilityView: React.FC<Props> = ({
  store,
  onSelectForPreview,
}) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';

  const renderCapCell = (native: boolean) => (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
        native
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-amber-700 dark:text-amber-400'
      }`}
    >
      {native ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{native ? t.nativeSupport : t.appLevelSupport}</span>
    </span>
  );

  return (
    <div className="max-w-[1380px] mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-2xl">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.driversTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t.driversSubtitle}
          </p>
        </div>

        {/* Inline Legend (unboxed typography) */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            {t.nativeLegend}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            {t.appLevelLegend}
          </span>
        </div>
      </div>

      {/* Compatibility Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-start border-collapse min-w-[920px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1120]/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <th className="py-3.5 px-4 text-start">{t.colRouterFamily}</th>
              <th className="py-3.5 px-4 text-start">{t.colAuthPattern}</th>
              <th className="py-3.5 px-4 text-start">{t.capBandwidth}</th>
              <th className="py-3.5 px-4 text-start">{t.capQuota}</th>
              <th className="py-3.5 px-4 text-start">{t.capBlock}</th>
              <th className="py-3.5 px-4 text-start">{t.capGuest}</th>
              <th className="py-3.5 px-4 text-start">{t.capReboot}</th>
              <th className="py-3.5 px-4 text-end">{t.colAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {ROUTER_DRIVER_SPECS.map((spec) => {
              const isCurrent = spec.id === store.activeDriverSpec.id;
              return (
                <tr
                  key={spec.id}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-teal-50/40 dark:bg-teal-950/20'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-4 px-4 align-top">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {isRtl ? spec.nameAr : spec.nameEn}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {spec.vendorFamily} · {spec.defaultGateway}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                      {isRtl ? spec.notesAr : spec.notesEn}
                    </p>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <p className="font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {spec.authStrategy}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Parser: {spec.parserType}
                    </p>
                  </td>
                  <td className="py-4 px-4 align-top">
                    {renderCapCell(spec.capabilities.supportsBandwidthLimit)}
                  </td>
                  <td className="py-4 px-4 align-top">
                    {renderCapCell(spec.capabilities.supportsQuotaTracking)}
                  </td>
                  <td className="py-4 px-4 align-top">
                    {renderCapCell(spec.capabilities.supportsBlockDevice)}
                  </td>
                  <td className="py-4 px-4 align-top">
                    {renderCapCell(spec.capabilities.supportsGuestWifi)}
                  </td>
                  <td className="py-4 px-4 align-top">
                    {renderCapCell(spec.capabilities.supportsReboot)}
                  </td>
                  <td className="py-4 px-4 align-top text-end">
                    <button
                      type="button"
                      onClick={() => onSelectForPreview(spec.id)}
                      className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-teal-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t.testInApp}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
