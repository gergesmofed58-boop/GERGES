import JSZip from 'jszip';

export interface CarpentryFlutterFile {
  path: string;
  folder: string;
  summaryAr: string;
  summaryEn: string;
  content: string;
}

export const CARPENTRY_FLUTTER_FILES: CarpentryFlutterFile[] = [
  {
    path: 'pubspec.yaml',
    folder: 'root',
    summaryAr: 'تعريف تطبيق الأندرويد الأسطى نجار 3D وحزم Flutter المستقرة للعمل بدون إنترنت.',
    summaryEn: 'Flutter 3.32.5 Android APK manifest and offline dependencies.',
    content: `name: osta_nagar_carpentry
description: OstaNagar 3D — Native Android Carpentry Cut-List, 3D Viewer & Sheet Optimizer APK.
publish_to: 'none'
version: 1.1.0+2

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  shared_preferences: ^2.3.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0

flutter:
  uses-material-design: true
`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    folder: 'android/app/src/main',
    summaryAr: 'ملف AndroidManifest باسم التطبيق «الأسطى نجار 3D» وصلاحيات التشغيل الكامل على أندرويد.',
    summaryEn: 'Android manifest configuring OstaNagar 3D app label and launcher activity.',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="الأسطى نجار 3D"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:taskAffinity=""
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
    path: 'android/app/src/main/kotlin/com/ostanagar/carpentry/MainActivity.kt',
    folder: 'android/app/src/main/kotlin/com/ostanagar/carpentry',
    summaryAr: 'نقطة تشغيل تطبيق الأندرويد بلغة Kotlin.',
    summaryEn: 'Kotlin Android MainActivity entry point.',
    content: `package com.ostanagar.carpentry

import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity()
`,
  },
  {
    path: 'android/app/build.gradle',
    folder: 'android/app',
    summaryAr: 'إعدادات بناء ملف الـ APK النهائي (Android SDK 35 و Java 17).',
    summaryEn: 'Android Gradle app build script targeting SDK 35 & JDK 17.',
    content: `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

android {
    namespace = "com.ostanagar.carpentry"
    compileSdk = 35
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.ostanagar.carpentry"
        minSdk = 23
        targetSdk = 35
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.debug
            minifyEnabled false
            shrinkResources false
        }
    }
}

flutter {
    source = "../.."
}
`,
  },
  {
    path: 'android/build.gradle',
    folder: 'android',
    summaryAr: 'ملف build.gradle الرئيسي لمشروع أندرويد.',
    summaryEn: 'Root Android Gradle configuration.',
    content: `allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.buildDir = "../build"
subprojects {
    project.buildDir = "\${rootProject.buildDir}/\${project.name}"
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register("clean", Delete) {
    delete rootProject.buildDir
}
`,
  },
  {
    path: 'android/settings.gradle',
    folder: 'android',
    summaryAr: 'ربط Flutter Gradle Plugin مع AGP 8.7 و Kotlin 2.0.21.',
    summaryEn: 'Android Gradle settings matching Flutter 3.32.5.',
    content: `pluginManagement {
    def flutterSdkPath = {
        def properties = new Properties()
        file("local.properties").withInputStream { properties.load(it) }
        def flutterSdkPath = properties.getProperty("flutter.sdk")
        assert flutterSdkPath != null, "flutter.sdk not set in local.properties"
        return flutterSdkPath
    }()

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

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
    path: 'lib/engine/carpentry_engine.dart',
    folder: 'lib/engine',
    summaryAr: 'محرك النجارة لـ 12 تصميم: التقطيع، سعر كل قطعة لوحدها، توزيع ألواح 122×244، وحساب الهالك بالمساحة والفلوس.',
    summaryEn: 'Parametric Dart engine for all 12 designs, per-piece EGP pricing, 2D 122x244 sheet packer & waste value calculator.',
    content: `import 'dart:math' as math;

enum FurnitureKind {
  wardrobe,
  dressing,
  bed,
  nightstand,
  dresser,
  kitchen,
  buffet,
  table,
  tvUnit,
  bookshelf,
  desk,
  shoeRack,
}

class CarpentryParams {
  final FurnitureKind kind;
  final double widthCm;
  final double heightCm;
  final double depthCm;
  final int doors;
  final int shelves;
  final int drawers;
  final int dividers;
  final double plinthCm;
  final double boardMm;
  final double kerfMm;
  final double sheetPriceEgp;
  final double laborPct;

  const CarpentryParams({
    required this.kind,
    required this.widthCm,
    required this.heightCm,
    required this.depthCm,
    required this.doors,
    required this.shelves,
    required this.drawers,
    required this.dividers,
    required this.plinthCm,
    this.boardMm = 18,
    this.kerfMm = 3,
    this.sheetPriceEgp = 1850,
    this.laborPct = 45,
  });

  CarpentryParams copyWith({
    FurnitureKind? kind,
    double? widthCm,
    double? heightCm,
    double? depthCm,
    int? doors,
    int? shelves,
    int? drawers,
    int? dividers,
    double? plinthCm,
    double? boardMm,
    double? sheetPriceEgp,
    double? laborPct,
  }) {
    return CarpentryParams(
      kind: kind ?? this.kind,
      widthCm: widthCm ?? this.widthCm,
      heightCm: heightCm ?? this.heightCm,
      depthCm: depthCm ?? this.depthCm,
      doors: doors ?? this.doors,
      shelves: shelves ?? this.shelves,
      drawers: drawers ?? this.drawers,
      dividers: dividers ?? this.dividers,
      plinthCm: plinthCm ?? this.plinthCm,
      boardMm: boardMm ?? this.boardMm,
      kerfMm: kerfMm,
      sheetPriceEgp: sheetPriceEgp ?? this.sheetPriceEgp,
      laborPct: laborPct ?? this.laborPct,
    );
  }
}

class CutPart {
  final String code;
  final String nameAr;
  final double lengthCm;
  final double widthCm;
  final int qty;
  final String edgeCode;
  final bool isBack;
  final String noteAr;
  final int estCostEgp;

  const CutPart({
    required this.code,
    required this.nameAr,
    required this.lengthCm,
    required this.widthCm,
    required this.qty,
    required this.edgeCode,
    this.isBack = false,
    required this.noteAr,
    this.estCostEgp = 0,
  });
}

class SheetRect {
  final String label;
  final double x;
  final double y;
  final double w;
  final double h;

  const SheetRect(this.label, this.x, this.y, this.w, this.h);
}

class PackedBoard {
  final int index;
  final List<SheetRect> rects;
  final double utilPct;

  const PackedBoard(this.index, this.rects, this.utilPct);
}

class CarpentryResult {
  final List<CutPart> parts;
  final List<PackedBoard> boards;
  final int backSheets;
  final double edgeMeters;
  final double diagonalCm;
  final int totalPieces;
  final int hardwareEgp;
  final double wastePct;
  final double wasteAreaM2;
  final int wasteCostEgp;
  final int rawMaterialEgp;
  final int totalQuoteEgp;
  final List<String> stepsAr;

  const CarpentryResult({
    required this.parts,
    required this.boards,
    required this.backSheets,
    required this.edgeMeters,
    required this.diagonalCm,
    required this.totalPieces,
    required this.hardwareEgp,
    required this.wastePct,
    required this.wasteAreaM2,
    required this.wasteCostEgp,
    required this.rawMaterialEgp,
    required this.totalQuoteEgp,
    required this.stepsAr,
  });
}

double _r1(double v) => (v * 10).roundToDouble() / 10;
double _r2(double v) => (v * 100).roundToDouble() / 100;

CarpentryResult computeCarpentry(CarpentryParams p) {
  final t = p.boardMm / 10.0;
  final w = p.widthCm;
  final h = p.heightCm;
  final d = p.depthCm;
  final innerW = _r1(w - 2 * t);
  final bodyH = _r1(h - p.plinthCm);
  final innerH = _r1(bodyH - 2 * t);
  final bays = p.dividers + 1;
  final bayW = _r1((innerW - p.dividers * t) / bays);
  final diag = _r1(math.sqrt(w * w + h * h));
  final rawParts = <CutPart>[];
  int hardwareCost = 220;

  final isBoxTemplate = p.kind == FurnitureKind.wardrobe ||
      p.kind == FurnitureKind.dressing ||
      p.kind == FurnitureKind.kitchen ||
      p.kind == FurnitureKind.bookshelf ||
      p.kind == FurnitureKind.tvUnit ||
      p.kind == FurnitureKind.shoeRack ||
      p.kind == FurnitureKind.nightstand ||
      p.kind == FurnitureKind.dresser ||
      p.kind == FurnitureKind.buffet;

  if (isBoxTemplate) {
    final bodyD = _r1(d - (p.doors > 0 ? t : 0));
    rawParts.add(CutPart(code: 'A', nameAr: 'جنب يمين وشمال', lengthCm: h, widthCm: bodyD, qty: 2, edgeCode: '1L+1W', noteAr: 'مفحار خلفي 6مم للظهر'));
    rawParts.add(CutPart(code: 'B', nameAr: 'سقف وأرضية العلبة', lengthCm: innerW, widthCm: bodyD, qty: 2, edgeCode: '1L', noteAr: 'تجميع خوابير 8مم + مسامير 4×50'));
    if (p.plinthCm > 0) {
      rawParts.add(CutPart(code: 'C', nameAr: 'وزرة سفلية أمام وخلف', lengthCm: innerW, widthCm: p.plinthCm, qty: 2, edgeCode: '1L', noteAr: 'ترجع للداخل 2سم'));
    }
    if (p.dividers > 0) {
      rawParts.add(CutPart(code: 'D', nameAr: 'قاطوع رأسي داخلي', lengthCm: innerH, widthCm: _r1(bodyD - 2), qty: p.dividers, edgeCode: '1L', noteAr: 'تقسيم الخانات الداخلية'));
    }
    if (p.shelves > 0) {
      rawParts.add(CutPart(code: 'E', nameAr: 'رفوف داخلية', lengthCm: bayW, widthCm: _r1(bodyD - 3), qty: p.shelves, edgeCode: '1L', noteAr: 'توزيع متساوي للرفوف'));
    }
    if (p.doors > 0) {
      final doorW = _r1((w - (p.doors + 1) * 0.3) / p.doors);
      final doorH = _r1(bodyH - 0.4);
      rawParts.add(CutPart(code: 'F', nameAr: 'ضلف أمامية', lengthCm: doorH, widthCm: doorW, qty: p.doors, edgeCode: '2L+2W', noteAr: 'قشاط PVC 2مم من 4 جهات + خلوص 3مم'));
      final hingesPerDoor = doorH < 100 ? 2 : (doorH < 160 ? 3 : 4);
      hardwareCost += p.doors * hingesPerDoor * 42 + p.doors * 65;
    }
    if (p.drawers > 0) {
      final boxW = _r1(bayW - 2.6);
      final slide = d >= 55 ? 45.0 : (d >= 42 ? 35.0 : 30.0);
      rawParts.add(CutPart(code: 'G', nameAr: 'وشوش أدراج', lengthCm: _r1(bayW - 0.4), widthCm: 19, qty: p.drawers, edgeCode: '2L+2W', noteAr: 'تغطية المجرى بخلوص 3مم'));
      rawParts.add(CutPart(code: 'H', nameAr: 'جوانب صناديق الأدراج', lengthCm: slide, widthCm: 15, qty: p.drawers * 2, edgeCode: '1L', noteAr: 'مجرى تلسكوبي \${slide.toInt()} سم'));
      rawParts.add(CutPart(code: 'I', nameAr: 'أمام وخلف الدرج', lengthCm: _r1(math.max(18, boxW - 2 * t)), widthCm: 15, qty: p.drawers * 2, edgeCode: '1L', noteAr: 'خصم 26مم للمجاري'));
      hardwareCost += p.drawers * 215;
    }
    if (p.kind == FurnitureKind.dresser) {
      rawParts.add(CutPart(code: 'M', nameAr: 'برواز المرآة الدائري/المستطيل', lengthCm: _r1(math.min(80, w * 0.6)), widthCm: 8, qty: 4, edgeCode: '2L', noteAr: 'مرآة بلجيكي 5مم'));
      hardwareCost += 550;
    }
    rawParts.add(CutPart(code: 'K', nameAr: 'ظهر أبلكاش 6مم', lengthCm: _r1(bodyH - 0.8), widthCm: _r1(w - 0.8), qty: 1, edgeCode: 'بدون', isBack: true, noteAr: 'يضبط زاوية 90° بالوترين'));
  } else if (p.kind == FurnitureKind.desk) {
    final legH = _r1(h - t);
    rawParts.add(CutPart(code: 'A', nameAr: 'قرصة المكتب العلوية', lengthCm: w, widthCm: d, qty: 1, edgeCode: '2L+2W', noteAr: 'شريط PVC 2مم دائري + فتحة كابلات 60مم'));
    rawParts.add(CutPart(code: 'B', nameAr: 'جوانب/أرجل المكتب', lengthCm: legH, widthCm: _r1(d - 4), qty: 2, edgeCode: '2L', noteAr: 'بروز القرصة 2سم'));
    rawParts.add(CutPart(code: 'C', nameAr: 'مريلة ظهر تقوية', lengthCm: _r1(w - 48), widthCm: 38, qty: 1, edgeCode: '1L', noteAr: 'تمنع اهتزاز المكتب'));
    if (p.drawers > 0) {
      rawParts.add(CutPart(code: 'D', nameAr: 'وشوش أدراج الكمودة', lengthCm: 42, widthCm: 19, qty: p.drawers, edgeCode: '2L+2W', noteAr: 'مجرى تلسكوبي 45سم'));
      hardwareCost += p.drawers * 210;
    }
  } else if (p.kind == FurnitureKind.bed) {
    rawParts.add(CutPart(code: 'A', nameAr: 'لوح شباك الرأس', lengthCm: _r1(w - 4), widthCm: _r1(h - 45), qty: 1, edgeCode: '2L+2W', noteAr: 'تجميع خوابير زان 10مم'));
    rawParts.add(CutPart(code: 'B', nameAr: 'جوانب السرير (فخذين)', lengthCm: _r1(d + 1), widthCm: 22, qty: 2, edgeCode: '2L', noteAr: 'خطاف سرير معدن تقيل'));
    rawParts.add(CutPart(code: 'C', nameAr: 'شباك القدم الأمامي', lengthCm: _r1(w - 4), widthCm: 22, qty: 1, edgeCode: '2L', noteAr: 'متناسق مع ارتفاع المرتبة'));
    rawParts.add(CutPart(code: 'D', nameAr: 'مولل السرير (موسكي)', lengthCm: _r1(w + 0.5), widthCm: 8, qty: math.max(10, p.shelves), edgeCode: 'بدون', noteAr: 'توزيع متساوي للتهوية'));
    hardwareCost += 420;
  } else {
    rawParts.add(CutPart(code: 'A', nameAr: 'قرصة الترابيزة', lengthCm: w, widthCm: d, qty: 1, edgeCode: '2L+2W', noteAr: 'بروز 6سم من كل جهة'));
    rawParts.add(CutPart(code: 'B', nameAr: 'أرجل زان 8×8 سم', lengthCm: _r1(h - 3.6), widthCm: 8, qty: 4, edgeCode: 'بدون', noteAr: 'ربط بكعوب مائلة 45° وجوايط'));
    rawParts.add(CutPart(code: 'C', nameAr: 'مرايل طولية أمام وخلف', lengthCm: _r1(w - 28), widthCm: 10, qty: 2, edgeCode: '1L', noteAr: 'تثبيت القرصة بكليبسات تمدد'));
    rawParts.add(CutPart(code: 'D', nameAr: 'مرايل عرضية يمين وشمال', lengthCm: _r1(d - 28), widthCm: 10, qty: 2, edgeCode: '1L', noteAr: 'تقوية ضد الميلان'));
    hardwareCost += 360;
  }

  // Compute per-piece EGP estimate & pack onto 122 x 244 cm sheets
  const sheetW = 122.0;
  const sheetH = 244.0;
  const sheetAreaM2 = (sheetW * sheetH) / 10000.0;
  final pricePerM2Main = p.sheetPriceEgp / sheetAreaM2;
  const pricePerM2Back = 580.0 / sheetAreaM2;

  final parts = rawParts.map((part) {
    final areaM2 = (part.lengthCm * part.widthCm * part.qty) / 10000.0;
    final cost = (areaM2 * (part.isBack ? pricePerM2Back : pricePerM2Main)).round();
    return CutPart(
      code: part.code,
      nameAr: part.nameAr,
      lengthCm: part.lengthCm,
      widthCm: part.widthCm,
      qty: part.qty,
      edgeCode: part.edgeCode,
      isBack: part.isBack,
      noteAr: part.noteAr,
      estCostEgp: math.max(1, cost),
    );
  }).toList();

  final kerf = p.kerfMm / 10.0;
  final mainRects = <({String label, double w, double h})>[];
  double backArea = 0;
  double edgeTotalCm = 0;
  double mainUsedCm2 = 0;

  for (final part in parts) {
    if (part.edgeCode.contains('2L')) edgeTotalCm += part.lengthCm * 2 * part.qty;
    else if (part.edgeCode.contains('1L')) edgeTotalCm += part.lengthCm * part.qty;
    if (part.edgeCode.contains('2W')) edgeTotalCm += part.widthCm * 2 * part.qty;
    else if (part.edgeCode.contains('1W')) edgeTotalCm += part.widthCm * part.qty;

    if (part.isBack) {
      backArea += part.lengthCm * part.widthCm * part.qty;
      continue;
    }
    for (int i = 1; i <= part.qty; i++) {
      final rw = math.min(part.widthCm, 120.0);
      final rh = math.min(part.lengthCm, 242.0);
      mainUsedCm2 += rw * rh;
      mainRects.add((
        label: part.qty > 1 ? '\${part.code}\$i' : part.code,
        w: rw,
        h: rh,
      ));
    }
  }

  mainRects.sort((a, b) => b.h.compareTo(a.h));
  final boards = <PackedBoard>[];
  final openRects = <List<SheetRect>>[];
  final openCursors = <List<List<double>>>[];

  for (final item in mainRects) {
    bool placed = false;
    for (int b = 0; b < openRects.length; b++) {
      for (final row in openCursors[b]) {
        if (item.h <= row[1] + 0.1 && row[2] + item.w <= sheetW - 2) {
          openRects[b].add(SheetRect(item.label, 1 + row[2], 1 + row[0], item.w, item.h));
          row[2] += item.w + kerf;
          placed = true;
          break;
        }
      }
      if (placed) break;
      final nextY = openCursors[b].isEmpty ? 0.0 : openCursors[b].last[0] + openCursors[b].last[1] + kerf;
      if (nextY + item.h <= sheetH - 2 && item.w <= sheetW - 2) {
        openCursors[b].add([nextY, item.h, item.w + kerf]);
        openRects[b].add(SheetRect(item.label, 1, 1 + nextY, item.w, item.h));
        placed = true;
        break;
      }
    }
    if (!placed) {
      openRects.add([SheetRect(item.label, 1, 1, item.w, item.h)]);
      openCursors.add([[0, item.h, item.w + kerf]]);
    }
  }

  for (int i = 0; i < openRects.length; i++) {
    final used = openRects[i].fold<double>(0, (s, r) => s + r.w * r.h);
    boards.add(PackedBoard(i + 1, openRects[i], _r1(math.min(99, used / (sheetW * sheetH) * 100))));
  }

  final totalSheetCm2 = boards.length * sheetW * sheetH;
  final wasteCm2 = math.max(0.0, totalSheetCm2 - mainUsedCm2);
  final wastePct = totalSheetCm2 <= 0 ? 0.0 : _r1((wasteCm2 / totalSheetCm2) * 100);
  final wasteAreaM2 = _r2(wasteCm2 / 10000.0);
  final mainSheetsCost = (boards.length * p.sheetPriceEgp).round();
  final wasteCostEgp = (mainSheetsCost * (wastePct / 100.0)).round();

  final backSheets = backArea <= 0 ? 0 : math.max(1, (backArea * 1.12 / (sheetW * sheetH)).ceil());
  final edgeMeters = _r1((edgeTotalCm / 100.0) * 1.12);
  final rawMaterialEgp = (mainSheetsCost + backSheets * 580 + edgeMeters * 18 + hardwareCost + 350).round();
  final totalQuote = (rawMaterialEgp * (1 + p.laborPct / 100.0)).round();

  return CarpentryResult(
    parts: parts,
    boards: boards,
    backSheets: backSheets,
    edgeMeters: edgeMeters,
    diagonalCm: diag,
    totalPieces: parts.fold(0, (s, x) => s + x.qty),
    hardwareEgp: hardwareCost,
    wastePct: wastePct,
    wasteAreaM2: wasteAreaM2,
    wasteCostEgp: wasteCostEgp,
    rawMaterialEgp: rawMaterialEgp,
    totalQuoteEgp: totalQuote,
    stepsAr: [
      '1. تقطيع ألواح الخشب (\${boards.length} لوح 122×244 سم — الهالك \${wastePct}% بقيمة \${wasteCostEgp} ج.م) وقشط شريط الحرف PVC (\${edgeMeters} متر).',
      '2. تجميع الشاسيه الرئيسي بخوابير 8مم وغراء أبيض ومسامير 4×50 والتأكد من تساوي الوترين عند \${diag} سم لضبط زاوية 90°.',
      '3. تركيب القواطيع والرفوف والمجاري التلسكوبي بميزان الميه مع خصم 13مم لكل جنب للمجرى.',
      '4. تفريغ كوباية المفصلات 35مم على بُعد 22مم من الحرف، ووزن الضلف بخلوص موحد 3مم ثم التشطيب النهائي.',
    ],
  );
}
`,
  },
  {
    path: 'lib/widgets/furniture_3d_painter.dart',
    folder: 'lib/widgets',
    summaryAr: 'محرك رسم 3D تفاعلي حقيقي باللمس 360° لكل الـ 12 تصميم مع التفكيك (Exploded View) وفتح الضلف.',
    summaryEn: 'Native Flutter 3D perspective renderer for all 12 furniture designs with touch orbit, exploded view, and door toggle.',
    content: `import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../engine/carpentry_engine.dart';

class _Vec3 {
  final double x, y, z;
  const _Vec3(this.x, this.y, this.z);
}

class _Box3D {
  final double cx, cy, cz, sx, sy, sz;
  final Color color;
  const _Box3D(this.cx, this.cy, this.cz, this.sx, this.sy, this.sz, this.color);
}

class _Face2D {
  final List<Offset> pts;
  final double depth;
  final Color fill;
  const _Face2D(this.pts, this.depth, this.fill);
}

class Furniture3DPainter extends CustomPainter {
  final CarpentryParams params;
  final double yaw;
  final double pitch;
  final double explode;
  final bool openDoors;

  Furniture3DPainter({
    required this.params,
    required this.yaw,
    required this.pitch,
    required this.explode,
    required this.openDoors,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = params.widthCm / 100.0;
    final h = params.heightCm / 100.0;
    final d = params.depthCm / 100.0;
    final t = params.boardMm / 1000.0;
    final exp = explode * 0.68;

    const woodMain = Color(0xFFC89E6B);
    const woodFront = Color(0xFFA97B47);
    const woodBack = Color(0xFFD9C7AA);
    const mirrorTone = Color(0xFFBFD7EA);

    final boxes = <_Box3D>[];
    if (params.kind == FurnitureKind.table) {
      boxes.add(_Box3D(0, h / 2 - 0.02 + exp, 0, w, 0.04, d, woodFront));
      final lx = w / 2 - 0.1;
      final lz = d / 2 - 0.1;
      for (final sx in [-1.0, 1.0]) {
        for (final sz in [-1.0, 1.0]) {
          boxes.add(_Box3D(sx * (lx + exp * 0.5), -0.02, sz * (lz + exp * 0.5), 0.08, h - 0.04, 0.08, woodMain));
        }
      }
      boxes.add(_Box3D(0, h / 2 - 0.09, lz, w - 0.24, 0.10, t, woodMain));
      boxes.add(_Box3D(0, h / 2 - 0.09, -lz, w - 0.24, 0.10, t, woodMain));
    } else if (params.kind == FurnitureKind.bed) {
      boxes.add(_Box3D(0, 0.05, -d / 2 - exp, w, h, t * 1.4, woodFront));
      boxes.add(_Box3D(0, -h / 2 + 0.22, d / 2 + exp, w, 0.44, t * 1.4, woodFront));
      boxes.add(_Box3D(-w / 2 - exp, -h / 2 + 0.26, 0, t * 1.4, 0.22, d, woodMain));
      boxes.add(_Box3D(w / 2 + exp, -h / 2 + 0.26, 0, t * 1.4, 0.22, d, woodMain));
      final slats = math.max(8, math.min(14, params.shelves));
      for (int i = 0; i < slats; i++) {
        final sz = -d / 2 + 0.1 + ((d - 0.2) / (slats - 1)) * i;
        boxes.add(_Box3D(0, -h / 2 + 0.28 + exp * 0.5, sz, w - 0.06, 0.02, 0.07, woodBack));
      }
    } else {
      final plinth = params.plinthCm / 100.0;
      boxes.add(_Box3D(-w / 2 + t / 2 - exp, 0, 0, t, h, d, woodMain));
      boxes.add(_Box3D(w / 2 - t / 2 + exp, 0, 0, t, h, d, woodMain));
      boxes.add(_Box3D(0, h / 2 - t / 2 + exp, 0, w - 2 * t, t, d, woodMain));
      boxes.add(_Box3D(0, -h / 2 + plinth + t / 2 - exp * 0.5, 0, w - 2 * t, t, d, woodMain));
      boxes.add(_Box3D(0, 0, -d / 2 - exp, w - 0.02, h - 0.02, 0.01, woodBack));

      for (int dv = 1; dv <= math.min(3, params.dividers); dv++) {
        final dx = -w / 2 + (w / (params.dividers + 1)) * dv;
        boxes.add(_Box3D(dx, plinth / 2, 0, t, h - plinth - 2 * t, d - 0.03, woodMain));
      }

      for (int s = 1; s <= math.min(6, params.shelves); s++) {
        final sy = -h / 2 + plinth + ((h - plinth) / (math.min(6, params.shelves) + 1)) * s;
        boxes.add(_Box3D(0, sy, exp * 0.3, w - 2 * t, t, d - 0.04, woodMain));
      }

      if (params.doors > 0 && !openDoors) {
        final dw = (w - 0.01 * params.doors) / params.doors;
        for (int i = 0; i < params.doors; i++) {
          final dx = -w / 2 + dw / 2 + i * (dw + 0.01);
          boxes.add(_Box3D(dx, plinth / 2, d / 2 + t / 2 + exp * 1.4, dw - 0.005, h - plinth, t, woodFront));
        }
      } else if (params.drawers > 0 && params.doors == 0) {
        final dh = (h - plinth - 0.04) / math.min(4, params.drawers);
        for (int i = 0; i < math.min(4, params.drawers); i++) {
          final dy = -h / 2 + plinth + dh / 2 + i * dh;
          boxes.add(_Box3D(0, dy, d / 2 + t / 2 + exp * 1.2, w - 0.03, dh - 0.012, t, woodFront));
        }
      }

      if (params.kind == FurnitureKind.dresser) {
        final mSize = math.min(0.75, w * 0.58);
        boxes.add(_Box3D(0, h / 2 + mSize / 2 + 0.04 + exp, -d / 2 + 0.03, mSize, mSize, 0.03, mirrorTone));
      }
    }

    final maxDim = math.max(w, math.max(h + (params.kind == FurnitureKind.dresser ? 0.65 : 0), d));
    final scale = math.min(size.width, size.height) * 0.52 / math.max(1.0, maxDim);
    final center = Offset(size.width / 2, size.height / 2 + 14);

    _Vec3 rot(_Vec3 v) {
      final cy = math.cos(yaw), sy = math.sin(yaw);
      final x1 = v.x * cy - v.z * sy;
      final z1 = v.x * sy + v.z * cy;
      final cp = math.cos(pitch), sp = math.sin(pitch);
      final y2 = v.y * cp - z1 * sp;
      final z2 = v.y * sp + z1 * cp;
      return _Vec3(x1, y2, z2);
    }

    Offset proj(_Vec3 v) {
      final persp = 4.2 / (4.2 - v.z);
      return Offset(center.dx + v.x * scale * persp, center.dy - v.y * scale * persp);
    }

    final faces = <_Face2D>[];
    const faceIndices = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [1, 2, 6, 5],
      [0, 3, 7, 4],
    ];
    const shade = [1.0, 0.72, 0.84, 1.08, 0.9, 0.78];

    for (final b in boxes) {
      final hx = b.sx / 2, hy = b.sy / 2, hz = b.sz / 2;
      final corners = [
        _Vec3(b.cx - hx, b.cy - hy, b.cz + hz),
        _Vec3(b.cx + hx, b.cy - hy, b.cz + hz),
        _Vec3(b.cx + hx, b.cy + hy, b.cz + hz),
        _Vec3(b.cx - hx, b.cy + hy, b.cz + hz),
        _Vec3(b.cx - hx, b.cy - hy, b.cz - hz),
        _Vec3(b.cx + hx, b.cy - hy, b.cz - hz),
        _Vec3(b.cx + hx, b.cy + hy, b.cz - hz),
        _Vec3(b.cx - hx, b.cy + hy, b.cz - hz),
      ].map(rot).toList();

      for (int f = 0; f < 6; f++) {
        final idx = faceIndices[f];
        final avgZ = (corners[idx[0]].z + corners[idx[1]].z + corners[idx[2]].z + corners[idx[3]].z) / 4.0;
        final pts = idx.map((k) => proj(corners[k])).toList();
        final hsl = HSLColor.fromColor(b.color);
        final lit = hsl.withLightness((hsl.lightness * shade[f]).clamp(0.15, 0.88)).toColor();
        faces.add(_Face2D(pts, avgZ, lit));
      }
    }

    faces.sort((a, b) => a.depth.compareTo(b.depth));
    final strokePaint = Paint()
      ..color = const Color(0xFF4A3520).withValues(alpha: 0.45)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    for (final face in faces) {
      final path = Path()..addPolygon(face.pts, true);
      canvas.drawPath(path, Paint()..color = face.fill);
      canvas.drawPath(path, strokePaint);
    }
  }

  @override
  bool shouldRepaint(covariant Furniture3DPainter old) => true;
}
`,
  },
  {
    path: 'lib/main.dart',
    folder: 'lib',
    summaryAr: 'التطبيق الكامل بالمصري العامي: 12 تصميم، عرض 3D وتفكيك واسع، مصمم الأوض والمساحات، سعر لوح الخشب، حساب الهالك بالفلوس، ومقاس وتكلفة كل حتة.',
    summaryEn: 'Complete Egyptian Arabic RTL Material 3 Android app with 12 designs, wide 3D explode viewer, Room Space Architect tab, sheet price input, waste cost & per-piece breakdown.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'engine/carpentry_engine.dart';
import 'widgets/furniture_3d_painter.dart';

void main() {
  runApp(const OstaNagarApp());
}

class OstaNagarApp extends StatelessWidget {
  const OstaNagarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'الأسطى نجار 3D',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFFB45309),
        scaffoldBackgroundColor: const Color(0xFFF8F7F4),
      ),
      home: const CarpentryHomeScreen(),
    );
  }
}

class CarpentryHomeScreen extends StatefulWidget {
  const CarpentryHomeScreen({super.key});

  @override
  State<CarpentryHomeScreen> createState() => _CarpentryHomeScreenState();
}

class _CarpentryHomeScreenState extends State<CarpentryHomeScreen> {
  int _tab = 0;
  double _yaw = 0.58;
  double _pitch = 0.28;
  double _explode = 0.0;
  bool _openDoors = false;

  // Room & Space Architect state
  double _roomLengthCm = 380;
  double _roomWidthCm = 340;
  double _roomCeilingCm = 280;
  String _roomType = 'auto';

  CarpentryParams _params = const CarpentryParams(
    kind: FurnitureKind.wardrobe,
    widthCm: 180,
    heightCm: 220,
    depthCm: 60,
    doors: 3,
    shelves: 4,
    drawers: 3,
    dividers: 1,
    plinthCm: 8,
    sheetPriceEgp: 1950,
  );

  void _selectTemplate(FurnitureKind kind) {
    final price = _params.sheetPriceEgp;
    setState(() {
      switch (kind) {
        case FurnitureKind.wardrobe:
          _params = CarpentryParams(kind: kind, widthCm: 180, heightCm: 220, depthCm: 60, doors: 3, shelves: 4, drawers: 3, dividers: 1, plinthCm: 8, sheetPriceEgp: price);
        case FurnitureKind.dressing:
          _params = CarpentryParams(kind: kind, widthCm: 240, heightCm: 240, depthCm: 58, doors: 0, shelves: 8, drawers: 4, dividers: 2, plinthCm: 8, sheetPriceEgp: price);
        case FurnitureKind.bed:
          _params = CarpentryParams(kind: kind, widthCm: 160, heightCm: 105, depthCm: 200, doors: 0, shelves: 14, drawers: 0, dividers: 1, plinthCm: 0, sheetPriceEgp: price);
        case FurnitureKind.nightstand:
          _params = CarpentryParams(kind: kind, widthCm: 55, heightCm: 56, depthCm: 42, doors: 0, shelves: 0, drawers: 2, dividers: 0, plinthCm: 10, sheetPriceEgp: price);
        case FurnitureKind.dresser:
          _params = CarpentryParams(kind: kind, widthCm: 120, heightCm: 82, depthCm: 48, doors: 0, shelves: 0, drawers: 6, dividers: 1, plinthCm: 12, sheetPriceEgp: price);
        case FurnitureKind.kitchen:
          _params = CarpentryParams(kind: kind, widthCm: 140, heightCm: 85, depthCm: 58, doors: 2, shelves: 1, drawers: 3, dividers: 1, plinthCm: 10, sheetPriceEgp: price);
        case FurnitureKind.buffet:
          _params = CarpentryParams(kind: kind, widthCm: 180, heightCm: 86, depthCm: 45, doors: 4, shelves: 2, drawers: 3, dividers: 2, plinthCm: 14, sheetPriceEgp: price);
        case FurnitureKind.table:
          _params = CarpentryParams(kind: kind, widthCm: 180, heightCm: 76, depthCm: 95, doors: 0, shelves: 0, drawers: 0, dividers: 0, plinthCm: 0, sheetPriceEgp: price);
        case FurnitureKind.tvUnit:
          _params = CarpentryParams(kind: kind, widthCm: 200, heightCm: 52, depthCm: 42, doors: 2, shelves: 2, drawers: 2, dividers: 2, plinthCm: 10, sheetPriceEgp: price);
        case FurnitureKind.bookshelf:
          _params = CarpentryParams(kind: kind, widthCm: 160, heightCm: 200, depthCm: 35, doors: 0, shelves: 5, drawers: 0, dividers: 2, plinthCm: 8, sheetPriceEgp: price);
        case FurnitureKind.desk:
          _params = CarpentryParams(kind: kind, widthCm: 140, heightCm: 76, depthCm: 65, doors: 0, shelves: 0, drawers: 3, dividers: 0, plinthCm: 0, sheetPriceEgp: price);
        case FurnitureKind.shoeRack:
          _params = CarpentryParams(kind: kind, widthCm: 90, heightCm: 115, depthCm: 36, doors: 2, shelves: 5, drawers: 1, dividers: 0, plinthCm: 8, sheetPriceEgp: price);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final res = computeCarpentry(_params);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('الأسطى نجار 3D', style: TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
        ),
        body: IndexedStack(
          index: _tab,
          children: [
            _buildDesignerTab(res),
            _buildRoomTab(),
            _buildCutListTab(res),
            _buildSheetsTab(res),
            _buildGuideTab(res),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.view_in_ar), label: 'المصمم 3D'),
            NavigationDestination(icon: Icon(Icons.home_outlined), label: 'أوضة 3D'),
            NavigationDestination(icon: Icon(Icons.table_chart), label: 'التقطيع'),
            NavigationDestination(icon: Icon(Icons.grid_view), label: 'الألواح'),
            NavigationDestination(icon: Icon(Icons.construction), label: 'الشرح'),
          ],
        ),
      ),
    );
  }

  Widget _buildDesignerTab(CarpentryResult res) {
    final labels = {
      FurnitureKind.wardrobe: 'دولاب',
      FurnitureKind.dressing: 'دريسينج روم',
      FurnitureKind.bed: 'سرير',
      FurnitureKind.nightstand: 'كومودينو',
      FurnitureKind.dresser: 'تسريحة بمرآة',
      FurnitureKind.kitchen: 'مطبخ',
      FurnitureKind.buffet: 'بوفيه سفرة',
      FurnitureKind.table: 'ترابيزة',
      FurnitureKind.tvUnit: 'وحدة TV',
      FurnitureKind.bookshelf: 'مكتبة',
      FurnitureKind.desk: 'مكتب',
      FurnitureKind.shoeRack: 'جزامة مدخل',
    };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: FurnitureKind.values.map((k) {
              final selected = _params.kind == k;
              return Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: ChoiceChip(
                  label: Text(labels[k]!),
                  selected: selected,
                  onSelected: (_) => _selectTemplate(k),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onPanUpdate: (d) => setState(() {
            _yaw += d.delta.dx * 0.012;
            _pitch = (_pitch + d.delta.dy * 0.01).clamp(-0.6, 1.1);
          }),
          child: Container(
            height: 280,
            decoration: BoxDecoration(
              color: const Color(0xFFF1EEE8),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.brown.shade200),
            ),
            child: Stack(
              children: [
                CustomPaint(
                  size: Size.infinite,
                  painter: Furniture3DPainter(
                    params: _params,
                    yaw: _yaw,
                    pitch: _pitch,
                    explode: _explode,
                    openDoors: _openDoors,
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                    child: Text(
                      '3D · عرض \${_params.widthCm.toInt()} × ارتفاع \${_params.heightCm.toInt()} × عمق \${_params.depthCm.toInt()} سنتي',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: () => setState(() => _explode = _explode > 0.5 ? 0.0 : 1.0),
              icon: const Icon(Icons.open_in_full, size: 16),
              label: Text(_explode > 0.5 ? 'تجميع' : 'تفكيك واسع', style: const TextStyle(fontSize: 11)),
            ),
            Expanded(
              child: Slider(
                value: _explode,
                onChanged: (v) => setState(() => _explode = v),
              ),
            ),
            if (_params.doors > 0)
              TextButton.icon(
                onPressed: () => setState(() => _openDoors = !_openDoors),
                icon: const Icon(Icons.door_front_door_outlined, size: 18),
                label: Text(_openDoors ? 'قفل' : 'فتح'),
              ),
          ],
        ),
        _dimSlider('سعر اللوح (جنيه)', _params.sheetPriceEgp, 600, 5000, (v) => setState(() => _params = _params.copyWith(sheetPriceEgp: v)), step: 50),
        _dimSlider('العرض (سنتي)', _params.widthCm, 40, 320, (v) => setState(() => _params = _params.copyWith(widthCm: v))),
        _dimSlider('الارتفاع (سنتي)', _params.heightCm, 40, 260, (v) => setState(() => _params = _params.copyWith(heightCm: v))),
        _dimSlider('العمق (سنتي)', _params.depthCm, 25, 220, (v) => setState(() => _params = _params.copyWith(depthCm: v))),
        const SizedBox(height: 6),
        Card(
          color: const Color(0xFFFFFBEB),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _stat('الألواح', '\${res.boards.length} لوح'),
                    _stat('الهالك', '\${res.wastePct}% (\${res.wasteAreaM2} متر²)'),
                    _stat('قيمة الهالك', '\${res.wasteCostEgp} جنيه', isDanger: true),
                  ],
                ),
                const Divider(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _stat('الحتت', '\${res.totalPieces} حتة'),
                    _stat('خامات فقط', '\${res.rawMaterialEgp} جنيه'),
                    _stat('سعر للعميل', '\${res.totalQuoteEgp} جنيه'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRoomTab() {
    final areaM2 = ((_roomLengthCm * _roomWidthCm) / 10000.0);
    final resolvedType = _roomType != 'auto'
        ? _roomType
        : areaM2 < 4.5
            ? 'entryway'
            : areaM2 < 7.5
                ? 'dressing'
                : areaM2 < 11.0
                    ? 'kitchen'
                    : areaM2 < 16.0
                        ? 'bedroom'
                        : 'living';

    final maxH = (_roomCeilingCm - 25).clamp(180.0, 250.0).toDouble();
    final price = _params.sheetPriceEgp;
    final roomItems = <Map<String, Object>>[];
    String suggestion = '';

    if (resolvedType == 'entryway') {
      suggestion = 'المساحة دي (\${areaM2.toStringAsFixed(1)} متر مربع) ممتازة لركن مدخل شيك بجزامة ومكتبة خفيفة عشان تسيب ممر مشي واسع.';
      roomItems.add({
        'title': 'جزامة مدخل متظبطة على الحيطة',
        'params': CarpentryParams(kind: FurnitureKind.shoeRack, widthCm: (_roomLengthCm - 35).clamp(70.0, 150.0).toDouble(), heightCm: 115, depthCm: 36, doors: 2, shelves: 5, drawers: 1, dividers: 0, plinthCm: 8, sheetPriceEgp: price),
      });
    } else if (resolvedType == 'dressing') {
      suggestion = 'الأوضة دي (\${areaM2.toStringAsFixed(1)} متر مربع) تعمللك دريسينج روم مفتوح محترمة لحد قرب السقف ومعاها تسريحة أو وحدة أدراج.';
      roomItems.add({
        'title': 'دريسينج روم رئيسية على الحيطة الطويلة',
        'params': CarpentryParams(kind: FurnitureKind.dressing, widthCm: (_roomLengthCm - 30).clamp(140.0, 320.0).toDouble(), heightCm: maxH, depthCm: 58, doors: 0, shelves: 8, drawers: 4, dividers: 2, plinthCm: 8, sheetPriceEgp: price),
      });
      roomItems.add({
        'title': 'تسريحة / وحدة أدراج جانبية',
        'params': CarpentryParams(kind: FurnitureKind.dresser, widthCm: 110, heightCm: 82, depthCm: 46, doors: 0, shelves: 0, drawers: 6, dividers: 1, plinthCm: 10, sheetPriceEgp: price),
      });
    } else if (resolvedType == 'kitchen') {
      suggestion = 'المساحة دي (\${areaM2.toStringAsFixed(1)} متر مربع) تشيل مطبخ عملي مريح بوحدة سفلية عريضة وبوفيه تخزين وممر حركة فوق 100 سنتي.';
      roomItems.add({
        'title': 'وحدة مطبخ سفلية أساسية',
        'params': CarpentryParams(kind: FurnitureKind.kitchen, widthCm: (_roomLengthCm - 40).clamp(120.0, 260.0).toDouble(), heightCm: 86, depthCm: 60, doors: 3, shelves: 2, drawers: 3, dividers: 1, plinthCm: 10, sheetPriceEgp: price),
      });
      roomItems.add({
        'title': 'وحدة بوفيه وتخزين إضافي',
        'params': CarpentryParams(kind: FurnitureKind.buffet, widthCm: (_roomWidthCm - 90).clamp(100.0, 180.0).toDouble(), heightCm: 86, depthCm: 45, doors: 3, shelves: 2, drawers: 3, dividers: 1, plinthCm: 10, sheetPriceEgp: price),
      });
    } else if (resolvedType == 'living') {
      suggestion = 'المساحة الواسعة دي (\${areaM2.toStringAsFixed(1)} متر مربع) تشيل مكتبة تليفزيون مودرن + ترابيزة سفرة + بوفيه مرتاحين جداً.';
      roomItems.add({
        'title': 'وحدة تليفزيون مودرن عريضة',
        'params': CarpentryParams(kind: FurnitureKind.tvUnit, widthCm: (_roomLengthCm * 0.55).clamp(160.0, 260.0).toDouble(), heightCm: 52, depthCm: 42, doors: 2, shelves: 2, drawers: 2, dividers: 2, plinthCm: 10, sheetPriceEgp: price),
      });
      roomItems.add({
        'title': 'ترابيزة سفرة متينة',
        'params': CarpentryParams(kind: FurnitureKind.table, widthCm: 180, heightCm: 76, depthCm: 95, doors: 0, shelves: 0, drawers: 0, dividers: 0, plinthCm: 0, sheetPriceEgp: price),
      });
      roomItems.add({
        'title': 'بوفيه سفرة 4 ضلف',
        'params': CarpentryParams(kind: FurnitureKind.buffet, widthCm: 170, heightCm: 86, depthCm: 45, doors: 4, shelves: 2, drawers: 3, dividers: 2, plinthCm: 12, sheetPriceEgp: price),
      });
    } else {
      suggestion = 'الأوضة دي (\${areaM2.toStringAsFixed(1)} متر مربع) تظبطلك أوضة نوم كاملة: سرير مريح + دولاب على قد الحيطة + كومودينو + تسريحة.';
      roomItems.add({
        'title': 'دولاب ملابس متفصل على الحيطة',
        'params': CarpentryParams(kind: FurnitureKind.wardrobe, widthCm: (_roomLengthCm - 120).clamp(140.0, 260.0).toDouble(), heightCm: maxH, depthCm: 60, doors: 4, shelves: 5, drawers: 3, dividers: 2, plinthCm: 8, sheetPriceEgp: price),
      });
      roomItems.add({
        'title': 'سرير خشب بالمولل',
        'params': CarpentryParams(kind: FurnitureKind.bed, widthCm: _roomWidthCm >= 320 ? 160.0 : 120.0, heightCm: 105, depthCm: 200, doors: 0, shelves: 14, drawers: 0, dividers: 1, plinthCm: 0, sheetPriceEgp: price),
      });
      roomItems.add({
        'title': 'كومودينو جنب السرير',
        'params': CarpentryParams(kind: FurnitureKind.nightstand, widthCm: 55, heightCm: 56, depthCm: 42, doors: 0, shelves: 0, drawers: 2, dividers: 0, plinthCm: 10, sheetPriceEgp: price),
      });
    }

    final roomChoices = const [
      ('auto', 'اقتراح أوتوماتيك'),
      ('bedroom', 'أوضة نوم'),
      ('dressing', 'دريسينج'),
      ('kitchen', 'مطبخ'),
      ('living', 'ليفينج وسفرة'),
      ('entryway', 'مدخل / ركن'),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('مصمم الأوض والمساحات — قولّي مساحتك وأقولك تتعمل فيها إيه!', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: roomChoices.map((c) {
            return ChoiceChip(
              label: Text(c.\$2),
              selected: _roomType == c.\$1,
              onSelected: (_) => setState(() => _roomType = c.\$1),
            );
          }).toList(),
        ),
        const SizedBox(height: 10),
        _dimSlider('طول الأوضة (سنتي)', _roomLengthCm, 140, 700, (v) => setState(() => _roomLengthCm = v), step: 10),
        _dimSlider('عرض الأوضة (سنتي)', _roomWidthCm, 110, 600, (v) => setState(() => _roomWidthCm = v), step: 10),
        _dimSlider('ارتفاع السقف (سنتي)', _roomCeilingCm, 220, 360, (v) => setState(() => _roomCeilingCm = v), step: 10),
        const SizedBox(height: 8),
        Card(
          color: const Color(0xFFECFDF5),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Text(suggestion, style: const TextStyle(fontSize: 13, height: 1.6, fontWeight: FontWeight.w600, color: Color(0xFF065F46))),
          ),
        ),
        const SizedBox(height: 10),
        ...roomItems.map((entry) {
          final p = entry['params'] as CarpentryParams;
          final calc = computeCarpentry(p);
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              title: Text(entry['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('عرض \${p.widthCm.toInt()} × ارتفاع \${p.heightCm.toInt()} × عمق \${p.depthCm.toInt()} سنتي · \${calc.boards.length} لوح · ~\${calc.totalQuoteEgp} جنيه'),
              trailing: FilledButton(
                onPressed: () {
                  setState(() {
                    _params = p;
                    _tab = 0;
                  });
                },
                child: const Text('افتح 3D'),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _dimSlider(String label, double val, double min, double max, ValueChanged<double> onChanged, {double step = 1}) {
    final divisions = ((max - min) / step).round();
    return Row(
      children: [
        SizedBox(width: 112, child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
        Expanded(
          child: Slider(
            value: val.clamp(min, max),
            min: min,
            max: max,
            divisions: divisions > 0 ? divisions : 10,
            onChanged: (v) => onChanged((v / step).round() * step),
          ),
        ),
        SizedBox(width: 52, child: Text('\${val.toInt()}', textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.bold))),
      ],
    );
  }

  Widget _stat(String k, String v, {bool isDanger = false}) => Column(
        children: [
          Text(k, style: const TextStyle(fontSize: 11, color: Colors.black54)),
          const SizedBox(height: 2),
          Text(
            v,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isDanger ? const Color(0xFFBE123C) : const Color(0xFFB45309),
            ),
          ),
        ],
      );

  Widget _buildCutListTab(CarpentryResult res) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...res.parts.map((p) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFFEF3C7),
                  child: Text(p.code, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                ),
                title: Text(p.nameAr, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('\${p.noteAr} · شريط: \${p.edgeCode}'),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('\${p.lengthCm} × \${p.widthCm} سم (×\${p.qty})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    Text('~\${p.estCostEgp} ج.م', style: const TextStyle(color: Color(0xFF047857), fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildSheetsTab(CarpentryResult res) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: const Color(0xFFFFF1F2),
          margin: const EdgeInsets.only(bottom: 14),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              'إجمالي الألواح: \${res.boards.length} لوح × \${_params.sheetPriceEgp.toInt()} ج.م · الهالك: \${res.wastePct}% (\${res.wasteAreaM2} م²) بقيمة \${res.wasteCostEgp} ج.م',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF9F1239)),
            ),
          ),
        ),
        ...res.boards.map((board) {
          return Card(
            margin: const EdgeInsets.only(bottom: 14),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('لوح رقم #\${board.index} (122 × 244 سم) — استغلال \${board.utilPct}%', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  AspectRatio(
                    aspectRatio: 2.0,
                    child: CustomPaint(
                      painter: _SheetPainter(board),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildGuideTab(CarpentryResult res) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: res.stepsAr.length,
      itemBuilder: (_, i) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(res.stepsAr[i], style: const TextStyle(fontSize: 14, height: 1.6)),
        ),
      ),
    );
  }
}

class _SheetPainter extends CustomPainter {
  final PackedBoard board;
  _SheetPainter(this.board);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = const Color(0xFFF3F4F6));
    final sx = size.width / 244.0;
    final sy = size.height / 122.0;
    for (final r in board.rects) {
      final rect = Rect.fromLTWH(r.y * sx, r.x * sy, r.h * sx, r.w * sy);
      canvas.drawRect(rect, Paint()..color = const Color(0xFFFEF3C7));
      canvas.drawRect(rect, Paint()..color = const Color(0xFFB45309)..style = PaintingStyle.stroke..strokeWidth = 1.2);
    }
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.black45..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(covariant _SheetPainter oldDelegate) => true;
}
`,
  },
];

export async function exportCarpentryFlutterZip(): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('osta_nagar_carpentry');
  if (!root) return;

  for (const file of CARPENTRY_FLUTTER_FILES) {
    root.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'osta_nagar_carpentry_android_flutter.zip';
  a.click();
  URL.revokeObjectURL(url);
}
