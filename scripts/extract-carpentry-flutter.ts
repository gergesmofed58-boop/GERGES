import fs from 'node:fs';
import path from 'node:path';
import { CARPENTRY_FLUTTER_FILES } from '../src/carpentry/flutterProject';

const targetDir = path.resolve(process.argv[2] || 'flutter_carpentry_apk');

// Remove default Kotlin DSL gradle scripts and starter MainActivity so Groovy Gradle + our Kotlin activity compile cleanly
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
for (const file of CARPENTRY_FLUTTER_FILES) {
  const dest = path.join(targetDir, file.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, file.content, 'utf8');
  written += 1;
}

console.log(`Extracted ${written} OstaNagar 3D Flutter Android files into ${targetDir}`);
