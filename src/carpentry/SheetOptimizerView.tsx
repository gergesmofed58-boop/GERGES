import React, { useState } from 'react';
import { Recycle, RotateCw, TrendingDown } from 'lucide-react';
import {
  AppLocale,
  CutPiece,
  ProjectCalculation,
  ProjectParams,
} from './types';

interface Props {
  params: ProjectParams;
  calc: ProjectCalculation;
  sheetPriceEgp: number;
  onToggleGrainRotation: () => void;
  locale: AppLocale;
}

const CATEGORY_COLORS: Record<
  CutPiece['category'],
  { fill: string; stroke: string; text: string }
> = {
  carcass: { fill: '#FEF3C7', stroke: '#B45309', text: '#78350F' },
  front: { fill: '#DBEAFE', stroke: '#1D4ED8', text: '#1E3A8A' },
  internal: { fill: '#D1FAE5', stroke: '#047857', text: '#064E3B' },
  drawer: { fill: '#FCE7F3', stroke: '#BE185D', text: '#831843' },
  frame: { fill: '#E0E7FF', stroke: '#4338CA', text: '#312E81' },
  back: { fill: '#F3F4F6', stroke: '#4B5563', text: '#1F2937' },
};

export const SheetOptimizerView: React.FC<Props> = ({
  params,
  calc,
  sheetPriceEgp,
  onToggleGrainRotation,
  locale,
}) => {
  const isRtl = locale === 'ar';
  const [selectedPieceCode, setSelectedPieceCode] = useState<string | null>(null);
  const { sheets } = calc;

  const totalSheetsCostEgp = sheets.mainSheets.length * sheetPriceEgp;
  const wasteCostEgp = Math.round(totalSheetsCostEgp * (sheets.wastePct / 100));
  const usedCostEgp = Math.max(0, totalSheetsCostEgp - wasteCostEgp);

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
            {isRtl
              ? 'مخطط تقطيع الألواح الذكي وحساب الهالك (122 × 244 سم)'
              : '2D Sheet Cutting Optimizer & Waste Analysis (122 × 244 cm)'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {isRtl
              ? `إجمالي ${sheets.mainSheets.length} لوح أساسي (${sheets.totalSheetAreaM2} م²) · سلاح المنشار ${params.kerfMm}مم · سعر اللوح ${sheetPriceEgp.toLocaleString()} ج.م`
              : `${sheets.mainSheets.length} main sheets (${sheets.totalSheetAreaM2} m²) · ${params.kerfMm}mm kerf · ${sheetPriceEgp.toLocaleString()} EGP/sheet`}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleGrainRotation}
          className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors text-start ${
            params.allowGrainRotation
              ? 'bg-amber-700 text-white border-amber-700'
              : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5 shrink-0" />
          <span>
            {params.allowGrainRotation
              ? isRtl
                ? 'تدوير القطع 90° مفعّل (أقل هالك)'
                : '90° Rotation Enabled (Min Waste)'
              : isRtl
              ? 'تثبيت اتجاه ثمرة الخشب (اضغط لتقليل الهالك)'
              : 'Grain Locked (Click to Allow Rotation)'}
          </span>
        </button>
      </div>

      {/* Live Waste & Cost Analytics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {isRtl ? 'إجمالي تكلفة الألواح' : 'Total Boards Cost'}
          </p>
          <p dir="ltr" className="text-xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100 mt-1">
            {totalSheetsCostEgp.toLocaleString()} {isRtl ? 'ج.م' : 'EGP'}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {sheets.mainSheets.length} × {sheetPriceEgp.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {isRtl ? 'الخشب المستغل فعلياً' : 'Net Used Wood'}
          </p>
          <p dir="ltr" className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {sheets.averageUtilizationPct}% · {sheets.totalMainAreaM2} m²
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
            {isRtl
              ? `قيمة صافية ≈ ${usedCostEgp.toLocaleString()} ج.م`
              : `Net value ≈ ${usedCostEgp.toLocaleString()} EGP`}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4">
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
            {isRtl ? 'الهالك (نسبة ومساحة)' : 'Waste (% & Area)'}
          </p>
          <p dir="ltr" className="text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400 mt-1">
            {sheets.wastePct}% · {sheets.wasteAreaM2} m²
          </p>
          <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
            {isRtl ? 'شامل قص السلاح 3مم والفضلات' : 'Includes saw kerf & offcuts'}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
            {isRtl ? 'تكلفة الهالك بالجنيه' : 'Waste Value (EGP)'}
          </p>
          <p dir="ltr" className="text-xl font-bold font-mono tabular-nums text-amber-800 dark:text-amber-400 mt-1">
            {wasteCostEgp.toLocaleString()} {isRtl ? 'ج.م' : 'EGP'}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
            {isRtl
              ? `${sheets.reusableOffcuts.length} فضلة كبيرة قابلة للاستخدام`
              : `${sheets.reusableOffcuts.length} large reusable offcuts`}
          </p>
        </div>
      </div>

      {/* Smart Waste-Saver Suggestion Banner */}
      {sheets.sheetsSavedIfRotated > 0 && !params.allowGrainRotation && (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
            <TrendingDown className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>
              {isRtl
                ? `نصيحة توفير ذكية: لو فعّلت تدوير القطع 90° هتوفر ${sheets.sheetsSavedIfRotated} لوح كامل بقيمة ${(
                    sheets.sheetsSavedIfRotated * sheetPriceEgp
                  ).toLocaleString()} ج.م!`
                : `Smart Savings Tip: Enabling 90° rotation saves ${sheets.sheetsSavedIfRotated} full sheet(s) worth ${(
                    sheets.sheetsSavedIfRotated * sheetPriceEgp
                  ).toLocaleString()} EGP!`}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleGrainRotation}
            className="min-h-[38px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap"
          >
            {isRtl ? 'تفعيل التوفير الآن' : 'Enable Savings Now'}
          </button>
        </div>
      )}

      {/* Category Color Key */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-300 px-1">
        {(
          [
            { key: 'carcass', ar: 'جسم/شاسيه', en: 'Carcass' },
            { key: 'front', ar: 'ضلف/قرصة', en: 'Fronts/Top' },
            { key: 'internal', ar: 'رفوف/قواطيع', en: 'Shelves/Dividers' },
            { key: 'drawer', ar: 'أدراج', en: 'Drawers' },
            { key: 'frame', ar: 'قوائم/أرجل', en: 'Frames/Legs' },
          ] as { key: CutPiece['category']; ar: string; en: string }[]
        ).map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-xs border"
              style={{
                backgroundColor: CATEGORY_COLORS[c.key].fill,
                borderColor: CATEGORY_COLORS[c.key].stroke,
              }}
            />
            <span>{isRtl ? c.ar : c.en}</span>
          </div>
        ))}
      </div>

      {/* Visual SVG Boards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {sheets.mainSheets.map((sheet) => {
          const svgW = 610;
          const svgH = 305;
          const scale = 2.5;

          return (
            <div
              key={sheet.sheetIndex}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] overflow-hidden flex flex-col"
            >
              <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {isRtl
                    ? `لوح رقم #${sheet.sheetIndex} (244 × 122 سم)`
                    : `Sheet #${sheet.sheetIndex} (244 × 122 cm)`}
                </span>
                <span
                  dir="ltr"
                  className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400"
                >
                  {sheet.utilizationPct}% {isRtl ? 'مستغل' : 'used'} ·{' '}
                  {sheet.wasteAreaM2} m² {isRtl ? 'هالك' : 'waste'}
                </span>
              </div>

              <div className="p-3 sm:p-4 overflow-x-auto bg-stone-50/70 dark:bg-[#111315]">
                <svg
                  viewBox={`0 0 ${svgW + 24} ${svgH + 28}`}
                  className="w-full min-w-[440px] h-auto"
                  role="img"
                  aria-label={`Sheet ${sheet.sheetIndex} cutting layout`}
                >
                  <defs>
                    <pattern
                      id={`waste-hatch-${sheet.sheetIndex}`}
                      width="8"
                      height="8"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="8"
                        stroke="#94A3B8"
                        strokeOpacity="0.28"
                        strokeWidth="1.5"
                      />
                    </pattern>
                  </defs>

                  <rect
                    x="12"
                    y="8"
                    width={svgW}
                    height={svgH}
                    fill={`url(#waste-hatch-${sheet.sheetIndex})`}
                    stroke="#64748B"
                    strokeWidth="1.5"
                  />

                  {sheet.placements.map((p, i) => {
                    const colors = CATEGORY_COLORS[p.category];
                    const rx = 12 + p.y * scale;
                    const ry = 8 + p.x * scale;
                    const rw = Math.max(4, p.h * scale);
                    const rh = Math.max(4, p.w * scale);
                    const isHighlighted = selectedPieceCode === p.pieceCode;

                    return (
                      <g
                        key={`${p.instanceLabel}-${i}`}
                        onClick={() =>
                          setSelectedPieceCode(isHighlighted ? null : p.pieceCode)
                        }
                        className="cursor-pointer"
                      >
                        <rect
                          x={rx}
                          y={ry}
                          width={rw}
                          height={rh}
                          fill={colors.fill}
                          stroke={isHighlighted ? '#0F172A' : colors.stroke}
                          strokeWidth={isHighlighted ? 2.6 : 1.2}
                        />
                        {rw >= 34 && rh >= 20 && (
                          <text
                            x={rx + rw / 2}
                            y={ry + rh / 2 - (rh >= 36 ? 4 : 0)}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={colors.text}
                            fontSize={rw >= 62 ? '11' : '9'}
                            fontWeight="700"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {p.instanceLabel}
                          </text>
                        )}
                        {rw >= 58 && rh >= 36 && (
                          <text
                            x={rx + rw / 2}
                            y={ry + rh / 2 + 10}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={colors.text}
                            fontSize="9"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {p.h}×{p.w}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  <text
                    x={12 + svgW / 2}
                    y={svgH + 23}
                    textAnchor="middle"
                    className="fill-stone-500 font-mono text-[10px]"
                  >
                    244 cm (2440 mm)
                  </text>
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reusable Offcuts Inventory (الفضلات الكبيرة الصالحة لإعادة الاستخدام) */}
      {sheets.reusableOffcuts.length > 0 && (
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl
                ? 'الفضلات الكبيرة الصالحة للاستخدام من التقطيع (بدل ما تترمي هالك)'
                : 'Reusable Large Offcuts Extracted From Your Sheets'}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sheets.reusableOffcuts.map((off, idx) => (
              <div
                key={`${off.sheetIndex}-${idx}`}
                className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#111315] p-3 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-500">
                    {isRtl ? `من لوح #${off.sheetIndex}` : `Sheet #${off.sheetIndex}`}
                  </span>
                  <span dir="ltr" className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    {off.areaM2} m²
                  </span>
                </div>
                <p dir="ltr" className="font-mono tabular-nums text-sm font-bold text-stone-900 dark:text-stone-100">
                  {off.lengthCm} × {off.widthCm} cm
                </p>
                <p className="text-stone-600 dark:text-stone-400">
                  {isRtl ? off.suggestedUseAr : off.suggestedUseEn}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
