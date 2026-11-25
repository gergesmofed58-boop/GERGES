import React, { useMemo, useState } from 'react';
import { FolderOpen, Save, Trash2 } from 'lucide-react';
import { getTemplateSpec } from './catalog';
import { ManualNumberInput } from './ManualNumberInput';
import { AppLocale, SavedCarpentryProject } from './types';

interface Props {
  locale: AppLocale;
  savedProjects: SavedCarpentryProject[];
  onSaveCurrentProject: () => void;
  onLoadProject: (project: SavedCarpentryProject) => void;
  onDeleteProject: (id: string) => void;
}

export const WorkshopToolsView: React.FC<Props> = ({
  locale,
  savedProjects,
  onSaveCurrentProject,
  onLoadProject,
  onDeleteProject,
}) => {
  const isRtl = locale === 'ar';

  // 1. Equal Shelf Spacing Calculator
  const [innerHeightCm, setInnerHeightCm] = useState(195);
  const [shelfCount, setShelfCount] = useState(5);
  const [boardMm, setBoardMm] = useState(18);

  const shelfMarks = useMemo(() => {
    const tCm = boardMm / 10;
    const clearGap =
      Math.round(((innerHeightCm - shelfCount * tCm) / (shelfCount + 1)) * 10) /
      10;
    const marks: number[] = [];
    for (let i = 1; i <= shelfCount; i++) {
      marks.push(Math.round((clearGap * i + tCm * (i - 1)) * 10) / 10);
    }
    return { clearGap: Math.max(0, clearGap), marks };
  }, [innerHeightCm, shelfCount, boardMm]);

  // 2. Raw Lumber Cubic Meter Calculator (زان / موسكي)
  const [plankThickMm, setPlankThickMm] = useState(50);
  const [plankWidthCm, setPlankWidthCm] = useState(15);
  const [plankLengthM, setPlankLengthM] = useState(3.0);
  const [plankQty, setPlankQty] = useState(8);
  const [cubicPriceEgp, setCubicPriceEgp] = useState(29000);

  const lumberResult = useMemo(() => {
    const volOne = (plankThickMm / 1000) * (plankWidthCm / 100) * plankLengthM;
    const totalM3 = Math.round(volOne * plankQty * 10000) / 10000;
    const totalPrice = Math.round(totalM3 * cubicPriceEgp);
    return { totalM3, totalPrice };
  }, [plankThickMm, plankWidthCm, plankLengthM, plankQty, cubicPriceEgp]);

  // 3. Carpentry Unit Converter (cm <-> mm <-> inch + 1/16 fraction)
  const [cmInput, setCmInput] = useState(122);
  const converter = useMemo(() => {
    const mm = Math.round(cmInput * 10 * 10) / 10;
    const inches = cmInput / 2.54;
    const wholeIn = Math.floor(inches);
    const sixteenths = Math.round((inches - wholeIn) * 16);
    const fracStr =
      sixteenths === 0
        ? `${wholeIn}"`
        : sixteenths === 16
        ? `${wholeIn + 1}"`
        : `${wholeIn} ${sixteenths}/16"`;
    return {
      mm,
      inchesDecimal: Math.round(inches * 100) / 100,
      fracStr,
    };
  }, [cmInput]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tool 1: Equal Shelf / Drawer Divider */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? 'حاسبة تقسيم الرفوف المتساوية' : 'Equal Shelf Spacing Calculator'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? 'تطلعلك علامات المازورة من تحت لفوق بالملي'
                : 'Exact ruler marks from bottom panel upward'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'الارتفاع الصافي' : 'Inner H'}</span>
              <ManualNumberInput
                value={innerHeightCm}
                onChange={setInnerHeightCm}
                min={20}
                max={400}
                allowDecimal
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'الرفوف' : 'Shelves'}</span>
              <ManualNumberInput
                value={shelfCount}
                onChange={setShelfCount}
                min={1}
                max={20}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'التخانة (مم)' : 'Board mm'}</span>
              <ManualNumberInput
                value={boardMm}
                onChange={setBoardMm}
                min={6}
                max={50}
              />
            </div>
          </div>

          <div className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 p-3.5 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-stone-600 dark:text-stone-400">
                {isRtl ? 'الفراغ الصافي بين كل رفين:' : 'Clear gap between shelves:'}
              </span>
              <span dir="ltr" className="font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                {shelfMarks.clearGap} cm
              </span>
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">
              <span>{isRtl ? 'علامات بداية كل رف من الأرضية:' : 'Ruler marks from bottom:'}</span>
              <div dir="ltr" className="font-mono tabular-nums text-stone-900 dark:text-stone-100 font-semibold mt-1 leading-relaxed">
                {shelfMarks.marks.map((m, idx) => `#${idx + 1}: ${m}cm`).join(' · ')}
              </div>
            </div>
          </div>
        </section>

        {/* Tool 2: Lumber Cubic Meter Calculator */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl
                ? 'حاسبة تكعيب الخشب (م³ زان وموسكي)'
                : 'Raw Lumber Cubic Meter (m³) Calculator'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? 'لحساب تكعيب وسعر ألواح الزان والموسكي في المغلق'
                : 'Calculate exact m³ volume and cost for hardwood planks'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'التخانة (مللي)' : 'Thickness mm'}</span>
              <ManualNumberInput
                value={plankThickMm}
                onChange={setPlankThickMm}
                min={5}
                max={200}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'العرض (سنتي)' : 'Width cm'}</span>
              <ManualNumberInput
                value={plankWidthCm}
                onChange={setPlankWidthCm}
                min={2}
                max={120}
                allowDecimal
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'الطول (متر)' : 'Length m'}</span>
              <ManualNumberInput
                value={plankLengthM}
                onChange={setPlankLengthM}
                min={0.5}
                max={12}
                allowDecimal
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-stone-500 font-semibold">{isRtl ? 'عدد الألواح' : 'Plank Count'}</span>
              <ManualNumberInput
                value={plankQty}
                onChange={setPlankQty}
                min={1}
                max={500}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-stone-500 font-semibold">
              {isRtl ? 'سعر المتر المكعب (تعديل يدوي)' : 'Price per m³'}
            </span>
            <ManualNumberInput
              value={cubicPriceEgp}
              onChange={setCubicPriceEgp}
              min={0}
              max={500000}
              step={500}
              unit={isRtl ? 'جنيه' : 'EGP'}
              showSteppers
            />
          </div>

          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {isRtl ? 'إجمالي التكعيب' : 'Total Volume'}
              </p>
              <p dir="ltr" className="font-mono tabular-nums text-lg font-bold text-stone-900 dark:text-stone-100">
                {lumberResult.totalM3} m³
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {isRtl ? 'التكلفة الإجمالية' : 'Total Price'}
              </p>
              <p dir="ltr" className="font-mono tabular-nums text-lg font-bold text-amber-800 dark:text-amber-400">
                {lumberResult.totalPrice.toLocaleString()} {isRtl ? 'جنيه' : 'EGP'}
              </p>
            </div>
          </div>
        </section>

        {/* Tool 3: Carpentry Unit Converter */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? 'محول مقاسات النجارة السريع' : 'Quick Carpentry Unit Converter'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? 'تحويل فوري بين السنتي والمللي والبوصة وكسور الـ 1/16'
                : 'Instant conversion between cm, mm, decimal inches & 1/16"'}
            </p>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-stone-500 font-semibold">
              {isRtl ? 'اكتب المقاس بالسنتي' : 'Enter dimension in cm'}
            </span>
            <ManualNumberInput
              value={cmInput}
              onChange={setCmInput}
              min={0}
              max={10000}
              step={1}
              allowDecimal
              unit={isRtl ? 'سنتي' : 'cm'}
              showSteppers
            />
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 flex justify-between">
              <span className="text-stone-500">{isRtl ? 'مللي (mm)' : 'Millimeters'}</span>
              <span dir="ltr" className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                {converter.mm} mm
              </span>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 flex justify-between">
              <span className="text-stone-500">{isRtl ? 'بوصة عشري' : 'Decimal Inches'}</span>
              <span dir="ltr" className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                {converter.inchesDecimal} in
              </span>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 flex justify-between">
              <span className="text-stone-500">{isRtl ? 'بوصة كسور (المازورة)' : 'Tape Fraction'}</span>
              <span dir="ltr" className="font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                {converter.fracStr}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Saved Customer Projects */}
      <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? 'مشاريع ومقاسات العملاء المحفوظة' : 'Saved Customer Jobs'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? 'احفظ مقايسة كل عميل على الموبايل وارجعلها في أي وقت من غير نت'
                : 'Save customer dimensions offline and reload anytime'}
            </p>
          </div>
          <button
            type="button"
            onClick={onSaveCurrentProject}
            className="min-h-[42px] px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            <span>{isRtl ? 'حفظ المقايسة الحالية' : 'Save Current Job'}</span>
          </button>
        </div>

        {savedProjects.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-stone-400 py-6 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
            {isRtl
              ? 'مفيش مشاريع محفوظة لسه — اضغط «حفظ المقايسة الحالية» لحفظ أول شغل.'
              : 'No saved customer projects yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {savedProjects.map((job) => {
              const tpl = getTemplateSpec(job.params.templateId);
              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#111315] p-3.5 flex flex-col justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {job.params.projectTitle || (isRtl ? tpl.nameAr : tpl.nameEn)}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {job.params.clientName ? `${job.params.clientName} · ` : ''}
                      <span dir="ltr" className="font-mono tabular-nums">
                        {job.params.widthCm}×{job.params.heightCm}×{job.params.depthCm} cm
                      </span>
                    </p>
                    <p className="text-xs font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold mt-1">
                      {job.totalQuoteEgp.toLocaleString()} {isRtl ? 'جنيه' : 'EGP'} ·{' '}
                      {job.sheetsCount} {isRtl ? 'لوح' : 'sheets'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadProject(job)}
                      className="flex-1 min-h-[40px] px-3 rounded-lg bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-amber-600 flex items-center justify-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'فتح المشروع' : 'Load Job'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProject(job.id)}
                      className="min-h-[40px] min-w-[40px] rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-red-600 flex items-center justify-center"
                      aria-label="Delete saved job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
