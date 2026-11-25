import { getWoodSpec } from './catalog';
import {
  AssemblyStep,
  CutPiece,
  EdgeBandingSpec,
  HardwareItem,
  PackedSheet,
  ProjectCalculation,
  ProjectParams,
  ReusableOffcut,
  SheetOptimizationResult,
  SheetPlacement,
} from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function calcEdgeMeters(lengthCm: number, widthCm: number, edge: EdgeBandingSpec): number {
  return round2((lengthCm * edge.longSides + widthCm * edge.shortSides) / 100);
}

function makePiece(
  code: string,
  nameAr: string,
  nameEn: string,
  lengthCm: number,
  widthCm: number,
  thicknessMm: number,
  qty: number,
  materialKind: CutPiece['materialKind'],
  edgeBanding: EdgeBandingSpec,
  category: CutPiece['category'],
  noteAr: string,
  noteEn: string,
  isCustom = false
): CutPiece {
  const L = Math.max(4, round1(lengthCm));
  const W = Math.max(4, round1(widthCm));
  return {
    id: `${code}-${L}-${W}-${qty}-${isCustom ? 'c' : 's'}`,
    code,
    nameAr,
    nameEn,
    lengthCm: L,
    widthCm: W,
    thicknessMm,
    qty,
    materialKind,
    edgeBanding,
    edgeMetersPerPiece: calcEdgeMeters(L, W, edgeBanding),
    grainDirection: L >= W ? 'length' : 'width',
    category,
    noteAr,
    noteEn,
    isCustom,
  };
}

function nearestSlideCm(availableDepthCm: number): number {
  const standard = [25, 30, 35, 40, 45, 50, 55, 60];
  let best = 25;
  for (const s of standard) {
    if (s <= availableDepthCm - 3) best = s;
  }
  return best;
}

function hingesPerDoor(doorHeightCm: number): number {
  if (doorHeightCm < 100) return 2;
  if (doorHeightCm < 160) return 3;
  if (doorHeightCm < 215) return 4;
  return 5;
}

function suggestOffcutUse(lCm: number, wCm: number): { ar: string; en: string } {
  const minSide = Math.min(lCm, wCm);
  const maxSide = Math.max(lCm, wCm);
  if (minSide >= 35 && maxSide >= 60) {
    return {
      ar: 'رفوف إضافية أو جوانب كومودينو',
      en: 'Extra shelves or nightstand sides',
    };
  }
  if (minSide >= 16 && maxSide >= 45) {
    return {
      ar: 'جوانب أدراج أو وزرة سفلية',
      en: 'Drawer box sides or plinth rails',
    };
  }
  return {
    ar: 'سدائب تقوية أو عوارض تثبيت داخلية',
    en: 'Internal cleats or cabinet stretchers',
  };
}

interface RawPackOutput {
  packedSheets: PackedSheet[];
  reusableOffcuts: ReusableOffcut[];
  totalMainAreaCm2: number;
  totalBackAreaCm2: number;
}

function runGuillotinePack(
  pieces: CutPiece[],
  sheetWidthCm: number,
  sheetHeightCm: number,
  kerfMm: number,
  allowRotation: boolean
): RawPackOutput {
  const kerfCm = kerfMm / 10;
  const trimMarginCm = 1.0;
  const usableW = sheetWidthCm - trimMarginCm * 2;
  const usableH = sheetHeightCm - trimMarginCm * 2;

  const mainItems: Array<{
    pieceCode: string;
    instanceLabel: string;
    nameAr: string;
    nameEn: string;
    w: number;
    h: number;
    category: CutPiece['category'];
  }> = [];

  let totalBackAreaCm2 = 0;
  let totalMainAreaCm2 = 0;

  for (const p of pieces) {
    if (p.materialKind === 'back') {
      totalBackAreaCm2 += p.lengthCm * p.widthCm * p.qty;
      continue;
    }
    totalMainAreaCm2 += p.lengthCm * p.widthCm * p.qty;
    for (let i = 1; i <= p.qty; i++) {
      const w = Math.min(p.widthCm, usableW);
      const h = Math.min(p.lengthCm, usableH);
      mainItems.push({
        pieceCode: p.code,
        instanceLabel: p.qty > 1 ? `${p.code}${i}` : p.code,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        w,
        h,
        category: p.category,
      });
    }
  }

  mainItems.sort(
    (a, b) => Math.max(b.h, b.w) - Math.max(a.h, a.w) || b.w * b.h - a.w * a.h
  );

  interface ShelfRow {
    y: number;
    height: number;
    cursorX: number;
  }

  interface OpenSheet {
    rows: ShelfRow[];
    placements: SheetPlacement[];
    usedAreaCm2: number;
  }

  const sheets: OpenSheet[] = [];

  const tryPlaceOnSheet = (
    sheet: OpenSheet,
    item: (typeof mainItems)[number]
  ): boolean => {
    const orientations: Array<{ w: number; h: number; rotated: boolean }> = [
      { w: item.w, h: item.h, rotated: false },
    ];
    if (allowRotation && Math.abs(item.w - item.h) > 0.1) {
      orientations.push({ w: item.h, h: item.w, rotated: true });
    } else if (item.w > usableW && item.h <= usableW) {
      orientations[0] = { w: item.h, h: item.w, rotated: true };
    }

    for (const row of sheet.rows) {
      for (const o of orientations) {
        if (o.h <= row.height + 0.01 && row.cursorX + o.w <= usableW + 0.01) {
          sheet.placements.push({
            pieceCode: item.pieceCode,
            instanceLabel: item.instanceLabel,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            x: round1(trimMarginCm + row.cursorX),
            y: round1(trimMarginCm + row.y),
            w: o.w,
            h: o.h,
            rotated: o.rotated,
            category: item.category,
          });
          row.cursorX += o.w + kerfCm;
          sheet.usedAreaCm2 += o.w * o.h;
          return true;
        }
      }
    }

    const currentY =
      sheet.rows.length === 0
        ? 0
        : sheet.rows[sheet.rows.length - 1].y +
          sheet.rows[sheet.rows.length - 1].height +
          kerfCm;

    const fittingOrientations = orientations
      .filter((o) => o.w <= usableW + 0.01 && currentY + o.h <= usableH + 0.01)
      .sort((a, b) => a.h - b.h);

    if (fittingOrientations.length > 0) {
      const chosen = fittingOrientations[0];
      sheet.rows.push({
        y: currentY,
        height: chosen.h,
        cursorX: chosen.w + kerfCm,
      });
      sheet.placements.push({
        pieceCode: item.pieceCode,
        instanceLabel: item.instanceLabel,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        x: round1(trimMarginCm),
        y: round1(trimMarginCm + currentY),
        w: chosen.w,
        h: chosen.h,
        rotated: chosen.rotated,
        category: item.category,
      });
      sheet.usedAreaCm2 += chosen.w * chosen.h;
      return true;
    }

    return false;
  };

  for (const item of mainItems) {
    let placed = false;
    for (const sheet of sheets) {
      if (tryPlaceOnSheet(sheet, item)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      const fresh: OpenSheet = { rows: [], placements: [], usedAreaCm2: 0 };
      tryPlaceOnSheet(fresh, item);
      sheets.push(fresh);
    }
  }

  const sheetAreaCm2 = sheetWidthCm * sheetHeightCm;
  const reusableOffcuts: ReusableOffcut[] = [];

  const packedSheets: PackedSheet[] = sheets.map((s, idx) => {
    const usedClamped = Math.min(sheetAreaCm2, s.usedAreaCm2);
    const wasteCm2 = Math.max(0, sheetAreaCm2 - usedClamped);

    // Extract large reusable leftover strip at the bottom of the sheet
    const usedY =
      s.rows.length === 0
        ? 0
        : s.rows[s.rows.length - 1].y + s.rows[s.rows.length - 1].height + kerfCm;
    const remBottomH = round1(usableH - usedY);
    if (remBottomH >= 18) {
      const use = suggestOffcutUse(usableW, remBottomH);
      reusableOffcuts.push({
        sheetIndex: idx + 1,
        lengthCm: round1(usableW),
        widthCm: remBottomH,
        areaM2: round2((usableW * remBottomH) / 10000),
        suggestedUseAr: use.ar,
        suggestedUseEn: use.en,
      });
    }

    // Check largest side strip offcut from rows
    let bestRowOffcut: { w: number; h: number } | null = null;
    for (const row of s.rows) {
      const remW = round1(usableW - row.cursorX);
      if (remW >= 18 && row.height >= 35) {
        if (!bestRowOffcut || remW * row.height > bestRowOffcut.w * bestRowOffcut.h) {
          bestRowOffcut = { w: remW, h: round1(row.height) };
        }
      }
    }
    if (bestRowOffcut) {
      const use = suggestOffcutUse(bestRowOffcut.h, bestRowOffcut.w);
      reusableOffcuts.push({
        sheetIndex: idx + 1,
        lengthCm: bestRowOffcut.h,
        widthCm: bestRowOffcut.w,
        areaM2: round2((bestRowOffcut.w * bestRowOffcut.h) / 10000),
        suggestedUseAr: use.ar,
        suggestedUseEn: use.en,
      });
    }

    return {
      sheetIndex: idx + 1,
      widthCm: sheetWidthCm,
      heightCm: sheetHeightCm,
      placements: s.placements,
      usedAreaCm2: round1(usedClamped),
      totalAreaCm2: sheetAreaCm2,
      utilizationPct: round1(Math.min(99, (usedClamped / sheetAreaCm2) * 100)),
      wasteAreaM2: round2(wasteCm2 / 10000),
    };
  });

  return {
    packedSheets,
    reusableOffcuts,
    totalMainAreaCm2,
    totalBackAreaCm2,
  };
}

export function packPiecesIntoSheets(
  pieces: CutPiece[],
  sheetWidthCm: number,
  sheetHeightCm: number,
  kerfMm: number,
  allowRotation: boolean
): SheetOptimizationResult {
  const sheetAreaCm2 = sheetWidthCm * sheetHeightCm;
  const primary = runGuillotinePack(
    pieces,
    sheetWidthCm,
    sheetHeightCm,
    kerfMm,
    allowRotation
  );

  // Compare with rotated packing to advise user how many sheets they can save
  let sheetsSavedIfRotated = 0;
  if (!allowRotation && primary.packedSheets.length > 1) {
    const alt = runGuillotinePack(pieces, sheetWidthCm, sheetHeightCm, kerfMm, true);
    sheetsSavedIfRotated = Math.max(0, primary.packedSheets.length - alt.packedSheets.length);
  }

  const totalSheetAreaCm2 = primary.packedSheets.length * sheetAreaCm2;
  const avgUtil =
    totalSheetAreaCm2 === 0
      ? 0
      : round1(Math.min(99, (primary.totalMainAreaCm2 / totalSheetAreaCm2) * 100));
  const wasteAreaCm2 = Math.max(0, totalSheetAreaCm2 - primary.totalMainAreaCm2);

  const backSheetsCount =
    primary.totalBackAreaCm2 <= 0
      ? 0
      : Math.max(1, Math.ceil((primary.totalBackAreaCm2 * 1.12) / sheetAreaCm2));

  return {
    sheetWidthCm,
    sheetHeightCm,
    mainSheets: primary.packedSheets,
    backSheetsCount,
    totalSheetAreaM2: round2(totalSheetAreaCm2 / 10000),
    totalMainAreaM2: round2(primary.totalMainAreaCm2 / 10000),
    totalBackAreaM2: round2(primary.totalBackAreaCm2 / 10000),
    wasteAreaM2: round2(wasteAreaCm2 / 10000),
    averageUtilizationPct: avgUtil,
    wastePct: round1(Math.max(1, 100 - avgUtil)),
    reusableOffcuts: primary.reusableOffcuts.slice(0, 8),
    sheetsSavedIfRotated,
  };
}

export function calculateCarpentryProject(
  params: ProjectParams
): ProjectCalculation {
  const wood = getWoodSpec(params.woodType);
  const T = params.boardThicknessMm / 10;
  const W = params.widthCm;
  const H = params.heightCm;
  const D = params.depthCm;
  const plinth = params.plinthHeightCm;
  const pieces: CutPiece[] = [];
  const hardware: HardwareItem[] = [];
  const steps: AssemblyStep[] = [];

  const backGrooveOffset = params.includeBackPanel ? params.backThicknessMm / 10 + 0.4 : 0;
  const innerDepth = round1(D - (params.doorsCount > 0 ? T : 0) - backGrooveOffset);
  const diagonalCheckCm = round1(Math.hypot(W, H));

  if (params.templateId === 'wardrobe' || params.templateId === 'dressing') {
    const isDressing = params.templateId === 'dressing';
    const innerWidth = round1(W - 2 * T);
    const carcassHeight = round1(H - plinth);
    const innerHeight = round1(carcassHeight - 2 * T);
    const bays = params.dividersCount + 1;
    const bayWidth = round1((innerWidth - params.dividersCount * T) / bays);
    const bodyDepth = round1(D - (params.doorsCount > 0 ? T : 0));
    const shelfDepth = round1(innerDepth - 2);
    const doorHeight = round1(carcassHeight - 0.4);
    const doorWidth = round1((W - (params.doorsCount + 1) * 0.3) / Math.max(1, params.doorsCount));
    const slideLen = nearestSlideCm(innerDepth);

    pieces.push(
      makePiece('A', isDressing ? 'جنب الدريسينج يمين وشمال' : 'جنب دولاب يمين وشمال', 'Left & Right Side Panels', H, bodyDepth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 1 }, 'carcass', 'تفتيح مفحار خلفي 6مم للظهر', 'Cut 6mm rear rabbet for back panel'),
      makePiece('B', 'سقف وأرضية الوحدة', 'Top & Bottom Carcass Panels', innerWidth, bodyDepth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'يركب بين الجنبين بخوابير 8مم ومسامير 4×50', 'Fixed between sides with dowels & 4×50 screws')
    );

    if (plinth > 0) {
      pieces.push(
        makePiece('C', 'وزرة سفلية (أمام وخلف)', 'Front & Rear Plinth Rails', innerWidth, plinth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'ترجع للداخل 2سم لراحة القدم', 'Set back 2cm for toe-kick clearance')
      );
    }

    if (params.dividersCount > 0) {
      pieces.push(
        makePiece('D', 'قواطيع رأسية داخلية', 'Vertical Center Dividers', innerHeight, shelfDepth, params.boardThicknessMm, params.dividersCount, 'main', { longSides: 1, shortSides: 0 }, 'internal', `تقسّم العرض إلى ${bays} خانات بعرض ${bayWidth} سم`, `Splits unit into ${bays} bays of ${bayWidth} cm`)
      );
    }

    if (params.shelvesCount > 0) {
      pieces.push(
        makePiece('E', isDressing ? 'رفوف عرض وأحذية داخلية' : 'رفوف داخلية', 'Internal Shelves', bayWidth, shelfDepth, params.boardThicknessMm, params.shelvesCount, 'main', { longSides: 1, shortSides: 0 }, 'internal', `صافي الخانة ${bayWidth} سم`, `Bay width ${bayWidth} cm`)
      );
    }

    if (params.doorsCount > 0) {
      pieces.push(
        makePiece('F', 'ضلف الدولاب الأمامية', 'Front Hinged Doors', doorHeight, doorWidth, params.boardThicknessMm, params.doorsCount, 'main', { longSides: 2, shortSides: 2 }, 'front', 'قشاط PVC 2مم من الأربع جهات + خلوص 3مم', '2mm PVC all 4 sides, 3mm reveal gap')
      );
    }

    if (params.drawersCount > 0) {
      const drawerBoxW = round1(bayWidth - 2.6);
      const drawerH = 16;
      const drawerFrontH = 19;
      pieces.push(
        makePiece('G', 'وشوش الأدراج الأمامية', 'Drawer Front Faces', round1(bayWidth - 0.6), drawerFrontH, params.boardThicknessMm, params.drawersCount, 'main', { longSides: 2, shortSides: 2 }, 'drawer', 'قشاط PVC من الأربع جهات', 'Edge-banded all 4 sides'),
        makePiece('H', 'جوانب صناديق الأدراج', 'Drawer Side Boards', slideLen, drawerH, params.boardThicknessMm, params.drawersCount * 2, 'main', { longSides: 1, shortSides: 0 }, 'drawer', `مطابق لمجرى تلسكوبي ${slideLen} سم`, `Matched to ${slideLen}cm slides`),
        makePiece('I', 'أمام وخلف صناديق الأدراج', 'Drawer Front/Back Box', round1(drawerBoxW - 2 * T), drawerH, params.boardThicknessMm, params.drawersCount * 2, 'main', { longSides: 1, shortSides: 0 }, 'drawer', 'خصم 26مم للمجاري + سمك الجانبين', '26mm runner deduction + side thickness'),
        makePiece('J', 'أرضيات أدراج أبلكاش', 'Drawer Bottom Plywood', round1(drawerBoxW - 0.8), round1(slideLen - 0.8), params.backThicknessMm, params.drawersCount, 'back', { longSides: 0, shortSides: 0 }, 'back', 'تدخل في مفحار سفلي 6مم', 'Slides into 6mm bottom groove')
      );
    }

    if (params.includeBackPanel) {
      pieces.push(
        makePiece('K', 'ظهر الوحدة أبلكاش', 'Cabinet Back Panel', round1(carcassHeight - 0.8), round1(W - 0.8), params.backThicknessMm, 1, 'back', { longSides: 0, shortSides: 0 }, 'back', 'يضبط زاوية 90° بالوترين', 'Squares carcass via diagonal check')
      );
    }

    if (params.doorsCount > 0) {
      const totalHinges = params.doorsCount * hingesPerDoor(doorHeight);
      hardware.push({ id: 'hinges', nameAr: 'مفصلات باكم (هيدروليك 35مم)', nameEn: 'Soft-Close Cup Hinges (35mm)', qty: totalHinges, unitAr: 'مفصلة', unitEn: 'pcs', unitPriceEgp: 42, specAr: `${hingesPerDoor(doorHeight)} مفصلات لكل ضلفة`, specEn: `${hingesPerDoor(doorHeight)} hinges per door` });
    }
    hardware.push(
      { id: 'handles', nameAr: 'مقابض معدن مودرن', nameEn: 'Brushed Metal Handles', qty: Math.max(2, params.doorsCount + params.drawersCount), unitAr: 'مقبض', unitEn: 'pcs', unitPriceEgp: 65, specAr: 'للضلف والأدراج', specEn: 'For doors & drawers' },
      { id: 'rod', nameAr: 'ماسورة شماعة ألومنيوم + فلانشات', nameEn: 'Oval Hanging Rod + Flanges', qty: isDressing ? 2 : 1, unitAr: 'طقم', unitEn: 'set', unitPriceEgp: 145, specAr: `تُقص على صافي ${bayWidth} سم`, specEn: `Cut to clear width ${bayWidth} cm` }
    );
    if (params.drawersCount > 0) {
      hardware.push({ id: 'slides', nameAr: `طقم مجاري تلسكوبي محمّل (${slideLen} سم)`, nameEn: `Telescopic Slides (${slideLen}cm)`, qty: params.drawersCount, unitAr: 'طقم', unitEn: 'pair', unitPriceEgp: 155, specAr: 'خلوص 13مم لكل جنب', specEn: '13mm clearance per side' });
    }
    if (isDressing) {
      hardware.push({ id: 'led', nameAr: 'بروفايل ليد دافئ مع ترانس للأرفف', nameEn: 'Warm LED Strip Profile + Driver', qty: 1, unitAr: 'طقم', unitEn: 'kit', unitPriceEgp: 480, specAr: 'إضاءة فاخرة داخل خانات الدريسينج', specEn: 'Recessed warm shelf lighting' });
    }
    hardware.push({ id: 'screws', nameAr: 'مسامير تجميع 4×50 + خوابير رفوف + غراء', nameEn: '4×50 Screws + Shelf Pins + Glue', qty: 1, unitAr: 'مجموعة', unitEn: 'pack', unitPriceEgp: 240, specAr: 'تجميع الشاسيه والوزرة', specEn: 'Carcass & plinth fastening' });

    steps.push(
      { stepNumber: 1, titleAr: 'تقطيع الألواح وقشط شريط الحرف PVC', titleEn: 'Cut All Panels & Apply Edge Banding', detailsAr: `اقطع الجنبين (${H}×${bodyDepth} سم) والسقف والأرضية (${innerWidth} سم) والقواطيع (${bays} خانات بعرض ${bayWidth} سم) وافتح مفحار خلفي 6مم.`, detailsEn: `Cut sides (${H}×${bodyDepth} cm), top/bottom (${innerWidth} cm), and dividers (${bays} bays of ${bayWidth} cm) with 6mm rear groove.`, toolAr: 'منشار صينية + ماكينة قشاط', toolEn: 'Table saw + Edge bander', tipAr: 'رقّم كل قطعة بالقلم الرصاص (A, B, C...) فور القص لتسريع التجميع.', tipEn: 'Label every piece right off the saw to eliminate assembly mix-ups.', highlightDim: `صافي الخانة ${bayWidth} سم`, diagramType: 'carcass' },
      { stepNumber: 2, titleAr: 'تجميع الشاسيه وضبط الوترين 90°', titleEn: 'Assemble Carcass & Check Diagonals', detailsAr: `جمّع العلبة والوزرة (${plinth} سم) وتأكد من تطابق الوترين عند ${diagonalCheckCm} سم بالضبط قبل تثبيت الظهر الأبلكاش.`, detailsEn: `Join carcass and ${plinth}cm plinth, verifying diagonals match at ${diagonalCheckCm} cm before fastening the back.`, toolAr: 'شنيور + ميزان ميه + قمط', toolEn: 'Drill + Level + Bar clamps', tipAr: 'في الدريسينج العريض فوق 200سم يفضل تقسيمه علبتين مربوطتين بمسامير ربط (تجميع) لسهولة النقل والطلوع في السلم.', tipEn: 'For units wider than 200cm, build as two modular boxes bolted together on site.', highlightDim: `الوتر = ${diagonalCheckCm} سم`, diagramType: 'square' },
      { stepNumber: 3, titleAr: 'تركيب الأدراج والمجاري والشماعات', titleEn: 'Install Drawers, Slides & Rods', detailsAr: `ركّب ${params.drawersCount} طقم مجاري تلسكوبي مقاس ${slideLen} سم متوازية بميزان الميه ثم ثبّت الرفوف وماسورة الشماعة.`, detailsEn: `Install ${params.drawersCount} pairs of ${slideLen}cm slides dead level, then fit shelves and hanging rods.`, toolAr: 'ميزان ميه + شابلون مجاري', toolEn: 'Spirit level + Slide jig', tipAr: 'ثبّت رف واحد ثابت بمسامير في المنتصف لتقوية الجوانب ومنع التقويس.', tipEn: 'Screw-fix one center shelf per bay for structural stiffness.', highlightDim: `مجرى ${slideLen} سم`, diagramType: 'drawers' },
      { stepNumber: 4, titleAr: isDressing ? 'تركيب الإضاءة الليد والتشطيب النهائي' : 'تفريغ المفصلات 35مم ووزن الضلف', titleEn: isDressing ? 'Mount LED Profiles & Final Finish' : 'Bore 35mm Hinges & Align Doors', detailsAr: isDressing ? 'افتح مجرى بروفايل الليد أسفل الرفوف العلوية بعمق 8مم ووصّل الأسلاك خلف الظهر الأبلكاش ثم صنفر ونظف الحواف.' : `افتح كوباية 35مم على بُعد 22مم من الحرف ووزن ${params.doorsCount} ضلف (${doorHeight}×${doorWidth} سم) بخلوص 3مم موحد.`, detailsEn: isDressing ? 'Rout 8mm LED aluminum channels under top shelves, conceal wiring behind back panel, and clean all edges.' : `Bore 35mm cups 22mm from door edge and align ${params.doorsCount} doors (${doorHeight}×${doorWidth} cm) to 3mm gaps.`, toolAr: isDressing ? 'راوتر + صنفرة 220' : 'بونطة 35مم + شابلون مقابض', toolEn: isDressing ? 'Router + 220-grit' : '35mm Forstner bit + Jig', tipAr: 'اضبط كل الفواصل والمقابض بشابلون واحد لتطلع النتيجة زي المصانع.', tipEn: 'Use a single jig for every handle so alignment is factory-perfect.', highlightDim: isDressing ? 'إضاءة ليد مخفية' : `ضلفة ${doorHeight}×${doorWidth} سم`, diagramType: isDressing ? 'finish' : 'doors' }
    );
  } else if (
    params.templateId === 'kitchen' ||
    params.templateId === 'buffet' ||
    params.templateId === 'dresser' ||
    params.templateId === 'tv_unit' ||
    params.templateId === 'shoe_rack' ||
    params.templateId === 'nightstand'
  ) {
    const isKitchen = params.templateId === 'kitchen';
    const isDresser = params.templateId === 'dresser';
    const isTv = params.templateId === 'tv_unit';
    const isShoe = params.templateId === 'shoe_rack';
    const isNightstand = params.templateId === 'nightstand';
    const topThickCm = isKitchen ? 3.0 : T;
    const bodyH = round1(Math.max(28, H - plinth - (isKitchen ? topThickCm : 0)));
    const bodyDepth = round1(D - (isKitchen ? 4 : params.doorsCount > 0 ? T : 0));
    const innerWidth = round1(W - 2 * T);
    const bays = params.dividersCount + 1;
    const bayWidth = round1((innerWidth - params.dividersCount * T) / bays);
    const slideLen = nearestSlideCm(bodyDepth - 2);

    pieces.push(
      makePiece('A', 'جنب الوحدة يمين وشمال', 'Left & Right Side Panels', bodyH, bodyDepth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 1 }, 'carcass', 'تجميع بخوابير 8مم ومسامير 4×50', 'Doweled & screwed carcass sides'),
      makePiece('B', 'أرضية وسقف الوحدة', 'Top & Bottom Panels', innerWidth, bodyDepth, params.boardThicknessMm, isKitchen ? 1 : 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'هيكل أساسي متين ومربع الزاوية', 'Rigid squared top & bottom'),
      ...(isKitchen
        ? [
            makePiece('C', 'عارضتين سقف (أمام وخلف)', 'Top Front & Rear Stretchers', innerWidth, 10, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'لتثبيت القرصة وتوفير الخشب', 'Countertop mounting stretchers'),
            makePiece('D', 'قرصة علوية', 'Countertop Slab', round1(W + 2), D, 30, 1, 'main', { longSides: 1, shortSides: 2 }, 'front', 'بروز أمامي 3سم لحماية الضلف', '3cm protective front overhang'),
          ]
        : [
            makePiece('C', 'قرصة علوية بارزة للزينة', 'Top Cap Panel', round1(W + 1), round1(D + 1), params.boardThicknessMm, 1, 'main', { longSides: 2, shortSides: 2 }, 'front', 'قشاط PVC 2مم من الأربع جهات', '2mm PVC on all 4 edges'),
          ])
    );

    if (plinth > 0) {
      if (isShoe || isNightstand || params.templateId === 'buffet') {
        pieces.push(
          makePiece('E', 'أرجل خشب زان/أرو متينة', 'Solid Hardwood Legs', plinth, 5, 50, 4, 'solid', { longSides: 0, shortSides: 0 }, 'frame', `ارتفاع ${plinth} سم لسهولة التنظيف تحت الوحدة`, `${plinth}cm height for clean floor clearance`)
        );
      } else {
        pieces.push(
          makePiece('E', 'وزرة سفلية (سوكلو)', 'Kick-Plate Plinth', W, plinth, params.boardThicknessMm, 1, 'main', { longSides: 2, shortSides: 2 }, 'carcass', 'معزولة ضد مياه المسح', 'Moisture-sealed kick plate')
        );
      }
    }

    if (params.dividersCount > 0) {
      pieces.push(
        makePiece('F', 'قواطيع رأسية داخلية', 'Internal Bay Dividers', round1(bodyH - 2 * T), round1(bodyDepth - 2), params.boardThicknessMm, params.dividersCount, 'main', { longSides: 1, shortSides: 0 }, 'internal', `تقسم الوحدة إلى ${bays} خانات بعرض ${bayWidth} سم`, `Divides into ${bays} bays of ${bayWidth} cm`)
      );
    }

    if (params.shelvesCount > 0) {
      pieces.push(
        makePiece('G', isShoe ? 'رفوف أحذية مائلة/مستوية' : 'رفوف داخلية', isShoe ? 'Shoe Storage Shelves' : 'Internal Shelves', bayWidth, round1(bodyDepth - 3), params.boardThicknessMm, params.shelvesCount, 'main', { longSides: 1, shortSides: 0 }, 'internal', isShoe ? 'تُركب بميل خفيف 12° أو مستوية مع مصد خلفي' : 'مقاس أقل 3سم من العمق لسهولة التناول', isShoe ? 'Tilt 12° or mount flat for shoes' : 'Set back 3cm for easy reach')
      );
    }

    if (params.doorsCount > 0) {
      const doorHeight = round1(
        params.templateId === 'buffet' || isShoe
          ? bodyH * 0.72
          : bodyH - 0.4
      );
      const doorW = round1(
        Math.min(
          bayWidth - 0.3,
          (W - (params.doorsCount + 1) * 0.3) / params.doorsCount
        )
      );
      pieces.push(
        makePiece('H', isTv ? 'ضلف تليفزيون (سادة أو شرائح)' : 'ضلف أمامية', 'Front Hinged Doors', doorHeight, doorW, params.boardThicknessMm, params.doorsCount, 'main', { longSides: 2, shortSides: 2 }, 'front', 'خلوص موحد 3مم مع مفصلات باكم', '3mm gap with soft-close hinges')
      );
    }

    if (params.drawersCount > 0) {
      const drawerBayW =
        params.templateId === 'buffet' || isTv
          ? round1((innerWidth - 0.6) / Math.max(1, params.drawersCount))
          : isDresser
          ? round1(innerWidth * 0.65)
          : bayWidth;
      const drwFaceH = round1(
        params.templateId === 'buffet' || isShoe
          ? Math.min(18, bodyH * 0.24)
          : isNightstand
          ? Math.min(17, (bodyH * 0.56) / params.drawersCount)
          : (bodyH - (params.drawersCount + 1) * 0.3) / params.drawersCount
      );
      const drwBoxW = round1(drawerBayW - 2.6);
      const drwBoxH = round1(Math.max(9, drwFaceH - 4));
      pieces.push(
        makePiece('I', 'وشوش الأدراج الأمامية', 'Drawer Fronts', round1(drawerBayW - 0.4), drwFaceH, params.boardThicknessMm, params.drawersCount, 'main', { longSides: 2, shortSides: 2 }, 'drawer', 'قشاط PVC 2مم من الأربع جهات', '2mm PVC all 4 sides'),
        makePiece('J', 'جوانب صناديق الأدراج', 'Drawer Box Sides', slideLen, drwBoxH, params.boardThicknessMm, params.drawersCount * 2, 'main', { longSides: 1, shortSides: 0 }, 'drawer', `مجرى تلسكوبي ${slideLen} سم`, `${slideLen}cm telescopic slides`),
        makePiece('K', 'أمام وخلف صندوق الدرج', 'Drawer Front & Back Box', round1(drwBoxW - 2 * T), drwBoxH, params.boardThicknessMm, params.drawersCount * 2, 'main', { longSides: 1, shortSides: 0 }, 'drawer', 'خصم 26مم للمجاري + سمك الجانبين', '26mm runner deduction'),
        makePiece('L', 'قواعد أدراج أبلكاش', 'Drawer Bottoms (6mm)', round1(drwBoxW - 0.8), round1(slideLen - 0.8), params.backThicknessMm, params.drawersCount, 'back', { longSides: 0, shortSides: 0 }, 'back', 'تدخل في مفحار سفلي 6مم', 'Slides into 6mm groove')
      );
    }

    if (isDresser) {
      const mirrorDia = Math.min(80, round1(W * 0.52));
      pieces.push(
        makePiece('M', 'برواز مرآة خشب (دائري أو مربع)', 'Wooden Mirror Frame', mirrorDia, mirrorDia, params.boardThicknessMm, 1, 'main', { longSides: 2, shortSides: 2 }, 'front', `مرآة بلجيكي قطر/مقاس ${mirrorDia} سم`, `Mirror diameter ${mirrorDia} cm`)
      );
    }

    if (params.includeBackPanel) {
      pieces.push(
        makePiece('N', 'ظهر الوحدة أبلكاش', 'Cabinet Back Panel', round1(bodyH - 0.8), round1(W - 0.8), params.backThicknessMm, 1, 'back', { longSides: 0, shortSides: 0 }, 'back', isTv ? 'تفتيح فتحة دائرية 60مم لأسلاك الرسيفر' : 'ضبط الزاوية القائمة 90°', isTv ? 'Cut 60mm rear cable hole' : 'Squares the cabinet')
      );
    }

    if (params.doorsCount > 0) {
      hardware.push({ id: 'hinges', nameAr: 'مفصلات باكم (هيدروليك 35مم)', nameEn: 'Soft-Close Hinges (35mm)', qty: params.doorsCount * 2, unitAr: 'مفصلة', unitEn: 'pcs', unitPriceEgp: 45, specAr: 'غلق ناعم بدون صوت', specEn: 'Soft-close hydraulic hinges' });
    }
    if (params.drawersCount > 0) {
      hardware.push({ id: 'slides', nameAr: `طقم مجاري تلسكوبي (${slideLen} سم)`, nameEn: `Telescopic Slides (${slideLen}cm)`, qty: params.drawersCount, unitAr: 'طقم', unitEn: 'pair', unitPriceEgp: 160, specAr: 'خلوص تركيب 13مم لكل جنب', specEn: '13mm side clearance' });
    }
    hardware.push(
      { id: 'handles', nameAr: 'مقابض معدن / نحاس مودرن', nameEn: 'Modern Metal Handles', qty: Math.max(1, params.doorsCount + params.drawersCount), unitAr: 'مقبض', unitEn: 'pcs', unitPriceEgp: 60, specAr: 'للضلف والأدراج', specEn: 'Doors & drawers' },
      ...(isDresser
        ? [{ id: 'mirror', nameAr: 'مرآة زجاج بلجيكي 5مم + علاقات حائط', nameEn: '5mm Clear Mirror Glass + Mounts', qty: 1, unitAr: 'قطعة', unitEn: 'pcs', unitPriceEgp: 520, specAr: 'مرآة نقية مضادة للرطوبة', specEn: 'Moisture-sealed mirror glass' }]
        : []),
      ...(isTv
        ? [{ id: 'wall_mount', nameAr: 'طقم تثبيت معلق فولاذي (French Cleat + فيشر 10مم)', nameEn: 'Heavy Wall-Mount Bracket Kit', qty: 1, unitAr: 'طقم', unitEn: 'set', unitPriceEgp: 190, specAr: 'يتحمل وزن الوحدة حتى 65 كجم', specEn: 'Supports up to 65kg wall load' }]
        : []),
      { id: 'screws', nameAr: 'مسامير تجميع + خوابير + غراء أبيض + تشطيب', nameEn: 'Assembly Screws + Dowels + Glue', qty: 1, unitAr: 'مجموعة', unitEn: 'pack', unitPriceEgp: 210, specAr: 'تجميع كامل للعلبة', specEn: 'Complete fastening pack' }
    );

    steps.push(
      { stepNumber: 1, titleAr: 'قص أجزاء العلبة والقرصة وتلزيق القشاط', titleEn: 'Cut Carcass Panels & Apply PVC Banding', detailsAr: `اقطع الجنبين (${bodyH}×${bodyDepth} سم) والسقف والأرضية (${innerWidth} سم) وافتح مفحار خلفي 6مم للظهر الأبلكاش.`, detailsEn: `Cut sides (${bodyH}×${bodyDepth} cm) and top/bottom (${innerWidth} cm), routing a 6mm rear groove.`, toolAr: 'منشار صينية + شريط PVC', toolEn: 'Table saw + Edge bander', tipAr: 'عزل الحواف السفلية بشريط PVC بيحمي الكونتر من الرطوبة ومياه المسح.', tipEn: 'Banding bottom edges protects board cores against floor moisture.', highlightDim: `جسم الوحدة ${W}×${bodyH} سم`, diagramType: 'carcass' },
      { stepNumber: 2, titleAr: 'تجميع الهيكل وضبط الزاوية بالوترين', titleEn: 'Assemble Carcass & Verify Square', detailsAr: `جمّع العلبة والقواطيع (${bays} خانات) وقِس الوترين (${round1(Math.hypot(W, bodyH))} سم) قبل تدبيس الظهر الأبلكاش.`, detailsEn: `Clamp carcass with ${bays} bay(s) and check diagonals (${round1(Math.hypot(W, bodyH))} cm) before fixing the back.`, toolAr: 'قمط + شنيور + زاوية قائمة', toolEn: 'Clamps + Drill + Square', tipAr: 'تثبيت الأرجل أو الوزرة بميزان ميه يضمن إن الضلف والأدراج متقفلش مايلة.', tipEn: 'Leveling legs/plinth ensures doors and drawers never rub or bind.', highlightDim: `الوتر = ${round1(Math.hypot(W, bodyH))} سم`, diagramType: 'square' },
      { stepNumber: 3, titleAr: 'تركيب الأدراج التلسكوبي والرفوف', titleEn: 'Fit Telescopic Drawers & Shelves', detailsAr: `ثبّت ${params.drawersCount} طقم مجاري مقاس ${slideLen} سم بخلوص 13مم لكل جنب وركّب وشوش الأدراج بفواصل 3مم.`, detailsEn: `Install ${params.drawersCount} pairs of ${slideLen}cm slides with 13mm side clearance and 3mm reveal spacers.`, toolAr: 'ميزان ميه + فواصل 3مم', toolEn: 'Spirit level + 3mm spacers', tipAr: 'استخدم دابل فيس لوزن وش الدرج الأول قبل ما تربطه بمسامير من الداخل.', tipEn: 'Use double-sided tape to align drawer fronts before screwing from inside.', highlightDim: `مجرى ${slideLen} سم`, diagramType: 'drawers' },
      { stepNumber: 4, titleAr: 'وزن الضلف والتشطيب النهائي', titleEn: 'Align Doors & Final Finishing', detailsAr: `ركّب الضلف بمفصلات باكم 35مم (على بُعد 22مم من الحرف)، صنفر السوك بـ 220 ناعم وركّب المقابض والقرصة.`, detailsEn: `Hang doors with 35mm hinges (22mm setback), sand edges 220-grit, and fit handles & top.`, toolAr: 'بونطة 35مم + صنفرة 220', toolEn: '35mm cup bit + Sander', tipAr: isTv ? 'ثبّت الوحدة على الحائط بفيشر 10مم وميزان ميه على ارتفاع 45سم من الأرض لراحة العين.' : 'قِس أماكن المقابض بشابلون واحد لتوحيد الخط الأفقي.', tipEn: isTv ? 'Mount floating TV console ~45cm off the floor with heavy wall anchors.' : 'Use a simple handle jig so every pull aligns perfectly.', highlightDim: 'خلوص موحّد 3مم', diagramType: 'doors' }
    );
  } else if (params.templateId === 'desk') {
    const legH = round1(H - T);
    const pedWidth = params.drawersCount > 0 ? Math.min(48, Math.max(38, round1(W * 0.3))) : 0;
    const kneeWidth = round1(W - pedWidth - 2 * T);
    const slideLen = nearestSlideCm(D - 8);

    pieces.push(
      makePiece('A', 'قرصة المكتب العلوية', 'Main Desktop Panel', W, D, params.boardThicknessMm, 1, 'main', { longSides: 2, shortSides: 2 }, 'front', 'قشاط PVC 2مم دائري ناعم لراحة اليد', 'Smooth 2mm PVC edge all around'),
      makePiece('B', 'جنب/رجل المكتب الجانبية', 'Desk Side Leg Panel', legH, round1(D - 4), params.boardThicknessMm, params.drawersCount > 0 ? 1 : 2, 'main', { longSides: 2, shortSides: 1 }, 'carcass', 'بروز القرصة 2سم أمام وخلف', '2cm front/rear desktop overhang'),
      makePiece('C', 'مريلة الظهر (تقوية المكتب)', 'Rear Modesty Panel', round1(kneeWidth + T), round1(Math.min(42, legH * 0.55)), params.boardThicknessMm, 1, 'main', { longSides: 1, shortSides: 0 }, 'internal', 'تمنع اهتزاز المكتب وتداري الأسلاك', 'Prevents racking wobble & hides cables')
    );

    if (params.drawersCount > 0) {
      const pedBodyH = round1(legH - 4);
      const pedDepth = round1(D - 6);
      const drwBoxW = round1(pedWidth - 2 * T - 2.6);
      const drwFaceH = round1((pedBodyH - (params.drawersCount + 1) * 0.3) / params.drawersCount);
      const drwBoxH = round1(Math.max(9, drwFaceH - 4));
      pieces.push(
        makePiece('D', 'جوانب وحدة الأدراج (كمود المكتب)', 'Pedestal Side Panels', pedBodyH, pedDepth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'تقف على رجول 4سم', 'Rests on 4cm leveling glides'),
        makePiece('E', 'أرضية وسقف وحدة الأدراج', 'Pedestal Top & Bottom', round1(pedWidth - 2 * T), pedDepth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'تُربط أسفل القرصة مباشرة', 'Mounts beneath desktop'),
        makePiece('F', 'وشوش أدراج المكتب', 'Desk Drawer Fronts', round1(pedWidth - 0.4), drwFaceH, params.boardThicknessMm, params.drawersCount, 'main', { longSides: 2, shortSides: 2 }, 'drawer', 'قشاط من الأربع جهات', 'Edge-banded all 4 sides'),
        makePiece('G', 'جوانب صناديق الأدراج', 'Drawer Box Sides', slideLen, drwBoxH, params.boardThicknessMm, params.drawersCount * 2, 'main', { longSides: 1, shortSides: 0 }, 'drawer', `مجرى تلسكوبي ${slideLen} سم`, `${slideLen}cm slides`),
        makePiece('H', 'أمام وخلف صناديق الأدراج', 'Drawer Box Front & Back', round1(drwBoxW - 2 * T), drwBoxH, params.boardThicknessMm, params.drawersCount * 2, 'main', { longSides: 1, shortSides: 0 }, 'drawer', 'خصم 26مم للمجاري', '26mm slide clearance'),
        makePiece('I', 'أرضية أدراج وظهر الكمودة أبلكاش', 'Drawer Bottoms & Back', round1(pedWidth - 0.8), round1(pedBodyH - 0.8), params.backThicknessMm, params.drawersCount + 1, 'back', { longSides: 0, shortSides: 0 }, 'back', 'أبلكاش 6مم', '6mm plywood')
      );
    }

    hardware.push(
      { id: 'slides', nameAr: `طقم مجاري تلسكوبي (${slideLen} سم)`, nameEn: `Telescopic Slides (${slideLen}cm)`, qty: params.drawersCount, unitAr: 'طقم', unitEn: 'pair', unitPriceEgp: 150, specAr: 'انزلاق ناعم للأدراج', specEn: 'Smooth ball-bearing slides' },
      { id: 'handles', nameAr: 'مقابض نحاس أو أسود مط', nameEn: 'Matte Brass/Black Handles', qty: params.drawersCount, unitAr: 'مقبض', unitEn: 'pcs', unitPriceEgp: 55, specAr: 'مقبض لكل درج', specEn: '1 handle per drawer' },
      { id: 'grommet', nameAr: 'جراب تمرير كابلات دائري 60مم', nameEn: '60mm Cable Grommet', qty: 1, unitAr: 'قطعة', unitEn: 'pcs', unitPriceEgp: 45, specAr: 'ركن القرصة الخلفي', specEn: 'Rear desktop corner' },
      { id: 'screws', nameAr: 'زوايا تثبيت مخفية + مسامير + رجول كاوتش', nameEn: 'Brackets + Screws + Floor Glides', qty: 1, unitAr: 'مجموعة', unitEn: 'pack', unitPriceEgp: 220, specAr: 'تجميع نظيف بدون مسامير ظاهرة', specEn: 'Hidden underside fastening' }
    );

    steps.push(
      { stepNumber: 1, titleAr: 'تجهيز قرصة المكتب وفتحة الكابلات', titleEn: 'Prepare Desktop & Cable Hole', detailsAr: `اقطع القرصة (${W}×${D} سم) وافتح فتحة كابلات 60مم وشطّف الحافة الأمامية بشريط PVC 2مم.`, detailsEn: `Cut ${W}×${D} cm desktop, drill 60mm grommet hole, and apply 2mm PVC banding.`, toolAr: 'منشار صينية + هول سو 60مم', toolEn: 'Table saw + 60mm hole saw', tipAr: 'تدوير الحافة الأمامية للقرصة يجعل المكتب مريحاً جداً للذراعين.', tipEn: 'Softening the front edge improves wrist ergonomics.', highlightDim: `قرصة ${W}×${D} سم`, diagramType: 'carcass' },
      { stepNumber: 2, titleAr: 'تجميع وحدة الأدراج وربط المريلة', titleEn: 'Build Drawer Pedestal & Modesty Panel', detailsAr: `جمّع وحدة الأدراج بعرض ${pedWidth || 42} سم واربط مريلة الظهر بينها وبين الرجل الجانبية لمنع أي اهتزاز.`, detailsEn: `Assemble the ${pedWidth || 42} cm pedestal and fasten the modesty panel between leg & box.`, toolAr: 'قمط + شنيور + ميزان ميه', toolEn: 'Clamps + Drill + Level', tipAr: `مساحة الجلوس الصافية (${kneeWidth} سم) مريحة جداً لأي كرسي مكتب.`, tipEn: `Clear knee opening (${kneeWidth} cm) comfortably fits standard office chairs.`, highlightDim: `مساحة الجلوس ${kneeWidth} سم`, diagramType: 'drawers' }
    );
  } else if (params.templateId === 'bookshelf') {
    const innerWidth = round1(W - 2 * T);
    const bodyH = round1(H - plinth);
    const innerH = round1(bodyH - 2 * T);
    const cols = params.dividersCount + 1;
    const cellW = round1((innerWidth - params.dividersCount * T) / cols);
    const shelfD = round1(D - backGrooveOffset);
    const cellH = round1((innerH - params.shelvesCount * T) / (params.shelvesCount + 1));

    pieces.push(
      makePiece('A', 'جنب المكتبة يمين وشمال', 'Bookshelf Side Panels', H, D, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 1 }, 'carcass', 'مفحار خلفي 6مم', '6mm rear rabbet'),
      makePiece('B', 'سقف وأرضية المكتبة', 'Top & Bottom Panels', innerWidth, D, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'تجميع خوابير 8مم', '8mm dowels & screws')
    );
    if (plinth > 0) {
      pieces.push(makePiece('C', 'وزرة سفلية', 'Bottom Plinth Rail', innerWidth, plinth, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'أمام وخلف', 'Front & rear support'));
    }
    if (params.dividersCount > 0) {
      pieces.push(makePiece('D', 'قواطيع رأسية داخلية', 'Vertical Dividers', innerH, shelfD, params.boardThicknessMm, params.dividersCount, 'main', { longSides: 1, shortSides: 0 }, 'internal', `${cols} خانات بعرض ${cellW} سم`, `${cols} bays of ${cellW} cm`));
    }
    pieces.push(makePiece('E', 'رفوف المكتبة', 'Bookshelf Shelves', cellW, shelfD, params.boardThicknessMm, params.shelvesCount * cols, 'main', { longSides: 1, shortSides: 0 }, 'internal', `ارتفاع كل خانة صافي ${cellH} سم`, `Clear height ${cellH} cm`));
    if (params.includeBackPanel) {
      pieces.push(makePiece('F', 'ظهر المكتبة أبلكاش', 'Bookshelf Back Panel', round1(bodyH - 0.8), round1(W - 0.8), params.backThicknessMm, 1, 'back', { longSides: 0, shortSides: 0 }, 'back', 'يمنع ميلان المكتبة', 'Prevents lateral racking'));
    }
    hardware.push(
      { id: 'pins', nameAr: 'خوابير رفوف معدن + خوابير خشب', nameEn: 'Metal Shelf Pins + Dowels', qty: params.shelvesCount * cols * 4, unitAr: 'قطعة', unitEn: 'pcs', unitPriceEgp: 4, specAr: '4 خوابير لكل رف', specEn: '4 per shelf' },
      { id: 'anchors', nameAr: 'زوايا أمان تثبيت حائط', nameEn: 'Anti-Tip Wall Anchors', qty: 2, unitAr: 'طقم', unitEn: 'set', unitPriceEgp: 35, specAr: 'أمان للمكتبات العالية', specEn: 'Tall unit safety' },
      { id: 'screws', nameAr: 'مسامير 4×50 + غراء أبيض + أغطية مسامير', nameEn: '4×50 Screws + Glue + Caps', qty: 1, unitAr: 'مجموعة', unitEn: 'pack', unitPriceEgp: 195, specAr: 'تشطيب نظيف', specEn: 'Clean finish' }
    );
    steps.push(
      { stepNumber: 1, titleAr: 'قص كل الرفوف بمصد واحد متطابق', titleEn: 'Batch-Cut Identical Shelves', detailsAr: `اقطع ${params.shelvesCount * cols} رف بمقاس واحد (${cellW}×${shelfD} سم) وعلم خطوط الرفوف كل ${round1(cellH + T)} سم على الجوانب قبل التجميع.`, detailsEn: `Cut all ${params.shelvesCount * cols} shelves to ${cellW}×${shelfD} cm and gang-mark lines every ${round1(cellH + T)} cm.`, toolAr: 'منشار صينية + مصد', toolEn: 'Table saw + Stop block', tipAr: 'عرض الخانة أقل من 75سم يمنع تقويس الرف تحت الكتب الثقيلة.', tipEn: 'Keeping spans under 75cm prevents sagging.', highlightDim: `خانة ${cellW}×${cellH} سم`, diagramType: 'shelves' },
      { stepNumber: 2, titleAr: 'تقفيل العلبة وضبط الوترين', titleEn: 'Square Frame & Mount Back', detailsAr: `تأكد من تساوي الوترين (${diagonalCheckCm} سم) وثبّت الظهر الأبلكاش وزوايا الحائط.`, detailsEn: `Check ${diagonalCheckCm} cm diagonals and secure back panel + wall anchors.`, toolAr: 'شنيور + ميزان ميه', toolEn: 'Drill + Level', tipAr: 'ثبّت الرف الأوسط بمسامير لتقوية الهيكل.', tipEn: 'Fix middle shelf rigidly with screws.', highlightDim: `الوتر = ${diagonalCheckCm} سم`, diagramType: 'square' }
    );
  } else if (params.templateId === 'bed') {
    const outerW = round1(W + 2 * T + 1);
    const slatsCount = Math.max(10, params.shelvesCount);
    const slatGap = round1((D - slatsCount * 8) / Math.max(1, slatsCount - 1));

    pieces.push(
      makePiece('A', 'قوائم شباك الرأس (زان/متين)', 'Headboard Posts', H, 8, 45, 2, 'solid', { longSides: 0, shortSides: 0 }, 'frame', 'قطاع 4.5×8 سم', '4.5×8cm posts'),
      makePiece('B', 'لوح شباك الرأس العلوي', 'Headboard Panel', round1(outerW - 10), round1(Math.max(40, H - 52)), params.boardThicknessMm, 1, 'main', { longSides: 2, shortSides: 2 }, 'front', 'تجميع خوابير 10مم', '10mm doweled panel'),
      makePiece('C', 'قوائم شباك الرجل الأمامي', 'Footboard Posts', 44, 8, 45, 2, 'solid', { longSides: 0, shortSides: 0 }, 'frame', 'رجل أمامية متناسقة', 'Front corner posts'),
      makePiece('D', 'عارضة شباك الرجل', 'Footboard Rail', round1(outerW - 10), 22, params.boardThicknessMm, 1, 'main', { longSides: 2, shortSides: 0 }, 'front', 'تُجمع مع القوائم الأمامية', 'Joins front legs'),
      makePiece('E', 'جوانب السرير الطولية (فخذين)', 'Long Side Rails', round1(D + 1), 22, params.boardThicknessMm, 2, 'main', { longSides: 2, shortSides: 0 }, 'carcass', 'يركب عليهم خطاف سرير معدن', 'Heavy steel rail hooks'),
      makePiece('F', 'سدائب حمل المولل الداخلية', 'Slat Support Cleats', round1(D - 4), 4, 30, 2, 'solid', { longSides: 0, shortSides: 0 }, 'internal', 'على عمق 10سم من الحافة العلوية', '10cm below top rail edge'),
      makePiece('G', 'مولل السرير (موسكي)', 'Bed Mattress Slats', round1(W + 0.6), 8, 20, slatsCount, 'solid', { longSides: 0, shortSides: 0 }, 'internal', `فراغ ${slatGap} سم بين المولل`, `${slatGap} cm spacing`),
      makePiece('H', 'كمرة وسطى حاملة + رجل منتصف', 'Center Support Beam + Leg', round1(D + 1), 7, 35, 1, 'solid', { longSides: 0, shortSides: 0 }, 'internal', 'تمنع هبوط المرتبة', 'Prevents center sag')
    );

    hardware.push(
      { id: 'hooks', nameAr: 'طقم خطاف سرير معدن تقيل (4 أركان)', nameEn: 'Heavy Steel Bed Hooks (4)', qty: 1, unitAr: 'طقم', unitEn: 'set', unitPriceEgp: 210, specAr: 'فك وتركيب سريع', specEn: 'Knock-down joints' },
      { id: 'center', nameAr: 'حامل كمرة وسطى + رجل دعم', nameEn: 'Center Beam Brackets + Leg', qty: 1, unitAr: 'طقم', unitEn: 'set', unitPriceEgp: 135, specAr: 'دعم للمراتب السوست', specEn: 'Spring mattress support' },
      { id: 'dowels', nameAr: 'خوابير زان 10مم + مسامير + غراء + ورنيش', nameEn: '10mm Dowels + Screws + Finish', qty: 1, unitAr: 'طقم', unitEn: 'kit', unitPriceEgp: 540, specAr: 'تجميع وتشطيب بدون تزييق', specEn: 'Squeak-free assembly' }
    );

    steps.push(
      { stepNumber: 1, titleAr: 'تجميع شباك الرأس وشباك الرجل', titleEn: 'Assemble Headboard & Footboard', detailsAr: `جمّع القوائم واللوح العلوي (${round1(outerW - 10)} سم) بخوابير 10مم وغراء في القمط 4 ساعات.`, detailsEn: `Glue & dowel headboard/footboard frames (${round1(outerW - 10)} cm) and clamp 4 hours.`, toolAr: 'قمط طويلة + شنيور', toolEn: 'Bar clamps + Drill', tipAr: 'اترك المرتبة بزيادة 1سم خلوص لسهولة فرش الملاية.', tipEn: 'Adding 1cm ease makes tucking bed sheets effortless.', highlightDim: `مرتبة ${W}×${D} سم`, diagramType: 'carcass' },
      { stepNumber: 2, titleAr: 'تركيب السدائب وخطافات الجوانب والمولل', titleEn: 'Mount Cleats, Hooks & Slats', detailsAr: `اربط سدائب المولل على عمق 10سم ثم وزّع ${slatsCount} ملة بفراغ ${slatGap} سم مع شريط فوم مانع للتزييق.`, detailsEn: `Mount cleats 10cm down and space ${slatsCount} slats at ${slatGap} cm with felt tape.`, toolAr: 'أزميل + مازورة + شنيور', toolEn: 'Chisel + Tape + Drill', tipAr: 'شريط الفوم الرفيع فوق السدائب يمنع أي صوت تزييق مدى الحياة.', tipEn: 'Felt tape along cleats eliminates wood squeaking permanently.', highlightDim: `${slatsCount} ملة · فراغ ${slatGap} سم`, diagramType: 'shelves' }
    );
  } else {
    // Dining Table
    const legH = round1(H - 3.6);
    const longApron = round1(W - 28);
    const shortApron = round1(D - 28);
    pieces.push(
      makePiece('A', 'قرصة الترابيزة العلوية', 'Tabletop Slab', W, D, 36, 1, 'main', { longSides: 2, shortSides: 2 }, 'front', 'شطف حواف 45° ناعم', 'Gentle chamfered underside'),
      makePiece('B', 'أرجل الترابيزة (قطاع 8×8 سم)', 'Square Legs (8×8cm)', legH, 8, 80, 4, 'solid', { longSides: 0, shortSides: 0 }, 'frame', 'زان أو أرو صلب', 'Solid hardwood legs'),
      makePiece('C', 'مريلة طولية أمام وخلف', 'Long Apron Rails', longApron, 10, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'تُرحّل للداخل 1سم', 'Recessed 1cm inside leg face'),
      makePiece('D', 'مريلة عرضية يمين وشمال', 'Short Apron Rails', shortApron, 10, params.boardThicknessMm, 2, 'main', { longSides: 1, shortSides: 0 }, 'carcass', 'تقوية ضد الميلان', 'Lateral rigidity'),
      makePiece('E', 'كعوب تقوية الأركان 45°', 'Corner Brace Blocks', 16, 10, 25, 4, 'solid', { longSides: 0, shortSides: 0 }, 'internal', 'تثبيت بجوايط 8مم', 'Locked with 8mm bolts')
    );
    hardware.push(
      { id: 'bolts', nameAr: 'مسامير جوايط وورد أركان 8مم', nameEn: '8mm Hanger Bolts & Washers', qty: 8, unitAr: 'طقم', unitEn: 'set', unitPriceEgp: 18, specAr: '2 مسمار لكل رجل', specEn: '2 bolts per leg' },
      { id: 'zclips', nameAr: 'كليبسات تمدد القرصة (Z-Clips)', nameEn: 'Tabletop Expansion Z-Clips', qty: 10, unitAr: 'قطعة', unitEn: 'pcs', unitPriceEgp: 14, specAr: 'تمنع تشقق الخشب الطبيعي', specEn: 'Allows seasonal expansion' },
      { id: 'finish', nameAr: 'طقم سيلر + ورنيش بولي يوريثان مقاوم للمياه', nameEn: 'Waterproof Poly Finish Kit', qty: 1, unitAr: 'طقم', unitEn: 'kit', unitPriceEgp: 420, specAr: '3 أوجه حماية للقرصة', specEn: '3 durable coats' }
    );
    steps.push(
      { stepNumber: 1, titleAr: 'تجميع الشاسيه والأرجل والكعوب 45°', titleEn: 'Assemble Aprons, Legs & Corner Braces', detailsAr: `جمّع المرايل (${longApron} و ${shortApron} سم) داخل الأرجل الأربعة (${legH} سم) وثبّت كعوب الأركان بجوايط 8مم.`, detailsEn: `Join aprons (${longApron} & ${shortApron} cm) into the 4 legs (${legH} cm) with 45° braces.`, toolAr: 'قمط طويلة + زاوية 90°', toolEn: 'Bar clamps + Square', tipAr: `ارتفاع الجلوس الصافي تحت المريلة ${round1(legH - 10)} سم يناسب كل كراسي السفرة.`, tipEn: `Clear knee height under apron (${round1(legH - 10)} cm) fits dining chairs.`, highlightDim: `قرصة ${W}×${D} سم`, diagramType: 'carcass' },
      { stepNumber: 2, titleAr: 'تثبيت القرصة بكليبسات التمدد والتشطيب', titleEn: 'Fasten Slab via Z-Clips & Finish', detailsAr: 'سنتر الشاسيه أسفل القرصة ببروز 6سم من الأربع جهات، واربطه بكليبسات التمدد ثم ادهن 3 أوجه بولي يوريثان.', detailsEn: 'Center frame with 6cm overhang, attach via Z-clips, and apply 3 coats of waterproof finish.', toolAr: 'شنيور + مسدس رش', toolEn: 'Drill + Spray/roller', tipAr: 'كليبسات التمدد تحمي القرصة من الشروخ مع تغير فصول السنة.', tipEn: 'Z-clips keep solid tabletops flat across humidity changes.', highlightDim: 'بروز 6سم متساوي', diagramType: 'finish' }
    );
  }

  // Append any user-added custom free pieces directly into the project cut list & sheet optimizer!
  if (params.customPieces && params.customPieces.length > 0) {
    params.customPieces.forEach((cp, idx) => {
      const edge: EdgeBandingSpec =
        cp.edgeSides === 'all'
          ? { longSides: 2, shortSides: 2 }
          : cp.edgeSides === '1L'
          ? { longSides: 1, shortSides: 0 }
          : { longSides: 0, shortSides: 0 };
      pieces.push(
        makePiece(
          `X${idx + 1}`,
          cp.name || `قطعة مخصصة #${idx + 1}`,
          cp.name || `Custom Board #${idx + 1}`,
          cp.lengthCm,
          cp.widthCm,
          params.boardThicknessMm,
          Math.max(1, cp.qty),
          'main',
          edge,
          'internal',
          'قطعة إضافية مخصصة بمقاسك',
          'User-added custom board',
          true
        )
      );
    });
  }

  const totalPiecesCount = pieces.reduce((acc, p) => acc + p.qty, 0);
  const rawEdgeMeters = pieces.reduce((acc, p) => acc + p.edgeMetersPerPiece * p.qty, 0);
  const totalEdgeBandingMeters = round1(rawEdgeMeters * 1.12);

  const sheets = packPiecesIntoSheets(
    pieces,
    wood.sheetWidthCm,
    wood.sheetHeightCm,
    params.kerfMm,
    params.allowGrainRotation
  );

  const estimatedHours = round1(
    Math.max(
      3,
      totalPiecesCount * 0.26 +
        params.drawersCount * 1.05 +
        params.doorsCount * 0.6
    )
  );

  return {
    pieces,
    hardware,
    steps,
    sheets,
    totalPiecesCount,
    totalEdgeBandingMeters,
    diagonalCheckCm,
    estimatedHours,
  };
}
