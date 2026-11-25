import React from 'react';
import { CheckCircle2, Circle, Wrench } from 'lucide-react';
import { AppLocale, AssemblyStep, ProjectCalculation, ProjectParams } from './types';

interface Props {
  params: ProjectParams;
  calc: ProjectCalculation;
  completedSteps: number[];
  onToggleStep: (stepNumber: number) => void;
  locale: AppLocale;
}

const StepJoineryDiagram: React.FC<{
  type: AssemblyStep['diagramType'];
  params: ProjectParams;
  diagonalCm: number;
  isRtl: boolean;
}> = ({ type, params, diagonalCm, isRtl }) => {
  if (type === 'square') {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-28 rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200 dark:border-stone-800">
        <rect x="42" y="16" width="136" height="88" fill="none" stroke="#B45309" strokeWidth="2.5" />
        <line x1="42" y1="16" x2="178" y2="104" stroke="#1D4ED8" strokeWidth="1.6" strokeDasharray="4 3" />
        <line x1="178" y1="16" x2="42" y2="104" stroke="#059669" strokeWidth="1.6" strokeDasharray="4 3" />
        <rect x="42" y="16" width="12" height="12" fill="none" stroke="#1D4ED8" strokeWidth="1.2" />
        <text x="110" y="64" textAnchor="middle" className="fill-blue-700 dark:fill-blue-400 font-mono text-[11px] font-bold">
          D1 = D2 = {diagonalCm} cm
        </text>
      </svg>
    );
  }
  if (type === 'doors') {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-28 rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200 dark:border-stone-800">
        <rect x="28" y="14" width="164" height="92" fill="#FEF3C7" fillOpacity="0.35" stroke="#B45309" strokeWidth="2" />
        <circle cx="62" cy="60" r="18" fill="#DBEAFE" stroke="#1D4ED8" strokeWidth="2" />
        <line x1="28" y1="60" x2="62" y2="60" stroke="#1D4ED8" strokeWidth="1.5" />
        <text x="128" y="54" textAnchor="middle" className="fill-stone-800 dark:fill-stone-200 font-mono text-[10px] font-bold">
          Ø 35mm Cup Bore
        </text>
        <text x="128" y="72" textAnchor="middle" className="fill-blue-700 dark:fill-blue-400 font-mono text-[10px]">
          22mm {isRtl ? 'من الحرف' : 'from edge'}
        </text>
      </svg>
    );
  }
  if (type === 'drawers') {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-28 rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200 dark:border-stone-800">
        <rect x="22" y="20" width="12" height="80" fill="#B45309" fillOpacity="0.35" stroke="#B45309" strokeWidth="1.5" />
        <rect x="186" y="20" width="12" height="80" fill="#B45309" fillOpacity="0.35" stroke="#B45309" strokeWidth="1.5" />
        <rect x="48" y="34" width="124" height="52" fill="#DBEAFE" fillOpacity="0.4" stroke="#1D4ED8" strokeWidth="2" />
        <line x1="34" y1="60" x2="48" y2="60" stroke="#DC2626" strokeWidth="2" />
        <line x1="172" y1="60" x2="186" y2="60" stroke="#DC2626" strokeWidth="2" />
        <text x="110" y="62" textAnchor="middle" className="fill-stone-800 dark:fill-stone-200 font-mono text-[10px] font-bold">
          13mm ← Box → 13mm
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 120" className="w-full h-28 rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200 dark:border-stone-800">
      <rect x="36" y="18" width="148" height="84" fill="#FEF3C7" fillOpacity="0.25" stroke="#B45309" strokeWidth="2" />
      <line x1="36" y1="46" x2="184" y2="46" stroke="#B45309" strokeWidth="1.8" />
      <line x1="36" y1="74" x2="184" y2="74" stroke="#B45309" strokeWidth="1.8" />
      <text x="110" y="36" textAnchor="middle" className="fill-stone-700 dark:fill-stone-300 font-mono text-[10px] font-bold">
        T = {params.boardThicknessMm}mm · {params.widthCm}×{params.heightCm}cm
      </text>
      <text x="110" y="92" textAnchor="middle" className="fill-amber-800 dark:fill-amber-400 font-mono text-[10px]">
        {isRtl ? 'خوابير 8مم + مسمار 4×50' : '8mm Dowels + 4×50 Screws'}
      </text>
    </svg>
  );
};

export const AssemblyGuideView: React.FC<Props> = ({
  params,
  calc,
  completedSteps,
  onToggleStep,
  locale,
}) => {
  const isRtl = locale === 'ar';
  const progress = Math.round(
    (completedSteps.length / Math.max(1, calc.steps.length)) * 100
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Progress Banner */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {isRtl
                ? 'دليل التنفيذ والتجميع خطوة بخطوة بالمقاسات والرسومات'
                : 'Step-by-Step Illustrated Workshop Assembly Guide'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? `الوقت التقديري للتنفيذ: ~${calc.estimatedHours} ساعة عمل · مقاس ضبط الوترين: ${calc.diagonalCheckCm} سم`
                : `Estimated build time: ~${calc.estimatedHours} hrs · Diagonal square check: ${calc.diagonalCheckCm} cm`}
            </p>
          </div>
          <span
            dir="ltr"
            className="font-mono tabular-nums text-sm font-bold text-amber-700 dark:text-amber-400"
          >
            {completedSteps.length}/{calc.steps.length} ({progress}%)
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div
            className="h-full bg-amber-700 dark:bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {calc.steps.map((step) => {
          const isDone = completedSteps.includes(step.stepNumber);
          return (
            <article
              key={step.stepNumber}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                isDone
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20]'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {isRtl
                        ? `الخطوة ${step.stepNumber} · ${step.highlightDim}`
                        : `Step 0${step.stepNumber} · ${step.highlightDim}`}
                    </p>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
                      {isRtl ? step.titleAr : step.titleEn}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStep(step.stepNumber)}
                    className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-stone-400 hover:text-emerald-600 transition-colors shrink-0"
                    aria-label={`Toggle step ${step.stepNumber}`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                </div>

                <StepJoineryDiagram
                  type={step.diagramType}
                  params={params}
                  diagonalCm={calc.diagonalCheckCm}
                  isRtl={isRtl}
                />

                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {isRtl ? step.detailsAr : step.detailsEn}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                  <Wrench className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="font-semibold">
                    {isRtl ? 'العدة المطلوبة:' : 'Tools:'}
                  </span>
                  <span>{isRtl ? step.toolAr : step.toolEn}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                  <span className="font-semibold text-amber-800 dark:text-amber-400">
                    {isRtl ? 'نصيحة أسطى:' : 'Workshop Tip:'}
                  </span>{' '}
                  {isRtl ? step.tipAr : step.tipEn}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
