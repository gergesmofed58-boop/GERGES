/**
 * Resolves backend API URLs safely across both web browser and Capacitor Android APK.
 * - On standard web hosts, returns the relative path ('/api/...').
 * - Inside the installed Capacitor Android APK (origin 'https://localhost' or 'capacitor://localhost'),
 *   routes online-only calls (live wood prices & photo-to-design analysis) to the live backend server,
 *   while all 3D models, 12 studio photos, Room 3D, Cut List, and Sheet Optimizer stay 100% offline inside the APK.
 */

const NATIVE_REMOTE_BACKEND_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://ais-pre-4qwrbvb3eyoyjiqoe32fds-316289141548.europe-west2.run.app';

export function isRunningInsideNativeApk(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }
  const { protocol, hostname, port } = window.location;
  if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
    return true;
  }
  // Capacitor Android defaults to https://localhost (with empty port)
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && !port) {
    return true;
  }
  return false;
}

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (isRunningInsideNativeApk()) {
    return `${NATIVE_REMOTE_BACKEND_BASE}${normalizedPath}`;
  }
  return normalizedPath;
}
