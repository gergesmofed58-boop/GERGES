export type AppLocale = 'ar' | 'en';
export type AppTheme = 'light' | 'dark';
export type WorkspaceView = 'simulator' | 'code' | 'drivers';
export type MobileTab = 'home' | 'devices' | 'quotas' | 'tools';

export type RouterDriverType =
  | 'universal_auto'
  | 'mikrotik_rest'
  | 'we_huawei_dg8045'
  | 'we_zte_h168n'
  | 'vodafone_orange_stc'
  | 'tplink_json'
  | 'tenda_dlink_asus'
  | 'huawei_xml'
  | 'zte_html'
  | 'openwrt_luci'
  | 'mock_demo';

export type AuthStrategy =
  | 'Auto-Detect LAN Probe'
  | 'HTTP Basic / RouterOS v7 REST'
  | 'Session Cookie + JSON'
  | 'CSRF Token + XML'
  | 'Cookie Session + HTML/XML'
  | 'JSON-RPC Token'
  | 'Universal WebBridge / HTTP'
  | 'Demo In-Memory';

export type PriorityLevel = 'gaming' | 'calls' | 'normal' | 'background';
export type QuotaActionMode = 'block' | 'throttle_1m';

export interface RouterCapabilities {
  supportsBandwidthLimit: boolean;
  supportsQuotaTracking: boolean;
  supportsBlockDevice: boolean;
  supportsGuestWifi: boolean;
  supportsReboot: boolean;
  supportsVdslStats?: boolean;
  supportsDnsControl?: boolean;
  supportsMikroTikQueues?: boolean;
  supportsWakeOnLan?: boolean;
}

export interface RouterDriverSpec {
  id: RouterDriverType;
  nameEn: string;
  nameAr: string;
  vendorFamily: string;
  defaultGateway: string;
  authStrategy: AuthStrategy;
  parserType: 'Auto' | 'Mock' | 'JSON' | 'XML' | 'HTML/XML' | 'JSON-RPC';
  capabilities: RouterCapabilities;
  notesEn: string;
  notesAr: string;
}

export interface RouterProfile {
  id: string;
  label: string;
  gatewayIp: string;
  username: string;
  /** Stored securely on-device (flutter_secure_storage in Flutter) */
  passwordMasked: string;
  driverType: RouterDriverType;
  modelName: string;
  lastConnectedAt: string;
  isSaved: boolean;
  usesDefaultCredentials?: boolean;
}

export type ConnectionBand = '5GHz' | '2.4GHz' | 'LAN';
export type DeviceGroupId = 'family' | 'kids' | 'guests' | 'unassigned';
export type DeviceType = 'phone' | 'laptop' | 'tv' | 'tablet' | 'console' | 'iot';

export interface ConnectedDevice {
  id: string;
  hostname: string;
  alias: string;
  ip: string;
  mac: string;
  band: ConnectionBand;
  deviceType: DeviceType;
  groupId: DeviceGroupId;
  downloadMbps: number;
  uploadMbps: number;
  isBlocked: boolean;
  isUnknown: boolean;
  joinedAt: string;
  /** MikroTik Simple Queue & Priority Rules */
  speedLimitEnabled: boolean;
  downloadLimitMbps: number;
  uploadLimitMbps: number;
  burstEnabled?: boolean;
  priority: PriorityLevel;
  /** Per-Device Exact Daily + Monthly Consumption */
  todayUsedGb: number;
  quotaLimitGb: number;
  quotaUsedGb: number;
  autoBlockOnQuotaExceeded: boolean;
  quotaAction: QuotaActionMode;
  canWakeOnLan?: boolean;
}

export interface GroupQuotaPolicy {
  id: Exclude<DeviceGroupId, 'unassigned'>;
  nameAr: string;
  nameEn: string;
  allocatedGb: number;
  speedLimitEnabled: boolean;
  downloadLimitMbps: number;
  uploadLimitMbps: number;
  autoBlockOnQuotaExceeded: boolean;
}

export interface GuestVoucher {
  id: string;
  code: string;
  labelAr: string;
  labelEn: string;
  durationMinutes: number;
  dataLimitGb: number;
  speedLimitMbps: number;
  createdAt: string;
  active: boolean;
}

export interface RouterSystemHealth {
  cpuLoadPct: number;
  ramUsedPct: number;
  temperatureC: number;
  uptimeLabel: string;
  firmwareVersion: string;
}

export type WifiEncryption = 'WPA3' | 'WPA2/WPA3' | 'WPA2' | 'WPA';

export interface MainWifiConfig {
  ssid: string;
  password: string;
  hiddenSsid: boolean;
  encryption: WifiEncryption;
  wpsEnabled: boolean;
  channel24: number;
  channel5: number;
}

export interface GuestWifiConfig {
  enabled: boolean;
  ssid: string;
  password: string;
  bandwidthCapMbps: number;
  isolateClients: boolean;
}

export type DnsPresetId =
  | 'isp_default'
  | 'cloudflare_family'
  | 'adguard_family'
  | 'opendns_family'
  | 'custom';

export interface DnsConfig {
  preset: DnsPresetId;
  primaryDns: string;
  secondaryDns: string;
}

export interface VdslLineStats {
  lineType: 'VDSL2 17a' | 'VDSL2 35b' | 'GPON Fiber';
  downstreamSnrDb: number;
  upstreamSnrDb: number;
  downstreamAttenuationDb: number;
  upstreamAttenuationDb: number;
  actualDownMbps: number;
  actualUpMbps: number;
  maxAttainableDownMbps: number;
  maxAttainableUpMbps: number;
  crcErrors: number;
  uptimeHours: number;
}

export interface ChannelMetric {
  channel: number;
  band: '2.4GHz' | '5GHz';
  congestionPct: number;
  neighbors: number;
}

export interface BillingCycleConfig {
  renewalDay: number; // 1..28
  monthlyPackageGb: number;
  autoResetOnRenewal: boolean;
}

export interface AppLockConfig {
  enabled: boolean;
  pin: string;
  biometricEnabled: boolean;
}

export interface LocalNotificationItem {
  id: string;
  type: 'unknown' | 'warning80' | 'exceeded100' | 'security';
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  time: string;
  read: boolean;
}

export interface ScheduleRule {
  id: string;
  titleAr: string;
  titleEn: string;
  targetGroup: DeviceGroupId;
  action: 'block' | 'throttle';
  throttleMbps?: number;
  startTime: string;
  endTime: string;
  daysLabelAr: string;
  daysLabelEn: string;
  enabled: boolean;
}

export interface PingTargetResult {
  host: string;
  labelAr: string;
  labelEn: string;
  samplesMs: number[];
  avgMs: number;
  minMs: number;
  maxMs: number;
  jitterMs: number;
  packetLossPct: number;
  status: 'idle' | 'running' | 'done';
}

export interface FlutterCodeFile {
  path: string;
  folder: string;
  language: 'dart' | 'yaml' | 'markdown' | 'xml' | 'gradle' | 'kotlin';
  summaryEn: string;
  summaryAr: string;
  content: string;
}
