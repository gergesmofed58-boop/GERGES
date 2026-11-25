import JSZip from 'jszip';
import { FlutterCodeFile } from '../../types/router';
import { FLUTTER_ADVANCED_FEATURE_FILES } from './advancedFeatureFiles';
import { FLUTTER_ANDROID_CONFIG_FILES } from './androidConfigFiles';
import { FLUTTER_CORE_AND_MODELS } from './coreAndModels';
import { FLUTTER_DRIVERS_AND_SERVICES } from './driversAndServices';
import { FLUTTER_MOBILE_SCREENS } from './mobileScreens';

export const FLUTTER_PROJECT_FILES: FlutterCodeFile[] = [
  ...FLUTTER_CORE_AND_MODELS,
  ...FLUTTER_ANDROID_CONFIG_FILES,
  ...FLUTTER_DRIVERS_AND_SERVICES,
  ...FLUTTER_ADVANCED_FEATURE_FILES,
  ...FLUTTER_MOBILE_SCREENS,
];

/** Packages all Android-ready Flutter source & Gradle files into a downloadable ZIP archive. */
export async function exportFlutterProjectZip(): Promise<void> {
  const zip = new JSZip();
  const rootFolder = zip.folder('mikrobox_router');
  if (!rootFolder) return;

  for (const file of FLUTTER_PROJECT_FILES) {
    rootFolder.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mikrobox_router_android_flutter.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
