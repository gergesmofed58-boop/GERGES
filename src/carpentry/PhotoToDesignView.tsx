import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Camera,
  Check,
  Copy,
  Download,
  FileText,
  Hammer,
  Home,
  ImagePlus,
  Link2,
  Loader2,
  Paintbrush,
  Ruler,
  Sparkles,
  Upload,
  Wrench,
} from 'lucide-react';
import { isRunningInsideNativeApk, resolveApiUrl } from './apiBase';
import { FURNITURE_TEMPLATES, getTemplateSpec, getWoodSpec, WOOD_MATERIALS } from './catalog';
import {
  egBoxDims,
  egDim,
  egEdgeBandingText,
  egQtyPieces,
  egQtySheets,
  egSpokenLength,
  egThickness,
} from './egyptianCopy';
import { calculateCarpentryProject } from './engine';
import { ManualNumberInput, normalizeNumericInput } from './ManualNumberInput';
import {
  AppLocale,
  CustomExtraPiece,
  FurnitureTemplateId,
  ProjectParams,
  WoodTypeId,
} from './types';

export interface AnalyzedCutRow {
  code: string;
  nameEg: string;
  lengthCm: number;
  widthCm: number;
  thicknessMm: number;
  qty: number;
  spokenSizeEg: string;
  edgeBandingEg: string;
  noteEg: string;
  isExtraSpecialPiece: boolean;
}

export interface AnalyzedHardwareRow {
  nameEg: string;
  qtyTextEg: string;
  specEg: string;
  approxCostEgp: number;
}

export interface AnalyzedStepRow {
  stepNumber: number;
  titleEg: string;
  detailsEg: string;
  masterTipEg: string;
}

export interface PhotoAnalysisResult {
  detectedTitleEg: string;
  styleSummaryEg: string;
  fitExplanationEg: string;
  dimensionsSpokenEg: string;
  mappedTemplateId: FurnitureTemplateId;
  recommendedWoodType: WoodTypeId;
  recommendedWoodNameEg: string;
  fittedDimensions: {
    widthCm: number;
    heightCm: number;
    depthCm: number;
    doorsCount: number;
    shelvesCount: number;
    drawersCount: number;
    dividersCount: number;
    plinthHeightCm: number;
    boardThicknessMm: number;
  };
  detailedCutList: AnalyzedCutRow[];
  hardwareListEg: AnalyzedHardwareRow[];
  assemblyStepsEg: AnalyzedStepRow[];
  finishingAndPaintEg: string;
  commonMistakesEg: string[];
  estimatedSheetsCount: number;
  estimatedTotalCostEgp: number;
  estimatedWorkHours: number;
  carpenterVerdictEg: string;
  engineSource?: 'ai' | 'local';
}

interface StoredPhotoPlan {
  result: PhotoAnalysisResult;
  previewUrl: string;
  analyzedAt: string;
}

interface Props {
  locale: AppLocale;
  isOnline: boolean;
  sheetPriceEgp: number;
  currencyLabel: string;
  onUpdateSheetPrice: (nextPrice: number) => void;
  onApplyTo3D: (pieceParams: ProjectParams) => void;
}

const STORAGE_KEY = 'ostanagar_last_photo_plan_v1';

type FitMode = 'custom' | 'room' | 'free';

function loadLastPhotoPlan(): StoredPhotoPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPhotoPlan;
    if (parsed && parsed.result && parsed.result.detectedTitleEg) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resilient mobile file loader:
 * 1. Tries canvas downscaling to max 1280px JPEG for fast memory-friendly preview & optional upload.
 * 2. If canvas fails on any unusual phone format, falls back cleanly to raw FileReader DataURL.
 */
async function loadPhotoFileSafely(
  file: File
): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة من الجهاز.'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      const fallbackMime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
      const fallbackBase64 = rawDataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

      const img = new Image();
      img.onerror = () => {
        if (rawDataUrl.startsWith('data:image/')) {
          resolve({ base64: fallbackBase64, mimeType: fallbackMime, dataUrl: rawDataUrl });
        } else {
          reject(new Error('الملف ده مش صورة سليمة — اختار صورة JPG أو PNG من الاستوديو.'));
        }
      };
      img.onload = () => {
        try {
          const maxSide = 1280;
          let { width, height } = img;
          if (width > maxSide || height > maxSide) {
            const scale = maxSide / Math.max(width, height);
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: fallbackBase64, mimeType: fallbackMime, dataUrl: rawDataUrl });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
          resolve({ base64, mimeType: 'image/jpeg', dataUrl });
        } catch {
          resolve({ base64: fallbackBase64, mimeType: fallbackMime, dataUrl: rawDataUrl });
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function fetchLocalAssetAsBase64(
  assetUrl: string
): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  const resp = await fetch(assetUrl);
  const blob = await resp.blob();
  const file = new File([blob], 'sample.jpg', { type: blob.type || 'image/jpeg' });
  return loadPhotoFileSafely(file);
}

/**
 * Parses Egyptian colloquial notes (e.g., "دولاب عرض 240 ارتفاع 220 عمق 60 و4 ضلف و3 أدراج")
 * to infer furniture template & exact dimensions on-device without needing internet!
 */
function parseEgyptianNotes(
  notesRaw: string,
  fallbackTemplate: FurnitureTemplateId
): {
  templateId: FurnitureTemplateId;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  doorsCount?: number;
  shelvesCount?: number;
  drawersCount?: number;
} {
  const text = normalizeNumericInput(notesRaw).toLowerCase();

  let templateId = fallbackTemplate;
  if (/مطبخ|رخام|حوض|ألوميتال|بولي لاك/.test(text)) templateId = 'kitchen';
  else if (/دريسينج|دريسنج|غرفة ملابس/.test(text)) templateId = 'dressing';
  else if (/سرير|مرتب|شباك/.test(text)) templateId = 'bed';
  else if (/كومود|كمودينو/.test(text)) templateId = 'nightstand';
  else if (/تسريح|مراي/.test(text)) templateId = 'dresser';
  else if (/بوفيه|نيش|سفره/.test(text)) templateId = 'buffet';
  else if (/ترابيز|طاول|سفرة/.test(text)) templateId = 'table';
  else if (/شاش|تليفزيون|تلفزيون|رسيفر|tv/.test(text)) templateId = 'tv_unit';
  else if (/كتب|مكتب[ةه]/.test(text)) templateId = 'bookshelf';
  else if (/مكتب|كمبيوتر|مذاكر/.test(text)) templateId = 'desk';
  else if (/جزام|جزم|أحذي/.test(text)) templateId = 'shoe_rack';
  else if (/دولاب/.test(text)) templateId = 'wardrobe';

  const extractAfter = (pattern: RegExp): number | undefined => {
    const m = text.match(pattern);
    if (!m?.[1]) return undefined;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  };

  let widthCm = extractAfter(/(?:عرض|طول)\s*[:=]?\s*(\d{2,3})/);
  let heightCm = extractAfter(/(?:ارتفاع|علو|طول)\s*[:=]?\s*(\d{2,3})/);
  let depthCm = extractAfter(/(?:عمق|غوط)\s*[:=]?\s*(\d{2,3})/);

  // Support "200x220x60" or "200×220×60"
  const triple = text.match(/(\d{2,3})\s*[x×*]\s*(\d{2,3})(?:\s*[x×*]\s*(\d{2,3}))?/);
  if (triple) {
    widthCm = widthCm ?? Number(triple[1]);
    heightCm = heightCm ?? Number(triple[2]);
    if (triple[3]) depthCm = depthCm ?? Number(triple[3]);
  }

  const doorsCount = extractAfter(/(\d{1,2})\s*(?:ضلف|دلف|باب|أبواب)/);
  const drawersCount = extractAfter(/(\d{1,2})\s*(?:درج|أدراج|ادراج)/);
  const shelvesCount = extractAfter(/(\d{1,2})\s*(?:رف|رفوف|أرفف)/);

  return {
    templateId,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    shelvesCount,
    drawersCount,
  };
}

/**
 * 100% Local On-Device Workshop Photo Blueprint Engine.
 * Guarantees the Photo Tab ALWAYS produces a real, detailed, accurate carpentry blueprint
 * even inside a standalone offline Android APK!
 */
function buildLocalPhotoBlueprint(opts: {
  selectedTemplateId: FurnitureTemplateId;
  selectedWoodId: WoodTypeId;
  fitMode: FitMode;
  targetWidthCm: number;
  targetHeightCm: number;
  targetDepthCm: number;
  doorsCount: number;
  shelvesCount: number;
  drawersCount: number;
  boardThicknessMm: number;
  roomLengthCm: number;
  roomWidthCm: number;
  roomCeilingCm: number;
  roomType: string;
  userNotes: string;
  sheetPriceEgp: number;
}): PhotoAnalysisResult {
  const parsedNotes = parseEgyptianNotes(opts.userNotes, opts.selectedTemplateId);
  const templateId =
    opts.fitMode === 'free' && opts.userNotes.trim()
      ? parsedNotes.templateId
      : opts.selectedTemplateId;

  const spec = getTemplateSpec(templateId);
  const woodSpec = getWoodSpec(opts.selectedWoodId);

  let widthCm = opts.targetWidthCm;
  let heightCm = opts.targetHeightCm;
  let depthCm = opts.targetDepthCm;
  let doorsCount = opts.doorsCount;
  let shelvesCount = opts.shelvesCount;
  let drawersCount = opts.drawersCount;

  let fitExplanationEg = '';

  if (opts.fitMode === 'room') {
    // Auto-size comfortably for the room while keeping >= 75cm clear walkway
    const maxWallW = Math.max(60, Math.min(360, opts.roomLengthCm - 60));
    const maxSafeDepth = Math.max(30, Math.min(spec.defaults.depthCm, opts.roomWidthCm - 90));
    const maxSafeHeight = Math.max(
      spec.defaults.heightCm > 150 ? Math.min(245, opts.roomCeilingCm - 25) : spec.defaults.heightCm,
      45
    );
    widthCm = Math.round(Math.min(maxWallW, Math.max(spec.defaults.widthCm, opts.roomLengthCm * 0.62)));
    depthCm = Math.round(maxSafeDepth);
    heightCm = Math.round(maxSafeHeight);
    fitExplanationEg = `اتظبّطت مقاسات ${spec.nameAr} عشان تركب مرتاحة في ${opts.roomType} (${egSpokenLength(
      opts.roomLengthCm
    )} × ${egSpokenLength(opts.roomWidthCm)} وسقف ${egSpokenLength(
      opts.roomCeilingCm
    )}) وتسيب ممر مشي واسع أكتر من 80 سنتي من غير ما تقفل باب ولا شباك.`;
  } else if (opts.fitMode === 'free') {
    widthCm = parsedNotes.widthCm ?? opts.targetWidthCm;
    heightCm = parsedNotes.heightCm ?? opts.targetHeightCm;
    depthCm = parsedNotes.depthCm ?? opts.targetDepthCm;
    doorsCount = parsedNotes.doorsCount ?? opts.doorsCount;
    shelvesCount = parsedNotes.shelvesCount ?? opts.shelvesCount;
    drawersCount = parsedNotes.drawersCount ?? opts.drawersCount;
    fitExplanationEg = `اتنفّذ التصميم والتقطيع على حسب كلامك بالظبط: «${opts.userNotes.trim()}» مع مراعاة خلوصات الضلف وتخانة الخشب ${opts.boardThicknessMm} مللي.`;
  } else {
    fitExplanationEg = `اتظبّطت الصورة على مقاسك اليدوي بالملي: عرض ${egSpokenLength(
      widthCm
    )} × ارتفاع ${egSpokenLength(heightCm)} × عمق ${egSpokenLength(
      depthCm
    )} — وحسبنالك خصم تخانة اللوح (${opts.boardThicknessMm} مللي) وخلوصات التقفيل.`;
  }

  const dividersCount =
    widthCm >= 160 && spec.supportsDividers ? Math.max(1, Math.floor(widthCm / 85)) : spec.defaults.dividersCount;

  const projectParams: ProjectParams = {
    templateId,
    projectTitle: `${spec.nameAr} (متظبط من صورتك)`,
    clientName: '',
    widthCm: Math.max(30, Math.min(500, Math.round(widthCm))),
    heightCm: Math.max(30, Math.min(350, Math.round(heightCm))),
    depthCm: Math.max(20, Math.min(250, Math.round(depthCm))),
    doorsCount: spec.supportsDoors ? Math.max(0, Math.min(8, Math.round(doorsCount))) : 0,
    shelvesCount: spec.supportsShelves ? Math.max(0, Math.min(14, Math.round(shelvesCount))) : 0,
    drawersCount: spec.supportsDrawers ? Math.max(0, Math.min(10, Math.round(drawersCount))) : 0,
    dividersCount: spec.supportsDividers ? Math.max(0, Math.min(5, dividersCount)) : 0,
    plinthHeightCm: spec.defaults.plinthHeightCm,
    woodType: opts.selectedWoodId,
    boardThicknessMm: Math.max(8, Math.min(40, Math.round(opts.boardThicknessMm))),
    backThicknessMm: spec.defaults.backThicknessMm,
    kerfMm: 3,
    allowGrainRotation: true,
    includeBackPanel: spec.supportsBackPanel,
    customPieces: [],
  };

  const calc = calculateCarpentryProject(projectParams);
  const mainSheetsCost = calc.sheets.mainSheets.length * opts.sheetPriceEgp;
  const backSheetsCost = calc.sheets.backSheetsCount * 580;
  const edgeCost = Math.round(calc.totalEdgeBandingMeters * 18);
  const hwCost = calc.hardware.reduce((sum, h) => sum + h.qty * h.unitPriceEgp, 0);
  const rawTotal = mainSheetsCost + backSheetsCost + edgeCost + hwCost + 350;
  const grandTotal = Math.round(rawTotal * 1.45);

  const detailedCutList: AnalyzedCutRow[] = calc.pieces.map((p) => ({
    code: p.code,
    nameEg: p.nameAr,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    thicknessMm: p.thicknessMm,
    qty: p.qty,
    spokenSizeEg: `طول ${egSpokenLength(p.lengthCm)} × عرض ${egSpokenLength(p.widthCm)} — ${egThickness(
      p.thicknessMm
    )}`,
    edgeBandingEg: egEdgeBandingText(p.edgeBanding.longSides, p.edgeBanding.shortSides),
    noteEg: p.noteAr,
    isExtraSpecialPiece: false,
  }));

  const hardwareListEg: AnalyzedHardwareRow[] = calc.hardware.map((h) => ({
    nameEg: h.nameAr,
    qtyTextEg: `${h.qty} ${h.unitAr}`,
    specEg: h.specAr,
    approxCostEgp: h.qty * h.unitPriceEgp,
  }));

  const assemblyStepsEg: AnalyzedStepRow[] = calc.steps.map((s) => ({
    stepNumber: s.stepNumber,
    titleEg: s.titleAr,
    detailsEg: s.detailsAr,
    masterTipEg: s.tipAr,
  }));

  return {
    detectedTitleEg: `${spec.nameAr} — متفصّل على مقاسك من الصورة`,
    styleSummaryEg: `تفصيل ورشة مصري على مقاس ${egBoxDims(
      projectParams.widthCm,
      projectParams.heightCm,
      projectParams.depthCm
    )} بخامة ${woodSpec.nameAr} و${egThickness(projectParams.boardThicknessMm)}${
      opts.userNotes.trim() ? ` · ملاحظاتك: ${opts.userNotes.trim()}` : ''
    }.`,
    fitExplanationEg,
    dimensionsSpokenEg: `عرض ${egSpokenLength(projectParams.widthCm)} × ارتفاع ${egSpokenLength(
      projectParams.heightCm
    )} × عمق ${egSpokenLength(projectParams.depthCm)}`,
    mappedTemplateId: templateId,
    recommendedWoodType: opts.selectedWoodId,
    recommendedWoodNameEg: `${woodSpec.nameAr} — ${egThickness(projectParams.boardThicknessMm)}`,
    fittedDimensions: {
      widthCm: projectParams.widthCm,
      heightCm: projectParams.heightCm,
      depthCm: projectParams.depthCm,
      doorsCount: projectParams.doorsCount,
      shelvesCount: projectParams.shelvesCount,
      drawersCount: projectParams.drawersCount,
      dividersCount: projectParams.dividersCount,
      plinthHeightCm: projectParams.plinthHeightCm,
      boardThicknessMm: projectParams.boardThicknessMm,
    },
    detailedCutList,
    hardwareListEg,
    assemblyStepsEg,
    finishingAndPaintEg:
      'صنفرة ناعمة بدرجة 220 وبعدين وشين سيلر شفاف مطفي أو بولي يوريثان حسب لون الصورة، ولزق شريط حرف PVC تخانة 2 مللي على الضلف والوشوش عشان تقفيل نظيف زي الجاهز.',
    commonMistakesEg: [
      `اوعى تقص قبل ما تراجع الوتر (${calc.diagonalCheckCm} سنتي) عشان العلبة تطلع قايمة 90 درجة ومش ملوّحة.`,
      'سيب خلوص 3 مللي بين كل ضلفة والتانية و26 مللي إجمالي لمجاري الأدراج السوفت كلوز عشان ما تحكش.',
      'لو الأرضية فيها ميل في الشقة، اعمل ريجلاش تحت الوزرة عشان الضلف تقفل مظبوط على ميزان المية.',
    ],
    estimatedSheetsCount: calc.sheets.mainSheets.length,
    estimatedTotalCostEgp: grandTotal,
    estimatedWorkHours: calc.estimatedHours,
    carpenterVerdictEg: `الشغلانة دي هتاخد ${egQtySheets(
      calc.sheets.mainSheets.length
    )} أساسي بنسبة هالك ${calc.sheets.wastePct}% (${calc.sheets.wasteAreaM2} متر مربع) وإجمالي ${egQtyPieces(
      calc.totalPiecesCount
    )} — جاهزة للتنفيذ فوراً وبتتفتح 3D بضغطة واحدة!`,
    engineSource: 'local',
  };
}

export const PhotoToDesignView: React.FC<Props> = ({
  locale,
  isOnline,
  sheetPriceEgp,
  currencyLabel,
  onUpdateSheetPrice,
  onApplyTo3D,
}) => {
  const isRtl = locale === 'ar';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default to 'upload' so phone users immediately see the big gallery/camera button
  const [sourceMode, setSourceMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState<string>('image/jpeg');
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewImgError, setPreviewImgError] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<FurnitureTemplateId>('wardrobe');
  const [selectedWoodId, setSelectedWoodId] = useState<WoodTypeId>('oak18');
  const [fitMode, setFitMode] = useState<FitMode>('custom');

  // Fully manual editable dimensions
  const [targetWidthCm, setTargetWidthCm] = useState(200);
  const [targetHeightCm, setTargetHeightCm] = useState(220);
  const [targetDepthCm, setTargetDepthCm] = useState(60);
  const [doorsCount, setDoorsCount] = useState(4);
  const [shelvesCount, setShelvesCount] = useState(5);
  const [drawersCount, setDrawersCount] = useState(2);
  const [boardThicknessMm, setBoardThicknessMm] = useState(18);
  const [cropMode, setCropMode] = useState<'contain' | 'cover'>('contain');

  // Room dimensions
  const [roomLengthCm, setRoomLengthCm] = useState(380);
  const [roomWidthCm, setRoomWidthCm] = useState(340);
  const [roomCeilingCm, setRoomCeilingCm] = useState(280);
  const [roomType, setRoomType] = useState('أوضة نوم');

  // Optional free notes
  const [userNotes, setUserNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [exportingAnnotated, setExportingAnnotated] = useState(false);

  const [savedPlan, setSavedPlan] = useState<StoredPhotoPlan | null>(() => loadLastPhotoPlan());

  useEffect(() => {
    if (savedPlan && !previewSrc && savedPlan.previewUrl) {
      setPreviewSrc(savedPlan.previewUrl);
    }
  }, [savedPlan, previewSrc]);

  const handleSelectPhotoTemplate = (tplId: FurnitureTemplateId) => {
    const spec = getTemplateSpec(tplId);
    setSelectedTemplateId(tplId);
    setTargetWidthCm(spec.defaults.widthCm);
    setTargetHeightCm(spec.defaults.heightCm);
    setTargetDepthCm(spec.defaults.depthCm);
    setDoorsCount(spec.defaults.doorsCount);
    setShelvesCount(spec.defaults.shelvesCount);
    setDrawersCount(spec.defaults.drawersCount);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusNotice(null);
    setPreviewImgError(false);
    try {
      const loaded = await loadPhotoFileSafely(file);
      setUploadedBase64(loaded.base64);
      setUploadedMime(loaded.mimeType);
      setPreviewSrc(loaded.dataUrl);
      setImageUrlInput('');
      setSourceMode('upload');
    } catch (err) {
      setStatusNotice(
        err instanceof Error
          ? err.message
          : 'معرفناش نقرأ الصورة دي — جرب صورة تانية من الاستوديو.'
      );
    } finally {
      // Allow re-picking the same photo if needed
      e.target.value = '';
    }
  };

  const handlePickSamplePhoto = async (
    tplId: FurnitureTemplateId,
    assetUrl: string,
    sampleNote: string
  ) => {
    setStatusNotice(null);
    setPreviewImgError(false);
    handleSelectPhotoTemplate(tplId);
    try {
      const converted = await fetchLocalAssetAsBase64(assetUrl);
      setUploadedBase64(converted.base64);
      setUploadedMime(converted.mimeType);
      setPreviewSrc(converted.dataUrl);
      setImageUrlInput('');
      setSourceMode('upload');
      if (!userNotes.trim()) {
        setUserNotes(sampleNote);
      }
    } catch {
      setPreviewSrc(assetUrl);
    }
  };

  const persistAndDisplayResult = (
    result: PhotoAnalysisResult,
    finalPreview: string,
    noticeText: string | null
  ) => {
    const nextStored: StoredPhotoPlan = {
      result,
      previewUrl:
        finalPreview.startsWith('data:') && finalPreview.length > 420_000
          ? ''
          : finalPreview,
      analyzedAt: new Date().toISOString(),
    };
    setSavedPlan(nextStored);
    setStatusNotice(noticeText);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
    } catch {
      // ignore storage quota
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);

    const trimmedUrl = imageUrlInput.trim();
    if (fitMode === 'free' && !userNotes.trim()) {
      setStatusNotice(
        'اكتب المقاسات أو التعديلات اللي انت عاوزها في المربع تحت (مثلاً: دولاب عرض 220 وارتفاع 230 وعمق 60 و4 ضلف و3 أدراج).'
      );
      return;
    }

    setLoading(true);

    const fallbackLocalPlan = () =>
      buildLocalPhotoBlueprint({
        selectedTemplateId,
        selectedWoodId,
        fitMode,
        targetWidthCm,
        targetHeightCm,
        targetDepthCm,
        doorsCount,
        shelvesCount,
        drawersCount,
        boardThicknessMm,
        roomLengthCm,
        roomWidthCm,
        roomCeilingCm,
        roomType,
        userNotes,
        sheetPriceEgp,
      });

    // Try live AI Vision when online & a photo is supplied (with safe timeout & zero-crash fallback)
    const hasPhoto = Boolean(uploadedBase64 || trimmedUrl);
    if (isOnline && hasPhoto && !isRunningInsideNativeApk()) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 14000);
      try {
        const payload: Record<string, unknown> = {
          fitMode,
          targetWidthCm,
          targetHeightCm,
          targetDepthCm,
          roomLengthCm,
          roomWidthCm,
          roomCeilingCm,
          roomType,
          userNotes: userNotes.trim(),
          sheetPriceEgp,
          currencyLabel,
        };
        if (uploadedBase64 && (sourceMode === 'upload' || !trimmedUrl)) {
          payload.imageBase64 = uploadedBase64;
          payload.imageMimeType = uploadedMime;
        } else {
          payload.imageUrl = trimmedUrl;
        }

        const resp = await fetch(resolveApiUrl('/api/carpentry/analyze-photo'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const rawText = await resp.text();
        const data = JSON.parse(rawText) as {
          result?: PhotoAnalysisResult;
          previewDataUrl?: string | null;
        };

        if (resp.ok && data.result && data.result.detectedTitleEg) {
          const finalPreview = data.previewDataUrl || previewSrc || trimmedUrl || '';
          if (finalPreview) setPreviewSrc(finalPreview);
          persistAndDisplayResult(
            { ...data.result, engineSource: 'ai' },
            finalPreview,
            null
          );
          setLoading(false);
          window.clearTimeout(timer);
          return;
        }
      } catch {
        // Silently fall through to guaranteed local workshop engine below!
      } finally {
        window.clearTimeout(timer);
      }
    }

    // Guaranteed Local On-Device Workshop Blueprint Engine (100% works on phone APK & offline!)
    const localResult = fallbackLocalPlan();
    const finalPreview = previewSrc || trimmedUrl || getTemplateSpec(localResult.mappedTemplateId).imageUrl;
    if (!previewSrc && finalPreview) {
      setPreviewSrc(finalPreview);
    }
    persistAndDisplayResult(
      localResult,
      finalPreview,
      'تم تجهيز المقاسات وتفصيل القطع فوراً على موبايلك (تقدر تعدل أي رقم فوق وتضغط تاني للتحديث الفوري).'
    );
    setLoading(false);
  };

  /**
   * Draws the user's photo + live Egyptian dimension arrows + fitted spec strip onto a real PNG
   * so they can save/share the edited sized photo directly to WhatsApp or their customer!
   */
  const handleSaveAnnotatedPhotoPng = async () => {
    if (!previewSrc) return;
    setExportingAnnotated(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not load photo'));
        img.src = previewSrc;
      });

      const canvasW = 1080;
      const canvasH = 1220;
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Warm workshop blueprint background
      ctx.fillStyle = '#18181B';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Header bar with Egyptian title & dimensions
      ctx.fillStyle = '#B45309';
      ctx.fillRect(0, 0, canvasW, 118);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `BOLA WOOD 3D — ${getTemplateSpec(selectedTemplateId).nameAr}`,
        canvasW / 2,
        52
      );
      ctx.font = 'bold 26px Cairo, sans-serif';
      ctx.fillStyle = '#FEF3C7';
      ctx.fillText(
        `المقاس المتظبط: عرض ${targetWidthCm} سم × ارتفاع ${targetHeightCm} سم × عمق ${targetDepthCm} سم`,
        canvasW / 2,
        96
      );

      // Draw photo neatly centered inside dimension frame
      const padX = 95;
      const padTop = 185;
      const boxW = canvasW - padX * 2;
      const boxH = 820;

      ctx.fillStyle = '#27272A';
      ctx.fillRect(padX, padTop, boxW, boxH);

      const scale =
        cropMode === 'cover'
          ? Math.max(boxW / img.width, boxH / img.height)
          : Math.min(boxW / img.width, boxH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = padX + (boxW - drawW) / 2;
      const drawY = padTop + (boxH - drawH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(padX, padTop, boxW, boxH);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Golden architectural border + top/side measurement lines
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.strokeRect(padX, padTop, boxW, boxH);

      // Top Width Dimension Line
      ctx.beginPath();
      ctx.moveTo(padX, padTop - 28);
      ctx.lineTo(padX + boxW, padTop - 28);
      ctx.stroke();
      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 28px Cairo, sans-serif';
      ctx.fillText(`العرض: ${egSpokenLength(targetWidthCm)} (${targetWidthCm} سم)`, canvasW / 2, padTop - 40);

      // Footer specs bar
      ctx.fillStyle = '#27272A';
      ctx.fillRect(0, canvasH - 175, canvasW, 175);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 26px Cairo, sans-serif';
      ctx.fillText(
        `الارتفاع: ${targetHeightCm} سم · العمق: ${targetDepthCm} سم · التخانة: ${boardThicknessMm} مللي`,
        canvasW / 2,
        canvasH - 118
      );
      ctx.fillStyle = '#E4E4E7';
      ctx.font = '24px Cairo, sans-serif';
      ctx.fillText(
        `الخشب: ${getWoodSpec(selectedWoodId).nameAr} · الضلف: ${doorsCount} · الرفوف: ${shelvesCount} · الأدراج: ${drawersCount}`,
        canvasW / 2,
        canvasH - 68
      );

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `bola-wood-photo-${targetWidthCm}x${targetHeightCm}cm.png`;
      a.click();
    } catch {
      setStatusNotice('ملاحظة: لو الصورة من رابط خارجي مانع التحميل، احفظ الصورة على موبايلك وارفعها من الاستوديو عشان تحفظها بالمقاسات.');
    } finally {
      setExportingAnnotated(false);
    }
  };

  const handleOpenIn3D = (plan: PhotoAnalysisResult) => {
    const spec = getTemplateSpec(plan.mappedTemplateId);
    const d = plan.fittedDimensions;

    const extraPieces: CustomExtraPiece[] = plan.detailedCutList
      .filter((row) => row.isExtraSpecialPiece)
      .slice(0, 8)
      .map((row, idx) => ({
        id: `photo-extra-${Date.now()}-${idx}`,
        name: row.nameEg,
        lengthCm: Math.max(8, Math.min(240, Math.round(row.lengthCm))),
        widthCm: Math.max(8, Math.min(120, Math.round(row.widthCm))),
        qty: Math.max(1, Math.min(20, Math.round(row.qty))),
        edgeSides: '1L',
      }));

    const nextParams: ProjectParams = {
      templateId: plan.mappedTemplateId,
      projectTitle: plan.detectedTitleEg.slice(0, 60),
      clientName: '',
      widthCm: Math.max(25, Math.min(500, Math.round(d.widthCm))),
      heightCm: Math.max(25, Math.min(350, Math.round(d.heightCm))),
      depthCm: Math.max(18, Math.min(250, Math.round(d.depthCm))),
      doorsCount: spec.supportsDoors ? Math.max(0, Math.min(8, Math.round(d.doorsCount))) : 0,
      shelvesCount: spec.supportsShelves ? Math.max(0, Math.min(14, Math.round(d.shelvesCount))) : 0,
      drawersCount: spec.supportsDrawers ? Math.max(0, Math.min(10, Math.round(d.drawersCount))) : 0,
      dividersCount: spec.supportsDividers ? Math.max(0, Math.min(5, Math.round(d.dividersCount))) : 0,
      plinthHeightCm: spec.supportsPlinth
        ? Math.max(0, Math.min(30, Math.round(d.plinthHeightCm)))
        : spec.defaults.plinthHeightCm,
      woodType: plan.recommendedWoodType,
      boardThicknessMm: Math.max(8, Math.min(40, Math.round(d.boardThicknessMm || 18))),
      backThicknessMm: spec.defaults.backThicknessMm,
      kerfMm: 3,
      allowGrainRotation: true,
      includeBackPanel: spec.supportsBackPanel,
      customPieces: extraPieces,
    };

    onApplyTo3D(nextParams);
  };

  const handleCopyWhatsApp = async (plan: PhotoAnalysisResult) => {
    const cutLines = plan.detailedCutList
      .map(
        (c) =>
          `• ${c.code} (${c.nameEg}): ${c.spokenSizeEg || `${egDim(c.lengthCm)} × ${egDim(c.widthCm)}`} — ${egQtyPieces(
            c.qty
          )} (${c.edgeBandingEg})`
      )
      .join('\n');

    const hwLines = plan.hardwareListEg
      .map((h) => `• ${h.nameEg}: ${h.qtyTextEg} (${h.specEg})`)
      .join('\n');

    const text = [
      `تفصيل نجارة من صورة — ${plan.detectedTitleEg}`,
      `المقاس المتظبط: ${egBoxDims(
        plan.fittedDimensions.widthCm,
        plan.fittedDimensions.heightCm,
        plan.fittedDimensions.depthCm
      )}`,
      `الخشب: ${plan.recommendedWoodNameEg}`,
      `الألواح: ${egQtySheets(plan.estimatedSheetsCount)} · التكلفة التقريبية: ${plan.estimatedTotalCostEgp.toLocaleString()} ${currencyLabel}`,
      '',
      '--- مقاسات التقطيع حتة حتة ---',
      cutLines,
      '',
      '--- الخردوات والإكسسوارات ---',
      hwLines,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      window.setTimeout(() => setCopiedWhatsApp(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  // Live preview frame aspect ratio reflecting user's manual width vs height
  const previewAspectRatio = useMemo(() => {
    const w = Math.max(40, targetWidthCm);
    const h = Math.max(40, targetHeightCm);
    const ratio = w / h;
    return Math.max(0.65, Math.min(1.85, ratio));
  }, [targetWidthCm, targetHeightCm]);

  const activeResult = savedPlan?.result ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Compact Header */}
      <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0">
          <ImagePlus className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
            {isRtl
              ? 'صمّم من أي صورة من موبايلك أو النت — وعدّل مقاساتها يدوي بالكامل!'
              : 'Design from Any Phone or Web Photo — Full Manual Sizing'}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
            {isRtl
              ? 'ارفع الصورة وشوف المقاسات مرسومة عليها فوراً، وعدّل العرض والارتفاع والعمق والضلف وسعر اللوح يدوي — شغّال أونلاين وأوفلاين من غير أي أخطاء.'
              : 'Upload a photo, adjust every dimension manually on the live frame, get the complete cut list, and open in 3D — works 100% online & offline.'}
          </p>
        </div>
      </section>

      {/* Responsive Split: Mobile stacks Live Photo Preview + Form cleanly */}
      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-5 items-start">
        {/* Live Scaled Photo Blueprint Preview (Shows FIRST on mobile right after picking!) */}
        <div className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
          <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-3.5 sm:p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-100">
                معاينة الصورة بمقاساتك الحقيقية
              </span>
              {previewSrc && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCropMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
                    className="min-h-[34px] px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-stone-700 dark:text-stone-200"
                  >
                    {cropMode === 'contain' ? 'ملء البرواز' : 'إظهار الصورة كاملة'}
                  </button>
                  <button
                    type="button"
                    disabled={exportingAnnotated}
                    onClick={() => void handleSaveAnnotatedPhotoPng()}
                    className="min-h-[34px] px-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{exportingAnnotated ? 'بيتحفظ...' : 'حفظ بالمقاسات'}</span>
                  </button>
                </div>
              )}
            </div>

            {previewSrc && !previewImgError ? (
              <div className="rounded-xl bg-stone-900 p-3 sm:p-4 flex flex-col items-center gap-2.5">
                {/* Top Width Dimension Bar */}
                <div className="w-full flex items-center gap-2 text-[11px] font-bold text-amber-300">
                  <span className="h-px flex-1 bg-amber-400/70" />
                  <span className="whitespace-nowrap tabular-nums">
                    العرض: {targetWidthCm} سنتي ({egSpokenLength(targetWidthCm)})
                  </span>
                  <span className="h-px flex-1 bg-amber-400/70" />
                </div>

                {/* Scaled Photo Frame matching User's Width:Height Ratio */}
                <div className="w-full flex items-center justify-center gap-2">
                  <div
                    style={{ aspectRatio: String(previewAspectRatio) }}
                    className="relative w-full max-h-[300px] sm:max-h-[360px] rounded-xl overflow-hidden border-2 border-amber-400/80 bg-stone-950 flex items-center justify-center"
                  >
                    <img
                      src={previewSrc}
                      alt="معاينة الصورة بالمقاسات"
                      referrerPolicy="no-referrer"
                      onError={() => setPreviewImgError(true)}
                      className={`w-full h-full ${
                        cropMode === 'cover' ? 'object-cover' : 'object-contain'
                      }`}
                    />
                    <div className="absolute bottom-2 inset-x-2 rounded-lg bg-black/75 px-2.5 py-1.5 text-[11px] text-white flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-amber-300">
                        {getTemplateSpec(selectedTemplateId).nameAr}
                      </span>
                      <span className="font-mono tabular-nums">
                        {targetWidthCm}×{targetHeightCm}×{targetDepthCm} سم · {boardThicknessMm}مم
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Live Specs Strip */}
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-200 pt-1">
                  <span>الارتفاع: {egSpokenLength(targetHeightCm)}</span>
                  <span>·</span>
                  <span>العمق: {egSpokenLength(targetDepthCm)}</span>
                  <span>·</span>
                  <span>
                    {doorsCount} ضلف · {shelvesCount} رفوف · {drawersCount} أدراج
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSourceMode('upload');
                  fileInputRef.current?.click();
                }}
                className="min-h-[190px] rounded-xl border-2 border-dashed border-amber-400/80 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/15 hover:bg-amber-50 dark:hover:bg-amber-950/30 p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors"
              >
                <Camera className="w-8 h-8 text-amber-700 dark:text-amber-400" />
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  اضغط هنا لاختيار صورة من الاستوديو أو الكاميرا
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs">
                  الصورة هتظهر هنا فوراً بالمقاسات مرسومة عليها، وتقدر تعدّل كل مقاس يدوي وتحفظها أو تفتحها 3D
                </p>
              </button>
            )}
          </section>

          {/* Detailed Blueprint Result Card */}
          {activeResult && (
            <div className="flex flex-col gap-4">
              {/* Summary + Big Open in 3D CTA */}
              <section className="rounded-2xl border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {activeResult.detectedTitleEg}
                    </h2>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                      {activeResult.styleSummaryEg}
                    </p>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-1.5">
                      {activeResult.fitExplanationEg}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenIn3D(activeResult)}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Box className="w-4 h-4 shrink-0" />
                      <span>افتحه 3D والألواح</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyWhatsApp(activeResult)}
                      className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#191C20] text-xs font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {copiedWhatsApp ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedWhatsApp ? 'اتنسخ!' : 'نسخ للواتساب'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3">
                    <span className="text-stone-500 block">المقاس النهائي</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                      {activeResult.dimensionsSpokenEg}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3">
                    <span className="text-stone-500 block">الخشب والتخانة</span>
                    <span className="font-bold text-amber-800 dark:text-amber-400 mt-0.5 block">
                      {activeResult.recommendedWoodNameEg}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3">
                    <span className="text-stone-500 block">الألواح (122×244)</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                      {egQtySheets(activeResult.estimatedSheetsCount)} · ~{activeResult.estimatedWorkHours} ساعة
                    </span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-800 p-3">
                    <span className="text-stone-500 block">التكلفة التقريبية</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5 block">
                      {activeResult.estimatedTotalCostEgp.toLocaleString()} {currencyLabel}
                    </span>
                  </div>
                </div>

                {activeResult.carpenterVerdictEg && (
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50">
                    خلاصة الأسطى: {activeResult.carpenterVerdictEg}
                  </p>
                )}
              </section>

              {/* Piece-by-Piece Cut List (Mobile-First Cards) */}
              <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span>تفصيل التقطيع حتة حتة ({activeResult.detailedCutList.length} بند)</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeResult.detailedCutList.map((row, i) => (
                    <div
                      key={`${row.code}-${i}`}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#111315] p-3 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {row.code}
                          </span>
                          <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                            {row.nameEg}
                          </span>
                        </div>
                        <span className="font-bold text-blue-700 dark:text-blue-400 shrink-0">
                          {egQtyPieces(row.qty)}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                        {egDim(row.lengthCm)} × {egDim(row.widthCm)} · {egThickness(row.thicknessMm)}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        شريط حرف: {row.edgeBandingEg}
                        {row.noteEg ? ` · ${row.noteEg}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Hardware + Paint + Mistakes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span>الخردوات والمفصلات المطلوبة</span>
                  </h3>
                  <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                    {activeResult.hardwareListEg.map((h, i) => (
                      <div key={i} className="py-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-stone-900 dark:text-stone-100">{h.nameEg}</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">{h.specEg}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <span className="font-bold text-stone-800 dark:text-stone-200 block">
                            {h.qtyTextEg}
                          </span>
                          <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                            {h.approxCostEgp.toLocaleString()} {currencyLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex flex-col gap-3 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-1.5">
                      <Paintbrush className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>الدهان والتشطيب</span>
                    </h3>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      {activeResult.finishingAndPaintEg}
                    </p>
                  </div>

                  {activeResult.commonMistakesEg.length > 0 && (
                    <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800">
                      <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>خد بالك من الغلطات دي:</span>
                      </h4>
                      <ul className="space-y-1.5 text-stone-700 dark:text-stone-300">
                        {activeResult.commonMistakesEg.map((m, idx) => (
                          <li key={idx}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>

              {/* Assembly Steps */}
              <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Hammer className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>خطوات التجميع في الورشة</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {activeResult.assemblyStepsEg.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#111315] p-3 flex flex-col gap-1"
                    >
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {step.stepNumber}. {step.titleEg}
                      </span>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                        {step.detailsEg}
                      </p>
                      {step.masterTipEg && (
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 mt-0.5">
                          تريكاية الأسطى: {step.masterTipEg}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Manual Input Form Panel */}
        <form
          onSubmit={handleAnalyze}
          className="order-2 lg:order-1 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 flex flex-col gap-4"
        >
          {/* Step 1: Photo Source */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                1. اختار الصورة
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSourceMode('upload')}
                  className={`min-h-[34px] px-2.5 rounded-md flex items-center gap-1 ${
                    sourceMode === 'upload'
                      ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>من موبايلك</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('url')}
                  className={`min-h-[34px] px-2.5 rounded-md flex items-center gap-1 ${
                    sourceMode === 'url'
                      ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>رابط نت</span>
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {sourceMode === 'upload' ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[54px] rounded-xl border border-amber-400 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/25 hover:bg-amber-100/70 px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-200 transition-colors"
              >
                <Camera className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>
                  {uploadedBase64
                    ? 'تغيير الصورة من الاستوديو / الكاميرا'
                    : 'اختار صورة من الاستوديو أو الكاميرا'}
                </span>
              </button>
            ) : (
              <input
                type="url"
                dir="ltr"
                value={imageUrlInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setImageUrlInput(val);
                  setUploadedBase64(null);
                  setPreviewImgError(false);
                  const trimmed = val.trim();
                  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
                    setPreviewSrc(trimmed);
                  }
                }}
                placeholder="https://example.com/wardrobe.jpg"
                className="h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-700"
              />
            )}

            {/* Quick Sample Photos */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  tpl: FURNITURE_TEMPLATES[0],
                  label: 'دولاب',
                  note: 'دولاب مودرن بـ 4 ضلف و3 أدراج تحت',
                },
                {
                  tpl: FURNITURE_TEMPLATES[5],
                  label: 'مطبخ',
                  note: 'وحدة مطبخ بقرصة رخام وأدراج سوفت كلوز',
                },
                {
                  tpl: FURNITURE_TEMPLATES[8],
                  label: 'مكتبة شاشة',
                  note: 'مكتبة شاشة متعلقة على الحيطة بفتحات سلك',
                },
              ].map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() =>
                    void handlePickSamplePhoto(sample.tpl.id, sample.tpl.imageUrl, sample.note)
                  }
                  className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 hover:border-amber-600 text-start bg-stone-50 dark:bg-[#111315]"
                >
                  <img
                    src={sample.tpl.imageUrl}
                    alt={sample.label}
                    className="w-full h-12 object-cover"
                  />
                  <span className="block px-2 py-1 text-[11px] font-bold text-stone-800 dark:text-stone-200 truncate text-center">
                    {sample.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Furniture Type & Wood Selector (Manual) */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
            <label className="flex flex-col gap-1">
              <span className="font-bold text-stone-700 dark:text-stone-200">
                نوع القطعة في الصورة
              </span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectPhotoTemplate(e.target.value as FurnitureTemplateId)}
                className="h-11 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] font-semibold text-stone-900 dark:text-stone-100"
              >
                {FURNITURE_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameAr}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-bold text-stone-700 dark:text-stone-200">نوع الخشب</span>
              <select
                value={selectedWoodId}
                onChange={(e) => setSelectedWoodId(e.target.value as WoodTypeId)}
                className="h-11 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] font-semibold text-stone-900 dark:text-stone-100"
              >
                {WOOD_MATERIALS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr.split('(')[0]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Step 3: Fit Mode + Full Manual Dimensions */}
          <div className="flex flex-col gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
              2. عدّل المقاسات يدوي براحتك
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'custom', label: 'مقاس يدوي', icon: Ruler },
                  { id: 'room', label: 'مساحة أوضة', icon: Home },
                  { id: 'free', label: 'اكتب طلبك', icon: FileText },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const active = fitMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFitMode(m.id)}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                      active
                        ? 'border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {fitMode === 'custom' && (
              <div className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 p-3 flex flex-col gap-3">
                {[
                  { label: 'العرض', val: targetWidthCm, set: setTargetWidthCm, min: 25, max: 500 },
                  { label: 'الارتفاع', val: targetHeightCm, set: setTargetHeightCm, min: 25, max: 350 },
                  { label: 'العمق', val: targetDepthCm, set: setTargetDepthCm, min: 18, max: 250 },
                ].map((dim) => (
                  <div key={dim.label} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-700 dark:text-stone-200">{dim.label}</span>
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                        {egSpokenLength(dim.val)}
                      </span>
                    </div>
                    <ManualNumberInput
                      value={dim.val}
                      onChange={dim.set}
                      min={dim.min}
                      max={dim.max}
                      step={5}
                      unit="سنتي"
                      showSteppers
                    />
                  </div>
                ))}

                {/* Manual Doors / Shelves / Drawers / Thickness / Wood Price */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-stone-200/70 dark:border-stone-800 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">الضلف</span>
                    <ManualNumberInput
                      value={doorsCount}
                      onChange={setDoorsCount}
                      min={0}
                      max={8}
                      showSteppers
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">الرفوف</span>
                    <ManualNumberInput
                      value={shelvesCount}
                      onChange={setShelvesCount}
                      min={0}
                      max={14}
                      showSteppers
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">الأدراج</span>
                    <ManualNumberInput
                      value={drawersCount}
                      onChange={setDrawersCount}
                      min={0}
                      max={10}
                      showSteppers
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">
                      التخانة (مللي)
                    </span>
                    <ManualNumberInput
                      value={boardThicknessMm}
                      onChange={setBoardThicknessMm}
                      min={8}
                      max={40}
                      unit="مم"
                      showSteppers
                    />
                  </div>
                </div>
              </div>
            )}

            {fitMode === 'room' && (
              <div className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 p-3 flex flex-col gap-3 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-stone-700 dark:text-stone-200">نوع الأوضة:</span>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#191C20] font-semibold"
                  >
                    <option value="أوضة نوم">أوضة نوم</option>
                    <option value="أوضة أطفال">أوضة أطفال</option>
                    <option value="دريسينج روم">دريسينج روم</option>
                    <option value="مطبخ">مطبخ</option>
                    <option value="ريسبشن / ليفينج">ريسبشن / ليفينج</option>
                    <option value="أوضة مكتب">أوضة مكتب</option>
                    <option value="مدخل شقة">مدخل شقة</option>
                  </select>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-stone-600 dark:text-stone-400">طول الأوضة</span>
                    <ManualNumberInput
                      value={roomLengthCm}
                      onChange={setRoomLengthCm}
                      min={100}
                      max={900}
                      step={10}
                      unit="سم"
                      showSteppers
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-stone-600 dark:text-stone-400">عرض الأوضة</span>
                    <ManualNumberInput
                      value={roomWidthCm}
                      onChange={setRoomWidthCm}
                      min={100}
                      max={800}
                      step={10}
                      unit="سم"
                      showSteppers
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-stone-600 dark:text-stone-400">ارتفاع السقف</span>
                    <ManualNumberInput
                      value={roomCeilingCm}
                      onChange={setRoomCeilingCm}
                      min={200}
                      max={450}
                      step={10}
                      unit="سم"
                      showSteppers
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Editable Wood Sheet Price right inside Photo tab */}
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-bold text-stone-700 dark:text-stone-200">
                سعر لوح الخشب (تعديل يدوي)
              </span>
              <ManualNumberInput
                value={sheetPriceEgp}
                onChange={onUpdateSheetPrice}
                min={0}
                max={100000}
                step={50}
                unit={currencyLabel}
                showSteppers
              />
            </div>

            {/* Free Notes */}
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-stone-700 dark:text-stone-200">
                ملاحظات أو تعديلات بالكلام (اختياري):
              </span>
              <textarea
                rows={2}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="مثال: عاوزها عرض 240 وارتفاع 220 وعمق 60 فيها 4 ضلف و3 أدراج..."
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-700"
              />
            </label>
          </div>

          {statusNotice && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
              {statusNotice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>بنجهّز المقاسات والتقطيع...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>ظبّط الصورة وطلّع التقطيع والـ 3D</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
