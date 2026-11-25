import React, { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Shield,
  Trash2,
  Wifi,
} from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';
import { DeviceGroupId, DnsPresetId, WifiEncryption } from '../../types/router';
import { WifiQrCard } from './WifiQrCard';

interface Props {
  store: NetPulseStore;
}

type ToolSubTab = 'wifi' | 'diagnostics' | 'security';

export const ToolsTab: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';
  const caps = store.activeDriverSpec.capabilities;

  const [subTab, setSubTab] = useState<ToolSubTab>('wifi');
  const [showMainPwd, setShowMainPwd] = useState(false);
  const [showGuestPwd, setShowGuestPwd] = useState(false);
  const [channelBand, setChannelBand] = useState<'2.4GHz' | '5GHz'>('2.4GHz');
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);

  // Add schedule form state
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState<DeviceGroupId>('kids');
  const [newAction, setNewAction] = useState<'block' | 'throttle'>('block');
  const [newStart, setNewStart] = useState('21:30');
  const [newEnd, setNewEnd] = useState('06:30');

  const bandChannels = useMemo(
    () => store.channels.filter((c) => c.band === channelBand),
    [store.channels, channelBand]
  );

  const recommendedChannel = useMemo(() => {
    return [...bandChannels].sort(
      (a, b) => a.congestionPct - b.congestionPct
    )[0];
  }, [bandChannels]);

  const activeChannel =
    channelBand === '2.4GHz'
      ? store.mainWifi.channel24
      : store.mainWifi.channel5;

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    store.addSchedule({
      titleAr: newTitle.trim(),
      titleEn: newTitle.trim(),
      targetGroup: newGroup,
      action: newAction,
      throttleMbps: newAction === 'throttle' ? 4 : undefined,
      startTime: newStart,
      endTime: newEnd,
      daysLabelAr: 'يومياً',
      daysLabelEn: 'Daily',
      enabled: true,
    });
    setNewTitle('');
    setShowAddSchedule(false);
  };

  const renderPingBlock = (res: typeof store.pingResults.gateway) => {
    const maxSample = Math.max(30, ...res.samplesMs);
    return (
      <div className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {isRtl ? res.labelAr : res.labelEn}
            </span>
            <span className="mx-1.5 text-slate-400">·</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {res.host}
            </span>
          </div>
          <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
            {res.status === 'running' ? '...' : `${res.avgMs} ms`}
          </span>
        </div>

        <div className="flex items-end gap-1.5 h-8">
          {res.samplesMs.map((ms, idx) => {
            const hPct = Math.max(18, Math.min(100, (ms / maxSample) * 100));
            return (
              <div
                key={idx}
                className="flex-1 h-full flex items-end"
                title={`${ms} ms`}
              >
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    res.status === 'running'
                      ? 'bg-slate-300 dark:bg-slate-700 animate-pulse'
                      : 'bg-teal-600/80 dark:bg-teal-400/80'
                  }`}
                  style={{ height: `${hPct}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
          <span>
            {t.avgLabel}: {res.avgMs}ms
          </span>
          <span>
            {t.jitterLabel}: {res.jitterMs}ms
          </span>
          <span>
            {t.lossLabel}: {res.packetLossPct}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Segmented Tool Sub-Navigation */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setSubTab('wifi')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'wifi'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'الواي فاي و QR' : 'Wi-Fi & QR'}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('diagnostics')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'diagnostics'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'DNS والقنوات' : 'DNS & Ping'}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('security')}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'security'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'الحماية والجداول' : 'Lock & Rules'}
        </button>
      </div>

      {/* TAB 1: Main Wi-Fi Settings + QR Sharing + Guest Wi-Fi */}
      {subTab === 'wifi' && (
        <>
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Wifi className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.wifiSettingsTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.wifiSettingsDesc}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t.mainWifiSsid}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={store.mainWifi.ssid}
                  onChange={(e) =>
                    store.setMainWifi((p) => ({ ...p, ssid: e.target.value }))
                  }
                  className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t.guestPassword}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showMainPwd ? 'text' : 'password'}
                      dir="ltr"
                      value={store.mainWifi.password}
                      onChange={(e) =>
                        store.setMainWifi((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      className="w-full h-10 px-2.5 pe-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-xs text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMainPwd((v) => !v)}
                      className="absolute end-2 text-slate-500"
                      aria-label="Toggle Wi-Fi password"
                    >
                      {showMainPwd ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t.wifiEncryption}
                  </label>
                  <select
                    value={store.mainWifi.encryption}
                    onChange={(e) =>
                      store.setMainWifi((p) => ({
                        ...p,
                        encryption: e.target.value as WifiEncryption,
                      }))
                    }
                    className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="WPA3">WPA3</option>
                    <option value="WPA2/WPA3">WPA2/WPA3</option>
                    <option value="WPA2">WPA2</option>
                    <option value="WPA">WPA (Legacy)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] cursor-pointer text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.hideSsidToggle}
                </span>
                <input
                  type="checkbox"
                  checked={store.mainWifi.hiddenSsid}
                  onChange={(e) =>
                    store.setMainWifi((p) => ({
                      ...p,
                      hiddenSsid: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-teal-600"
                />
              </label>

              <label className="flex items-center justify-between min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] cursor-pointer text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.wpsToggle}
                </span>
                <input
                  type="checkbox"
                  checked={store.mainWifi.wpsEnabled}
                  onChange={(e) =>
                    store.setMainWifi((p) => ({
                      ...p,
                      wpsEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-teal-600"
                />
              </label>
            </div>

            {/* Scannable Wi-Fi QR Code */}
            <WifiQrCard store={store} />
          </section>

          {/* Guest Wi-Fi Card */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Wifi className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t.guestWifiTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {caps.supportsGuestWifi
                      ? t.guestWifiDesc
                      : t.unsupportedByRouter}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={store.guestWifi.enabled}
                onClick={() =>
                  store.setGuestWifi((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`w-12 h-7 rounded-full transition-colors p-0.5 shrink-0 ${
                  store.guestWifi.enabled
                    ? 'bg-teal-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                    store.guestWifi.enabled
                      ? isRtl
                        ? '-translate-x-5'
                        : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {store.guestWifi.enabled && (
              <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t.guestSsid}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={store.guestWifi.ssid}
                      onChange={(e) =>
                        store.setGuestWifi((p) => ({
                          ...p,
                          ssid: e.target.value,
                        }))
                      }
                      className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t.guestPassword}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showGuestPwd ? 'text' : 'password'}
                        dir="ltr"
                        value={store.guestWifi.password}
                        onChange={(e) =>
                          store.setGuestWifi((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        className="w-full h-10 px-2.5 pe-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-xs text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGuestPwd((v) => !v)}
                        className="absolute end-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        aria-label="Toggle guest password"
                      >
                        {showGuestPwd ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {t.guestSpeedCap}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={2}
                      max={30}
                      value={store.guestWifi.bandwidthCapMbps}
                      onChange={(e) =>
                        store.setGuestWifi((p) => ({
                          ...p,
                          bandwidthCapMbps: Number(e.target.value),
                        }))
                      }
                      className="w-28 accent-teal-600"
                    />
                    <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400 w-14 text-end">
                      {store.guestWifi.bandwidthCapMbps} Mbps
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* MikroTik Hotspot-Style Guest Vouchers */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.vouchersTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.vouchersDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  store.createGuestVoucher({
                    labelAr: 'كارت 3 ساعات · 3 GB',
                    labelEn: '3h Pass · 3 GB',
                    durationMinutes: 180,
                    dataLimitGb: 3,
                    speedLimitMbps: 6,
                  })
                }
                className="min-h-[38px] px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.createVoucher}</span>
              </button>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {store.guestVouchers.map((v) => (
                <div
                  key={v.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold tracking-wider text-teal-700 dark:text-teal-400">
                      {v.code}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {isRtl ? v.labelAr : v.labelEn} · {v.dataLimitGb} GB ·{' '}
                      {v.speedLimitMbps} Mbps
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => store.deleteGuestVoucher(v.id)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                    aria-label="Delete voucher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* TAB 2: Safe DNS + Channel Analyzer + Ping Diagnostics */}
      {subTab === 'diagnostics' && (
        <>
          {/* Safe DNS / Family Shield */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.dnsTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.dnsDesc}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {(
                [
                  { id: 'isp_default', label: t.dnsIsp },
                  { id: 'cloudflare_family', label: t.dnsCloudflare },
                  { id: 'adguard_family', label: t.dnsAdguard },
                  { id: 'opendns_family', label: t.dnsOpendns },
                  { id: 'custom', label: t.dnsCustom },
                ] as { id: DnsPresetId; label: string }[]
              ).map((preset) => (
                <label
                  key={preset.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    store.dnsConfig.preset === preset.id
                      ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 font-semibold text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="dns_preset"
                    checked={store.dnsConfig.preset === preset.id}
                    onChange={() => store.applyDnsPreset(preset.id)}
                    className="accent-teal-600"
                  />
                  <span>{preset.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.primaryDns}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={store.dnsConfig.primaryDns}
                  onChange={(e) =>
                    store.setDnsConfig({
                      ...store.dnsConfig,
                      preset: 'custom',
                      primaryDns: e.target.value,
                    })
                  }
                  className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.secondaryDns}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={store.dnsConfig.secondaryDns}
                  onChange={(e) =>
                    store.setDnsConfig({
                      ...store.dnsConfig,
                      preset: 'custom',
                      secondaryDns: e.target.value,
                    })
                  }
                  className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </section>

          {/* Wi-Fi Channel Analyzer */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.channelTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={store.rescanChannels}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Rescan Wi-Fi channels"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(['2.4GHz', '5GHz'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setChannelBand(b)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-semibold ${
                      channelBand === b
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {t.currentChannel}: <strong>CH {activeChannel}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {bandChannels.map((ch) => {
                const isBest = ch.channel === recommendedChannel?.channel;
                const isActive = ch.channel === activeChannel;
                return (
                  <div
                    key={ch.channel}
                    className="flex items-center gap-2.5 text-xs"
                  >
                    <span className="font-mono tabular-nums w-12 font-semibold text-slate-700 dark:text-slate-300">
                      CH {ch.channel}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ch.congestionPct >= 70
                            ? 'bg-red-500'
                            : ch.congestionPct >= 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ch.congestionPct}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500 w-16 text-end">
                      {ch.congestionPct}%{isActive ? ' ★' : isBest ? ' ✓' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {recommendedChannel && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {t.recommendedChannel}:{' '}
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    CH {recommendedChannel.channel}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    store.applyRecommendedChannel(
                      channelBand,
                      recommendedChannel.channel
                    )
                  }
                  disabled={activeChannel === recommendedChannel.channel}
                  className="min-h-[36px] px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                >
                  {t.applyRecommended}
                </button>
              </div>
            )}
          </section>

          {/* Ping & Latency Check Card */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.pingTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={store.runPingDiagnostics}
                disabled={store.pingResults.gateway.status === 'running'}
                className="min-h-[38px] px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {store.pingResults.gateway.status === 'running'
                  ? t.pingRunning
                  : t.runPing}
              </button>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {renderPingBlock(store.pingResults.gateway)}
              {renderPingBlock(store.pingResults.internet)}
            </div>
          </section>
        </>
      )}

      {/* TAB 3: App Lock (Biometric/PIN) + Internet Schedules + Router Reboot */}
      {subTab === 'security' && (
        <>
          {/* Biometric / PIN App Lock */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Fingerprint className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t.appLockTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.appLockDesc}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={store.appLock.enabled}
                onChange={(e) =>
                  store.setAppLock((p) => ({ ...p, enabled: e.target.checked }))
                }
                className="w-5 h-5 accent-teal-600 mt-1 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.appLockPinLabel}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={4}
                  value={store.appLock.pin}
                  onChange={(e) =>
                    store.setAppLock((p) => ({
                      ...p,
                      pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => store.setIsAppLocked(true)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{t.testLockNow}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Internet & Device Schedules Card */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.schedulesTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSchedule((v) => !v)}
                className="min-h-[36px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{t.addSchedule}</span>
              </button>
            </div>

            {showAddSchedule && (
              <form
                onSubmit={handleCreateSchedule}
                className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800"
              >
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.scheduleTitlePlaceholder}
                  className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs text-slate-900 dark:text-slate-100"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newGroup}
                    onChange={(e) =>
                      setNewGroup(e.target.value as DeviceGroupId)
                    }
                    className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="kids">{t.groupKids}</option>
                    <option value="guests">{t.groupGuests}</option>
                    <option value="family">{t.groupFamily}</option>
                  </select>
                  <select
                    value={newAction}
                    onChange={(e) =>
                      setNewAction(e.target.value as 'block' | 'throttle')
                    }
                    className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="block">{t.actionBlock}</option>
                    <option value="throttle">{t.actionThrottle} (4M)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] font-mono text-xs text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] font-mono text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  {t.saveChanges}
                </button>
              </form>
            )}

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {store.schedules.map((sch) => (
                <div
                  key={sch.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {isRtl ? sch.titleAr : sch.titleEn}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {sch.startTime}–{sch.endTime} ·{' '}
                      {isRtl ? sch.daysLabelAr : sch.daysLabelEn} ·{' '}
                      {sch.action === 'block'
                        ? t.actionBlock
                        : `${t.actionThrottle} ${sch.throttleMbps ?? 4}M`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="checkbox"
                      checked={sch.enabled}
                      onChange={() => store.toggleSchedule(sch.id)}
                      className="w-4 h-4 accent-teal-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => store.deleteSchedule(sch.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Delete schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Router Reboot Card */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.rebootTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.rebootDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmReboot(true)}
              className="min-h-[42px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/70 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Power className="w-4 h-4" />
              <span>{t.rebootButton}</span>
            </button>
          </section>
        </>
      )}

      {/* Reboot Confirmation Modal */}
      {confirmReboot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t.rebootConfirmTitle}
            </h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t.rebootConfirmDesc}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmReboot(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmReboot(false);
                  store.triggerReboot();
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                {t.rebootButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
