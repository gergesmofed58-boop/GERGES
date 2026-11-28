import React, { useState } from 'react';
import { Check, LocateFixed, MapPin, Navigation } from 'lucide-react';
import { WorkLocationSettings } from './types';
import {
  GpsLiveState,
  captureCurrentPositionOffline,
  formatDistanceAr,
} from './gpsUtils';

interface GpsCheckInSectionProps {
  workLocation: WorkLocationSettings;
  gpsState: GpsLiveState;
  onUpdateWorkLocation: (next: WorkLocationSettings) => void;
  onCheckGpsNow: () => void;
}

const RADIUS_PRESETS = [100, 150, 250, 500];

export const GpsCheckInSection: React.FC<GpsCheckInSectionProps> = ({
  workLocation,
  gpsState,
  onUpdateWorkLocation,
  onCheckGpsNow,
}) => {
  const [capturing, setCapturing] = useState(false);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const patch = (partial: Partial<WorkLocationSettings>) => {
    onUpdateWorkLocation({ ...workLocation, ...partial });
  };

  const hasSavedCoords =
    workLocation.latitude !== null && workLocation.longitude !== null;

  const handleCaptureWorkHere = async () => {
    setCapturing(true);
    setCaptureError(null);
    setCaptureFeedback(null);
    try {
      const pos = await captureCurrentPositionOffline();
      patch({
        latitude: pos.latitude,
        longitude: pos.longitude,
        enabled: true,
      });
      setCaptureFeedback(
        `تم حفظ موقع العمل بنجاح (دقة الإشارة: ${pos.accuracy} متر) وتفعيل التسجيل التلقائي.`
      );
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : 'تعذّر تحديد الموقع الحالي بالـ GPS.'
      );
    } finally {
      setCapturing(false);
    }
  };

  return (
    <section
      id="gps-checkin-section"
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5"
    >
      {/* Header + Master Toggle */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              التسجيل التلقائي بالـ GPS عند الوصول للعمل (أوفلاين)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              يعتمد على شريحة الـ GPS في موبايلك بدون إنترنت — احفظ موقع الشغل مرة واحدة، وأول ما
              توصل النطاق المحدد والتطبيق مفتوح بيسجّل حضورك تلقائياً
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => patch({ enabled: !workLocation.enabled })}
          className={`min-h-[42px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
            workLocation.enabled
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {workLocation.enabled ? 'الـ GPS مفعّل (اضغط للإيقاف)' : 'تفعيل التسجيل بالـ GPS'}
        </button>
      </div>

      {/* Step 1: Save Workplace Location Button + Manual Coordinates */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              1. تحديد موقع مقر العمل (أوفلاين)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              وأنت واقف في شغلك اضغط الزر ده مرة واحدة عشان يحفظ إحداثيات المكان، أو اكتب الإحداثيات
              يدوياً
            </p>
          </div>

          <button
            type="button"
            disabled={capturing}
            onClick={handleCaptureWorkHere}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
            <span>
              {capturing ? 'جاري التقاط إشارة الـ GPS...' : 'حفظ موقعي الحالي كمقر العمل'}
            </span>
          </button>
        </div>

        {captureFeedback && (
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{captureFeedback}</span>
          </p>
        )}

        {captureError && (
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{captureError}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="gps-place-name"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              اسم مكان العمل
            </label>
            <input
              id="gps-place-name"
              type="text"
              value={workLocation.placeName}
              onChange={(e) => patch({ placeName: e.target.value })}
              placeholder="مثلاً: المصنع / الشركة"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="gps-lat"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              خط العرض (Latitude)
            </label>
            <input
              id="gps-lat"
              type="number"
              step="any"
              dir="ltr"
              value={workLocation.latitude ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                patch({ latitude: v === '' ? null : parseFloat(v) });
              }}
              placeholder="مثلاً: 30.044420"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="gps-lng"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              خط الطول (Longitude)
            </label>
            <input
              id="gps-lng"
              type="number"
              step="any"
              dir="ltr"
              value={workLocation.longitude ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                patch({ longitude: v === '' ? null : parseFloat(v) });
              }}
              placeholder="مثلاً: 31.235712"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Geofence Radius & Automation Preferences */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="gps-radius"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            2. نطاق التسجيل حول مقر العمل (بالمتر)
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {RADIUS_PRESETS.map((r) => {
              const active = workLocation.radiusMeters === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => patch({ radiusMeters: r })}
                  className={`min-h-[38px] px-3 rounded-xl border text-xs font-mono font-bold tabular-nums transition-colors ${
                    active
                      ? 'bg-emerald-700 border-emerald-700 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {r} متر
                </button>
              );
            })}
            <input
              id="gps-radius"
              type="number"
              min="25"
              max="5000"
              step="25"
              value={workLocation.radiusMeters}
              onChange={(e) =>
                patch({
                  radiusMeters: Math.max(25, Math.min(5000, parseInt(e.target.value, 10) || 150)),
                })
              }
              aria-label="نطاق مخصص بالمتر"
              className="w-24 min-h-[38px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-center tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={workLocation.autoLogOnArrive}
              onChange={(e) => patch({ autoLogOnArrive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>تسجيل اليوم «حضور عادي» أوتوماتيك أول ما أدخل نطاق الشغل</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={workLocation.recordArrivalTimeNote}
              onChange={(e) => patch({ recordArrivalTimeNote: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>حفظ ساعة الوصول تلقائياً في ملاحظات اليوم</span>
          </label>
        </div>
      </div>

      {/* Live Offline GPS Distance & Manual Check Trigger */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums space-y-0.5">
          {!hasSavedCoords ? (
            <span>لم يتم حفظ إحداثيات مقر العمل بعد.</span>
          ) : gpsState.errorMsg ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {gpsState.errorMsg}
            </span>
          ) : gpsState.distanceMeters !== null ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span
                className={`font-bold ${
                  gpsState.isInside
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {gpsState.isInside
                  ? `أنت داخل نطاق ${workLocation.placeName || 'العمل'}`
                  : `المسافة عن ${workLocation.placeName || 'العمل'}: ${formatDistanceAr(
                      gpsState.distanceMeters
                    )}`}
              </span>
              {gpsState.accuracyMeters !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>دقة الإشارة: ±{gpsState.accuracyMeters} م</span>
                </>
              )}
              {gpsState.lastCheckedTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>آخر فحص: {gpsState.lastCheckedTime}</span>
                </>
              )}
            </div>
          ) : (
            <span>
              موقع العمل محفوظ ({workLocation.latitude?.toFixed(4)},{' '}
              {workLocation.longitude?.toFixed(4)}) · النطاق: {workLocation.radiusMeters} متر
            </span>
          )}
        </div>

        {hasSavedCoords && (
          <button
            type="button"
            onClick={onCheckGpsNow}
            className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>فحص موقعي بالـ GPS الآن</span>
          </button>
        )}
      </div>
    </section>
  );
};
