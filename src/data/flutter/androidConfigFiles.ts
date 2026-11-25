import { FlutterCodeFile } from '../../types/router';

export const FLUTTER_ANDROID_CONFIG_FILES: FlutterCodeFile[] = [
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    folder: 'android/app/src/main',
    language: 'xml',
    summaryEn: 'Android manifest with Wi-Fi gateway discovery, local cleartext HTTP, UDP Wake-on-LAN, biometrics, and Android 13+ alerts.',
    summaryAr: 'ملف AndroidManifest كامل بصلاحيات كشف الواي فاي والاتصال المحلي بالراوتر و Wake-on-LAN والبصمة والإشعارات.',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Local LAN Router Communication, MikroTik REST API, UDP Wake-on-LAN & Gateway Discovery -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <!-- Biometric App Lock (local_auth) -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <!-- Intruder Radar & 80%/100% Quota Alerts (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:label="ميكرو بوكس - MikroBox"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config">
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
    path: 'android/app/src/main/res/xml/network_security_config.xml',
    folder: 'android/app/src/main/res/xml',
    language: 'xml',
    summaryEn: 'Allows direct cleartext HTTP/LAN traffic to local router gateways (MikroTik 192.168.88.1, WE 192.168.1.1, TP-Link 192.168.0.1, etc.) on Android 9+.',
    summaryAr: 'إعدادات أمان الشبكة للسماح بالاتصال المحلي HTTP مع أي راوتر على أندرويد 9 فأحدث.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.88.1</domain>
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">192.168.0.1</domain>
        <domain includeSubdomains="true">192.168.8.1</domain>
        <domain includeSubdomains="true">192.168.100.1</domain>
        <domain includeSubdomains="true">10.0.0.1</domain>
    </domain-config>
</network-security-config>
`,
  },
  {
    path: 'android/app/src/main/kotlin/com/mikrobox/mikrobox_router/MainActivity.kt',
    folder: 'android/app/src/main/kotlin/com/mikrobox/mikrobox_router',
    language: 'kotlin',
    summaryEn: 'Android MainActivity extending FlutterFragmentActivity as required by local_auth for fingerprint/biometric lock.',
    summaryAr: 'ملف MainActivity بلغة Kotlin يرث FlutterFragmentActivity لتشغيل قفل البصمة على أندرويد.',
    content: `package com.mikrobox.mikrobox_router

import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity()
`,
  },
  {
    path: 'android/app/build.gradle',
    folder: 'android/app',
    language: 'gradle',
    summaryEn: 'Android app Gradle build script (SDK 35, minSdk 23, coreLibraryDesugaring, Java 17, MultiDex, Release APK).',
    summaryAr: 'ملف build.gradle لبناء APK حقيقي على أندرويد SDK 35 و Java 17 مع دعم البصمة والإشعارات.',
    content: `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

android {
    namespace = "com.mikrobox.mikrobox_router"
    compileSdk = 35
    ndkVersion = flutter.ndkVersion

    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.mikrobox.mikrobox_router"
        minSdk = 23
        targetSdk = 35
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        multiDexEnabled = true
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

dependencies {
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'
}
`,
  },
  {
    path: 'android/build.gradle',
    folder: 'android',
    language: 'gradle',
    summaryEn: 'Root Android Gradle repositories and clean task configuration.',
    summaryAr: 'ملف build.gradle الرئيسي لمشروع أندرويد.',
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
    language: 'gradle',
    summaryEn: 'Flutter Gradle Plugin loader with Android Gradle Plugin 8.7 & Kotlin 2.0.21.',
    summaryAr: 'إعدادات ربط Flutter SDK مع Gradle و Kotlin في أندرويد.',
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
    path: 'android/gradle.properties',
    folder: 'android',
    language: 'gradle',
    summaryEn: 'AndroidX and Gradle JVM memory tuning properties.',
    summaryAr: 'خصائص AndroidX وتحسين ذاكرة البناء في Gradle.',
    content: `org.gradle.jvmargs=-Xmx4G -XX:MaxMetaspaceSize=2G -XX:+HeapDumpOnOutOfMemoryError
android.useAndroidX=true
`,
  },
  {
    path: 'android/app/src/main/res/values/styles.xml',
    folder: 'android/app/src/main/res/values',
    language: 'xml',
    summaryEn: 'Android LaunchTheme & NormalTheme resources.',
    summaryAr: 'تعريف ستايل شاشة التشغيل الافتراضية لتطبيق أندرويد.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="LaunchTheme" parent="@android:style/Theme.Light.NoTitleBar">
        <item name="android:windowBackground">@android:color/white</item>
    </style>
    <style name="NormalTheme" parent="@android:style/Theme.Light.NoTitleBar">
        <item name="android:windowBackground">?android:colorBackground</item>
    </style>
</resources>
`,
  },
];
