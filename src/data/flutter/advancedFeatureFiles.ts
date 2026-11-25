import { FlutterCodeFile } from '../../types/router';

export const FLUTTER_ADVANCED_FEATURE_FILES: FlutterCodeFile[] = [
  {
    path: 'lib/models/vdsl_stats.dart',
    folder: 'lib/models',
    language: 'dart',
    summaryEn: 'Models for VDSL2 line diagnostics (SNR Margin, Attenuation, Max Rate), Safe DNS presets, and Billing Cycle.',
    summaryAr: 'نماذج فحص خط VDSL و DNS حماية العائلة ودورة تجديد الباقة.',
    content: `class VdslLineStats {
  final String lineType;
  final double downstreamSnrDb;
  final double upstreamSnrDb;
  final double downstreamAttenuationDb;
  final double upstreamAttenuationDb;
  final double actualDownMbps;
  final double actualUpMbps;
  final double maxAttainableDownMbps;
  final double maxAttainableUpMbps;
  final int crcErrors;

  const VdslLineStats({
    required this.lineType,
    required this.downstreamSnrDb,
    required this.upstreamSnrDb,
    required this.downstreamAttenuationDb,
    required this.upstreamAttenuationDb,
    required this.actualDownMbps,
    required this.actualUpMbps,
    required this.maxAttainableDownMbps,
    required this.maxAttainableUpMbps,
    required this.crcErrors,
  });

  String get qualityRating => downstreamSnrDb >= 12
      ? 'Excellent'
      : downstreamSnrDb >= 8
          ? 'Good'
          : 'Weak';
}

enum DnsPreset {
  ispDefault,
  cloudflareFamily,
  adGuardFamily,
  openDnsFamily,
  custom,
}

class DnsConfig {
  final DnsPreset preset;
  final String primaryDns;
  final String secondaryDns;

  const DnsConfig({
    required this.preset,
    required this.primaryDns,
    required this.secondaryDns,
  });

  static DnsConfig fromPreset(DnsPreset preset) => switch (preset) {
        DnsPreset.cloudflareFamily => const DnsConfig(
            preset: DnsPreset.cloudflareFamily,
            primaryDns: '1.1.1.3',
            secondaryDns: '1.0.0.3',
          ),
        DnsPreset.adGuardFamily => const DnsConfig(
            preset: DnsPreset.adGuardFamily,
            primaryDns: '94.140.14.15',
            secondaryDns: '94.140.15.16',
          ),
        DnsPreset.openDnsFamily => const DnsConfig(
            preset: DnsPreset.openDnsFamily,
            primaryDns: '208.67.222.123',
            secondaryDns: '208.67.220.123',
          ),
        _ => const DnsConfig(
            preset: DnsPreset.ispDefault,
            primaryDns: '163.121.128.134',
            secondaryDns: '163.121.128.135',
          ),
      };
}

class BillingCycleConfig {
  final int renewalDay;
  final double monthlyPackageGb;
  final bool autoResetOnRenewal;

  const BillingCycleConfig({
    this.renewalDay = 5,
    this.monthlyPackageGb = 200,
    this.autoResetOnRenewal = true,
  });

  int daysRemaining(DateTime now) {
    return renewalDay > now.day ? renewalDay - now.day : 30 - now.day + renewalDay;
  }

  double dailySafeBudgetGb(double usedGb, DateTime now) {
    final remaining = (monthlyPackageGb - usedGb).clamp(0, monthlyPackageGb);
    final days = daysRemaining(now).clamp(1, 31);
    return double.parse((remaining / days).toStringAsFixed(1));
  }
}
`,
  },
  {
    path: 'lib/services/wake_on_lan_service.dart',
    folder: 'lib/services',
    language: 'dart',
    summaryEn: 'Real UDP Port 9 Wake-on-LAN (Magic Packet) broadcaster to power on LAN PCs & consoles from your phone.',
    summaryAr: 'خدمة تشغيل الكمبيوتر عن بُعد (Wake-on-LAN) ببث حزمة Magic Packet الحقيقية على شبكة LAN.',
    content: `import 'dart:io';
import 'dart:typed_data';

class WakeOnLanService {
  /// Sends a standard 102-byte Wake-on-LAN Magic Packet (6x 0xFF + 16x MAC) over UDP port 9.
  static Future<bool> wakeDevice(String macAddress, {String broadcastIp = '255.255.255.255'}) async {
    try {
      final clean = macAddress.replaceAll(RegExp(r'[^0-9A-Fa-f]'), '');
      if (clean.length != 12) return false;

      final macBytes = <int>[];
      for (var i = 0; i < 12; i += 2) {
        macBytes.add(int.parse(clean.substring(i, i + 2), radix: 16));
      }

      final packet = Uint8List(102);
      for (var i = 0; i < 6; i++) {
        packet[i] = 0xFF;
      }
      for (var i = 6; i < 102; i += 6) {
        for (var j = 0; j < 6; j++) {
          packet[i + j] = macBytes[j];
        }
      }

      final socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
      socket.broadcastEnabled = true;
      socket.send(packet, InternetAddress(broadcastIp), 9);
      socket.close();
      return true;
    } catch (_) {
      return false;
    }
  }
}
`,
  },
  {
    path: 'lib/services/app_lock_service.dart',
    folder: 'lib/services',
    language: 'dart',
    summaryEn: 'Biometric (Fingerprint/Face ID) & PIN app protection using local_auth + flutter_secure_storage.',
    summaryAr: 'خدمة قفل البرنامج بالبصمة أو الرقم السري عبر local_auth.',
    content: `import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

class AppLockService {
  final LocalAuthentication _auth = LocalAuthentication();
  static const _storage = FlutterSecureStorage();
  static const _pinKey = 'mikrobox_app_lock_pin';

  Future<bool> canCheckBiometrics() async {
    try {
      return await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  Future<bool> authenticateWithBiometrics({required bool isArabic}) async {
    try {
      return await _auth.authenticate(
        localizedReason: isArabic
            ? 'استخدم بصمة صباعك عشان تفتح ميكرو بوكس'
            : 'Authenticate with biometrics to unlock MikroBox',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }

  Future<void> savePin(String pin) => _storage.write(key: _pinKey, value: pin);

  Future<bool> verifyPin(String input) async {
    final stored = await _storage.read(key: _pinKey) ?? '1234';
    return stored == input;
  }
}
`,
  },
  {
    path: 'lib/services/notification_service.dart',
    folder: 'lib/services',
    language: 'dart',
    summaryEn: 'Android & iOS local notifications for Intruder Radar alerts and 80%/100% quota warnings.',
    summaryAr: 'إشعارات أندرويد المحلية لرادار المتطفلين وتنبيهات 80% / 100% من استهلاك الجيجات.',
    content: `import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  static Future<void> showAlert({
    required int id,
    required String title,
    required String body,
  }) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'mikrobox_alerts',
        'MikroBox Router Alerts',
        channelDescription: 'Intruder alerts and per-device GB quota alerts',
        importance: Importance.high,
        priority: Priority.high,
      ),
      iOS: DarwinNotificationDetails(),
    );
    await _plugin.show(id, title, body, details);
  }
}
`,
  },
  {
    path: 'lib/services/csv_export_service.dart',
    folder: 'lib/services',
    language: 'dart',
    summaryEn: 'Generates UTF-8 BOM CSV usage reports with daily & monthly consumption and shares them natively.',
    summaryAr: 'خدمة تصدير تقارير استهلاك الأجهزة اليومي والشهري بصيغة CSV (Excel).',
    content: `import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../models/connected_device.dart';

class CsvExportService {
  static Future<void> exportDevicesCsv(List<ConnectedDevice> devices) async {
    final buffer = StringBuffer('\uFEFF');
    buffer.writeln('Alias,Hostname,IP,MAC,Band,Group,TodayGB,MonthUsedGB,QuotaGB,SpeedCapMbps,Blocked');
    for (final d in devices) {
      buffer.writeln(
        '"\${d.alias.replaceAll('"', '""')}",\${d.hostname},\${d.ip},\${d.mac},\${d.bandLabel},\${d.group.name},\${d.todayUsedGb.toStringAsFixed(2)},\${d.quotaUsedGb.toStringAsFixed(2)},\${d.quotaLimitGb.toStringAsFixed(1)},\${d.speedLimitEnabled ? d.downloadLimitMbps : 'Unlimited'},\${d.isBlocked}',
      );
    }

    final dir = await getTemporaryDirectory();
    final file = File('\${dir.path}/mikrobox_usage_report.csv');
    await file.writeAsString(buffer.toString());

    await Share.shareXFiles(
      [XFile(file.path)],
      subject: 'MikroBox Per-Device Usage Report (CSV)',
    );
  }
}
`,
  },
  {
    path: 'lib/widgets/wifi_qr_dialog.dart',
    folder: 'lib/widgets',
    language: 'dart',
    summaryEn: 'Scannable Wi-Fi QR Code widget built with qr_flutter for sharing Main, Guest, and Voucher Wi-Fi.',
    summaryAr: 'ودجت توليد ومشاركة كود QR للواي فاي وكروت الضيوف عبر qr_flutter.',
    content: `import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class WifiQrDialog extends StatefulWidget {
  final String ssid;
  final String password;
  final bool hidden;

  const WifiQrDialog({
    super.key,
    required this.ssid,
    required this.password,
    this.hidden = false,
  });

  @override
  State<WifiQrDialog> createState() => _WifiQrDialogState();
}

class _WifiQrDialogState extends State<WifiQrDialog> {
  bool _showPassword = false;

  String get _wifiPayload {
    String esc(String s) => s.replaceAllMapped(RegExp(r'([\\\\;,:"])'), (m) => '\\\\\${m[1]}');
    return 'WIFI:T:WPA;S:\${esc(widget.ssid)};P:\${esc(widget.password)};H:\${widget.hidden};;';
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.ssid, textAlign: TextAlign.center),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: QrImageView(
              data: _wifiPayload,
              version: QrVersions.auto,
              size: 210,
            ),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: () => setState(() => _showPassword = !_showPassword),
            icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
            label: Text(_showPassword ? widget.password : '••••••••'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('OK'),
        ),
      ],
    );
  }
}
`,
  },
  {
    path: 'lib/drivers/mena_isp_drivers.dart',
    folder: 'lib/drivers',
    language: 'dart',
    summaryEn: 'Pre-configured endpoint profiles for WE Egypt (Huawei DG8045 / ZTE H168N & H188A), Vodafone/Orange/STC, and Tenda/D-Link/ASUS.',
    summaryAr: 'ملفات محولات جاهزة لراوترات WE مصر وفودافون وأورنج و STC وتيندا ودي لينك وأسوس.',
    content: `import '../models/router_capabilities.dart';
import '../models/router_profile.dart';
import 'generic_http_router_driver.dart';

class MenaIspDrivers {
  /// WE Egypt — Huawei DG8045 / HG630 V2 / HG633 / DN8245
  static GenericHttpRouterDriver weHuaweiDg8045() {
    return GenericHttpRouterDriver(
      const RouterEndpointProfile(
        vendorName: 'WE Egypt — Huawei DG8045 / HG630',
        authPattern: AuthPattern.csrfTokenXml,
        loginPath: '/api/system/user_login',
        devicesPath: '/api/system/HostInfo',
        blockPath: '/api/ntwk/macfilter',
        qosPath: '/api/ntwk/qos_bandwidth',
        guestWifiPath: '/api/ntwk/wlan_guest',
        rebootPath: '/api/service/reboot.cgi',
        capabilities: RouterCapabilities(
          supportsBandwidthLimit: true,
          supportsQuotaTracking: false,
          supportsBlockDevice: true,
          supportsGuestWifi: true,
          supportsReboot: true,
        ),
      ),
    );
  }

  /// WE Egypt — ZTE ZXHN H168N / H188A / H108N
  static GenericHttpRouterDriver weZteH168n() {
    return GenericHttpRouterDriver(
      const RouterEndpointProfile(
        vendorName: 'WE Egypt — ZTE H168N / H188A',
        authPattern: AuthPattern.cookieHtmlXml,
        loginPath: '/?_type=loginData&_tag=login_entry',
        devicesPath: '/?_type=menuData&_tag=accessdev_landev_lua.lua',
        blockPath: '/?_type=menuData&_tag=macfilter_lua.lua',
        qosPath: '/?_type=menuData&_tag=qos_basic_lua.lua',
        guestWifiPath: '/?_type=menuData&_tag=wlan_guest_lua.lua',
        rebootPath: '/?_type=menuData&_tag=devmgr_restart_lua.lua',
        capabilities: RouterCapabilities(
          supportsBandwidthLimit: true,
          supportsQuotaTracking: false,
          supportsBlockDevice: true,
          supportsGuestWifi: true,
          supportsReboot: true,
        ),
      ),
    );
  }

  /// Vodafone / Orange / Etisalat / STC Gateways
  static GenericHttpRouterDriver vodafoneOrangeStc() {
    return GenericHttpRouterDriver(
      const RouterEndpointProfile(
        vendorName: 'Vodafone / Orange / STC Gateway',
        authPattern: AuthPattern.csrfTokenXml,
        loginPath: '/api/user/login',
        devicesPath: '/api/lan/HostInfo',
        blockPath: '/api/security/mac-filter',
        qosPath: '/api/qos/rule',
        guestWifiPath: '/api/wlan/guest-settings',
        rebootPath: '/api/device/control',
        capabilities: RouterCapabilities(
          supportsBandwidthLimit: false,
          supportsQuotaTracking: false,
          supportsBlockDevice: true,
          supportsGuestWifi: true,
          supportsReboot: true,
        ),
      ),
    );
  }

  /// Tenda / D-Link / ASUS / Netgear / Mercusys Universal Adapter
  static GenericHttpRouterDriver tendaDlinkAsus() {
    return GenericHttpRouterDriver(
      const RouterEndpointProfile(
        vendorName: 'Tenda / D-Link / ASUS / Netgear',
        authPattern: AuthPattern.sessionCookieJson,
        loginPath: '/login/Auth',
        devicesPath: '/goform/getOnlineList',
        blockPath: '/goform/setMacFilterCfg',
        qosPath: '/goform/setQosUserList',
        guestWifiPath: '/goform/setWifiGuest',
        rebootPath: '/goform/sysReboot',
        capabilities: RouterCapabilities(
          supportsBandwidthLimit: true,
          supportsQuotaTracking: false,
          supportsBlockDevice: true,
          supportsGuestWifi: true,
          supportsReboot: true,
        ),
      ),
    );
  }
}
`,
  },
];
