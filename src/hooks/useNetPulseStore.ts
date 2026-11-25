import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_APP_LOCK,
  INITIAL_BILLING_CYCLE,
  INITIAL_CHANNELS,
  INITIAL_DEVICES,
  INITIAL_DNS_CONFIG,
  INITIAL_GROUP_POLICIES,
  INITIAL_GUEST_VOUCHERS,
  INITIAL_GUEST_WIFI,
  INITIAL_MAIN_WIFI,
  INITIAL_PROFILES,
  INITIAL_SCHEDULES,
  INITIAL_SYSTEM_HEALTH,
  INITIAL_VDSL_STATS,
  ROUTER_DRIVER_SPECS,
} from '../data/routerDriversData';
import {
  AppLocale,
  AppLockConfig,
  AppTheme,
  BillingCycleConfig,
  ChannelMetric,
  ConnectedDevice,
  DeviceGroupId,
  DnsConfig,
  DnsPresetId,
  GroupQuotaPolicy,
  GuestVoucher,
  GuestWifiConfig,
  LocalNotificationItem,
  MainWifiConfig,
  MobileTab,
  PingTargetResult,
  RouterDriverType,
  RouterProfile,
  RouterSystemHealth,
  ScheduleRule,
  VdslLineStats,
} from '../types/router';

const STORAGE_KEY_V3 = 'mikrobox_local_hive_v3';

export interface IntrusionEvent {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  time: string;
  action: 'auto_blocked' | 'manual_blocked' | 'detected';
}

interface PersistedState {
  profiles: RouterProfile[];
  devices: ConnectedDevice[];
  groups: GroupQuotaPolicy[];
  mainWifi: MainWifiConfig;
  guestWifi: GuestWifiConfig;
  guestVouchers: GuestVoucher[];
  dnsConfig: DnsConfig;
  billingCycle: BillingCycleConfig;
  appLock: AppLockConfig;
  schedules: ScheduleRule[];
  autoBlockIntruders?: boolean;
  intrusionLogs?: IntrusionEvent[];
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V3);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

const DNS_PRESET_MAP: Record<
  Exclude<DnsPresetId, 'custom'>,
  { primary: string; secondary: string }
> = {
  isp_default: { primary: '163.121.128.134', secondary: '163.121.128.135' },
  cloudflare_family: { primary: '1.1.1.3', secondary: '1.0.0.3' },
  adguard_family: { primary: '94.140.14.15', secondary: '94.140.15.16' },
  opendns_family: { primary: '208.67.222.123', secondary: '208.67.220.123' },
};

export function useNetPulseStore() {
  const persisted = useMemo(() => loadPersisted(), []);

  const [locale, setLocale] = useState<AppLocale>('ar');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const [profiles, setProfiles] = useState<RouterProfile[]>(
    persisted?.profiles ?? INITIAL_PROFILES
  );
  const [activeProfileId, setActiveProfileId] = useState<string>(
    (persisted?.profiles ?? INITIAL_PROFILES)[0]?.id ?? 'prof_mikrotik_main'
  );

  const [devices, setDevices] = useState<ConnectedDevice[]>(
    persisted?.devices ?? INITIAL_DEVICES
  );
  const [groups, setGroups] = useState<GroupQuotaPolicy[]>(
    persisted?.groups ?? INITIAL_GROUP_POLICIES
  );
  const [mainWifi, setMainWifi] = useState<MainWifiConfig>(
    persisted?.mainWifi ?? INITIAL_MAIN_WIFI
  );
  const [guestWifi, setGuestWifi] = useState<GuestWifiConfig>(
    persisted?.guestWifi ?? INITIAL_GUEST_WIFI
  );
  const [guestVouchers, setGuestVouchers] = useState<GuestVoucher[]>(
    persisted?.guestVouchers ?? INITIAL_GUEST_VOUCHERS
  );
  const [dnsConfig, setDnsConfig] = useState<DnsConfig>(
    persisted?.dnsConfig ?? INITIAL_DNS_CONFIG
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycleConfig>(
    persisted?.billingCycle ?? INITIAL_BILLING_CYCLE
  );
  const [appLock, setAppLock] = useState<AppLockConfig>(
    persisted?.appLock ?? INITIAL_APP_LOCK
  );
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<ScheduleRule[]>(
    persisted?.schedules ?? INITIAL_SCHEDULES
  );
  const [autoBlockIntruders, setAutoBlockIntruders] = useState<boolean>(
    persisted?.autoBlockIntruders ?? false
  );
  const [intrusionLogs, setIntrusionLogs] = useState<IntrusionEvent[]>(
    persisted?.intrusionLogs ?? [
      {
        id: 'intr_init_1',
        hostname: 'android-8f2c91a',
        ip: '192.168.88.78',
        mac: '9E:41:2C:7F:B4:19',
        time: '16:54',
        action: 'detected',
      },
    ]
  );

  const [systemHealth, setSystemHealth] = useState<RouterSystemHealth>(
    INITIAL_SYSTEM_HEALTH
  );
  const [vdslStats, setVdslStats] = useState<VdslLineStats>(INITIAL_VDSL_STATS);
  const [channels, setChannels] = useState<ChannelMetric[]>(INITIAL_CHANNELS);

  const [notifications, setNotifications] = useState<LocalNotificationItem[]>([
    {
      id: 'notif_init_1',
      type: 'unknown',
      titleAr: 'رادار المتطفلين: جهاز غريب دخل الواي فاي',
      titleEn: 'Intruder Radar: Unknown device joined',
      bodyAr: 'android-8f2c91a (192.168.88.78) دخل على 2.4GHz — تقدر تطرده دلوقتي.',
      bodyEn: 'android-8f2c91a (192.168.88.78) joined on 2.4GHz.',
      time: '16:54',
      read: false,
    },
    {
      id: 'notif_init_2',
      type: 'warning80',
      titleAr: 'تحذير 80% — تابلت عمر',
      titleEn: '80% Quota Warning — iPad Air Kids',
      bodyAr: 'سحب 17.2 GB من أصل 20 GB الشهر ده.',
      bodyEn: 'iPad Air Kids reached 17.2 GB of 20 GB.',
      time: '16:40',
      read: false,
    },
  ]);

  const [bandwidthHistory, setBandwidthHistory] = useState<number[]>([
    54, 62, 58, 69, 73, 64, 70, 68, 75, 67, 71, 69,
  ]);
  const [rebootCountdown, setRebootCountdown] = useState<number | null>(null);

  const [pingResults, setPingResults] = useState<{
    gateway: PingTargetResult;
    internet: PingTargetResult;
  }>({
    gateway: {
      host: '192.168.88.1',
      labelAr: 'بوابة الراوتر',
      labelEn: 'Router Gateway',
      samplesMs: [1.8, 2.1, 1.7, 2.3, 1.9],
      avgMs: 2.0,
      minMs: 1.7,
      maxMs: 2.3,
      jitterMs: 0.3,
      packetLossPct: 0,
      status: 'done',
    },
    internet: {
      host: '1.1.1.1',
      labelAr: 'الإنترنت (Cloudflare)',
      labelEn: 'Internet (Cloudflare)',
      samplesMs: [21.4, 23.1, 20.8, 24.5, 22.2],
      avgMs: 22.4,
      minMs: 20.8,
      maxMs: 24.5,
      jitterMs: 1.4,
      packetLossPct: 0,
      status: 'done',
    },
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        profiles,
        devices,
        groups,
        mainWifi,
        guestWifi,
        guestVouchers,
        dnsConfig,
        billingCycle,
        appLock,
        schedules,
        autoBlockIntruders,
        intrusionLogs,
      };
      localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(payload));
    } catch {
      // Ignore localStorage quota issues
    }
  }, [
    profiles,
    devices,
    groups,
    mainWifi,
    guestWifi,
    guestVouchers,
    dnsConfig,
    billingCycle,
    appLock,
    schedules,
    autoBlockIntruders,
    intrusionLogs,
  ]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? profiles[0],
    [profiles, activeProfileId]
  );

  const activeDriverSpec = useMemo(
    () =>
      ROUTER_DRIVER_SPECS.find((d) => d.id === activeProfile?.driverType) ??
      ROUTER_DRIVER_SPECS[0],
    [activeProfile]
  );

  const pushNotification = useCallback(
    (item: Omit<LocalNotificationItem, 'id' | 'time' | 'read'>) => {
      const now = new Date().toTimeString().slice(0, 5);
      setNotifications((prev) => [
        {
          ...item,
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          time: now,
          read: false,
        },
        ...prev.slice(0, 14),
      ]);
    },
    []
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Live 2.2s polling loop simulating RouterDriver.fetchConnectedDevices() + RouterHealth
  useEffect(() => {
    if (!isConnected || rebootCountdown !== null) return;
    const timer = window.setInterval(() => {
      setDevices((prev) => {
        let totalDown = 0;
        const next = prev.map((d) => {
          if (d.isBlocked) {
            return { ...d, downloadMbps: 0, uploadMbps: 0 };
          }
          const maxDown = d.speedLimitEnabled ? d.downloadLimitMbps : 38;
          const maxUp = d.speedLimitEnabled ? d.uploadLimitMbps : 11;
          const deltaDown = (Math.random() - 0.48) * 3.2;
          const deltaUp = (Math.random() - 0.5) * 0.9;
          const nextDown = Number(
            Math.max(0.3, Math.min(maxDown, d.downloadMbps + deltaDown)).toFixed(1)
          );
          const nextUp = Number(
            Math.max(0.1, Math.min(maxUp, d.uploadMbps + deltaUp)).toFixed(1)
          );
          totalDown += nextDown;
          const deltaGb = (nextDown * 2) / 8192;
          const nextUsed = Number((d.quotaUsedGb + deltaGb).toFixed(3));
          const nextToday = Number((d.todayUsedGb + deltaGb).toFixed(3));
          const exceeded = d.quotaLimitGb > 0 && nextUsed >= d.quotaLimitGb;
          const shouldAutoBlock =
            exceeded && d.autoBlockOnQuotaExceeded && d.quotaAction === 'block';
          const shouldAutoThrottle =
            exceeded &&
            d.autoBlockOnQuotaExceeded &&
            d.quotaAction === 'throttle_1m';

          return {
            ...d,
            downloadMbps: shouldAutoBlock
              ? 0
              : shouldAutoThrottle
                ? Math.min(1, nextDown)
                : nextDown,
            uploadMbps: shouldAutoBlock
              ? 0
              : shouldAutoThrottle
                ? Math.min(0.4, nextUp)
                : nextUp,
            speedLimitEnabled: shouldAutoThrottle ? true : d.speedLimitEnabled,
            downloadLimitMbps: shouldAutoThrottle ? 1 : d.downloadLimitMbps,
            todayUsedGb: nextToday,
            quotaUsedGb: nextUsed,
            isBlocked: shouldAutoBlock ? true : d.isBlocked,
          };
        });
        setBandwidthHistory((hist) => [
          ...hist.slice(1),
          Number(totalDown.toFixed(1)),
        ]);
        return next;
      });
      setSystemHealth((prev) => ({
        ...prev,
        cpuLoadPct: Math.max(
          8,
          Math.min(68, prev.cpuLoadPct + Math.round((Math.random() - 0.5) * 6))
        ),
        ramUsedPct: Math.max(
          28,
          Math.min(78, prev.ramUsedPct + Math.round((Math.random() - 0.5) * 2))
        ),
      }));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isConnected, rebootCountdown]);

  useEffect(() => {
    if (rebootCountdown === null) return;
    if (rebootCountdown <= 0) {
      setRebootCountdown(null);
      return;
    }
    const id = window.setTimeout(() => {
      setRebootCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [rebootCountdown]);

  const connectWithCredentials = useCallback(
    async (params: {
      gatewayIp: string;
      username: string;
      password: string;
      driverType: RouterDriverType;
      saveProfile: boolean;
      label?: string;
    }): Promise<boolean> => {
      setIsAuthenticating(true);
      await new Promise((r) => setTimeout(r, 500));
      setIsAuthenticating(false);

      if (
        !params.gatewayIp.trim() ||
        !params.username.trim() ||
        !params.password.trim()
      ) {
        return false;
      }

      const spec =
        ROUTER_DRIVER_SPECS.find((s) => s.id === params.driverType) ??
        ROUTER_DRIVER_SPECS[0];

      const isDefaultPwd =
        params.password.toLowerCase() === 'admin' ||
        params.password === '1234' ||
        params.password === 'admin1234';

      const existing = profiles.find(
        (p) =>
          p.gatewayIp === params.gatewayIp.trim() &&
          p.driverType === params.driverType &&
          p.username === params.username.trim()
      );

      if (existing) {
        setActiveProfileId(existing.id);
      } else {
        const newProfile: RouterProfile = {
          id: `prof_${Date.now()}`,
          label:
            params.label?.trim() ||
            (locale === 'ar' ? spec.nameAr : spec.nameEn),
          gatewayIp: params.gatewayIp.trim(),
          username: params.username.trim(),
          passwordMasked: '•'.repeat(Math.max(8, params.password.length)),
          driverType: params.driverType,
          modelName: spec.vendorFamily,
          lastConnectedAt: new Date()
            .toISOString()
            .slice(0, 16)
            .replace('T', ' '),
          isSaved: params.saveProfile,
          usesDefaultCredentials: isDefaultPwd,
        };
        if (params.saveProfile) {
          setProfiles((prev) => [newProfile, ...prev]);
        } else {
          setProfiles((prev) => [
            newProfile,
            ...prev.filter((item) => item.isSaved),
          ]);
        }
        setActiveProfileId(newProfile.id);
      }

      setPingResults((prev) => ({
        ...prev,
        gateway: { ...prev.gateway, host: params.gatewayIp.trim() },
      }));
      setIsConnected(true);
      setActiveTab('home');
      return true;
    },
    [locale, profiles]
  );

  const switchDriverLive = useCallback(
    (driverType: RouterDriverType) => {
      const spec =
        ROUTER_DRIVER_SPECS.find((s) => s.id === driverType) ??
        ROUTER_DRIVER_SPECS[0];
      const existing = profiles.find((p) => p.driverType === driverType);
      if (existing) {
        setActiveProfileId(existing.id);
      } else {
        const created: RouterProfile = {
          id: `prof_${driverType}`,
          label: locale === 'ar' ? spec.nameAr : spec.nameEn,
          gatewayIp: spec.defaultGateway,
          username: 'admin',
          passwordMasked: '••••••••',
          driverType,
          modelName: spec.vendorFamily,
          lastConnectedAt: new Date()
            .toISOString()
            .slice(0, 16)
            .replace('T', ' '),
          isSaved: true,
          usesDefaultCredentials: false,
        };
        setProfiles((prev) => [created, ...prev]);
        setActiveProfileId(created.id);
      }
      setIsConnected(true);
    },
    [locale, profiles]
  );

  const rotateDefaultAdminPassword = useCallback(() => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId
          ? {
              ...p,
              usesDefaultCredentials: false,
              passwordMasked: '••••••••••••',
            }
          : p
      )
    );
    pushNotification({
      type: 'security',
      titleAr: 'تم تأمين كلمة سر الراوتر',
      titleEn: 'Admin Password Secured',
      bodyAr: 'تم تحديث كلمة سر الأدمن وحفظها مشفرة على تليفونك.',
      bodyEn: 'Admin password updated and encrypted on-device.',
    });
  }, [activeProfileId, pushNotification]);

  const toggleBlockDevice = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== deviceId) return d;
        const nextBlocked = !d.isBlocked;
        if (nextBlocked && d.isUnknown) {
          setIntrusionLogs((logs) => [
            {
              id: `intr_${Date.now()}`,
              hostname: d.hostname,
              ip: d.ip,
              mac: d.mac,
              time: new Date().toTimeString().slice(0, 5),
              action: 'manual_blocked',
            },
            ...logs.slice(0, 11),
          ]);
        }
        return {
          ...d,
          isBlocked: nextBlocked,
          downloadMbps: nextBlocked ? 0 : 2.8,
          uploadMbps: nextBlocked ? 0 : 0.6,
        };
      })
    );
  }, []);

  const blockAllIntruders = useCallback(() => {
    const now = new Date().toTimeString().slice(0, 5);
    setDevices((prev) => {
      const intruders = prev.filter((d) => d.isUnknown && !d.isBlocked);
      if (intruders.length > 0) {
        setIntrusionLogs((logs) => [
          ...intruders.map((d) => ({
            id: `intr_${Date.now()}_${d.id}`,
            hostname: d.hostname,
            ip: d.ip,
            mac: d.mac,
            time: now,
            action: 'manual_blocked' as const,
          })),
          ...logs.slice(0, 10),
        ]);
        pushNotification({
          type: 'security',
          titleAr: `تم طرد وحظر ${intruders.length} جهاز مخترق`,
          titleEn: `Blocked ${intruders.length} Intruder Device(s)`,
          bodyAr: 'تم حظر عناوين الـ MAC الخاصة بهم فوراً من الشبكة.',
          bodyEn: 'Their MAC addresses were immediately blocked on the firewall.',
        });
      }
      return prev.map((d) =>
        d.isUnknown
          ? { ...d, isBlocked: true, downloadMbps: 0, uploadMbps: 0 }
          : d
      );
    });
  }, [pushNotification]);

  const distributeQuotaEqually = useCallback(() => {
    setDevices((prev) => {
      const trusted = prev.filter((d) => !d.isUnknown && !d.isBlocked);
      const count = Math.max(1, trusted.length);
      const perDeviceGb = Math.max(
        2,
        Math.floor(billingCycle.monthlyPackageGb / count)
      );
      return prev.map((d) =>
        !d.isUnknown && !d.isBlocked ? { ...d, quotaLimitGb: perDeviceGb } : d
      );
    });
    pushNotification({
      type: 'security',
      titleAr: 'تم توزيع الباقة بالتساوي على المشتركين',
      titleEn: 'Monthly Pool Distributed Equally',
      bodyAr: `تم تقسيم ${billingCycle.monthlyPackageGb} GB بالتساوي على كل الأجهزة المعتمدة.`,
      bodyEn: `Split ${billingCycle.monthlyPackageGb} GB evenly across trusted subscribers.`,
    });
  }, [billingCycle.monthlyPackageGb, pushNotification]);

  const trustUnknownDevice = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, isUnknown: false, isBlocked: false } : d
      )
    );
  }, []);

  const updateDevice = useCallback(
    (deviceId: string, patch: Partial<ConnectedDevice>) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, ...patch } : d))
      );
    },
    []
  );

  const sendWakeOnLan = useCallback(
    (device: ConnectedDevice) => {
      pushNotification({
        type: 'security',
        titleAr: `Wake-on-LAN — ${device.alias}`,
        titleEn: `Wake-on-LAN — ${device.alias}`,
        bodyAr: `اتبعتت إشارة تشغيل سحرية (UDP Port 9) للعنوان ${device.mac}.`,
        bodyEn: `Sent 102-byte Magic Packet over UDP:9 to ${device.mac}.`,
      });
    },
    [pushNotification]
  );

  const createGuestVoucher = useCallback(
    (params: {
      labelAr: string;
      labelEn: string;
      durationMinutes: number;
      dataLimitGb: number;
      speedLimitMbps: number;
    }) => {
      const num = Math.floor(1000 + Math.random() * 8999);
      const voucher: GuestVoucher = {
        id: `vch_${Date.now()}`,
        code: `MBX-${num}`,
        labelAr: params.labelAr,
        labelEn: params.labelEn,
        durationMinutes: params.durationMinutes,
        dataLimitGb: params.dataLimitGb,
        speedLimitMbps: params.speedLimitMbps,
        createdAt: new Date().toTimeString().slice(0, 5),
        active: true,
      };
      setGuestVouchers((prev) => [voucher, ...prev]);
    },
    []
  );

  const deleteGuestVoucher = useCallback((id: string) => {
    setGuestVouchers((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const resetDeviceQuota = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              todayUsedGb: 0,
              quotaUsedGb: 0,
              isBlocked: false,
              downloadMbps: 3.2,
              uploadMbps: 0.7,
            }
          : d
      )
    );
  }, []);

  const updateGroupPolicy = useCallback(
    (
      groupId: Exclude<DeviceGroupId, 'unassigned'>,
      patch: Partial<GroupQuotaPolicy>
    ) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g))
      );
      if (
        patch.speedLimitEnabled !== undefined ||
        patch.downloadLimitMbps !== undefined ||
        patch.autoBlockOnQuotaExceeded !== undefined
      ) {
        setDevices((prev) =>
          prev.map((d) =>
            d.groupId === groupId
              ? {
                  ...d,
                  speedLimitEnabled:
                    patch.speedLimitEnabled ?? d.speedLimitEnabled,
                  downloadLimitMbps:
                    patch.downloadLimitMbps ?? d.downloadLimitMbps,
                  uploadLimitMbps: patch.uploadLimitMbps ?? d.uploadLimitMbps,
                  autoBlockOnQuotaExceeded:
                    patch.autoBlockOnQuotaExceeded ??
                    d.autoBlockOnQuotaExceeded,
                }
              : d
          )
        );
      }
    },
    []
  );

  const applyDnsPreset = useCallback((preset: DnsPresetId) => {
    if (preset === 'custom') {
      setDnsConfig((prev) => ({ ...prev, preset: 'custom' }));
      return;
    }
    const pair = DNS_PRESET_MAP[preset];
    setDnsConfig({
      preset,
      primaryDns: pair.primary,
      secondaryDns: pair.secondary,
    });
  }, []);

  const refreshVdslStats = useCallback(() => {
    setVdslStats((prev) => ({
      ...prev,
      downstreamSnrDb: Number(
        Math.max(
          8.5,
          Math.min(18.5, prev.downstreamSnrDb + (Math.random() - 0.5) * 1.4)
        ).toFixed(1)
      ),
      actualDownMbps: Number(
        Math.max(
          28,
          Math.min(
            prev.maxAttainableDownMbps - 2,
            prev.actualDownMbps + (Math.random() - 0.5) * 1.8
          )
        ).toFixed(1)
      ),
      crcErrors: prev.crcErrors + (Math.random() > 0.7 ? 1 : 0),
    }));
  }, []);

  const rescanChannels = useCallback(() => {
    setChannels((prev) =>
      prev.map((ch) => ({
        ...ch,
        congestionPct: Math.max(
          8,
          Math.min(92, ch.congestionPct + Math.round((Math.random() - 0.5) * 16))
        ),
      }))
    );
  }, []);

  const applyRecommendedChannel = useCallback(
    (band: '2.4GHz' | '5GHz', channel: number) => {
      setMainWifi((prev) =>
        band === '2.4GHz'
          ? { ...prev, channel24: channel }
          : { ...prev, channel5: channel }
      );
    },
    []
  );

  const simulateUnknownDeviceJoin = useCallback(() => {
    const hex = () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    const id = `dev_unk_${Date.now()}`;
    const suffix = Math.floor(100 + Math.random() * 140);
    const hostname = `Redmi-Note-${suffix}`;
    const ip = `192.168.88.${suffix}`;
    const mac = `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
    const nowTime = new Date().toTimeString().slice(0, 5);
    const shouldQuarantine = autoBlockIntruders;
    const newClient: ConnectedDevice = {
      id,
      hostname,
      alias: `متطفل (${hostname})`,
      ip,
      mac,
      band: '2.4GHz',
      deviceType: 'phone',
      groupId: 'unassigned',
      downloadMbps: shouldQuarantine ? 0 : 5.4,
      uploadMbps: shouldQuarantine ? 0 : 0.9,
      isBlocked: shouldQuarantine,
      isUnknown: true,
      joinedAt: nowTime,
      speedLimitEnabled: false,
      downloadLimitMbps: 10,
      uploadLimitMbps: 3,
      priority: 'background',
      todayUsedGb: shouldQuarantine ? 0 : 0.12,
      quotaLimitGb: 10,
      quotaUsedGb: shouldQuarantine ? 0 : 0.12,
      autoBlockOnQuotaExceeded: true,
      quotaAction: 'block',
    };
    setDevices((prev) => [newClient, ...prev]);
    setIntrusionLogs((logs) => [
      {
        id: `intr_${Date.now()}`,
        hostname,
        ip,
        mac,
        time: nowTime,
        action: shouldQuarantine ? 'auto_blocked' : 'detected',
      },
      ...logs.slice(0, 11),
    ]);
    pushNotification({
      type: shouldQuarantine ? 'security' : 'unknown',
      titleAr: shouldQuarantine
        ? 'درع الاختراق: تم صد وحظر جهاز مخترق تلقائياً!'
        : 'رادار المتطفلين: جهاز غريب دخل الواي فاي!',
      titleEn: shouldQuarantine
        ? 'Intruder Shield: Auto-Blocked Unknown MAC!'
        : 'Intruder Radar: Unknown Device Joined',
      bodyAr: shouldQuarantine
        ? `تم حظر ${hostname} (${mac}) فوراً قبل سحب أي ميجابايت.`
        : `${hostname} (${ip}) دخل دلوقتي على 2.4GHz.`,
      bodyEn: shouldQuarantine
        ? `Blocked ${hostname} (${mac}) instantly via MAC firewall.`
        : `${hostname} (${ip}) just connected on 2.4GHz.`,
    });
  }, [autoBlockIntruders, pushNotification]);

  const simulateAdvanceTraffic = useCallback(() => {
    const triggeredAlerts: Omit<LocalNotificationItem, 'id' | 'time' | 'read'>[] = [];
    setDevices((prev) =>
      prev.map((d) => {
        if (d.isBlocked) return d;
        const added = d.groupId === 'kids' ? 2.8 : 2.1;
        const prevPct = d.quotaLimitGb > 0 ? d.quotaUsedGb / d.quotaLimitGb : 0;
        const nextUsed = Number((d.quotaUsedGb + added).toFixed(2));
        const nextToday = Number((d.todayUsedGb + added).toFixed(2));
        const nextPct = d.quotaLimitGb > 0 ? nextUsed / d.quotaLimitGb : 0;
        const reached = d.quotaLimitGb > 0 && nextUsed >= d.quotaLimitGb;
        const autoBlocked =
          reached && d.autoBlockOnQuotaExceeded && d.quotaAction === 'block';
        const autoThrottled =
          reached &&
          d.autoBlockOnQuotaExceeded &&
          d.quotaAction === 'throttle_1m';

        if (prevPct < 0.8 && nextPct >= 0.8 && nextPct < 1) {
          triggeredAlerts.push({
            type: 'warning80',
            titleAr: `تحذير 80%: ${d.alias}`,
            titleEn: `80% Quota Reached: ${d.alias}`,
            bodyAr: `سحب ${nextUsed.toFixed(1)} GB من أصل ${d.quotaLimitGb} GB.`,
            bodyEn: `Used ${nextUsed.toFixed(1)} GB of ${d.quotaLimitGb} GB.`,
          });
        } else if (prevPct < 1 && nextPct >= 1) {
          triggeredAlerts.push({
            type: 'exceeded100',
            titleAr: `انتهت الحصة (100%): ${d.alias}`,
            titleEn: `Quota Exhausted (100%): ${d.alias}`,
            bodyAr: autoBlocked
              ? 'اتقفل عنه النت تلقائياً حسب قاعدة الحصة.'
              : autoThrottled
                ? 'اتهدّت سرعته تلقائياً لـ 1 Mbps (واتساب ومكالمات بس).'
                : 'وصل 100% من حصته الشهرية.',
            bodyEn: autoBlocked
              ? 'Device auto-blocked per quota rule.'
              : autoThrottled
                ? 'Device auto-throttled to 1 Mbps.'
                : 'Device reached 100% of allocated quota.',
          });
        }

        return {
          ...d,
          todayUsedGb: nextToday,
          quotaUsedGb: nextUsed,
          isBlocked: autoBlocked ? true : d.isBlocked,
          speedLimitEnabled: autoThrottled ? true : d.speedLimitEnabled,
          downloadLimitMbps: autoThrottled ? 1 : d.downloadLimitMbps,
          downloadMbps: autoBlocked
            ? 0
            : autoThrottled
              ? Math.min(1, d.downloadMbps)
              : d.downloadMbps,
          uploadMbps: autoBlocked ? 0 : d.uploadMbps,
        };
      })
    );
    triggeredAlerts.forEach((a) => pushNotification(a));
  }, [pushNotification]);

  const exportUsageCsv = useCallback(() => {
    const header = [
      'Device Alias',
      'Hostname',
      'IP',
      'MAC',
      'Band',
      'Group',
      'Priority',
      'Today (GB)',
      'Month Used (GB)',
      'Quota (GB)',
      'Speed Cap (Mbps)',
      'Blocked',
    ];
    const rows = devices.map((d) => [
      `"${d.alias.replace(/"/g, '""')}"`,
      d.hostname,
      d.ip,
      d.mac,
      d.band,
      d.groupId,
      d.priority,
      d.todayUsedGb.toFixed(2),
      d.quotaUsedGb.toFixed(2),
      d.quotaLimitGb.toString(),
      d.speedLimitEnabled ? d.downloadLimitMbps.toString() : 'Unlimited',
      d.isBlocked ? 'Yes' : 'No',
    ]);
    const csv =
      '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrobox_usage_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [devices]);

  const runPingDiagnostics = useCallback(() => {
    const gwHost = activeProfile?.gatewayIp ?? '192.168.88.1';
    setPingResults((prev) => ({
      gateway: { ...prev.gateway, host: gwHost, status: 'running' },
      internet: { ...prev.internet, status: 'running' },
    }));

    window.setTimeout(() => {
      const makeStats = (base: number, spread: number) => {
        const samples = Array.from({ length: 5 }, () =>
          Number((base + Math.random() * spread).toFixed(1))
        );
        const avg = Number(
          (samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1)
        );
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        const jitter = Number(((max - min) / 2.2).toFixed(1));
        return { samples, avg, min, max, jitter };
      };
      const gw = makeStats(1.6, 1.9);
      const net = makeStats(19.5, 9.8);
      setPingResults({
        gateway: {
          host: gwHost,
          labelAr: 'بوابة الراوتر',
          labelEn: 'Router Gateway',
          samplesMs: gw.samples,
          avgMs: gw.avg,
          minMs: gw.min,
          maxMs: gw.max,
          jitterMs: gw.jitter,
          packetLossPct: 0,
          status: 'done',
        },
        internet: {
          host: '1.1.1.1',
          labelAr: 'الإنترنت (Cloudflare)',
          labelEn: 'Internet (Cloudflare)',
          samplesMs: net.samples,
          avgMs: net.avg,
          minMs: net.min,
          maxMs: net.max,
          jitterMs: net.jitter,
          packetLossPct: 0,
          status: 'done',
        },
      });
    }, 680);
  }, [activeProfile]);

  const toggleSchedule = useCallback((scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  const addSchedule = useCallback((rule: Omit<ScheduleRule, 'id'>) => {
    setSchedules((prev) => [{ ...rule, id: `sch_${Date.now()}` }, ...prev]);
  }, []);

  const deleteSchedule = useCallback((scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  }, []);

  const triggerReboot = useCallback(() => {
    setRebootCountdown(6);
  }, []);

  const totalDownloadMbps = useMemo(
    () =>
      Number(
        devices
          .reduce((sum, d) => sum + (d.isBlocked ? 0 : d.downloadMbps), 0)
          .toFixed(1)
      ),
    [devices]
  );

  const totalUploadMbps = useMemo(
    () =>
      Number(
        devices
          .reduce((sum, d) => sum + (d.isBlocked ? 0 : d.uploadMbps), 0)
          .toFixed(1)
      ),
    [devices]
  );

  const unknownDevices = useMemo(
    () => devices.filter((d) => d.isUnknown && !d.isBlocked),
    [devices]
  );

  const totalUsedGb = useMemo(
    () => Number(devices.reduce((acc, d) => acc + d.quotaUsedGb, 0).toFixed(1)),
    [devices]
  );

  const totalTodayGb = useMemo(
    () => Number(devices.reduce((acc, d) => acc + d.todayUsedGb, 0).toFixed(2)),
    [devices]
  );

  const totalAllocatedToDevicesGb = useMemo(
    () =>
      devices
        .filter((d) => !d.isUnknown)
        .reduce((acc, d) => acc + d.quotaLimitGb, 0),
    [devices]
  );

  const billingStats = useMemo(() => {
    const today = new Date().getDate();
    const renew = billingCycle.renewalDay;
    const daysLeft = renew > today ? renew - today : 30 - today + renew;
    const remainingGb = Math.max(
      0,
      Number((billingCycle.monthlyPackageGb - totalUsedGb).toFixed(1))
    );
    const dailySafeBudgetGb = Number(
      (remainingGb / Math.max(1, daysLeft)).toFixed(1)
    );
    return { daysLeft, remainingGb, dailySafeBudgetGb };
  }, [billingCycle, totalUsedGb]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    locale,
    setLocale,
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    isConnected,
    setIsConnected,
    isAuthenticating,
    profiles,
    activeProfile,
    activeDriverSpec,
    devices,
    groups,
    mainWifi,
    setMainWifi,
    guestWifi,
    setGuestWifi,
    guestVouchers,
    createGuestVoucher,
    deleteGuestVoucher,
    dnsConfig,
    setDnsConfig,
    applyDnsPreset,
    systemHealth,
    vdslStats,
    refreshVdslStats,
    channels,
    rescanChannels,
    applyRecommendedChannel,
    billingCycle,
    setBillingCycle,
    billingStats,
    appLock,
    setAppLock,
    isAppLocked,
    setIsAppLocked,
    notifications,
    unreadNotificationsCount,
    markAllNotificationsRead,
    schedules,
    autoBlockIntruders,
    setAutoBlockIntruders,
    intrusionLogs,
    bandwidthHistory,
    rebootCountdown,
    pingResults,
    totalDownloadMbps,
    totalUploadMbps,
    totalUsedGb,
    totalTodayGb,
    totalAllocatedToDevicesGb,
    unknownDevices,
    connectWithCredentials,
    switchDriverLive,
    rotateDefaultAdminPassword,
    toggleBlockDevice,
    blockAllIntruders,
    distributeQuotaEqually,
    trustUnknownDevice,
    updateDevice,
    sendWakeOnLan,
    resetDeviceQuota,
    updateGroupPolicy,
    simulateUnknownDeviceJoin,
    simulateAdvanceTraffic,
    exportUsageCsv,
    runPingDiagnostics,
    toggleSchedule,
    addSchedule,
    deleteSchedule,
    triggerReboot,
  };
}

export type NetPulseStore = ReturnType<typeof useNetPulseStore>;
