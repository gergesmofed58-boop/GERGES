import { FlutterCodeFile } from '../../types/router';

export const FLUTTER_CORE_AND_MODELS: FlutterCodeFile[] = [
  {
    path: 'pubspec.yaml',
    folder: 'root',
    language: 'yaml',
    summaryEn: 'Flutter 3.32+ Android dependencies: Riverpod, Dio + CookieJar, Secure Storage, Hive, Network Info, XML/HTML parsers, Biometrics, QR, and Local Alerts.',
    summaryAr: 'اعتماديات مشروع ميكرو بوكس (Flutter Android): Riverpod و Dio و flutter_secure_storage و Hive و network_info_plus والبصمة والـ QR.',
    content: `name: mikrobox_router
description: MikroBox / ميكرو بوكس - Universal MikroTik & Multi-Router Android Manager.
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.4.0 <4.0.0"
  flutter: ">=3.24.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  # State Management
  flutter_riverpod: ^2.6.1
  # Real LAN Networking & Router HTTP/REST Adapters
  dio: ^5.7.0
  cookie_jar: ^4.0.8
  dio_cookie_manager: ^3.1.1
  xml: ^6.5.0
  html: ^0.15.4
  # Wi-Fi Gateway Auto-Discovery & ICMP Ping
  network_info_plus: ^6.1.1
  dart_ping: ^9.0.1
  # On-Device Encrypted Credentials & Local Per-Device Consumption DB
  flutter_secure_storage: ^9.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  # Typography, Icons & Internationalization
  google_fonts: ^6.2.1
  intl: any
  cupertino_icons: ^1.0.8
  # Biometric Lock, Wi-Fi QR, Local Notifications & CSV Export
  local_auth: ^2.3.0
  qr_flutter: ^4.1.0
  flutter_local_notifications: ^18.0.1
  path_provider: ^2.1.5
  share_plus: ^10.1.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`,
  },
  {
    path: 'README.md',
    folder: 'root',
    language: 'markdown',
    summaryEn: 'Android APK build guide, real LAN protocol capabilities (MikroTik REST, WE/ZTE/Huawei, TP-Link, OpenWrt, Universal Auto-Detect, Wake-on-LAN).',
    summaryAr: 'دليل بناء ملف APK الحقيقي لمشروع ميكرو بوكس (MikroBox) وتشغيله على أي راوتر.',
    content: `# MikroBox — ميكرو بوكس (Real Native Android Flutter Project)

Universal Android router & Wi-Fi control application modeled after MikroTik WinBox — works over local LAN with **MikroTik RouterOS v7+ REST API**, **WE Egypt (Huawei DG8045 / ZTE H168N & H188A)**, **TP-Link**, **Tenda / D-Link / ASUS**, **Vodafone / Orange / STC**, **OpenWrt LuCI**, and **Universal Auto-Detect**.

## Build Installable Android APK

\`\`\`bash
# 1. Fetch Dart & Android packages
flutter pub get

# 2. Build standalone Release APK
flutter build apk --release

# Output APK:
# build/app/outputs/flutter-apk/app-release.apk
\`\`\`

## Real Native Android Features
- **Direct Local LAN HTTP/REST**: Cleartext LAN access configured in \`network_security_config.xml\` for \`192.168.88.1\`, \`192.168.1.1\`, \`192.168.0.1\`, \`192.168.8.1\`, and \`10.0.0.1\`.
- **MikroTik RouterOS v7 REST API**: Live DHCP leases, Simple Queues speed caps + burst + priority, byte counters, Firewall blocking, CPU/RAM health, and safe reboot.
- **Per-Device Daily & Monthly GB Consumption**: Local Hive database tracks every client's daily & monthly GB with Auto-Cut or Auto-Throttle (1 Mbps) when quota hits 100%.
- **Wake-on-LAN (UDP Port 9)**: Broadcasts real 102-byte Magic Packets to wake LAN PCs & consoles.
- **Biometric App Lock (\`local_auth\`)** & **Android Keystore Credential Encryption (\`flutter_secure_storage\`)**.
`,
  },
  {
    path: 'lib/main.dart',
    folder: 'lib',
    language: 'dart',
    summaryEn: 'Application bootstrap initializing Hive local DB, Android notifications, Riverpod ProviderScope, RTL/LTR localization, and Light/Dark themes.',
    summaryAr: 'نقطة تشغيل ميكرو بوكس وتهيئة قاعدة البيانات المحلية Hive والإشعارات واللغات والمظهر الليلي.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'controllers/router_controller.dart';
import 'core/theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'services/local_storage_service.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await LocalStorageService.initBoxes();
  await NotificationService.initialize();

  runApp(const ProviderScope(child: MikroBoxApp()));
}

class MikroBoxApp extends ConsumerWidget {
  const MikroBoxApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(routerControllerProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: state.locale.languageCode == 'ar' ? 'ميكرو بوكس' : 'MikroBox',
      locale: state.locale,
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      themeMode: state.themeMode,
      theme: AppTheme.light(state.locale),
      darkTheme: AppTheme.dark(state.locale),
      home: state.isConnected ? const MainShell() : const LoginScreen(),
    );
  }
}
`,
  },
  {
    path: 'lib/core/theme/app_theme.dart',
    folder: 'lib/core/theme',
    language: 'dart',
    summaryEn: 'Material 3 Light & Dark themes using Cairo for Arabic RTL and Plus Jakarta Sans for English LTR.',
    summaryAr: 'ثيم Material 3 فاتح وداكن بخط Cairo للعربية و Plus Jakarta Sans للإنجليزية.',
    content: `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryTeal = Color(0xFF0D9488);
  static const Color darkCanvas = Color(0xFF0B1120);
  static const Color darkSurface = Color(0xFF111827);
  static const Color lightCanvas = Color(0xFFF8FAFC);

  static TextTheme _textTheme(Locale locale, Brightness brightness) {
    final base = brightness == Brightness.dark
        ? ThemeData.dark().textTheme
        : ThemeData.light().textTheme;
    return locale.languageCode == 'ar'
        ? GoogleFonts.cairoTextTheme(base)
        : GoogleFonts.plusJakartaSansTextTheme(base);
  }

  static ThemeData light(Locale locale) {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryTeal,
      brightness: Brightness.light,
      surface: Colors.white,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: lightCanvas,
      textTheme: _textTheme(locale, Brightness.light),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF0F172A),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
    );
  }

  static ThemeData dark(Locale locale) {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryTeal,
      brightness: Brightness.dark,
      surface: darkSurface,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: darkCanvas,
      textTheme: _textTheme(locale, Brightness.dark),
      cardTheme: CardThemeData(
        elevation: 0,
        color: darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkSurface,
        foregroundColor: Color(0xFFF1F5F9),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/core/l10n/app_strings.dart',
    folder: 'lib/core/l10n',
    language: 'dart',
    summaryEn: 'Bilingual Egyptian Arabic (RTL) and English (LTR) strings for MikroBox.',
    summaryAr: 'قاموس النصوص بالعربي المصري والإنجليزية لبرنامج ميكرو بوكس.',
    content: `import 'package:flutter/widgets.dart';

class AppStrings {
  final bool isAr;
  const AppStrings(this.isAr);

  factory AppStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode;
    return AppStrings(code == 'ar');
  }

  String get appTitle => isAr ? 'ميكرو بوكس' : 'MikroBox';
  String get tabHome => isAr ? 'الرئيسية' : 'Home';
  String get tabDevices => isAr ? 'الأجهزة' : 'Devices';
  String get tabQuotas => isAr ? 'الاستهلاك' : 'Usage';
  String get tabTools => isAr ? 'أدوات برو' : 'Pro Tools';

  String get loginTitle => isAr ? 'اربط مع أي راوتر' : 'Connect to Any Router';
  String get gatewayIp => isAr ? 'عنوان الراوتر (Gateway IP)' : 'Gateway IP Address';
  String get autoDetect => isAr ? 'كشف تلقائي' : 'Auto-Detect';
  String get username => isAr ? 'اسم المستخدم (Admin)' : 'Admin Username';
  String get password => isAr ? 'كلمة السر' : 'Admin Password';
  String get saveProfile => isAr ? 'احفظ الراوتر بأمان على تليفونك' : 'Save router profile securely';
  String get connect => isAr ? 'اتصال بالراوتر دلوقتي' : 'Connect to Router';
  String get demoMode => isAr ? 'جرّب وضع التجربة' : 'Launch Demo Mode';

  String get unknownAlert => isAr ? 'رادار المتطفلين: جهاز غريب دخل الشبكة!' : 'Intruder Alert: Unknown device joined!';
  String get trust => isAr ? 'اعتماد' : 'Trust';
  String get block => isAr ? 'طرد وحظر' : 'Kick & Block';
  String get unblock => isAr ? 'فك الحظر' : 'Unblock';
  String get wakeOnLan => isAr ? 'تشغيل (WoL)' : 'Wake PC';
  String get nativeSupport => isAr ? 'مدعوم من الراوتر' : 'Router Native';
  String get appLevelSupport => isAr ? 'مراقبة ذكية بالبرنامج' : 'Smart App Rule';

  String get speedLimitToggle => isAr ? 'تحديد السرعة (Queue)' : 'Speed Queue';
  String get autoBlockToggle => isAr ? 'فصل تلقائي عند انتهاء الجيجات' : 'Auto-Cut at 100% Quota';
  String get guestWifi => isAr ? 'واي فاي الضيوف' : 'Guest Wi-Fi';
  String get rebootRouter => isAr ? 'إعادة تشغيل الراوتر' : 'Reboot Router';
  String get pingCheck => isAr ? 'فحص البنج والثبات (Ping)' : 'Ping & Jitter Check';
  String get schedules => isAr ? 'جدول فصل النت التلقائي' : 'Bedtime Schedules';
}
`,
  },
  {
    path: 'lib/models/router_capabilities.dart',
    folder: 'lib/models',
    language: 'dart',
    summaryEn: 'Declares native router feature support vs MikroBox app-level monitoring.',
    summaryAr: 'نموذج قدرات الراوتر لتوضيح التحكم الأصلي مقابل المراقبة الذكية في البرنامج.',
    content: `class RouterCapabilities {
  final bool supportsBandwidthLimit;
  final bool supportsQuotaTracking;
  final bool supportsBlockDevice;
  final bool supportsGuestWifi;
  final bool supportsReboot;
  final bool supportsMikroTikQueues;

  const RouterCapabilities({
    required this.supportsBandwidthLimit,
    required this.supportsQuotaTracking,
    required this.supportsBlockDevice,
    required this.supportsGuestWifi,
    required this.supportsReboot,
    this.supportsMikroTikQueues = false,
  });

  const RouterCapabilities.all()
      : supportsBandwidthLimit = true,
        supportsQuotaTracking = true,
        supportsBlockDevice = true,
        supportsGuestWifi = true,
        supportsReboot = true,
        supportsMikroTikQueues = true;
}
`,
  },
  {
    path: 'lib/models/router_profile.dart',
    folder: 'lib/models',
    language: 'dart',
    summaryEn: 'Router connection profile metadata supporting Universal Auto-Detect, MikroTik RouterOS, WE Egypt, TP-Link, Tenda/D-Link/ASUS, and OpenWrt.',
    summaryAr: 'نموذج تعريف الراوتر مع دعم الكشف التلقائي وميكروتيك و WE و TP-Link و Tenda و OpenWrt.',
    content: `enum RouterDriverType {
  universalAuto,
  mikroTikRest,
  weHuaweiDg8045,
  weZteH168n,
  vodafoneOrangeStc,
  tpLinkJson,
  tendaDlinkAsus,
  huaweiXml,
  zteHtml,
  openWrtLuci,
  mockDemo,
}

enum AuthPattern {
  autoProbe,
  httpBasicRest,
  sessionCookieJson,
  csrfTokenXml,
  cookieHtmlXml,
  jsonRpcToken,
  demo,
}

class RouterProfile {
  final String id;
  final String label;
  final String gatewayIp;
  final String username;
  final RouterDriverType driverType;
  final DateTime lastConnected;

  const RouterProfile({
    required this.id,
    required this.label,
    required this.gatewayIp,
    required this.username,
    required this.driverType,
    required this.lastConnected,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'gatewayIp': gatewayIp,
        'username': username,
        'driverType': driverType.name,
        'lastConnected': lastConnected.toIso8601String(),
      };

  factory RouterProfile.fromJson(Map<String, dynamic> json) => RouterProfile(
        id: json['id'] as String,
        label: json['label'] as String,
        gatewayIp: json['gatewayIp'] as String,
        username: json['username'] as String,
        driverType: RouterDriverType.values.firstWhere(
          (e) => e.name == json['driverType'],
          orElse: () => RouterDriverType.universalAuto,
        ),
        lastConnected: DateTime.tryParse(json['lastConnected'] ?? '') ?? DateTime.now(),
      );
}
`,
  },
  {
    path: 'lib/models/connected_device.dart',
    folder: 'lib/models',
    language: 'dart',
    summaryEn: 'Client telemetry model with MAC, IP, band, live speeds, MikroTik priority, daily & monthly GB consumption, and auto-cut/throttle rule.',
    summaryAr: 'نموذج الجهاز المتصل مع السرعة الحية والاستهلاك اليومي والشهري وأولوية الألعاب/المكالمات.',
    content: `enum ConnectionBand { wifi24, wifi5, lan }

enum DeviceGroup { family, kids, guests, unassigned }

enum TrafficPriority { gaming, calls, normal, background }

class ConnectedDevice {
  final String id;
  final String hostname;
  final String alias;
  final String ip;
  final String mac;
  final ConnectionBand band;
  final DeviceGroup group;
  final double downloadMbps;
  final double uploadMbps;
  final bool isBlocked;
  final bool isUnknown;
  final bool speedLimitEnabled;
  final double downloadLimitMbps;
  final double uploadLimitMbps;
  final TrafficPriority priority;
  final double todayUsedGb;
  final double quotaLimitGb;
  final double quotaUsedGb;
  final bool autoBlockOnQuotaExceeded;

  const ConnectedDevice({
    required this.id,
    required this.hostname,
    required this.alias,
    required this.ip,
    required this.mac,
    required this.band,
    this.group = DeviceGroup.unassigned,
    this.downloadMbps = 0,
    this.uploadMbps = 0,
    this.isBlocked = false,
    this.isUnknown = false,
    this.speedLimitEnabled = false,
    this.downloadLimitMbps = 20,
    this.uploadLimitMbps = 5,
    this.priority = TrafficPriority.normal,
    this.todayUsedGb = 0,
    this.quotaLimitGb = 25,
    this.quotaUsedGb = 0,
    this.autoBlockOnQuotaExceeded = false,
  });

  double get quotaPercent =>
      quotaLimitGb <= 0 ? 0 : (quotaUsedGb / quotaLimitGb).clamp(0.0, 1.0);

  bool get isWarning80 => quotaPercent >= 0.8 && quotaPercent < 1.0;
  bool get isQuotaExceeded => quotaPercent >= 1.0;

  String get bandLabel => switch (band) {
        ConnectionBand.wifi5 => '5GHz',
        ConnectionBand.wifi24 => '2.4GHz',
        ConnectionBand.lan => 'LAN',
      };

  int get mikroTikPriorityNum => switch (priority) {
        TrafficPriority.gaming => 1,
        TrafficPriority.calls => 2,
        TrafficPriority.normal => 5,
        TrafficPriority.background => 8,
      };

  ConnectedDevice copyWith({
    String? alias,
    DeviceGroup? group,
    double? downloadMbps,
    double? uploadMbps,
    bool? isBlocked,
    bool? isUnknown,
    bool? speedLimitEnabled,
    double? downloadLimitMbps,
    double? uploadLimitMbps,
    TrafficPriority? priority,
    double? todayUsedGb,
    double? quotaLimitGb,
    double? quotaUsedGb,
    bool? autoBlockOnQuotaExceeded,
  }) {
    return ConnectedDevice(
      id: id,
      hostname: hostname,
      alias: alias ?? this.alias,
      ip: ip,
      mac: mac,
      band: band,
      group: group ?? this.group,
      downloadMbps: downloadMbps ?? this.downloadMbps,
      uploadMbps: uploadMbps ?? this.uploadMbps,
      isBlocked: isBlocked ?? this.isBlocked,
      isUnknown: isUnknown ?? this.isUnknown,
      speedLimitEnabled: speedLimitEnabled ?? this.speedLimitEnabled,
      downloadLimitMbps: downloadLimitMbps ?? this.downloadLimitMbps,
      uploadLimitMbps: uploadLimitMbps ?? this.uploadLimitMbps,
      priority: priority ?? this.priority,
      todayUsedGb: todayUsedGb ?? this.todayUsedGb,
      quotaLimitGb: quotaLimitGb ?? this.quotaLimitGb,
      quotaUsedGb: quotaUsedGb ?? this.quotaUsedGb,
      autoBlockOnQuotaExceeded:
          autoBlockOnQuotaExceeded ?? this.autoBlockOnQuotaExceeded,
    );
  }
}
`,
  },
  {
    path: 'lib/models/quota_rule.dart',
    folder: 'lib/models',
    language: 'dart',
    summaryEn: 'Group quota policies, bedtime schedules, router health telemetry, and ping metrics.',
    summaryAr: 'نماذج سياسات المجموعات وجداول الفصل وصحة الراوتر ونتائج فحص البنج.',
    content: `import 'connected_device.dart';

class GroupQuotaPolicy {
  final DeviceGroup group;
  final String nameAr;
  final String nameEn;
  final double allocatedGb;
  final bool speedLimitEnabled;
  final double downloadLimitMbps;
  final double uploadLimitMbps;
  final bool autoBlockOnQuotaExceeded;

  const GroupQuotaPolicy({
    required this.group,
    required this.nameAr,
    required this.nameEn,
    required this.allocatedGb,
    required this.speedLimitEnabled,
    required this.downloadLimitMbps,
    required this.uploadLimitMbps,
    required this.autoBlockOnQuotaExceeded,
  });

  GroupQuotaPolicy copyWith({
    double? allocatedGb,
    bool? speedLimitEnabled,
    double? downloadLimitMbps,
    double? uploadLimitMbps,
    bool? autoBlockOnQuotaExceeded,
  }) {
    return GroupQuotaPolicy(
      group: group,
      nameAr: nameAr,
      nameEn: nameEn,
      allocatedGb: allocatedGb ?? this.allocatedGb,
      speedLimitEnabled: speedLimitEnabled ?? this.speedLimitEnabled,
      downloadLimitMbps: downloadLimitMbps ?? this.downloadLimitMbps,
      uploadLimitMbps: uploadLimitMbps ?? this.uploadLimitMbps,
      autoBlockOnQuotaExceeded:
          autoBlockOnQuotaExceeded ?? this.autoBlockOnQuotaExceeded,
    );
  }
}

class ScheduleRule {
  final String id;
  final String titleAr;
  final String titleEn;
  final DeviceGroup targetGroup;
  final String startTime;
  final String endTime;
  final bool pauseInternet;
  final double? throttleMbps;
  final bool enabled;

  const ScheduleRule({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    required this.targetGroup,
    required this.startTime,
    required this.endTime,
    required this.pauseInternet,
    this.throttleMbps,
    required this.enabled,
  });

  ScheduleRule copyWith({bool? enabled}) => ScheduleRule(
        id: id,
        titleAr: titleAr,
        titleEn: titleEn,
        targetGroup: targetGroup,
        startTime: startTime,
        endTime: endTime,
        pauseInternet: pauseInternet,
        throttleMbps: throttleMbps,
        enabled: enabled ?? this.enabled,
      );
}

class PingResult {
  final String host;
  final double avgMs;
  final double minMs;
  final double maxMs;
  final double jitterMs;
  final double packetLossPct;

  const PingResult({
    required this.host,
    required this.avgMs,
    required this.minMs,
    required this.maxMs,
    required this.jitterMs,
    required this.packetLossPct,
  });
}

class RouterHealth {
  final int cpuLoadPct;
  final int ramUsedPct;
  final String uptime;
  final String firmware;

  const RouterHealth({
    this.cpuLoadPct = 15,
    this.ramUsedPct = 38,
    this.uptime = '3d 12h',
    this.firmware = 'RouterOS / LAN',
  });
}
`,
  },
];
