import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Copy,
  Plus,
  Printer,
  Square,
  Trash2,
} from 'lucide-react';
import { getTemplateSpec, getWoodSpec } from './catalog';
import {
  egBoxDims,
  egDim,
  egEdgeBandingText,
  egQtyPieces,
  egQtySheets,
  egSpokenLength,
  egThickness,
} from './egyptianCopy';
import { ManualNumberInput } from './ManualNumberInput';
import {
  AppLocale,
  CustomExtraPiece,
  PricingConfig,
  ProjectCalculation,
  ProjectParams,
} from './types';

interface Props {
  params: ProjectParams;
  calc: ProjectCalculation;
  pricing: PricingConfig;
  currencyLabel: string;
  onUpdatePricing: (patch: Partial<PricingConfig>) => void;
  checkedCutIds: string[];
  onToggleCutChecked: (id: string) => void;
  onAddCustomPiece: (piece: CustomExtraPiece) => void;
  onRemoveCustomPiece: (id: string) => void;
  locale: AppLocale;
}

export const CutListAndCostView: React.FC<Props> = ({
  params,
  calc,
  pricing,
  currencyLabel,
  onUpdatePricing,
  checkedCutIds,
  onToggleCutChecked,
  onAddCustomPiece,
  onRemoveCustomPiece,
  locale,
}) => {
  const isRtl = locale === 'ar';
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm');
  const [copiedQuote, setCopiedQuote] = useState(false);

  // Custom extra piece builder state (all manually editable)
  const [customName, setCustomName] = useState('');
  const [customLength, setCustomLength] = useState(80);
  const [customWidth, setCustomWidth] = useState(40);
  const [customQty, setCustomQty] = useState(1);
  const [customEdge, setCustomEdge] = useState<CustomExtraPiece['edgeSides']>('1L');

  const template = getTemplateSpec(params.templateId);
  const wood = getWoodSpec(params.woodType);

  const sheetAreaM2 = (wood.sheetWidthCm * wood.sheetHeightCm) / 10000;
  const pricePerM2Main = pricing.sheetPriceEgp / sheetAreaM2;
  const pricePerM2Back = pricing.backSheetPriceEgp / sheetAreaM2;

  const getHardwareUnitPrice = (id: string, defaultPrice: number) =>
    pricing.hardwarePriceOverrides?.[id] ?? defaultPrice;

  const handleUpdateHardwarePrice = (id: string, nextPrice: number) => {
    onUpdatePricing({
      hardwarePriceOverrides: {
        ...(pricing.hardwarePriceOverrides ?? {}),
        [id]: Math.max(0, Math.round(nextPrice)),
      },
    });
  };

  const costs = useMemo(() => {
    const mainSheetsCost = calc.sheets.mainSheets.length * pricing.sheetPriceEgp;
    const backSheetsCost = calc.sheets.backSheetsCount * pricing.backSheetPriceEgp;
    const edgeCost = Math.round(
      calc.totalEdgeBandingMeters * pricing.edgeBandingPricePerMeterEgp
    );
    const hardwareCost = calc.hardware.reduce(
      (sum, item) => sum + item.qty * getHardwareUnitPrice(item.id, item.unitPriceEgp),
      0
    );
    const wasteCostEgp = Math.round(mainSheetsCost * (calc.sheets.wastePct / 100));
    const materialsTotal =
      mainSheetsCost +
      backSheetsCost +
      edgeCost +
      hardwareCost +
      pricing.finishingFixedEgp;
    const laborAndProfit = Math.round(
      materialsTotal * (pricing.laborAndProfitPct / 100)
    );
    const grandTotal = materialsTotal + laborAndProfit;
    return {
      mainSheetsCost,
      backSheetsCost,
      edgeCost,
      hardwareCost,
      wasteCostEgp,
      materialsTotal,
      laborAndProfit,
      grandTotal,
    };
  }, [calc, pricing]);

  const cutDoneCount = calc.pieces.filter((p) => checkedCutIds.includes(p.id)).length;
  const cutProgressPct =
    calc.pieces.length === 0
      ? 0
      : Math.round((cutDoneCount / calc.pieces.length) * 100);

  const formatDim = (cm: number) =>
    unit === 'cm' ? `${cm}` : `${Math.round(cm * 10)}`;

  const edgeCode = (longSides: number, shortSides: number) => {
    if (isRtl) return egEdgeBandingText(longSides, shortSides);
    if (longSides === 0 && shortSides === 0) return 'None';
    const parts: string[] = [];
    if (longSides > 0) parts.push(`${longSides}L`);
    if (shortSides > 0) parts.push(`${shortSides}W`);
    return parts.join(' + ');
  };

  const handleAddPieceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLength < 5 || customWidth < 5 || customQty < 1) return;
    onAddCustomPiece({
      id: `cp-${Date.now()}`,
      name: customName.trim() || (isRtl ? 'حتة خشب زيادة بمقاسك' : 'Custom Board'),
      lengthCm: Math.min(244, customLength),
      widthCm: Math.min(122, customWidth),
      qty: Math.min(50, customQty),
      edgeSides: customEdge,
    });
    setCustomName('');
  };

  const handleCopyWhatsAppQuote = async () => {
    const pieceLines = calc.pieces
      .map(
        (p) =>
          `• ${p.code} (${p.nameAr}): طول ${egSpokenLength(p.lengthCm)} × عرض ${egSpokenLength(
            p.widthCm
          )} (${egQtyPieces(p.qty)}) — ${egThickness(p.thicknessMm)}`
      )
      .join('\n');

    const lines = [
      `BOLA WOOD 3D — مقايسة نجارة (${params.projectTitle || template.nameAr})`,
      params.clientName ? `باسم: ${params.clientName}` : null,
      `المقاس الخارجي: ${egBoxDims(params.widthCm, params.heightCm, params.depthCm)}`,
      `نوع الخشب: ${wood.nameAr} (سعر اللوح ${pricing.sheetPriceEgp} ${currencyLabel})`,
      `الألواح المطلوبة (122×244 سنتي): ${egQtySheets(calc.sheets.mainSheets.length)} أساسي + ${egQtySheets(
        calc.sheets.backSheetsCount
      )} ظهر`,
      `نسبة الاستغلال: ${calc.sheets.averageUtilizationPct}% · الهالك: ${calc.sheets.wastePct}% (${calc.sheets.wasteAreaM2} متر مربع ≈ ${costs.wasteCostEgp} ${currencyLabel})`,
      `شريط الحرف PVC: ${calc.totalEdgeBandingMeters} متر`,
      `--- مقاسات التقطيع حتة حتة ---`,
      pieceLines,
      `--------------------------------`,
      `حساب الخامات والخردوات والدهان: ${costs.materialsTotal.toLocaleString()} ${currencyLabel}`,
      `المصنعية والربح (${pricing.laborAndProfitPct}%): ${costs.laborAndProfit.toLocaleString()} ${currencyLabel}`,
      `الإجمالي النهائي عالتسليم: ${costs.grandTotal.toLocaleString()} ${currencyLabel}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedQuote(true);
      window.setTimeout(() => setCopiedQuote(false), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top 4 KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
            {isRtl ? 'الألواح المطلوبة' : 'Sheets Needed'}
          </p>
          <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400 mt-0.5">
            {isRtl ? egQtySheets(calc.sheets.mainSheets.length) : calc.sheets.mainSheets.length}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
            {costs.mainSheetsCost.toLocaleString()} {currencyLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs font-semibold text-rose-800 dark:text-rose-300">
            {isRtl ? 'الهالك' : 'Board Waste'}
          </p>
          <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400 mt-0.5">
            {calc.sheets.wastePct}%
          </p>
          <p className="text-[11px] text-rose-800/85 dark:text-rose-300/85 mt-0.5 truncate">
            ≈ {costs.wasteCostEgp.toLocaleString()} {currencyLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
            {isRtl ? 'إجمالي الحتت' : 'Total Pieces'}
          </p>
          <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100 mt-0.5">
            {isRtl ? egQtyPieces(calc.totalPiecesCount) : calc.totalPiecesCount}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
            {isRtl
              ? `قصّينا ${cutDoneCount}/${calc.pieces.length} (${cutProgressPct}%)`
              : `Cut ${cutDoneCount}/${calc.pieces.length}`}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-300/70 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-300 font-semibold">
            {isRtl ? 'الإجمالي عالتسليم' : 'Client Quote'}
          </p>
          <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-800 dark:text-amber-400 mt-0.5">
            {costs.grandTotal.toLocaleString()}{' '}
            <span className="text-xs font-sans">{currencyLabel}</span>
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 truncate">
            {isRtl ? `خامات ${costs.materialsTotal.toLocaleString()}` : `Raw ${costs.materialsTotal.toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Manual Pricing & Quote Editor FIRST on Mobile so Wood Price is Immediately Editable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isRtl
                  ? 'تعديل كل الأسعار يدوياً وحساب التكلفة'
                  : 'Edit Every Price Manually & Client Quote'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isRtl
                  ? 'اكتب أي سعر بإيدك (سعر اللوح، الظهر، الشريط، الدهان، المصنعية) والحساب بيتحدث فوراً'
                  : 'Type any price manually — updates sheets, waste & quote live'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold">
                  {isRtl ? `سعر لوح الخشب (${currencyLabel})` : `Main Sheet (${currencyLabel})`}
                </span>
                <ManualNumberInput
                  value={pricing.sheetPriceEgp}
                  onChange={(v) => onUpdatePricing({ sheetPriceEgp: v })}
                  min={0}
                  max={100000}
                  step={50}
                  emptyAsZero
                  className="border-amber-400 dark:border-amber-700 bg-amber-50/40 dark:bg-[#111315]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold">
                  {isRtl ? `سعر لوح الظهر (${currencyLabel})` : `Back Sheet (${currencyLabel})`}
                </span>
                <ManualNumberInput
                  value={pricing.backSheetPriceEgp}
                  onChange={(v) => onUpdatePricing({ backSheetPriceEgp: v })}
                  min={0}
                  max={50000}
                  step={25}
                  emptyAsZero
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold">
                  {isRtl ? `متر الشريط (${currencyLabel})` : `Edge Band (${currencyLabel})`}
                </span>
                <ManualNumberInput
                  value={pricing.edgeBandingPricePerMeterEgp}
                  onChange={(v) => onUpdatePricing({ edgeBandingPricePerMeterEgp: v })}
                  min={0}
                  max={2000}
                  step={2}
                  emptyAsZero
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold">
                  {isRtl ? `الدهان (${currencyLabel})` : `Paint (${currencyLabel})`}
                </span>
                <ManualNumberInput
                  value={pricing.finishingFixedEgp}
                  onChange={(v) => onUpdatePricing({ finishingFixedEgp: v })}
                  min={0}
                  max={100000}
                  step={50}
                  emptyAsZero
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-stone-700 dark:text-stone-300 font-bold">
                  {isRtl ? 'نسبة المصنعية والربح (%)' : 'Labor & Profit (%)'}
                </span>
                <ManualNumberInput
                  value={pricing.laborAndProfitPct}
                  onChange={(v) => onUpdatePricing({ laborAndProfitPct: v })}
                  min={0}
                  max={300}
                  step={5}
                  emptyAsZero
                  unit="%"
                />
              </div>
            </div>

            <div className="border-t border-stone-200 dark:border-stone-800 pt-3 flex flex-col gap-2 text-xs sm:text-sm">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>
                  {isRtl
                    ? `ألواح الخشب (${calc.sheets.mainSheets.length} أساسي + ${calc.sheets.backSheetsCount} ظهر)`
                    : `Boards (${calc.sheets.mainSheets.length} main + ${calc.sheets.backSheetsCount} back)`}
                </span>
                <span dir="ltr" className="font-mono tabular-nums font-semibold">
                  {(costs.mainSheetsCost + costs.backSheetsCost).toLocaleString()} {currencyLabel}
                </span>
              </div>
              <div className="flex justify-between text-rose-700 dark:text-rose-400">
                <span>
                  {isRtl
                    ? `قيمة الهالك (${calc.sheets.wastePct}% · ${calc.sheets.wasteAreaM2} م²)`
                    : `Waste Value (${calc.sheets.wastePct}%)`}
                </span>
                <span dir="ltr" className="font-mono tabular-nums font-semibold">
                  {costs.wasteCostEgp.toLocaleString()} {currencyLabel}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>
                  {isRtl
                    ? `شريط (${calc.totalEdgeBandingMeters}م) + خردوات + دهان`
                    : `Edge + Hardware + Finish`}
                </span>
                <span dir="ltr" className="font-mono tabular-nums font-semibold">
                  {(costs.edgeCost + costs.hardwareCost + pricing.finishingFixedEgp).toLocaleString()}{' '}
                  {currencyLabel}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>
                  {isRtl
                    ? `المصنعية والربح (${pricing.laborAndProfitPct}%)`
                    : `Labor & Profit (${pricing.laborAndProfitPct}%)`}
                </span>
                <span dir="ltr" className="font-mono tabular-nums font-semibold">
                  {costs.laborAndProfit.toLocaleString()} {currencyLabel}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200 dark:border-stone-800 font-bold text-base text-stone-900 dark:text-stone-100">
                <span>{isRtl ? 'الإجمالي النهائي للعميل' : 'Total Client Quote'}</span>
                <span
                  dir="ltr"
                  className="font-mono tabular-nums text-lg text-amber-700 dark:text-amber-400"
                >
                  {costs.grandTotal.toLocaleString()} {currencyLabel}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyWhatsAppQuote}
            className="w-full min-h-[48px] px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {copiedQuote ? (
              <>
                <Check className="w-4 h-4" />
                <span>{isRtl ? 'تم نسخ المقايسة للواتساب!' : 'Quote Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{isRtl ? 'نسخ المقايسة والقطع للواتساب' : 'Copy Quote for WhatsApp'}</span>
              </>
            )}
          </button>
        </section>

        {/* Hardware BOM with Manual Editable Unit Prices! */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isRtl ? 'الخردوات والإكسسوارات (تعديل سعر أي بند يدوي)' : 'Hardware BOM (Editable Prices)'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isRtl
                  ? 'اضغط على سعر أي مفصلة أو مجرى وعدّله حسب سعر السوق عندك'
                  : 'Tap any unit price to override manually'}
              </p>
            </div>
            <span
              dir="ltr"
              className="font-mono tabular-nums text-sm font-bold text-amber-700 dark:text-amber-400 shrink-0"
            >
              {costs.hardwareCost.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {calc.hardware.map((item) => {
              const unitPrice = getHardwareUnitPrice(item.id, item.unitPriceEgp);
              return (
                <div
                  key={item.id}
                  className="py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      {isRtl ? item.nameAr : item.nameEn}{' '}
                      <span className="text-amber-700 dark:text-amber-400 font-mono">
                        ({item.qty} {isRtl ? item.unitAr : item.unitEn})
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {isRtl ? item.specAr : item.specEn}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ManualNumberInput
                      value={unitPrice}
                      onChange={(v) => handleUpdateHardwarePrice(item.id, v)}
                      min={0}
                      max={20000}
                      step={5}
                      emptyAsZero
                      className="w-36"
                      inputClassName="h-8 text-xs"
                    />
                    <span
                      dir="ltr"
                      className="font-mono tabular-nums text-xs font-bold text-stone-700 dark:text-stone-300 w-16 text-end"
                    >
                      {(item.qty * unitPrice).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Add Extra Custom Piece Bar (All ManualNumberInput) */}
      <form
        onSubmit={handleAddPieceSubmit}
        className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {isRtl
              ? 'زود حتة خشب زيادة بمقاسك اليدوي (تتحسب أوتوماتيك في الألواح والهالك)'
              : 'Add Custom Free-Dimension Board'}
          </h3>
          {params.customPieces.length > 0 && (
            <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold">
              +{params.customPieces.length} {isRtl ? 'حتة زيادة' : 'custom'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end text-xs">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-stone-500 font-semibold">{isRtl ? 'اسم الحتة' : 'Board Name'}</span>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={isRtl ? 'مثال: رف زيادة أو برنيطة' : 'e.g. Top Shelf'}
              className="h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] text-stone-900 dark:text-stone-100"
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-stone-500 font-semibold">{isRtl ? 'الطول (سنتي)' : 'Length'}</span>
            <ManualNumberInput
              value={customLength}
              onChange={setCustomLength}
              min={5}
              max={244}
              unit="سم"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-stone-500 font-semibold">{isRtl ? 'العرض (سنتي)' : 'Width'}</span>
            <ManualNumberInput
              value={customWidth}
              onChange={setCustomWidth}
              min={5}
              max={122}
              unit="سم"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-stone-500 font-semibold">{isRtl ? 'العدد / القشاط' : 'Qty / Edge'}</span>
            <div className="flex gap-1.5">
              <ManualNumberInput
                value={customQty}
                onChange={setCustomQty}
                min={1}
                max={50}
                className="w-16"
              />
              <select
                value={customEdge}
                onChange={(e) =>
                  setCustomEdge(e.target.value as CustomExtraPiece['edgeSides'])
                }
                className="flex-1 h-11 px-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] text-stone-900 dark:text-stone-100"
              >
                <option value="1L">1L</option>
                <option value="all">4x</option>
                <option value="none">0</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="col-span-2 sm:col-span-1 h-11 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{isRtl ? 'إضافة حتة' : 'Add'}</span>
          </button>
        </div>

        {params.customPieces.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {params.customPieces.map((cp) => (
              <div
                key={cp.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs text-stone-800 dark:text-stone-200"
              >
                <span className="font-semibold">{cp.name}</span>
                <span dir="ltr" className="font-mono tabular-nums text-stone-500">
                  {cp.lengthCm}×{cp.widthCm} (×{cp.qty})
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveCustomPiece(cp.id)}
                  className="text-stone-400 hover:text-rose-600 p-1"
                  aria-label="Remove custom piece"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Cut List: Mobile Card List (< md) + Full Precision Table (md+) */}
      <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl
                ? 'جدول التقطيع بالملي — مقاس وتكلفة كل حتة'
                : 'Precision Cut List — Every Board'}
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? `سعر اللوح ${pricing.sheetPriceEgp.toLocaleString()} ${currencyLabel} · ${egThickness(
                    params.boardThicknessMm
                  )}`
                : `${pricing.sheetPriceEgp.toLocaleString()} ${currencyLabel}/sheet · ${params.boardThicknessMm}mm`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                  unit === 'cm'
                    ? 'bg-white dark:bg-[#191C20] text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {isRtl ? 'بالسنتي' : 'cm'}
              </button>
              <button
                type="button"
                onClick={() => setUnit('mm')}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                  unit === 'mm'
                    ? 'bg-white dark:bg-[#191C20] text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {isRtl ? 'بالمللي' : 'mm'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex min-h-[38px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isRtl ? 'طباعة' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Clean Card View (Zero Cramped Horizontal Scrolling on Phones!) */}
        <div className="md:hidden divide-y divide-stone-100 dark:divide-stone-800">
          {calc.pieces.map((piece) => {
            const done = checkedCutIds.includes(piece.id);
            const areaM2 = (piece.lengthCm * piece.widthCm * piece.qty) / 10000;
            const boardRate =
              piece.materialKind === 'back' ? pricePerM2Back : pricePerM2Main;
            const pieceCostEgp = Math.round(
              areaM2 * boardRate +
                piece.edgeMetersPerPiece *
                  piece.qty *
                  pricing.edgeBandingPricePerMeterEgp
            );
            return (
              <button
                key={piece.id}
                type="button"
                onClick={() => onToggleCutChecked(piece.id)}
                className={`w-full p-3.5 text-start flex items-start gap-3 transition-colors ${
                  done ? 'bg-emerald-50/50 dark:bg-emerald-950/20 opacity-75' : ''
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-stone-400" />
                  )}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
                        {piece.code}
                      </span>
                      <span
                        className={`text-sm font-bold text-stone-900 dark:text-stone-100 truncate ${
                          done ? 'line-through' : ''
                        }`}
                      >
                        {isRtl ? piece.nameAr : piece.nameEn}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0">
                      {isRtl ? egQtyPieces(piece.qty) : `×${piece.qty}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                      {isRtl
                        ? `${egDim(piece.lengthCm, unit)} × ${egDim(piece.widthCm, unit)}`
                        : `${formatDim(piece.lengthCm)} × ${formatDim(piece.widthCm)} ${unit}`}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-amber-800 dark:text-amber-400">
                      {pieceCostEgp.toLocaleString()} {currencyLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {isRtl
                      ? `${egThickness(piece.thicknessMm)} · ${edgeCode(
                          piece.edgeBanding.longSides,
                          piece.edgeBanding.shortSides
                        )} · ${piece.noteAr}`
                      : `${piece.thicknessMm}mm · ${edgeCode(
                          piece.edgeBanding.longSides,
                          piece.edgeBanding.shortSides
                        )}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/50 text-stone-600 dark:text-stone-400 text-xs">
                <th className="py-3 px-3 text-center w-12">{isRtl ? 'اتقصّت' : 'Cut'}</th>
                <th className="py-3 px-3 text-start w-14">{isRtl ? 'كود' : 'Code'}</th>
                <th className="py-3 px-3 text-start">
                  {isRtl ? 'اسم الحتة والملاحظة بتاعة الأسطى' : 'Part Name & Note'}
                </th>
                <th className="py-3 px-3 text-center">
                  {isRtl ? `الطول (${unit === 'cm' ? 'سنتي' : 'مللي'})` : `L (${unit})`}
                </th>
                <th className="py-3 px-3 text-center">
                  {isRtl ? `العرض (${unit === 'cm' ? 'سنتي' : 'مللي'})` : `W (${unit})`}
                </th>
                <th className="py-3 px-3 text-center">{isRtl ? 'العدد' : 'Qty'}</th>
                <th className="py-3 px-3 text-center">{isRtl ? 'شريط الحرف' : 'Edge'}</th>
                <th className="py-3 px-3 text-end">
                  {isRtl ? `حساب البند (${currencyLabel})` : 'Est. Cost'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {calc.pieces.map((piece) => {
                const done = checkedCutIds.includes(piece.id);
                const areaM2 = (piece.lengthCm * piece.widthCm * piece.qty) / 10000;
                const boardRate =
                  piece.materialKind === 'back' ? pricePerM2Back : pricePerM2Main;
                const pieceCostEgp = Math.round(
                  areaM2 * boardRate +
                    piece.edgeMetersPerPiece *
                      piece.qty *
                      pricing.edgeBandingPricePerMeterEgp
                );

                return (
                  <tr
                    key={piece.id}
                    className={`transition-colors ${
                      done
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 opacity-75'
                        : 'hover:bg-stone-50/80 dark:hover:bg-stone-800/30'
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleCutChecked(piece.id)}
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                        aria-label={`Mark ${piece.code} as cut`}
                      >
                        {done ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-stone-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-800 dark:text-amber-400">
                      {piece.code}
                    </td>
                    <td className="py-3 px-3">
                      <div
                        className={`font-semibold text-stone-900 dark:text-stone-100 ${
                          done ? 'line-through' : ''
                        }`}
                      >
                        {isRtl ? piece.nameAr : piece.nameEn}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {isRtl
                          ? `${piece.noteAr} · ${egThickness(piece.thicknessMm)}`
                          : `${piece.noteEn} · ${piece.thicknessMm}mm`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-stone-900 dark:text-stone-100 tabular-nums whitespace-nowrap">
                      {isRtl ? egDim(piece.lengthCm, unit) : formatDim(piece.lengthCm)}
                      {isRtl && piece.lengthCm >= 100 && unit === 'cm' && (
                        <span className="block text-[10px] font-semibold text-amber-800 dark:text-amber-400">
                          {egSpokenLength(piece.lengthCm)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-stone-900 dark:text-stone-100 tabular-nums whitespace-nowrap">
                      {isRtl ? egDim(piece.widthCm, unit) : formatDim(piece.widthCm)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {isRtl ? egQtyPieces(piece.qty) : `× ${piece.qty}`}
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-stone-600 dark:text-stone-300">
                      {edgeCode(
                        piece.edgeBanding.longSides,
                        piece.edgeBanding.shortSides
                      )}
                    </td>
                    <td className="py-3 px-3 text-end font-mono tabular-nums font-semibold text-amber-800 dark:text-amber-400 whitespace-nowrap">
                      {pieceCostEgp.toLocaleString()} {currencyLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
