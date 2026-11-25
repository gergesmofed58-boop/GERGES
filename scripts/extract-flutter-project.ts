import fs from 'node:fs';
import path from 'node:path';
import { FLUTTER_PROJECT_FILES } from '../src/data/flutter/index';

const targetDir = path.resolve(process.argv[2] || 'flutter_apk_build');

// Clean up generated Kotlin DSL Gradle files and default MainActivity so Groovy Gradle + our FlutterFragmentActivity compile cleanly.
const pathsToRemove = [
  'android/app/build.gradle.kts',
  'android/build.gradle.kts',
  'android/settings.gradle.kts',
  'android/app/src/main/kotlin',
  'lib/main.dart',
  'test/widget_test.dart',
];

for (const rel of pathsToRemove) {
  const full = path.join(targetDir, rel);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
  }
}

let written = 0;
for (const file of FLUTTER_PROJECT_FILES) {
  const dest = path.join(targetDir, file.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, file.content, 'utf8');
  written += 1;
}

console.log(`Extracted ${written} MikroBox Flutter Android files into ${targetDir}`);
