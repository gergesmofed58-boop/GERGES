import { FlutterCodeFile } from '../../types/router';

export const FLUTTER_MOBILE_SCREENS: FlutterCodeFile[] = [
  {
    path: 'lib/screens/login_screen.dart',
    folder: 'lib/screens',
    language: 'dart',
    summaryEn: 'Clean empty-ready login screen with automatic Wi-Fi gateway discovery, Universal Auto-Detect, MikroTik RouterOS v7, WE/TP-Link/Tenda drivers, and Demo launch.',
    summaryAr: 'شاشة ربط الراوتر مع الكشف التلقائي للبوابة ودعم ميكروتيك وكل موديلات الراوترات وزر التجربة السريعة.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/router_controller.dart';
import '../core/l10n/app_strings.dart';
import '../models/router_profile.dart';
import '../services/gateway_discovery_service.dart';
import '../services/secure_storage_service.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _gatewayCtrl = TextEditingController();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _labelCtrl = TextEditingController();
  final _discovery = GatewayDiscoveryService();
  final _secureStorage = SecureStorageService();

  RouterDriverType _driverType = RouterDriverType.universalAuto;
  bool _obscurePassword = true;
  bool _saveProfile = true;
  bool _detecting = false;
  String? _error;

  Future<void> _autoDetectGateway() async {
    setState(() => _detecting = true);
    final ip = await _discovery.detectGatewayIp();
    if (!mounted) return;
    setState(() {
      _gatewayCtrl.text = ip;
      _detecting = false;
    });
  }

  Future<void> _selectSavedProfile(RouterProfile profile) async {
    final savedPass = await _secureStorage.readPassword(profile.id);
    if (!mounted) return;
    setState(() {
      _gatewayCtrl.text = profile.gatewayIp;
      _userCtrl.text = profile.username;
      _passCtrl.text = savedPass ?? '';
      _labelCtrl.text = profile.label;
      _driverType = profile.driverType;
    });
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final gw = _gatewayCtrl.text.trim().isEmpty ? '192.168.1.1' : _gatewayCtrl.text.trim();
    final user = _userCtrl.text.trim().isEmpty ? 'admin' : _userCtrl.text.trim();
    final ok = await ref.read(routerControllerProvider.notifier).login(
          gatewayIp: gw,
          username: user,
          password: _passCtrl.text,
          driverType: _driverType,
          saveProfile: _saveProfile,
          label: _labelCtrl.text,
        );
    if (!ok && mounted) {
      setState(() => _error = 'تعذر الاتصال بالراوتر — راجع عنوان الـ IP واسم المستخدم وكلمة السر.');
    }
  }

  Future<void> _launchDemo() async {
    setState(() => _error = null);
    await ref.read(routerControllerProvider.notifier).login(
          gatewayIp: '192.168.88.1',
          username: 'admin',
          password: 'demo',
          driverType: RouterDriverType.mockDemo,
          saveProfile: false,
          label: 'ميكرو بوكس (تجربة)',
        );
  }

  String _driverLabel(RouterDriverType t, bool isAr) => switch (t) {
        RouterDriverType.universalAuto => isAr ? 'كشف تلقائي (أي راوتر)' : 'Universal Auto-Detect',
        RouterDriverType.mikroTikRest => 'MikroTik RouterOS v7 REST',
        RouterDriverType.weHuaweiDg8045 => 'WE Egypt — Huawei DG8045 / HG630',
        RouterDriverType.weZteH168n => 'WE Egypt — ZTE H168N / H188A',
        RouterDriverType.vodafoneOrangeStc => 'Vodafone / Orange / STC',
        RouterDriverType.tpLinkJson => 'TP-Link Archer / Deco / VR',
        RouterDriverType.tendaDlinkAsus => 'Tenda / D-Link / ASUS / Netgear',
        RouterDriverType.openWrtLuci => 'OpenWrt / LuCI',
        RouterDriverType.huaweiXml => 'Huawei Fiber ONT',
        RouterDriverType.zteHtml => 'ZTE Generic / Fiber',
        RouterDriverType.mockDemo => isAr ? 'وضع التجربة (Demo)' : 'Demo Mode',
      };

  @override
  Widget build(BuildContext context) {
    final s = AppStrings.of(context);
    final state = ref.watch(routerControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(s.appTitle),
        actions: [
          IconButton(
            onPressed: () => ref.read(routerControllerProvider.notifier).toggleLocale(),
            icon: const Icon(Icons.language),
          ),
          IconButton(
            onPressed: () => ref.read(routerControllerProvider.notifier).toggleTheme(),
            icon: Icon(state.themeMode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(s.loginTitle, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            if (state.savedProfiles.isNotEmpty) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: state.savedProfiles
                    .map(
                      (p) => ActionChip(
                        label: Text('\${p.label} (\${p.gatewayIp})'),
                        onPressed: () => _selectSavedProfile(p),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _gatewayCtrl,
                    keyboardType: TextInputType.url,
                    decoration: InputDecoration(
                      labelText: s.gatewayIp,
                      hintText: '192.168.1.1 / 192.168.88.1',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton.tonal(
                  onPressed: _detecting ? null : _autoDetectGateway,
                  child: Text(_detecting ? '...' : s.autoDetect),
                ),
              ],
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<RouterDriverType>(
              value: _driverType,
              isExpanded: true,
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                labelText: s.isAr ? 'موديل الراوتر' : 'Router Model',
              ),
              items: RouterDriverType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(_driverLabel(t, s.isAr), overflow: TextOverflow.ellipsis)))
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _driverType = v);
              },
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _userCtrl,
              decoration: InputDecoration(
                labelText: s.username,
                hintText: 'admin',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _passCtrl,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: s.password,
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
            ),
            const SizedBox(height: 10),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _saveProfile,
              onChanged: (v) => setState(() => _saveProfile = v ?? true),
              title: Text(s.saveProfile),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            FilledButton(
              onPressed: state.isLoading ? null : _submit,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              child: state.isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(s.connect),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: state.isLoading ? null : _launchDemo,
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
              child: Text(s.demoMode),
            ),
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/main_shell.dart',
    folder: 'lib/screens',
    language: 'dart',
    summaryEn: 'Bottom navigation shell for Home, Devices, Consumption & Quotas, and Pro Tools.',
    summaryAr: 'هيكل التنقل السفلي لبرنامج ميكرو بوكس (الرئيسية، الأجهزة، الاستهلاك، أدوات برو).',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/router_controller.dart';
import '../core/l10n/app_strings.dart';
import 'dashboard_screen.dart';
import 'devices_screen.dart';
import 'quotas_screen.dart';
import 'tools_screen.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final s = AppStrings.of(context);
    final state = ref.watch(routerControllerProvider);
    final pages = const [
      DashboardScreen(),
      DevicesScreen(),
      QuotasScreen(),
      ToolsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(state.activeProfile?.label ?? s.appTitle),
        actions: [
          IconButton(
            tooltip: 'Language',
            onPressed: () => ref.read(routerControllerProvider.notifier).toggleLocale(),
            icon: const Icon(Icons.language),
          ),
          IconButton(
            tooltip: 'Theme',
            onPressed: () => ref.read(routerControllerProvider.notifier).toggleTheme(),
            icon: Icon(state.themeMode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: () => ref.read(routerControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.dashboard_outlined), label: s.tabHome),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: state.unknownDevices.isNotEmpty,
              label: Text('\${state.unknownDevices.length}'),
              child: const Icon(Icons.devices_outlined),
            ),
            label: s.tabDevices,
          ),
          NavigationDestination(icon: const Icon(Icons.data_usage_outlined), label: s.tabQuotas),
          NavigationDestination(icon: const Icon(Icons.tune_outlined), label: s.tabTools),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/dashboard_screen.dart',
    folder: 'lib/screens',
    language: 'dart',
    summaryEn: 'Dashboard displaying live throughput, daily total GB, MikroTik CPU/RAM health, Intruder Radar, and router capabilities.',
    summaryAr: 'الشاشة الرئيسية لعرض سرعة الشبكة واستهلاك اليوم وحالة معالج الراوتر ورادار المتطفلين.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/router_controller.dart';
import '../core/l10n/app_strings.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = AppStrings.of(context);
    final state = ref.watch(routerControllerProvider);
    final caps = state.capabilities;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: SwitchListTile(
            secondary: Icon(
              Icons.shield_outlined,
              color: state.autoBlockIntruders ? Colors.teal : null,
            ),
            title: Text(
              s.isAr ? 'درع منع الاختراق (حظر تلقائي للغرباء)' : 'Auto-Block Intruder Shield',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: Text(
              s.isAr
                  ? 'يحظر أي جهاز غير معتمد يحاول يدخل الواي فاي فوراً.'
                  : 'Automatically blocks unknown MACs on the router firewall.',
            ),
            value: state.autoBlockIntruders,
            onChanged: (v) => ref
                .read(routerControllerProvider.notifier)
                .toggleAutoBlockIntruders(v),
          ),
        ),
        const SizedBox(height: 8),
        if (state.unknownDevices.isNotEmpty)
          Card(
            color: Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.35),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.unknownAlert, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text('\${state.unknownDevices.first.hostname} · \${state.unknownDevices.first.ip}'),
                  const SizedBox(height: 10),
                  FilledButton.tonal(
                    onPressed: () => ref
                        .read(routerControllerProvider.notifier)
                        .toggleBlockDevice(state.unknownDevices.first),
                    child: Text(s.block),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.isAr ? 'سرعة التحميل' : 'Download'),
                      const SizedBox(height: 6),
                      Text(
                        '\${state.totalDownloadMbps.toStringAsFixed(1)} Mbps',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.isAr ? 'استهلاك اليوم' : "Today's GB"),
                      const SizedBox(height: 6),
                      Text(
                        '\${state.totalTodayGb.toStringAsFixed(2)} GB',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('CPU: \${state.health.cpuLoadPct}%', style: const TextStyle(fontWeight: FontWeight.w600)),
                Text('RAM: \${state.health.ramUsedPct}%', style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(state.health.uptime, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  s.isAr ? 'قدرات الراوتر الحالي' : 'Router Capabilities',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                _CapabilityRow(label: s.isAr ? 'تحديد السرعة (Queues)' : 'Speed Queues', native: caps.supportsBandwidthLimit, s: s),
                _CapabilityRow(label: s.isAr ? 'استهلاك الجيجات' : 'GB Consumption', native: caps.supportsQuotaTracking, s: s),
                _CapabilityRow(label: s.isAr ? 'طرد وحظر الأجهزة' : 'Block Devices', native: caps.supportsBlockDevice, s: s),
                _CapabilityRow(label: s.guestWifi, native: caps.supportsGuestWifi, s: s),
                _CapabilityRow(label: s.rebootRouter, native: caps.supportsReboot, s: s),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _CapabilityRow extends StatelessWidget {
  final String label;
  final bool native;
  final AppStrings s;

  const _CapabilityRow({required this.label, required this.native, required this.s});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            native ? s.nativeSupport : s.appLevelSupport,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: native ? Colors.teal : Colors.amber.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/devices_screen.dart',
    folder: 'lib/screens',
    language: 'dart',
    summaryEn: 'Connected devices with daily/monthly GB consumption, live speed, MikroTik Simple Queue + Priority editor, Block, and Wake-on-LAN.',
    summaryAr: 'شاشة الأجهزة المتصلة مع استهلاك اليوم والشهر وتحديد السرعة والأولوية والحظر و Wake-on-LAN.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/router_controller.dart';
import '../core/l10n/app_strings.dart';
import '../models/connected_device.dart';

class DevicesScreen extends ConsumerWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = AppStrings.of(context);
    final devices = ref.watch(routerControllerProvider).devices;

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: devices.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final d = devices[index];
        return Card(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            title: Text(d.alias, style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text('\${d.ip} · \${d.bandLabel} · \${s.isAr ? 'اليوم' : 'Today'}: \${d.todayUsedGb.toStringAsFixed(2)} GB'),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  d.isBlocked ? (s.isAr ? 'محظور' : 'Blocked') : '↓ \${d.downloadMbps} Mbps',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: d.isBlocked ? Colors.red : Colors.teal,
                  ),
                ),
                Text('\${d.quotaUsedGb.toStringAsFixed(1)} / \${d.quotaLimitGb.toStringAsFixed(0)} GB'),
              ],
            ),
            onTap: () => _openDeviceSheet(context, ref, d),
          ),
        );
      },
    );
  }

  void _openDeviceSheet(BuildContext context, WidgetRef ref, ConnectedDevice d) {
    final aliasCtrl = TextEditingController(text: d.alias);
    double limitMbps = d.downloadLimitMbps;
    double quotaGb = d.quotaLimitGb;
    bool speedEnabled = d.speedLimitEnabled;
    bool autoBlock = d.autoBlockOnQuotaExceeded;
    DeviceGroup selectedGroup = d.group;
    TrafficPriority selectedPriority = d.priority;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final s = AppStrings.of(ctx);
          return Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: aliasCtrl,
                  decoration: InputDecoration(
                    labelText: s.isAr ? 'اسم الجهاز' : 'Device Alias',
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<TrafficPriority>(
                  value: selectedPriority,
                  decoration: InputDecoration(
                    labelText: s.isAr ? 'أولوية السرعة (QoS)' : 'QoS Priority',
                    border: const OutlineInputBorder(),
                  ),
                  items: TrafficPriority.values
                      .map((p) => DropdownMenuItem(value: p, child: Text(p.name)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setModalState(() => selectedPriority = v);
                  },
                ),
                SwitchListTile(
                  value: speedEnabled,
                  onChanged: (v) => setModalState(() => speedEnabled = v),
                  title: Text(s.speedLimitToggle),
                ),
                if (speedEnabled)
                  Slider(
                    value: limitMbps,
                    min: 1,
                    max: 100,
                    divisions: 99,
                    label: '\${limitMbps.round()} Mbps',
                    onChanged: (v) => setModalState(() => limitMbps = v),
                  ),
                Slider(
                  value: quotaGb,
                  min: 1,
                  max: 200,
                  divisions: 199,
                  label: '\${quotaGb.round()} GB',
                  onChanged: (v) => setModalState(() => quotaGb = v),
                ),
                SwitchListTile(
                  value: autoBlock,
                  onChanged: (v) => setModalState(() => autoBlock = v),
                  title: Text(s.autoBlockToggle),
                ),
                Row(
                  children: [
                    IconButton.outlined(
                      tooltip: s.wakeOnLan,
                      onPressed: () async {
                        await ref.read(routerControllerProvider.notifier).wakeDevice(d.mac);
                      },
                      icon: const Icon(Icons.power_settings_new),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          ref.read(routerControllerProvider.notifier).toggleBlockDevice(d);
                          Navigator.pop(ctx);
                        },
                        child: Text(d.isBlocked ? s.unblock : s.block),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          ref.read(routerControllerProvider.notifier).updateDeviceRules(
                                device: d,
                                alias: aliasCtrl.text.trim(),
                                group: selectedGroup,
                                speedLimitEnabled: speedEnabled,
                                downloadLimitMbps: limitMbps,
                                uploadLimitMbps: (limitMbps * 0.3).clamp(1, 30),
                                priority: selectedPriority,
                                quotaLimitGb: quotaGb,
                                autoBlockOnExceed: autoBlock,
                              );
                          Navigator.pop(ctx);
                        },
                        child: Text(s.isAr ? 'حفظ' : 'Save'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/quotas_screen.dart',
    folder: 'lib/screens',
    language: 'dart',
    summaryEn: 'Per-device daily and monthly GB consumption screen with CSV export and 80%/100% warnings.',
    summaryAr: 'شاشة استهلاك الجيجات لكل جهاز (اليوم والشهر) مع تصدير CSV وتحذيرات 80% و 100%.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/router_controller.dart';
import '../core/l10n/app_strings.dart';
import '../services/csv_export_service.dart';

class QuotasScreen extends ConsumerWidget {
  const QuotasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = AppStrings.of(context);
    final state = ref.watch(routerControllerProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: FilledButton.tonalIcon(
            onPressed: () => CsvExportService.exportDevicesCsv(state.devices),
            icon: const Icon(Icons.download_outlined, size: 18),
            label: Text(s.isAr ? 'تصدير تقرير Excel (CSV)' : 'Export CSV'),
          ),
        ),
        const SizedBox(height: 12),
        for (final device in state.devices)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(device.alias, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(
                        '\${device.quotaUsedGb.toStringAsFixed(1)} / \${device.quotaLimitGb.toStringAsFixed(0)} GB',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    s.isAr
                        ? 'استهلاك النهاردة: \${device.todayUsedGb.toStringAsFixed(2)} GB'
                        : 'Used today: \${device.todayUsedGb.toStringAsFixed(2)} GB',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: device.quotaPercent,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                    color: device.isQuotaExceeded
                        ? Colors.red
                        : device.isWarning80
                            ? Colors.amber
                            : Colors.teal,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
`,
  },
  {
    path: 'lib/screens/tools_screen.dart',
    folder: 'lib/screens',
    language: 'dart',
    summaryEn: 'Pro tools: Guest Wi-Fi + QR share dialog, Ping & Jitter checker, and safe Router Reboot.',
    summaryAr: 'شاشة الأدوات الاحترافية: واي فاي الضيوف وكود QR وفحص البنج وإعادة التشغيل.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/router_controller.dart';
import '../core/l10n/app_strings.dart';
import '../widgets/wifi_qr_dialog.dart';

class ToolsScreen extends ConsumerWidget {
  const ToolsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = AppStrings.of(context);
    final state = ref.watch(routerControllerProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: Text(s.guestWifi),
                subtitle: Text('\${state.guestSsid} · \${state.guestCapMbps.round()} Mbps'),
                value: state.guestWifiEnabled,
                onChanged: (v) => ref.read(routerControllerProvider.notifier).toggleGuestWifi(v),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (_) => WifiQrDialog(
                          ssid: state.guestSsid,
                          password: state.guestPassword,
                        ),
                      );
                    },
                    icon: const Icon(Icons.qr_code_2),
                    label: Text(s.isAr ? 'مشاركة واي فاي الضيوف QR' : 'Share Guest QR'),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(s.pingCheck, style: const TextStyle(fontWeight: FontWeight.w700)),
                    FilledButton.tonal(
                      onPressed: () => ref.read(routerControllerProvider.notifier).runLatencyCheck(),
                      child: Text(s.isAr ? 'فحص الآن' : 'Run Ping'),
                    ),
                  ],
                ),
                if (state.gatewayPing != null) ...[
                  const SizedBox(height: 10),
                  Text('Gateway (\${state.gatewayPing!.host}): \${state.gatewayPing!.avgMs} ms'),
                  Text('Internet (1.1.1.1): \${state.internetPing?.avgMs ?? 0} ms'),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            title: Text(s.rebootRouter),
            subtitle: Text(s.isAr ? 'إعادة تشغيل آمنة للراوتر' : 'Restart router safely'),
            trailing: FilledButton.tonal(
              onPressed: () => ref.read(routerControllerProvider.notifier).rebootRouter(),
              child: Text(s.isAr ? 'رستر الآن' : 'Reboot'),
            ),
          ),
        ),
      ],
    );
  }
}
`,
  },
];
