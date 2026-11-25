import React, { useMemo, useState } from 'react';
import {
  Ban,
  Gamepad2,
  Laptop,
  Power,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Tv,
  Wifi,
  X,
} from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';
import {
  ConnectedDevice,
  ConnectionBand,
  DeviceGroupId,
  DeviceType,
  PriorityLevel,
  QuotaActionMode,
} from '../../types/router';

interface Props {
  store: NetPulseStore;
}

type BandFilter = 'all' | ConnectionBand | 'blocked';

function DeviceIcon({ type, blocked }: { type: DeviceType; blocked: boolean }) {
  const cls = `w-4 h-4 ${
    blocked ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-400'
  }`;
  switch (type) {
    case 'laptop':
      return <Laptop className={cls} />;
    case 'tv':
      return <Tv className={cls} />;
    case 'tablet':
      return <Tablet className={cls} />;
    case 'console':
      return <Gamepad2 className={cls} />;
    case 'iot':
      return <Wifi className={cls} />;
    default:
      return <Smartphone className={cls} />;
  }
}

export const DevicesTab: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BandFilter>('all');
  const [editingDevice, setEditingDevice] = useState<ConnectedDevice | null>(null);
  const [wolToast, setWolToast] = useState<string | null>(null);

  // Modal edit form state
  const [alias, setAlias] = useState('');
  const [groupId, setGroupId] = useState<DeviceGroupId>('family');
  const [speedEnabled, setSpeedEnabled] = useState(false);
  const [downLimit, setDownLimit] = useState(15);
  const [upLimit, setUpLimit] = useState(5);
  const [burstEnabled, setBurstEnabled] = useState(false);
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [quotaGb, setQuotaGb] = useState(25);
  const [autoBlock, setAutoBlock] = useState(false);
  const [quotaAction, setQuotaAction] = useState<QuotaActionMode>('throttle_1m');

  const openEditor = (d: ConnectedDevice) => {
    setEditingDevice(d);
    setAlias(d.alias);
    setGroupId(d.groupId);
    setSpeedEnabled(d.speedLimitEnabled);
    setDownLimit(d.downloadLimitMbps);
    setUpLimit(d.uploadLimitMbps);
    setBurstEnabled(Boolean(d.burstEnabled));
    setPriority(d.priority);
    setQuotaGb(d.quotaLimitGb);
    setAutoBlock(d.autoBlockOnQuotaExceeded);
    setQuotaAction(d.quotaAction);
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    store.updateDevice(editingDevice.id, {
      alias: alias.trim() || editingDevice.hostname,
      groupId,
      isUnknown: false,
      speedLimitEnabled: speedEnabled,
      downloadLimitMbps: downLimit,
      uploadLimitMbps: upLimit,
      burstEnabled,
      priority,
      quotaLimitGb: quotaGb,
      autoBlockOnQuotaExceeded: autoBlock,
      quotaAction,
    });
    setEditingDevice(null);
  };

  const handleWake = (d: ConnectedDevice) => {
    store.sendWakeOnLan(d);
    setWolToast(`${t.wolSentMsg} (${d.alias})`);
    window.setTimeout(() => setWolToast(null), 2600);
  };

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.devices.filter((d) => {
      if (filter === 'blocked' && !d.isBlocked) return false;
      if (
        (filter === '5GHz' || filter === '2.4GHz' || filter === 'LAN') &&
        d.band !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        d.alias.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.ip.includes(q) ||
        d.mac.toLowerCase().includes(q)
      );
    });
  }, [store.devices, filter, search]);

  const filters: { id: BandFilter; label: string }[] = [
    { id: 'all', label: t.filterAll },
    { id: '5GHz', label: '5GHz' },
    { id: '2.4GHz', label: '2.4GHz' },
    { id: 'LAN', label: 'LAN' },
    { id: 'blocked', label: t.filterBlocked },
  ];

  const groupLabel = (gid: DeviceGroupId) => {
    switch (gid) {
      case 'family':
        return t.groupFamily;
      case 'kids':
        return t.groupKids;
      case 'guests':
        return t.groupGuests;
      default:
        return t.groupUnassigned;
    }
  };

  const priorityTag = (p: PriorityLevel) => {
    if (p === 'gaming') return isRtl ? 'ألعاب P1' : 'Gaming P1';
    if (p === 'calls') return isRtl ? 'مكالمات P2' : 'Calls P2';
    if (p === 'background') return isRtl ? 'خلفية P8' : 'Bg P8';
    return isRtl ? 'عادي P5' : 'Normal P5';
  };

  return (
    <div className="flex flex-col gap-3.5 p-4 pb-6 relative">
      {wolToast && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          {wolToast}
        </div>
      )}

      {store.unknownDevices.length > 0 && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs font-semibold text-red-800 dark:text-red-200 truncate">
              {t.unknownAlertTitle} ({store.unknownDevices.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => openEditor(store.unknownDevices[0])}
            className="text-xs font-bold text-red-700 dark:text-red-300 underline whitespace-nowrap shrink-0"
          >
            {t.trustDevice}
          </button>
        </div>
      )}

      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute start-3.5 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchDevices}
          className="w-full h-11 ps-10 pe-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
        />
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 overflow-x-auto">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`flex-1 min-h-[34px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              filter === item.id
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredDevices.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {t.noDevicesFound}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredDevices.map((device) => {
            const pct = Math.min(
              100,
              Math.round(
                (device.quotaUsedGb / Math.max(1, device.quotaLimitGb)) * 100
              )
            );
            const barCls =
              pct >= 100
                ? 'bg-red-600'
                : pct >= 80
                  ? 'bg-amber-500'
                  : 'bg-teal-600 dark:bg-teal-500';
            return (
              <div
                key={device.id}
                className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        device.isBlocked
                          ? 'bg-red-50 dark:bg-red-950/40'
                          : 'bg-teal-50 dark:bg-teal-950/40'
                      }`}
                    >
                      <DeviceIcon
                        type={device.deviceType}
                        blocked={device.isBlocked}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {device.alias}
                        </p>
                        {device.isUnknown && (
                          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                            · {t.unknownBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                        {device.ip} · {device.band} · {groupLabel(device.groupId)} ·{' '}
                        {priorityTag(device.priority)}
                      </p>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    {device.isBlocked ? (
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        {t.blockedLabel}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end font-mono tabular-nums">
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                          ↓ {device.downloadMbps.toFixed(1)} Mbps
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          ↑ {device.uploadMbps.toFixed(1)} Mbps
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-Device Exact Daily + Monthly Consumption Strip */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-mono tabular-nums">
                      {isRtl ? 'النهاردة:' : 'Today:'}{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {device.todayUsedGb.toFixed(2)} GB
                      </strong>
                    </span>
                    <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
                      {device.speedLimitEnabled
                        ? `${device.downloadLimitMbps}M${device.burstEnabled ? '+B' : ''} · `
                        : ''}
                      {device.quotaUsedGb.toFixed(1)}/{device.quotaLimitGb} GB ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barCls}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => openEditor(device)}
                    className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{t.deviceSettings}</span>
                  </button>
                  {device.canWakeOnLan && (
                    <button
                      type="button"
                      onClick={() => handleWake(device)}
                      title={t.wakeOnLanBtn}
                      aria-label={t.wakeOnLanBtn}
                      className="min-h-[40px] px-3 rounded-xl border border-sky-200 dark:border-sky-900/70 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>WoL</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => store.toggleBlockDevice(device.id)}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                      device.isBlocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'border border-red-200 dark:border-red-900/70 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{device.isBlocked ? t.unblockDevice : t.blockNow}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet Modal for MikroTik Simple Queue / Priority / Quota / Auto-Throttle */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 max-h-[88vh] overflow-y-auto">
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t.deviceSettings}
                </h3>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {editingDevice.ip} · {editingDevice.mac}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t.cancel}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditor} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.deviceAlias}
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.deviceGroup}
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value as DeviceGroupId)}
                    className="h-11 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="family">{t.groupFamily}</option>
                    <option value="kids">{t.groupKids}</option>
                    <option value="guests">{t.groupGuests}</option>
                    <option value="unassigned">{t.groupUnassigned}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.priorityLabel}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="h-11 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="gaming">{t.priorityGaming}</option>
                    <option value="calls">{t.priorityCalls}</option>
                    <option value="normal">{t.priorityNormal}</option>
                    <option value="background">{t.priorityBackground}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center justify-between cursor-pointer min-h-[36px]">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t.enableSpeedLimit}
                  </span>
                  <input
                    type="checkbox"
                    checked={speedEnabled}
                    onChange={(e) => setSpeedEnabled(e.target.checked)}
                    className="w-5 h-5 accent-teal-600"
                  />
                </label>

                {speedEnabled && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          {t.downloadLimit}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                          {downLimit} Mbps ({downLimit * 1024} Kbps)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={downLimit}
                        onChange={(e) => setDownLimit(Number(e.target.value))}
                        className="w-full accent-teal-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          {t.uploadLimit}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                          {upLimit} Mbps
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={40}
                        value={upLimit}
                        onChange={(e) => setUpLimit(Number(e.target.value))}
                        className="w-full accent-teal-600"
                      />
                    </div>

                    <label className="flex items-center justify-between cursor-pointer min-h-[34px]">
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {t.burstToggle}
                      </span>
                      <input
                        type="checkbox"
                        checked={burstEnabled}
                        onChange={(e) => setBurstEnabled(e.target.checked)}
                        className="w-4 h-4 accent-teal-600"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {t.dataQuotaGb}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                    {quotaGb} GB
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={200}
                  step={1}
                  value={quotaGb}
                  onChange={(e) => setQuotaGb(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <label className="flex items-center justify-between cursor-pointer min-h-[36px]">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t.autoBlockExceed}
                  </span>
                  <input
                    type="checkbox"
                    checked={autoBlock}
                    onChange={(e) => setAutoBlock(e.target.checked)}
                    className="w-5 h-5 accent-teal-600"
                  />
                </label>

                {autoBlock && (
                  <div className="flex flex-col gap-1.5 ps-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="quota_action"
                        checked={quotaAction === 'throttle_1m'}
                        onChange={() => setQuotaAction('throttle_1m')}
                        className="accent-teal-600"
                      />
                      <span>{t.quotaActionThrottle}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="quota_action"
                        checked={quotaAction === 'block'}
                        onChange={() => setQuotaAction('block')}
                        className="accent-teal-600"
                      />
                      <span>{t.quotaActionBlock}</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
