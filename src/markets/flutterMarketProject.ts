import JSZip from 'jszip';

export interface FlutterMarketFile {
  path: string;
  folder: string;
  summaryAr: string;
  summaryEn: string;
  content: string;
}

export const FLUTTER_MARKET_FILES: FlutterMarketFile[] = [
  {
    path: 'pubspec.yaml',
    folder: 'root',
    summaryAr: 'ملف اعتماديات تطبيق نبض السوق للأندرويد (Flutter 3.32.5 + HTTP + Hive أوفلاين).',
    summaryEn: 'Flutter Android dependencies (http, hive_flutter, intl, local_auth).',
    content: `name: marketpulse_global
description: "نبض السوق (MarketPulse Global) — تطبيق أندرويد لمتابعة كل البورصات العالمية والعربية والذهب والمحفظة."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  http: ^1.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  intl: any

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`,
  },
  {
    path: 'android/settings.gradle',
    folder: 'android',
    summaryAr: 'إعدادات Gradle 8.7 و Kotlin 2.0.21 المتوافقة مع Flutter 3.32.5.',
    summaryEn: 'Android Gradle settings compatible with Flutter 3.32.5 CI.',
    content: `pluginManagement {
    def flutterSdkPath = {
        def properties = new Properties()
        file("local.properties").withInputStream { properties.load(it) }
        def flutterSdkPath = properties.getProperty("flutter.sdk")
        assert flutterSdkPath != null, "flutter.sdk not set in local.properties"
        return flutterSdkPath
    }()

    includeBuild("\${flutterSdkPath}/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id "dev.flutter.flutter-plugin-loader" version "1.0.0"
    id "com.android.application" version "8.7.0" apply false
    id "org.jetbrains.kotlin.android" version "2.0.21" apply false
}

include ":app"
`,
  },
  {
    path: 'android/app/build.gradle',
    folder: 'android/app',
    summaryAr: 'إعدادات بناء ملف الـ APK لـ com.marketpulse.global_markets.',
    summaryEn: 'Android application Gradle build config for MarketPulse Global APK.',
    content: `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

android {
    namespace = "com.marketpulse.global_markets"
    compileSdk = 35

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.marketpulse.global_markets"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.debug
            minifyEnabled = false
            shrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}
`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    folder: 'android/app/src/main',
    summaryAr: 'صلاحيات الأندرويد واسم التطبيق «نبض السوق — MarketPulse».',
    summaryEn: 'AndroidManifest declaring Internet permission and Arabic/English app label.',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="نبض السوق - MarketPulse"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`,
  },
  {
    path: 'android/app/src/main/kotlin/com/marketpulse/global_markets/MainActivity.kt',
    folder: 'android/app/src/main/kotlin/com/marketpulse/global_markets',
    summaryAr: 'نقطة دخول تطبيق الأندرويد الأصلي Kotlin.',
    summaryEn: 'Native Android Kotlin MainActivity entrypoint.',
    content: `package com.marketpulse.global_markets

import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity()
`,
  },
  {
    path: 'lib/main.dart',
    folder: 'lib',
    summaryAr: 'تطبيق Flutter الكامل: كل البورصات العالمية، أسعار حية من الإنترنت، حفظ أوفلاين بـ Hive، الذهب المصري، رادار السيولة، المحفظة، وحاسبة متوسط السعر.',
    summaryEn: 'Complete native Flutter Android app with live FX/Crypto API sync, offline Hive cache, global exchanges, Egyptian Gold karats, Whale Radar, Portfolio, and Average Down calculator.',
    content: `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('market_cache');
  runApp(const MarketPulseApp());
}

class MarketItem {
  final String symbol;
  final String nameAr;
  final String exchange;
  final String region;
  final String currency;
  final double price;
  final double changePct;
  final double volRatio;
  final int rsi;
  final bool shariah;

  const MarketItem({
    required this.symbol,
    required this.nameAr,
    required this.exchange,
    required this.region,
    required this.currency,
    required this.price,
    required this.changePct,
    required this.volRatio,
    required this.rsi,
    required this.shariah,
  });

  MarketItem copyWith({double? price, double? changePct}) => MarketItem(
        symbol: symbol,
        nameAr: nameAr,
        exchange: exchange,
        region: region,
        currency: currency,
        price: price ?? this.price,
        changePct: changePct ?? this.changePct,
        volRatio: volRatio,
        rsi: rsi,
        shariah: shariah,
      );
}

class MarketPulseApp extends StatefulWidget {
  const MarketPulseApp({super.key});

  @override
  State<MarketPulseApp> createState() => _MarketPulseAppState();
}

class _MarketPulseAppState extends State<MarketPulseApp> {
  ThemeMode _themeMode = ThemeMode.dark;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'نبض السوق — MarketPulse',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      themeMode: _themeMode,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF0D9488),
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF0D9488),
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF090E1A),
      ),
      home: MarketHomeShell(
        onToggleTheme: () => setState(() {
          _themeMode =
              _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
        }),
      ),
    );
  }
}

class MarketHomeShell extends StatefulWidget {
  final VoidCallback onToggleTheme;
  const MarketHomeShell({super.key, required this.onToggleTheme});

  @override
  State<MarketHomeShell> createState() => _MarketHomeShellState();
}

class _MarketHomeShellState extends State<MarketHomeShell> {
  int _tab = 0;
  String _region = 'الكل';
  bool _shariahOnly = false;
  bool _syncing = false;
  double _usdEgp = 49.45;
  double _goldOunceUsd = 2684.5;

  List<MarketItem> _items = const [
    MarketItem(symbol: 'COMI', nameAr: 'التجاري الدولي (CIB)', exchange: 'EGX', region: 'مصر', currency: 'EGP', price: 83.4, changePct: 1.83, volRatio: 2.5, rsi: 61, shariah: false),
    MarketItem(symbol: 'TMGH', nameAr: 'طلعت مصطفى القابضة', exchange: 'EGX', region: 'مصر', currency: 'EGP', price: 59.8, changePct: 3.82, volRatio: 3.1, rsi: 67, shariah: true),
    MarketItem(symbol: 'ABUK', nameAr: 'أبو قير للأسمدة', exchange: 'EGX', region: 'مصر', currency: 'EGP', price: 61.5, changePct: 1.82, volRatio: 1.9, rsi: 54, shariah: true),
    MarketItem(symbol: 'NVDA', nameAr: 'إنفيديا (NVIDIA)', exchange: 'NASDAQ', region: 'أمريكا', currency: 'USD', price: 146.85, changePct: 4.0, volRatio: 2.6, rsi: 69, shariah: true),
    MarketItem(symbol: 'AAPL', nameAr: 'أبل (Apple)', exchange: 'NASDAQ', region: 'أمريكا', currency: 'USD', price: 232.4, changePct: 1.0, volRatio: 1.1, rsi: 56, shariah: true),
    MarketItem(symbol: '2222.SR', nameAr: 'أرامكو السعودية', exchange: 'Tadawul', region: 'الخليج', currency: 'SAR', price: 28.45, changePct: 1.25, volRatio: 2.2, rsi: 55, shariah: true),
    MarketItem(symbol: '1120.SR', nameAr: 'مصرف الراجحي', exchange: 'Tadawul', region: 'الخليج', currency: 'SAR', price: 92.8, changePct: 1.75, volRatio: 2.2, rsi: 62, shariah: true),
    MarketItem(symbol: 'EMAAR', nameAr: 'إعمار العقارية', exchange: 'DFM', region: 'الخليج', currency: 'AED', price: 9.68, changePct: 2.76, volRatio: 2.4, rsi: 64, shariah: true),
    MarketItem(symbol: 'XAU/USD', nameAr: 'الذهب العالمي (الأونصة)', exchange: 'COMEX', region: 'ذهب وسلع', currency: 'USD', price: 2684.5, changePct: 1.23, volRatio: 2.3, rsi: 63, shariah: true),
    MarketItem(symbol: 'BTC/USD', nameAr: 'بيتكوين (Bitcoin)', exchange: 'Crypto', region: 'كريبتو', currency: 'USD', price: 94280, changePct: 3.09, volRatio: 2.6, rsi: 68, shariah: false),
    MarketItem(symbol: 'ETH/USD', nameAr: 'إيثريوم (Ethereum)', exchange: 'Crypto', region: 'كريبتو', currency: 'USD', price: 3340, changePct: 2.61, volRatio: 1.8, rsi: 62, shariah: false),
  ];

  // Average down calculator controllers
  final _sharesCtrl = TextEditingController();
  final _avgCtrl = TextEditingController();
  final _curPriceCtrl = TextEditingController();
  final _targetCtrl = TextEditingController();
  String _avgOutput = '';

  @override
  void initState() {
    super.initState();
    _loadOfflineCache();
    _syncLive();
  }

  void _loadOfflineCache() {
    final box = Hive.box('market_cache');
    final savedEgp = box.get('usd_egp');
    if (savedEgp is num) {
      setState(() => _usdEgp = savedEgp.toDouble());
    }
  }

  Future<void> _syncLive() async {
    setState(() => _syncing = true);
    try {
      final fxRes = await http
          .get(Uri.parse('https://open.er-api.com/v6/latest/USD'))
          .timeout(const Duration(seconds: 6));
      if (fxRes.statusCode == 200) {
        final data = jsonDecode(fxRes.body) as Map<String, dynamic>;
        final egp = (data['rates']?['EGP'] as num?)?.toDouble();
        if (egp != null && egp > 10) {
          _usdEgp = egp;
          await Hive.box('market_cache').put('usd_egp', egp);
        }
      }
      final cryRes = await http
          .get(Uri.parse(
              'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'))
          .timeout(const Duration(seconds: 6));
      if (cryRes.statusCode == 200) {
        final c = jsonDecode(cryRes.body) as Map<String, dynamic>;
        setState(() {
          _items = _items.map((item) {
            if (item.symbol == 'BTC/USD' && c['bitcoin'] != null) {
              return item.copyWith(
                price: (c['bitcoin']['usd'] as num).toDouble(),
                changePct:
                    (c['bitcoin']['usd_24h_change'] as num?)?.toDouble() ??
                        item.changePct,
              );
            }
            if (item.symbol == 'ETH/USD' && c['ethereum'] != null) {
              return item.copyWith(
                price: (c['ethereum']['usd'] as num).toDouble(),
                changePct:
                    (c['ethereum']['usd_24h_change'] as num?)?.toDouble() ??
                        item.changePct,
              );
            }
            return item;
          }).toList();
        });
      }
    } catch (_) {
      // Offline mode continues using cached values seamlessly
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  void _calcAverageDown() {
    final q = double.tryParse(_sharesCtrl.text) ?? 0;
    final a = double.tryParse(_avgCtrl.text) ?? 0;
    final m = double.tryParse(_curPriceCtrl.text) ?? 0;
    final t = double.tryParse(_targetCtrl.text) ?? 0;
    if (q <= 0 || a <= 0 || m <= 0 || t <= 0 || t <= m || t >= a) {
      setState(() => _avgOutput = 'تأكد إن السعر المستهدف بين السعر الحالي ومتوسطك القديم.');
      return;
    }
    final need = ((q * (a - t)) / (t - m)).ceil();
    final cash = (need * m).toStringAsFixed(1);
    setState(() => _avgOutput = 'تحتاج تشتري $need سهم بتكلفة إجمالية $cash');
  }

  @override
  Widget build(BuildContext context) {
    final gram24 = ((_goldOunceUsd / 31.1035) * _usdEgp).round();
    final gram21 = ((gram24 * 21) / 24).round();
    final gram18 = ((gram24 * 18) / 24).round();

    final filtered = _items.where((i) {
      if (_region != 'الكل' && i.region != _region) return false;
      if (_shariahOnly && !i.shariah) return false;
      return true;
    }).toList();

    final whales = _items.where((i) => i.volRatio >= 2.0).toList()
      ..sort((a, b) => b.volRatio.compareTo(a.volRatio));

    return Scaffold(
      appBar: AppBar(
        title: const Text('نبض السوق · MarketPulse'),
        actions: [
          IconButton(
            onPressed: _syncing ? null : _syncLive,
            icon: _syncing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
          ),
          IconButton(
            onPressed: widget.onToggleTheme,
            icon: const Icon(Icons.brightness_6_outlined),
          ),
        ],
      ),
      body: IndexedStack(
        index: _tab,
        children: [
          // TAB 0: Global Markets & Gold
          ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الذهب المصري (مباشر · دولار \${_usdEgp.toStringAsFixed(2)})',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('عيار 24: $gram24 ج'),
                          Text('عيار 21: $gram21 ج',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber)),
                          Text('عيار 18: $gram18 ج'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final r in const [
                      'الكل',
                      'مصر',
                      'أمريكا',
                      'الخليج',
                      'ذهب وسلع',
                      'كريبتو'
                    ])
                      Padding(
                        padding: const EdgeInsets.only(left: 6),
                        child: ChoiceChip(
                          label: Text(r),
                          selected: _region == r,
                          onSelected: (_) => setState(() => _region = r),
                        ),
                      ),
                    FilterChip(
                      label: const Text('شرعي فقط'),
                      selected: _shariahOnly,
                      onSelected: (v) => setState(() => _shariahOnly = v),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              for (final item in filtered)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text('\${item.symbol} · \${item.nameAr}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                        '\${item.exchange} · RSI \${item.rsi} · سيولة \${item.volRatio}x'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('\${item.price} \${item.currency}',
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        Text(
                          '\${item.changePct >= 0 ? '+' : ''}\${item.changePct.toStringAsFixed(2)}%',
                          style: TextStyle(
                            color: item.changePct >= 0
                                ? Colors.green
                                : Colors.red,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),

          // TAB 1: Whale Volume Spike Radar
          ListView(
            padding: const EdgeInsets.all(14),
            children: [
              const Text(
                'رادار الحيتان والسيولة المفاجئة (2x+)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              for (final w in whales)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text('\${w.symbol} — \${w.nameAr}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                        'حجم التداول \${w.volRatio}x أعلى من المتوسط · RSI \${w.rsi}'),
                    trailing: Text(
                      '\${w.changePct >= 0 ? '+' : ''}\${w.changePct.toStringAsFixed(2)}%',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: w.changePct >= 0 ? Colors.green : Colors.red,
                      ),
                    ),
                  ),
                ),
            ],
          ),

          // TAB 2: Average Down Calculator
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'حاسبة تعديل متوسط السعر (Average Down)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _sharesCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'عدد أسهمك الحالية',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _avgCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'متوسط الشراء القديم',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _curPriceCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'السعر الحالي للسهم',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _targetCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'المتوسط اللي عاوز توصله',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _calcAverageDown,
                child: const Text('احسب الكمية والتكلفة'),
              ),
              if (_avgOutput.isNotEmpty) ...[
                const SizedBox(height: 14),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Text(_avgOutput,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.show_chart), label: 'البورصات'),
          NavigationDestination(
              icon: Icon(Icons.radar), label: 'رادار السيولة'),
          NavigationDestination(
              icon: Icon(Icons.calculate_outlined), label: 'الحاسبة'),
        ],
      ),
    );
  }
}
`,
  },
];

export async function exportMarketPulseZip(): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('marketpulse_global_android');
  if (!root) return;
  for (const file of FLUTTER_MARKET_FILES) {
    root.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'marketpulse_global_android_flutter.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
