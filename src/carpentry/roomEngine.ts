import { getTemplateSpec } from './catalog';
import { calculateCarpentryProject } from './engine';
import { FurnitureTemplateId, ProjectParams, WoodTypeId } from './types';

export type RoomSpaceType =
  | 'auto'
  | 'bedroom'
  | 'dressing'
  | 'kitchen'
  | 'living'
  | 'office'
  | 'entryway';

export type RoomWall = 'back' | 'front' | 'left' | 'right';
export type WallSidePosition = 'left' | 'center' | 'right';
export type DoorSwingType = 'inward-left' | 'inward-right' | 'outward';
export type WindowSizePreset = 'none' | 'small' | 'medium' | 'large' | 'balcony';
export type CornerColumnPos =
  | 'none'
  | 'back-left'
  | 'back-right'
  | 'front-left'
  | 'front-right';

export interface RoomArchitecturalDetails {
  hasDoor: boolean;
  doorWall: RoomWall;
  doorPosition: WallSidePosition;
  doorWidthCm: number;
  doorHeightCm: number;
  doorSwing: DoorSwingType;
  windowPreset: WindowSizePreset;
  windowWall: RoomWall;
  windowPosition: WallSidePosition;
  windowWidthCm: number;
  windowHeightCm: number;
  windowSillCm: number;
  cornerColumn: CornerColumnPos;
  columnSizeCm: number;
}

export const DEFAULT_ROOM_DETAILS: RoomArchitecturalDetails = {
  hasDoor: true,
  doorWall: 'right',
  doorPosition: 'right',
  doorWidthCm: 90,
  doorHeightCm: 210,
  doorSwing: 'inward-left',
  windowPreset: 'large',
  windowWall: 'back',
  windowPosition: 'center',
  windowWidthCm: 190,
  windowHeightCm: 135,
  windowSillCm: 95,
  cornerColumn: 'none',
  columnSizeCm: 35,
};

export interface RoomInputParams {
  lengthCm: number; // X axis (back/front wall length)
  widthCm: number; // Z axis (left/right wall length)
  ceilingCm: number; // Y axis
  roomType: RoomSpaceType;
  woodType: WoodTypeId;
  sheetPriceEgp: number;
  details?: RoomArchitecturalDetails;
}

export interface ResolvedOpening {
  wall: RoomWall;
  startCm: number; // 0..wallLen along wall axis
  endCm: number;
  widthCm: number;
  heightCm: number;
  sillCm: number;
  centerCm: number;
  isBalcony?: boolean;
  swing?: DoorSwingType;
}

export interface Rect2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ResolvedColumn {
  pos: Exclude<CornerColumnPos, 'none'>;
  sizeCm: number;
  centerXCm: number;
  centerZCm: number;
  box: Rect2D;
}

export interface RoomPlacedItem {
  id: string;
  templateId: FurnitureTemplateId;
  roleAr: string;
  roleEn: string;
  wallNoteAr: string;
  wallNoteEn: string;
  placedWall: RoomWall | 'center';
  underWindow?: boolean;
  // Center coordinates in cm relative to room center (X: -L/2..+L/2, Z: -W/2..+W/2)
  posXCm: number;
  posZCm: number;
  rotationYRad: number;
  projectParams: ProjectParams;
  sheetsCount: number;
  piecesCount: number;
  wastePct: number;
  estimatedCostEgp: number;
}

export interface RoomPlanResult {
  resolvedType: Exclude<RoomSpaceType, 'auto'>;
  areaM2: number;
  lengthCm: number;
  widthCm: number;
  ceilingCm: number;
  details: RoomArchitecturalDetails;
  resolvedDoor: ResolvedOpening | null;
  resolvedWindow: ResolvedOpening | null;
  resolvedColumn: ResolvedColumn | null;
  doorClearanceBox: Rect2D | null;
  balconyClearanceBox: Rect2D | null;
  headlineAr: string;
  headlineEn: string;
  recommendationAr: string;
  recommendationEn: string;
  architecturalSummaryAr: string;
  architecturalSummaryEn: string;
  alternativeUsesAr: string[];
  alternativeUsesEn: string[];
  walkwayClearanceCm: number;
  ergonomicTipsAr: string[];
  ergonomicTipsEn: string[];
  items: RoomPlacedItem[];
  totalSheets: number;
  totalPieces: number;
  totalRoomCostEgp: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.round(Math.max(min, Math.min(max, v)));

export function getWallNameAr(wall: RoomWall): string {
  switch (wall) {
    case 'back':
      return 'الحيطة الخلفية (الوش)';
    case 'front':
      return 'الحيطة الأمامية';
    case 'left':
      return 'الحيطة الشمال';
    case 'right':
      return 'الحيطة اليمين';
  }
}

export function getWallNameEn(wall: RoomWall): string {
  switch (wall) {
    case 'back':
      return 'Back Wall';
    case 'front':
      return 'Front Wall';
    case 'left':
      return 'Left Wall';
    case 'right':
      return 'Right Wall';
  }
}

export function getWindowPresetDefaults(
  preset: WindowSizePreset
): { widthCm: number; heightCm: number; sillCm: number } {
  switch (preset) {
    case 'small':
      return { widthCm: 100, heightCm: 100, sillCm: 110 };
    case 'medium':
      return { widthCm: 145, heightCm: 120, sillCm: 100 };
    case 'large':
      return { widthCm: 200, heightCm: 135, sillCm: 95 };
    case 'balcony':
      return { widthCm: 165, heightCm: 215, sillCm: 0 };
    default:
      return { widthCm: 0, heightCm: 0, sillCm: 95 };
  }
}

/**
 * Smart Egyptian Arabic Room Description Parser:
 * Lets the user type free-form Arabic like:
 * "أوضة نوم 400×350 فيها شباك كبير في الوش والباب من الشمال وفيها عمود في الركن"
 */
export function parseEgyptianRoomDescription(
  text: string,
  current: {
    lengthCm: number;
    widthCm: number;
    roomType: RoomSpaceType;
    details: RoomArchitecturalDetails;
  }
): {
  lengthCm: number;
  widthCm: number;
  roomType: RoomSpaceType;
  details: RoomArchitecturalDetails;
  matchedSummaryAr: string;
} {
  const normalized = text
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .toLowerCase();

  let lengthCm = current.lengthCm;
  let widthCm = current.widthCm;
  let roomType = current.roomType;
  const details: RoomArchitecturalDetails = { ...current.details };
  const notes: string[] = [];

  // Extract dimensions like 400x350 or 4×3.5
  const dimMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[x×*في]\s*(\d+(?:\.\d+)?)/);
  if (dimMatch) {
    let a = parseFloat(dimMatch[1]);
    let b = parseFloat(dimMatch[2]);
    if (a > 0 && a <= 12) a = Math.round(a * 100);
    if (b > 0 && b <= 12) b = Math.round(b * 100);
    if (a >= 100 && a <= 900 && b >= 100 && b <= 800) {
      lengthCm = Math.round(a);
      widthCm = Math.round(b);
      notes.push(`مقاس الأوضة ${lengthCm}×${widthCm} سم`);
    }
  }

  // Room purpose detection
  if (/نوم|سرير|اطفال|أطفال|ماستر/.test(normalized)) {
    roomType = 'bedroom';
    notes.push('أوضة نوم');
  } else if (/مطبخ|حوض|بوتاجاز|كيتشن/.test(normalized)) {
    roomType = 'kitchen';
    notes.push('مطبخ');
  } else if (/دريسينج|ملابس|دواليب/.test(normalized)) {
    roomType = 'dressing';
    notes.push('دريسينج روم');
  } else if (/مكتب|مذاكرة|شغل|دراسة|كمبيوتر/.test(normalized)) {
    roomType = 'office';
    notes.push('أوضة مكتب');
  } else if (/ليفينج|ريسبشن|سفرة|صالة|معيشة|تليفزيون/.test(normalized)) {
    roomType = 'living';
    notes.push('ليفينج وسفرة');
  } else if (/مدخل|طرقة|ركن|جزامة/.test(normalized)) {
    roomType = 'entryway';
    notes.push('مدخل / ركن');
  }

  // Window / Balcony detection
  if (/بدون شباك|مفيش شباك|بلا شباك|مقفولة/.test(normalized)) {
    details.windowPreset = 'none';
    details.windowWidthCm = 0;
    notes.push('بدون شباك');
  } else if (/بلكون|تراس/.test(normalized)) {
    details.windowPreset = 'balcony';
    const d = getWindowPresetDefaults('balcony');
    details.windowWidthCm = d.widthCm;
    details.windowHeightCm = d.heightCm;
    details.windowSillCm = 0;
    notes.push('باب بلكونة');
  } else if (/شباك\s*(كبير|عريض|واسع|ضخم)|شباكين/.test(normalized)) {
    details.windowPreset = 'large';
    const d = getWindowPresetDefaults('large');
    details.windowWidthCm = d.widthCm;
    details.windowHeightCm = d.heightCm;
    details.windowSillCm = d.sillCm;
    notes.push('شباك كبير');
  } else if (/شباك\s*(صغير|ضيق|مناور|منور)/.test(normalized)) {
    details.windowPreset = 'small';
    const d = getWindowPresetDefaults('small');
    details.windowWidthCm = d.widthCm;
    details.windowHeightCm = d.heightCm;
    details.windowSillCm = d.sillCm;
    notes.push('شباك صغير');
  } else if (/شباك/.test(normalized)) {
    details.windowPreset = 'medium';
    const d = getWindowPresetDefaults('medium');
    details.windowWidthCm = d.widthCm;
    details.windowHeightCm = d.heightCm;
    details.windowSillCm = d.sillCm;
    notes.push('شباك متوسط');
  }

  // Window wall detection (check clauses mentioning شباك or بلكونة)
  const winClauseMatch = normalized.match(/(?:شباك|بلكون)[^،,.و]{0,35}/);
  const winClause = winClauseMatch ? winClauseMatch[0] : '';
  if (winClause) {
    if (/يمين|اليمين|الايمن|الأيمن/.test(winClause)) {
      details.windowWall = 'right';
      notes.push('الشباك على الحيطة اليمين');
    } else if (/شمال|الشمال|يسار|الايسر|الأيسر/.test(winClause)) {
      details.windowWall = 'left';
      notes.push('الشباك على الحيطة الشمال');
    } else if (/امام|أمام|قدام/.test(winClause)) {
      details.windowWall = 'front';
      notes.push('الشباك على الحيطة الأمامية');
    } else if (/وش|خلف|نص|النص|منتصف|مقابل/.test(winClause)) {
      details.windowWall = 'back';
      details.windowPosition = 'center';
      notes.push('الشباك في الوش');
    }
  }

  // Door wall detection (check clauses mentioning باب or مدخل)
  const doorClauseMatch = normalized.match(/(?:باب|المدخل|مدخل)[^،,.]{0,35}/);
  const doorClause = doorClauseMatch ? doorClauseMatch[0] : '';
  if (doorClause) {
    details.hasDoor = true;
    if (/يمين|اليمين|الايمن|الأيمن/.test(doorClause)) {
      details.doorWall = 'right';
      details.doorPosition = 'right';
      notes.push('الباب من اليمين');
    } else if (/شمال|الشمال|يسار|الايسر|الأيسر/.test(doorClause)) {
      details.doorWall = 'left';
      details.doorPosition = 'right';
      notes.push('الباب من الشمال');
    } else if (/وش|خلف|وراء/.test(doorClause)) {
      details.doorWall = 'back';
      details.doorPosition = 'right';
      notes.push('الباب في الحيطة الخلفية');
    } else if (/امام|أمام|قدام|نص|منتصف/.test(doorClause)) {
      details.doorWall = 'front';
      details.doorPosition = /يمين/.test(doorClause)
        ? 'right'
        : /شمال|يسار/.test(doorClause)
        ? 'left'
        : 'center';
      notes.push('الباب من الأمام');
    }
  }

  // Column detection
  if (/عمود/.test(normalized)) {
    if (/يمين/.test(normalized)) {
      details.cornerColumn = 'back-right';
    } else {
      details.cornerColumn = 'back-left';
    }
    notes.push('عمود خرسانة في الركن');
  }

  // Keep door and window on distinct walls if user gave door on back while window defaulted to back
  if (
    details.hasDoor &&
    details.windowPreset !== 'none' &&
    details.doorWall === details.windowWall &&
    !winClause
  ) {
    details.windowWall =
      details.doorWall === 'back' ? 'right' : 'back';
  }

  return {
    lengthCm,
    widthCm,
    roomType,
    details,
    matchedSummaryAr:
      notes.length > 0
        ? `تم تطبيق تفاصيل الأوضة: ${notes.join(' · ')}`
        : 'تم تحديث الرسم حسب تفاصيل الأوضة المختارة.',
  };
}

function getWallLength(wall: RoomWall, L: number, W: number): number {
  return wall === 'back' || wall === 'front' ? L : W;
}

function resolveOpeningSpan(
  wall: RoomWall,
  position: WallSidePosition,
  rawWidthCm: number,
  heightCm: number,
  sillCm: number,
  L: number,
  W: number,
  marginCm = 18,
  avoidSpan?: { startCm: number; endCm: number } | null
): ResolvedOpening {
  const wallLen = getWallLength(wall, L, W);
  const safeW = clamp(rawWidthCm, 60, Math.max(65, wallLen - marginCm * 2));
  let startCm = marginCm;
  if (position === 'center') {
    startCm = Math.round((wallLen - safeW) / 2);
  } else if (position === 'right') {
    startCm = Math.max(marginCm, wallLen - marginCm - safeW);
  }

  // If another opening is on the exact same wall, shift cleanly to the widest non-overlapping side
  if (avoidSpan) {
    const overlaps = !(startCm + safeW + 14 <= avoidSpan.startCm || startCm >= avoidSpan.endCm + 14);
    if (overlaps) {
      const leftRoom = avoidSpan.startCm - 14 - marginCm;
      const rightRoom = wallLen - marginCm - (avoidSpan.endCm + 14);
      if (rightRoom >= leftRoom && rightRoom >= 65) {
        startCm = avoidSpan.endCm + 14;
      } else if (leftRoom >= 65) {
        startCm = Math.max(marginCm, avoidSpan.startCm - 14 - Math.min(safeW, leftRoom));
      }
    }
  }

  const finalW = Math.min(safeW, Math.max(60, wallLen - marginCm - startCm));
  const endCm = startCm + finalW;
  return {
    wall,
    startCm,
    endCm,
    widthCm: finalW,
    heightCm,
    sillCm,
    centerCm: Math.round((startCm + endCm) / 2),
  };
}

function openingInwardBox(
  op: ResolvedOpening,
  depthInwardCm: number,
  L: number,
  W: number,
  sidePadCm = 8
): Rect2D {
  const s0 = op.startCm - sidePadCm;
  const s1 = op.endCm + sidePadCm;
  switch (op.wall) {
    case 'back':
      return {
        minX: -L / 2 + s0,
        maxX: -L / 2 + s1,
        minZ: -W / 2,
        maxZ: -W / 2 + depthInwardCm,
      };
    case 'front':
      return {
        minX: -L / 2 + s0,
        maxX: -L / 2 + s1,
        minZ: W / 2 - depthInwardCm,
        maxZ: W / 2,
      };
    case 'left':
      return {
        minX: -L / 2,
        maxX: -L / 2 + depthInwardCm,
        minZ: -W / 2 + s0,
        maxZ: -W / 2 + s1,
      };
    case 'right':
      return {
        minX: L / 2 - depthInwardCm,
        maxX: L / 2,
        minZ: -W / 2 + s0,
        maxZ: -W / 2 + s1,
      };
  }
}

function rectsOverlap(a: Rect2D, b: Rect2D, gapCm = 0): boolean {
  return !(
    a.maxX + gapCm <= b.minX ||
    a.minX - gapCm >= b.maxX ||
    a.maxZ + gapCm <= b.minZ ||
    a.minZ - gapCm >= b.maxZ
  );
}

function furnitureRect(
  posXCm: number,
  posZCm: number,
  widthCm: number,
  depthCm: number,
  rotationYRad: number
): Rect2D {
  const isSideways = Math.abs(Math.sin(rotationYRad)) > 0.7;
  const halfX = (isSideways ? depthCm : widthCm) / 2;
  const halfZ = (isSideways ? widthCm : depthCm) / 2;
  return {
    minX: posXCm - halfX,
    maxX: posXCm + halfX,
    minZ: posZCm - halfZ,
    maxZ: posZCm + halfZ,
  };
}

function wallPosToWorld(
  wall: RoomWall,
  sCenter: number,
  distFromWall: number,
  L: number,
  W: number
): { posXCm: number; posZCm: number; rotationYRad: number } {
  switch (wall) {
    case 'back':
      return { posXCm: -L / 2 + sCenter, posZCm: -W / 2 + distFromWall, rotationYRad: 0 };
    case 'front':
      return { posXCm: -L / 2 + sCenter, posZCm: W / 2 - distFromWall, rotationYRad: Math.PI };
    case 'left':
      return {
        posXCm: -L / 2 + distFromWall,
        posZCm: -W / 2 + sCenter,
        rotationYRad: Math.PI / 2,
      };
    case 'right':
      return {
        posXCm: L / 2 - distFromWall,
        posZCm: -W / 2 + sCenter,
        rotationYRad: -Math.PI / 2,
      };
  }
}

interface Interval1D {
  start: number;
  end: number;
}

function subtractIntervals(base: Interval1D, blocks: Interval1D[]): Interval1D[] {
  let result: Interval1D[] = [base];
  for (const b of blocks) {
    const next: Interval1D[] = [];
    for (const seg of result) {
      if (b.end <= seg.start || b.start >= seg.end) {
        next.push(seg);
      } else {
        if (b.start > seg.start) next.push({ start: seg.start, end: b.start });
        if (b.end < seg.end) next.push({ start: b.end, end: seg.end });
      }
    }
    result = next;
  }
  return result.filter((s) => s.end - s.start >= 25);
}

interface CandidateSlot {
  wall: RoomWall;
  startCm: number;
  endCm: number;
  widthCm: number;
  posXCm: number;
  posZCm: number;
  rotationYRad: number;
  underWindow: boolean;
  score: number;
}

function makePlacedItem(
  id: string,
  templateId: FurnitureTemplateId,
  roleAr: string,
  roleEn: string,
  wallNoteAr: string,
  wallNoteEn: string,
  placedWall: RoomWall | 'center',
  posXCm: number,
  posZCm: number,
  rotationYRad: number,
  overrides: Partial<ProjectParams>,
  woodType: WoodTypeId,
  sheetPriceEgp: number,
  underWindow = false
): RoomPlacedItem {
  const tpl = getTemplateSpec(templateId);
  const projectParams: ProjectParams = {
    ...tpl.defaults,
    ...overrides,
    templateId,
    woodType,
    projectTitle: roleAr,
    clientName: '',
    customPieces: [],
  };

  const calc = calculateCarpentryProject(projectParams);
  const mainCost = calc.sheets.mainSheets.length * sheetPriceEgp;
  const backCost = calc.sheets.backSheetsCount * 580;
  const edgeCost = Math.round(calc.totalEdgeBandingMeters * 18);
  const hwCost = calc.hardware.reduce((s, h) => s + h.qty * h.unitPriceEgp, 0);
  const raw = mainCost + backCost + edgeCost + hwCost + 300;
  const estimatedCostEgp = Math.round(raw * 1.4);

  return {
    id,
    templateId,
    roleAr,
    roleEn,
    wallNoteAr,
    wallNoteEn,
    placedWall,
    underWindow,
    posXCm: Math.round(posXCm),
    posZCm: Math.round(posZCm),
    rotationYRad,
    projectParams,
    sheetsCount: calc.sheets.mainSheets.length,
    piecesCount: calc.totalPiecesCount,
    wastePct: calc.sheets.wastePct,
    estimatedCostEgp,
  };
}

export function generateRoomSpacePlan(input: RoomInputParams): RoomPlanResult {
  const L = Math.max(140, Math.min(850, Math.round(input.lengthCm)));
  const W = Math.max(130, Math.min(750, Math.round(input.widthCm)));
  const H = Math.max(215, Math.min(420, Math.round(input.ceilingCm)));
  const areaM2 = Number(((L * W) / 10000).toFixed(2));
  const maxCabinetH = clamp(H - 25, 195, 255);

  const details: RoomArchitecturalDetails = {
    ...DEFAULT_ROOM_DETAILS,
    ...(input.details ?? {}),
  };

  // Resolve Window & Door spans cleanly
  let resolvedWindow: ResolvedOpening | null = null;
  if (details.windowPreset !== 'none' && details.windowWidthCm > 0) {
    const isBalcony = details.windowPreset === 'balcony';
    const sill = isBalcony ? 0 : clamp(details.windowSillCm, 40, Math.max(55, H - 90));
    const winH = isBalcony
      ? Math.min(H - 25, Math.max(195, details.windowHeightCm))
      : clamp(details.windowHeightCm, 60, Math.max(70, H - sill - 18));
    resolvedWindow = {
      ...resolveOpeningSpan(
        details.windowWall,
        details.windowPosition,
        details.windowWidthCm,
        winH,
        sill,
        L,
        W,
        18
      ),
      isBalcony,
    };
  }

  let resolvedDoor: ResolvedOpening | null = null;
  if (details.hasDoor) {
    const avoidOnSameWall =
      resolvedWindow && resolvedWindow.wall === details.doorWall
        ? { startCm: resolvedWindow.startCm, endCm: resolvedWindow.endCm }
        : null;
    resolvedDoor = {
      ...resolveOpeningSpan(
        details.doorWall,
        details.doorPosition,
        details.doorWidthCm,
        Math.min(H - 18, Math.max(190, details.doorHeightCm || 210)),
        0,
        L,
        W,
        14,
        avoidOnSameWall
      ),
      swing: details.doorSwing,
    };
  }

  // Resolve optional corner concrete column
  let resolvedColumn: ResolvedColumn | null = null;
  if (details.cornerColumn !== 'none') {
    const cs = clamp(details.columnSizeCm || 35, 20, 75);
    const isLeft = details.cornerColumn.includes('left');
    const isBack = details.cornerColumn.includes('back');
    const cx = isLeft ? -L / 2 + cs / 2 : L / 2 - cs / 2;
    const cz = isBack ? -W / 2 + cs / 2 : W / 2 - cs / 2;
    resolvedColumn = {
      pos: details.cornerColumn,
      sizeCm: cs,
      centerXCm: cx,
      centerZCm: cz,
      box: {
        minX: cx - cs / 2,
        maxX: cx + cs / 2,
        minZ: cz - cs / 2,
        maxZ: cz + cs / 2,
      },
    };
  }

  const doorClearanceBox = resolvedDoor
    ? openingInwardBox(
        resolvedDoor,
        resolvedDoor.swing === 'outward'
          ? 65
          : Math.min(Math.max(85, resolvedDoor.widthCm + 8), 115),
        L,
        W,
        8
      )
    : null;

  const balconyClearanceBox =
    resolvedWindow && resolvedWindow.isBalcony
      ? openingInwardBox(resolvedWindow, 90, L, W, 10)
      : null;

  // Track occupied 2D footprints to guarantee zero furniture collisions
  const occupiedBoxes: Rect2D[] = [];
  if (resolvedColumn) occupiedBoxes.push(resolvedColumn.box);

  const isRectFree = (rect: Rect2D, gapCm = 8, allowNearDoor = false): boolean => {
    if (
      rect.minX < -L / 2 + 2 ||
      rect.maxX > L / 2 - 2 ||
      rect.minZ < -W / 2 + 2 ||
      rect.maxZ > W / 2 - 2
    ) {
      return false;
    }
    if (!allowNearDoor && doorClearanceBox && rectsOverlap(rect, doorClearanceBox, 4)) {
      return false;
    }
    if (balconyClearanceBox && rectsOverlap(rect, balconyClearanceBox, 4)) {
      return false;
    }
    for (const box of occupiedBoxes) {
      if (rectsOverlap(rect, box, gapCm)) return false;
    }
    return true;
  };

  // Compute unobstructed 1D intervals along a given wall for a piece of height `pieceH`
  const getWallFreeSegments = (
    wall: RoomWall,
    pieceH: number,
    allowUnderWindow: boolean
  ): Interval1D[] => {
    const wallLen = getWallLength(wall, L, W);
    const blocks: Interval1D[] = [];

    // Door blocks its wall completely
    if (resolvedDoor && resolvedDoor.wall === wall) {
      blocks.push({
        start: Math.max(0, resolvedDoor.startCm - 12),
        end: Math.min(wallLen, resolvedDoor.endCm + 12),
      });
    }

    // Window blocks tall units (or any unit if balcony)
    if (resolvedWindow && resolvedWindow.wall === wall) {
      const blocksThisHeight =
        resolvedWindow.isBalcony ||
        !allowUnderWindow ||
        pieceH > resolvedWindow.sillCm - 4;
      if (blocksThisHeight) {
        blocks.push({
          start: Math.max(0, resolvedWindow.startCm - 10),
          end: Math.min(wallLen, resolvedWindow.endCm + 10),
        });
      }
    }

    // Corner column trims ends of the two adjacent walls
    if (resolvedColumn) {
      const cs = resolvedColumn.sizeCm + 6;
      const c = resolvedColumn.pos;
      if (wall === 'back') {
        if (c === 'back-left') blocks.push({ start: 0, end: cs });
        if (c === 'back-right') blocks.push({ start: wallLen - cs, end: wallLen });
      } else if (wall === 'front') {
        if (c === 'front-left') blocks.push({ start: 0, end: cs });
        if (c === 'front-right') blocks.push({ start: wallLen - cs, end: wallLen });
      } else if (wall === 'left') {
        if (c === 'back-left') blocks.push({ start: 0, end: cs });
        if (c === 'front-left') blocks.push({ start: wallLen - cs, end: wallLen });
      } else if (wall === 'right') {
        if (c === 'back-right') blocks.push({ start: 0, end: cs });
        if (c === 'front-right') blocks.push({ start: wallLen - cs, end: wallLen });
      }
    }

    return subtractIntervals({ start: 6, end: wallLen - 6 }, blocks);
  };

  // Find the smartest unobstructed placement along any preferred wall list
  const findBestWallSlot = (opts: {
    preferredWalls: RoomWall[];
    minWidthCm: number;
    idealWidthCm: number;
    maxWidthCm: number;
    depthCm: number;
    heightCm: number;
    allowUnderWindow: boolean;
    preferUnderWindow?: boolean;
    preferCenter?: boolean;
  }): CandidateSlot | null => {
    const candidates: CandidateSlot[] = [];

    for (let wIdx = 0; wIdx < opts.preferredWalls.length; wIdx++) {
      const wall = opts.preferredWalls[wIdx];
      const segments = getWallFreeSegments(wall, opts.heightCm, opts.allowUnderWindow);

      for (const seg of segments) {
        const segLen = seg.end - seg.start;
        if (segLen < opts.minWidthCm) continue;

        const targetW = clamp(
          Math.min(segLen - 4, opts.idealWidthCm),
          opts.minWidthCm,
          opts.maxWidthCm
        );

        // Try multiple slide positions along the segment to dodge adjacent door swing / furniture
        const anchors: number[] = [];
        const minCenter = seg.start + targetW / 2 + 2;
        const maxCenter = seg.end - targetW / 2 - 2;
        if (minCenter > maxCenter) continue;

        // If preferUnderWindow and window is on this wall, test centered directly under window first!
        if (
          opts.preferUnderWindow &&
          resolvedWindow &&
          !resolvedWindow.isBalcony &&
          resolvedWindow.wall === wall
        ) {
          const wc = clamp(resolvedWindow.centerCm, minCenter, maxCenter);
          anchors.push(wc);
        }

        const mid = (minCenter + maxCenter) / 2;
        if (opts.preferCenter) {
          anchors.push(mid, minCenter, maxCenter);
        } else {
          anchors.push(minCenter, mid, maxCenter);
        }
        // Fine stepping points along long segments
        for (let step = 1; step <= 4; step++) {
          anchors.push(minCenter + ((maxCenter - minCenter) * step) / 5);
        }

        for (const sCenter of anchors) {
          // Try full targetW first, then slightly trimmed if needed to avoid doorway
          const tryWidths = [targetW, Math.max(opts.minWidthCm, targetW - 25)];
          for (const wTry of tryWidths) {
            const world = wallPosToWorld(wall, sCenter, opts.depthCm / 2 + 3, L, W);
            const rect = furnitureRect(
              world.posXCm,
              world.posZCm,
              wTry,
              opts.depthCm,
              world.rotationYRad
            );
            if (!isRectFree(rect, 10)) continue;

            const isUnderWin = Boolean(
              resolvedWindow &&
                !resolvedWindow.isBalcony &&
                resolvedWindow.wall === wall &&
                sCenter + wTry / 2 > resolvedWindow.startCm + 15 &&
                sCenter - wTry / 2 < resolvedWindow.endCm - 15
            );

            // Score prioritizes preferred wall order, full width, solid walls for tall items, under-window for desks/kitchens
            let score = (10 - wIdx * 2.2) * 10 + wTry * 0.45;
            if (opts.preferUnderWindow && isUnderWin) score += 65;
            if (!opts.preferUnderWindow && isUnderWin) score -= 18;
            if (resolvedDoor && resolvedDoor.wall === wall) score -= 22;

            candidates.push({
              wall,
              startCm: sCenter - wTry / 2,
              endCm: sCenter + wTry / 2,
              widthCm: Math.round(wTry),
              posXCm: world.posXCm,
              posZCm: world.posZCm,
              rotationYRad: world.rotationYRad,
              underWindow: isUnderWin,
              score,
            });
            break;
          }
        }
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  };

  const commitItem = (item: RoomPlacedItem) => {
    items.push(item);
    occupiedBoxes.push(
      furnitureRect(
        item.posXCm,
        item.posZCm,
        item.projectParams.widthCm,
        item.projectParams.depthCm,
        item.rotationYRad
      )
    );
  };

  // Auto-detect best room purpose from area if set to 'auto'
  let resolvedType: Exclude<RoomSpaceType, 'auto'>;
  if (input.roomType !== 'auto') {
    resolvedType = input.roomType;
  } else if (areaM2 < 3.8 || Math.min(L, W) < 165) {
    resolvedType = 'entryway';
  } else if (areaM2 < 6.8) {
    resolvedType = L >= 220 ? 'dressing' : 'office';
  } else if (areaM2 < 9.5) {
    resolvedType = 'kitchen';
  } else if (areaM2 < 15) {
    resolvedType = 'bedroom';
  } else {
    resolvedType = 'living';
  }

  const allWalls: RoomWall[] = ['back', 'left', 'right', 'front'];
  // Sort walls from most solid (no door, no window) to walls with openings
  const solidWallsFirst = [...allWalls].sort((a, b) => {
    const penalty = (wall: RoomWall) => {
      let p = 0;
      if (resolvedDoor?.wall === wall) p += 100;
      if (resolvedWindow?.wall === wall) p += resolvedWindow.isBalcony ? 90 : 45;
      // Prefer back/left/right over front wall when equal (better cutaway sightlines)
      if (wall === 'front') p += 15;
      return p;
    };
    return penalty(a) - penalty(b);
  });

  const items: RoomPlacedItem[] = [];
  let headlineAr = '';
  let headlineEn = '';
  let recommendationAr = '';
  let recommendationEn = '';
  let walkwayClearanceCm = 90;
  const alternativeUsesAr: string[] = [];
  const alternativeUsesEn: string[] = [];
  const ergonomicTipsAr: string[] = [];
  const ergonomicTipsEn: string[] = [];

  if (resolvedType === 'bedroom') {
    // 1. Main Wardrobe: ALWAYS prioritize the longest solid wall free of door & window!
    const wardrobeSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst,
      minWidthCm: 110,
      idealWidthCm: Math.min(240, Math.max(160, Math.min(L, W) - 65)),
      maxWidthCm: 260,
      depthCm: 58,
      heightCm: maxCabinetH,
      allowUnderWindow: false,
      preferCenter: false,
    });

    if (wardrobeSlot) {
      commitItem(
        makePlacedItem(
          'room-wardrobe',
          'wardrobe',
          'دولاب ملابس رئيسي',
          'Main Wardrobe',
          `على ${getWallNameAr(wardrobeSlot.wall)} المصمتة بعيد عن الباب والشباك`,
          `Along solid ${getWallNameEn(wardrobeSlot.wall)}, clear of door & window`,
          wardrobeSlot.wall,
          wardrobeSlot.posXCm,
          wardrobeSlot.posZCm,
          wardrobeSlot.rotationYRad,
          {
            widthCm: wardrobeSlot.widthCm,
            heightCm: maxCabinetH,
            depthCm: 58,
            doorsCount: wardrobeSlot.widthCm >= 200 ? 4 : wardrobeSlot.widthCm >= 145 ? 3 : 2,
            shelvesCount: 5,
            drawersCount: 3,
            dividersCount: wardrobeSlot.widthCm >= 195 ? 2 : 1,
          },
          input.woodType,
          input.sheetPriceEgp
        )
      );
    }

    // 2. Bed: Place headboard on the best remaining wall (can go under a high window if sill >= 90 and needed, never blocking balcony or door!)
    const bedWalls: RoomWall[] = [
      ...solidWallsFirst.filter((w) => w !== wardrobeSlot?.wall),
      ...(wardrobeSlot ? [wardrobeSlot.wall] : []),
    ];
    const idealBedW = Math.min(L, W) >= 340 ? 160 : Math.min(L, W) >= 285 ? 140 : 120;
    const idealBedD = Math.min(200, Math.max(185, Math.min(L, W) - 115));

    const bedHeadH =
      resolvedWindow && !resolvedWindow.isBalcony && resolvedWindow.sillCm >= 85
        ? Math.min(resolvedWindow.sillCm - 4, 96)
        : 105;

    const bedSlot = findBestWallSlot({
      preferredWalls: bedWalls,
      minWidthCm: 105,
      idealWidthCm: idealBedW,
      maxWidthCm: 180,
      depthCm: idealBedD,
      heightCm: bedHeadH,
      allowUnderWindow: Boolean(resolvedWindow && !resolvedWindow.isBalcony && resolvedWindow.sillCm >= 85),
      preferCenter: true,
    });

    if (bedSlot) {
      commitItem(
        makePlacedItem(
          'room-bed',
          'bed',
          `سرير ${bedSlot.widthCm >= 155 ? 'كوين' : bedSlot.widthCm >= 135 ? 'كبير' : 'شبابي'}`,
          `${bedSlot.widthCm}cm Bed Frame`,
          bedSlot.underWindow
            ? `شباك الرأس تحت الشباك على ${getWallNameAr(bedSlot.wall)} بارتفاع مناسب (${bedHeadH} سم)`
            : `على ${getWallNameAr(bedSlot.wall)} بعيد عن مسار فتح الباب`,
          bedSlot.underWindow
            ? `Low headboard (${bedHeadH} cm) beneath window on ${getWallNameEn(bedSlot.wall)}`
            : `Anchored on ${getWallNameEn(bedSlot.wall)}, clear of door swing`,
          bedSlot.wall,
          bedSlot.posXCm,
          bedSlot.posZCm,
          bedSlot.rotationYRad,
          {
            widthCm: bedSlot.widthCm,
            heightCm: bedSlot.underWindow ? bedHeadH : 108,
            depthCm: idealBedD,
            shelvesCount: 14,
          },
          input.woodType,
          input.sheetPriceEgp,
          bedSlot.underWindow
        )
      );

      // 3. Nightstand right next to the bed on the same wall (whichever side is free!)
      const nsSlot = findBestWallSlot({
        preferredWalls: [bedSlot.wall],
        minWidthCm: 40,
        idealWidthCm: 50,
        maxWidthCm: 56,
        depthCm: 42,
        heightCm: 56,
        allowUnderWindow: true,
        preferCenter: false,
      });
      if (nsSlot) {
        commitItem(
          makePlacedItem(
            'room-nightstand',
            'nightstand',
            'كومودينو جنب السرير',
            'Bedside Nightstand',
            `جنب السرير على ${getWallNameAr(nsSlot.wall)}`,
            `Next to bed on ${getWallNameEn(nsSlot.wall)}`,
            nsSlot.wall,
            nsSlot.posXCm,
            nsSlot.posZCm,
            nsSlot.rotationYRad,
            { widthCm: nsSlot.widthCm, heightCm: 56, depthCm: 42, drawersCount: 2 },
            input.woodType,
            input.sheetPriceEgp,
            nsSlot.underWindow
          )
        );
      }
    }

    // 4. Vanity Dresser or Study Desk (prefers under window for natural daylight, or remaining free wall!)
    const dresserWalls: RoomWall[] = resolvedWindow && !resolvedWindow.isBalcony
      ? [resolvedWindow.wall, ...allWalls.filter((w) => w !== resolvedWindow.wall)]
      : solidWallsFirst;

    const dresserSlot = findBestWallSlot({
      preferredWalls: dresserWalls,
      minWidthCm: 80,
      idealWidthCm: 115,
      maxWidthCm: 140,
      depthCm: 45,
      heightCm: 80,
      allowUnderWindow: true,
      preferUnderWindow: Boolean(resolvedWindow && !resolvedWindow.isBalcony && resolvedWindow.sillCm >= 86),
      preferCenter: true,
    });

    if (dresserSlot) {
      const isDeskUnderWin = dresserSlot.underWindow;
      commitItem(
        makePlacedItem(
          'room-dresser',
          isDeskUnderWin ? 'desk' : 'dresser',
          isDeskUnderWin ? 'تسريحة / مكتب تحت الشباك' : 'تسريحة بمرآة',
          isDeskUnderWin ? 'Window Vanity / Desk' : 'Vanity Dresser & Mirror',
          isDeskUnderWin
            ? `تحت الشباك على ${getWallNameAr(dresserSlot.wall)} للاستفادة من الإضاءة الطبيعية`
            : `على ${getWallNameAr(dresserSlot.wall)} بعيد عن الباب`,
          isDeskUnderWin
            ? `Under window on ${getWallNameEn(dresserSlot.wall)} for daylight`
            : `On ${getWallNameEn(dresserSlot.wall)}, clear of entry`,
          dresserSlot.wall,
          dresserSlot.posXCm,
          dresserSlot.posZCm,
          dresserSlot.rotationYRad,
          isDeskUnderWin
            ? { widthCm: dresserSlot.widthCm, heightCm: 76, depthCm: 50, drawersCount: 3 }
            : { widthCm: dresserSlot.widthCm, heightCm: 82, depthCm: 45, drawersCount: 4, doorsCount: 1 },
          input.woodType,
          input.sheetPriceEgp,
          dresserSlot.underWindow
        )
      );
    }

    walkwayClearanceCm = Math.max(60, Math.round(Math.min(L, W) - 215));
    headlineAr = `غرفة نوم متفصلة على تفاصيل الأوضة (${L}×${W} سم · ${areaM2} م²)`;
    headlineEn = `Custom Bedroom Adapted to Room Openings (${L}×${W} cm · ${areaM2} m²)`;
    recommendationAr = `وزّعنا ${items.length} قطع نجارة (${items
      .map((i) => i.roleAr)
      .join(' + ')}) بحيث ولا قطعة تسد الباب أو الشباك، مع ترك ممر حركة صافي ~${walkwayClearanceCm} سم.`;
    recommendationEn = `Placed ${items.length} pieces (${items
      .map((i) => i.roleEn)
      .join(' + ')}) keeping doors & windows unobstructed with ~${walkwayClearanceCm} cm walkway.`;
    alternativeUsesAr.push(
      'أوضة أطفال بسريرين 100 سم + مكتب مذاكرة تحت الشباك',
      'دريسينج روم حرف L على الحوائط المصمتة + تسريحة تحت الشباك'
    );
    alternativeUsesEn.push(
      'Kids twin bedroom with study desk under the window',
      'L-shaped dressing suite on solid walls + window vanity'
    );
    ergonomicTipsAr.push(
      `ارتفاع الدولاب ${maxCabinetH} سم (خلوص 25 سم تحت سقف ${H} سم للتركيب والكرانيش).`,
      resolvedDoor
        ? `تم ترك منطقة خلوص كاملة قدام الباب على ${getWallNameAr(resolvedDoor.wall)} عشان الضلفة تفتح 90° براحتها.`
        : 'تقدر تضيف مكان الباب في أي وقت وهيُعاد توزيع العفش أوتوماتيك.'
    );
    ergonomicTipsEn.push(
      `Wardrobe height is ${maxCabinetH} cm (25 cm installation clearance below ${H} cm ceiling).`,
      resolvedDoor
        ? `Full 90° door swing zone reserved on ${getWallNameEn(resolvedDoor.wall)}.`
        : 'Add a doorway anytime to auto-adapt the furniture layout.'
    );
  } else if (resolvedType === 'kitchen') {
    // 1. Main Kitchen Base Run: LOVES being under the window if sill >= 90cm!
    const preferredKitchenWalls: RoomWall[] =
      resolvedWindow && !resolvedWindow.isBalcony && resolvedWindow.sillCm >= 88
        ? [resolvedWindow.wall, ...solidWallsFirst.filter((w) => w !== resolvedWindow.wall)]
        : solidWallsFirst;

    const mainRun = findBestWallSlot({
      preferredWalls: preferredKitchenWalls,
      minWidthCm: 120,
      idealWidthCm: Math.min(310, Math.max(160, L - 25)),
      maxWidthCm: 320,
      depthCm: 60,
      heightCm: 86,
      allowUnderWindow: true,
      preferUnderWindow: true,
      preferCenter: true,
    });

    if (mainRun) {
      commitItem(
        makePlacedItem(
          'room-kitchen-main',
          'kitchen',
          mainRun.underWindow ? 'وحدة المطبخ والحوض تحت الشباك' : 'وحدة المطبخ الرئيسية',
          mainRun.underWindow ? 'Main Sink & Base Run (Under Window)' : 'Main Kitchen Base Run',
          mainRun.underWindow
            ? `تحت الشباك على ${getWallNameAr(mainRun.wall)} (ارتفاع 86 سم أقل من جلسة الشباك)`
            : `على ${getWallNameAr(mainRun.wall)} بعيد عن الباب`,
          mainRun.underWindow
            ? `Directly under window on ${getWallNameEn(mainRun.wall)} (86 cm counter)`
            : `Along ${getWallNameEn(mainRun.wall)} clear of doorway`,
          mainRun.wall,
          mainRun.posXCm,
          mainRun.posZCm,
          mainRun.rotationYRad,
          {
            widthCm: mainRun.widthCm,
            heightCm: 86,
            depthCm: 60,
            doorsCount: mainRun.widthCm >= 220 ? 4 : 3,
            shelvesCount: 2,
            drawersCount: 3,
            dividersCount: mainRun.widthCm >= 220 ? 2 : 1,
          },
          input.woodType,
          input.sheetPriceEgp,
          mainRun.underWindow
        )
      );
    }

    // 2. L-Shape Side Kitchen Return on best adjacent free wall (never blocking door)
    const sideWalls = solidWallsFirst.filter((w) => w !== mainRun?.wall);
    const sideRun = findBestWallSlot({
      preferredWalls: sideWalls,
      minWidthCm: 100,
      idealWidthCm: Math.min(220, Math.max(120, W - 95)),
      maxWidthCm: 240,
      depthCm: 58,
      heightCm: 86,
      allowUnderWindow: true,
      preferCenter: false,
    });

    if (sideRun) {
      commitItem(
        makePlacedItem(
          'room-kitchen-side',
          'kitchen',
          'وحدة مطبخ جانبية (حرف L)',
          'L-Return Kitchen Cabinet',
          `على ${getWallNameAr(sideRun.wall)} لتكوين مطبخ حرف L`,
          `L-return along ${getWallNameEn(sideRun.wall)}`,
          sideRun.wall,
          sideRun.posXCm,
          sideRun.posZCm,
          sideRun.rotationYRad,
          {
            widthCm: sideRun.widthCm,
            heightCm: 86,
            depthCm: 58,
            doorsCount: sideRun.widthCm >= 165 ? 3 : 2,
            shelvesCount: 1,
            drawersCount: 2,
            dividersCount: 1,
          },
          input.woodType,
          input.sheetPriceEgp,
          sideRun.underWindow
        )
      );
    }

    // 3. Center Island / Breakfast Table if kitchen is spacious and clear of doorway
    if (L >= 310 && W >= 270) {
      const islW = clamp(L * 0.34, 105, 145);
      const islD = 72;
      const centerRect = furnitureRect(0, 15, islW, islD, 0);
      if (isRectFree(centerRect, 65)) {
        commitItem(
          makePlacedItem(
            'room-kitchen-table',
            'table',
            'جزيرة وسطى / ترابيزة فطار',
            'Breakfast Island Table',
            'في منتصف المطبخ مع ممر واسع حواليها',
            'Center island with wide walkways',
            'center',
            0,
            15,
            0,
            { widthCm: islW, heightCm: 82, depthCm: islD },
            input.woodType,
            input.sheetPriceEgp
          )
        );
      }
    }

    walkwayClearanceCm = Math.max(90, Math.round(Math.min(L, W) - 125));
    headlineAr = `مطبخ عملي متفصل على الشباك والباب (${L}×${W} سم · ${areaM2} م²)`;
    headlineEn = `Kitchen Layout Adapted to Window & Door (${L}×${W} cm · ${areaM2} m²)`;
    recommendationAr = `صمّمنا المطبخ ${
      items.length >= 2 ? 'بنظام حرف L' : 'بخط مستقيم'
    } بحيث الحوض والرخامة يستغلوا الشباك من غير ما نسد الباب، مع ممر حركة صافي ~${walkwayClearanceCm} سم.`;
    recommendationEn = `Configured as a ${
      items.length >= 2 ? 'L-shaped' : 'single-wall'
    } kitchen aligning base cabinets under the window while keeping the doorway wide open.`;
    alternativeUsesAr.push(
      'مطبخ أمريكان مفتوح ببار خدمة',
      'مطبخ بصفين متقابلين (Galley) مع وحدة ثلاجة وفرن'
    );
    alternativeUsesEn.push(
      'Open American kitchen with serving bar',
      'Parallel galley kitchen with tall pantry tower'
    );
    ergonomicTipsAr.push(
      'العلب السفلية بارتفاع 86 سم بتدخل تحت جلسة الشباك (95–110 سم) براحتها وبتخلي الحوض قدام التهوية.',
      'استخدم كونتر جود وود 18مم ووزرة PVC ضد المية 10 سم.'
    );
    ergonomicTipsEn.push(
      '86 cm lower cabinets tuck cleanly beneath standard 95–110 cm windowsills.',
      'Use 18mm moisture-resistant blockboard and waterproof 10 cm PVC plinths.'
    );
  } else if (resolvedType === 'dressing') {
    // Tall dressing units strictly on solid wall segments (never blocking window/door!)
    const mainDressing = findBestWallSlot({
      preferredWalls: solidWallsFirst,
      minWidthCm: 110,
      idealWidthCm: Math.min(290, Math.max(150, L - 25)),
      maxWidthCm: 300,
      depthCm: 55,
      heightCm: maxCabinetH,
      allowUnderWindow: false,
      preferCenter: true,
    });

    if (mainDressing) {
      commitItem(
        makePlacedItem(
          'room-dressing-main',
          'dressing',
          'وحدة دريسينج رئيسية للسقف',
          'Main Walk-in Dressing Wall',
          `على ${getWallNameAr(mainDressing.wall)} المصمتة بالكامل`,
          `Full solid ${getWallNameEn(mainDressing.wall)}`,
          mainDressing.wall,
          mainDressing.posXCm,
          mainDressing.posZCm,
          mainDressing.rotationYRad,
          {
            widthCm: mainDressing.widthCm,
            heightCm: maxCabinetH,
            depthCm: 55,
            doorsCount: 0,
            shelvesCount: 8,
            drawersCount: 4,
            dividersCount: mainDressing.widthCm >= 210 ? 2 : 1,
          },
          input.woodType,
          input.sheetPriceEgp
        )
      );
    }

    const sideDressing = findBestWallSlot({
      preferredWalls: solidWallsFirst.filter((w) => w !== mainDressing?.wall),
      minWidthCm: 90,
      idealWidthCm: Math.min(210, Math.max(110, W - 85)),
      maxWidthCm: 230,
      depthCm: 50,
      heightCm: maxCabinetH,
      allowUnderWindow: false,
      preferCenter: false,
    });

    if (sideDressing) {
      commitItem(
        makePlacedItem(
          'room-dressing-side',
          'wardrobe',
          'وحدة شماعات وأرفف جانبية (حرف L)',
          'Side Hanging & Shelving Unit',
          `على ${getWallNameAr(sideDressing.wall)} بعيد عن الباب والشباك`,
          `Along ${getWallNameEn(sideDressing.wall)}, clear of openings`,
          sideDressing.wall,
          sideDressing.posXCm,
          sideDressing.posZCm,
          sideDressing.rotationYRad,
          {
            widthCm: sideDressing.widthCm,
            heightCm: maxCabinetH,
            depthCm: 50,
            doorsCount: 0,
            shelvesCount: 5,
            drawersCount: 2,
            dividersCount: sideDressing.widthCm >= 150 ? 1 : 0,
          },
          input.woodType,
          input.sheetPriceEgp
        )
      );
    }

    // Low vanity under window (or remaining wall)
    const vanitySlot = findBestWallSlot({
      preferredWalls:
        resolvedWindow && !resolvedWindow.isBalcony
          ? [resolvedWindow.wall, ...allWalls.filter((w) => w !== resolvedWindow.wall)]
          : solidWallsFirst,
      minWidthCm: 75,
      idealWidthCm: 110,
      maxWidthCm: 130,
      depthCm: 44,
      heightCm: 80,
      allowUnderWindow: true,
      preferUnderWindow: true,
      preferCenter: true,
    });

    if (vanitySlot) {
      commitItem(
        makePlacedItem(
          'room-dressing-vanity',
          'dresser',
          vanitySlot.underWindow ? 'تسريحة ميك أب تحت الشباك' : 'تسريحة وميك أب بمرآة',
          vanitySlot.underWindow ? 'Daylight Window Vanity' : 'Vanity Makeup Table',
          vanitySlot.underWindow
            ? `تحت الشباك على ${getWallNameAr(vanitySlot.wall)} لإضاءة طبيعية ممتازة`
            : `على ${getWallNameAr(vanitySlot.wall)}`,
          vanitySlot.underWindow
            ? `Under window on ${getWallNameEn(vanitySlot.wall)} for natural light`
            : `Along ${getWallNameEn(vanitySlot.wall)}`,
          vanitySlot.wall,
          vanitySlot.posXCm,
          vanitySlot.posZCm,
          vanitySlot.rotationYRad,
          { widthCm: vanitySlot.widthCm, heightCm: 80, depthCm: 44, drawersCount: 3, doorsCount: 0 },
          input.woodType,
          input.sheetPriceEgp,
          vanitySlot.underWindow
        )
      );
    }

    walkwayClearanceCm = Math.max(75, Math.round(Math.min(L, W) - 105));
    headlineAr = `دريسينج روم متفصل على تفاصيل الغرفة (${L}×${W} سم · ${areaM2} م²)`;
    headlineEn = `Walk-in Dressing Room Adapted to Openings (${L}×${W} cm · ${areaM2} m²)`;
    recommendationAr = `استغلينا الحوائط المصمتة لوحدات الدريسينج بارتفاع ${maxCabinetH} سم، وحطّينا التسريحة في الإضاءة بعيد عن مسار الباب.`;
    recommendationEn = `Maximized solid walls with ${maxCabinetH} cm tall closet runs while leaving window daylight & doorway completely open.`;
    alternativeUsesAr.push(
      'أوضة مكتب هادئة مع مكتبة للسقف',
      'مخزن مطبخ (بانتري) بأرفف عميقة وجزامة عائلية'
    );
    alternativeUsesEn.push(
      'Private home office with ceiling-height bookcase',
      'Walk-in pantry and family shoe room'
    );
    ergonomicTipsAr.push(
      'عمق 55 سم للشماعات المفتوحة بيدي وسع في الممر وبيخلي الحركة سهلة.',
      'اضبط إضاءة ليد بروفايل مخفي تحت الأرفف العلوية.'
    );
    ergonomicTipsEn.push(
      '55 cm depth fits hangers cleanly without doors, widening the central aisle.',
      'Add recessed LED strip channels beneath upper shelves.'
    );
  } else if (resolvedType === 'office') {
    // 1. Study Desk: prefers under/facing the big window for natural daylight!
    const deskPreferredWalls: RoomWall[] =
      resolvedWindow && !resolvedWindow.isBalcony && resolvedWindow.sillCm >= 78
        ? [resolvedWindow.wall, ...solidWallsFirst.filter((w) => w !== resolvedWindow.wall)]
        : solidWallsFirst;

    const deskSlot = findBestWallSlot({
      preferredWalls: deskPreferredWalls,
      minWidthCm: 110,
      idealWidthCm: Math.min(185, Math.max(130, L * 0.52)),
      maxWidthCm: 200,
      depthCm: 65,
      heightCm: 76,
      allowUnderWindow: true,
      preferUnderWindow: true,
      preferCenter: true,
    });

    if (deskSlot) {
      commitItem(
        makePlacedItem(
          'room-desk',
          'desk',
          deskSlot.underWindow ? 'مكتب عمل ومذاكرة قدام الشباك' : 'مكتب عمل رئيسي بأدراج',
          deskSlot.underWindow ? 'Daylight Window Study Desk' : 'Executive Study Desk',
          deskSlot.underWindow
            ? `تحت الشباك مباشرة على ${getWallNameAr(deskSlot.wall)} لإضاءة طبيعية`
            : `على ${getWallNameAr(deskSlot.wall)} بعيد عن الباب`,
          deskSlot.underWindow
            ? `Under window on ${getWallNameEn(deskSlot.wall)} for natural light`
            : `On ${getWallNameEn(deskSlot.wall)} clear of entry`,
          deskSlot.wall,
          deskSlot.posXCm,
          deskSlot.posZCm,
          deskSlot.rotationYRad,
          { widthCm: deskSlot.widthCm, heightCm: 76, depthCm: 65, drawersCount: 3 },
          input.woodType,
          input.sheetPriceEgp,
          deskSlot.underWindow
        )
      );
    }

    // 2. Tall Bookcase on the longest solid wall free of door & window
    const bookcaseSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst.filter((w) => w !== deskSlot?.wall).concat(solidWallsFirst),
      minWidthCm: 100,
      idealWidthCm: Math.min(240, Math.max(140, L - 40)),
      maxWidthCm: 260,
      depthCm: 36,
      heightCm: Math.min(220, maxCabinetH),
      allowUnderWindow: false,
      preferCenter: true,
    });

    if (bookcaseSlot) {
      commitItem(
        makePlacedItem(
          'room-office-bookcase',
          'bookshelf',
          'مكتبة كتب وملفات مصمتة',
          'Full Wall Bookcase',
          `على ${getWallNameAr(bookcaseSlot.wall)} المصمتة بعيد عن الشباك والباب`,
          `Along solid ${getWallNameEn(bookcaseSlot.wall)}`,
          bookcaseSlot.wall,
          bookcaseSlot.posXCm,
          bookcaseSlot.posZCm,
          bookcaseSlot.rotationYRad,
          {
            widthCm: bookcaseSlot.widthCm,
            heightCm: Math.min(220, maxCabinetH),
            depthCm: 36,
            shelvesCount: 5,
            dividersCount: bookcaseSlot.widthCm >= 180 ? 2 : 1,
          },
          input.woodType,
          input.sheetPriceEgp
        )
      );
    }

    // 3. Side Printer / Archive Credenza if room has a 3rd clear wall
    const credSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst.filter(
        (w) => w !== deskSlot?.wall && w !== bookcaseSlot?.wall
      ),
      minWidthCm: 85,
      idealWidthCm: 130,
      maxWidthCm: 155,
      depthCm: 44,
      heightCm: 78,
      allowUnderWindow: true,
      preferCenter: false,
    });

    if (credSlot) {
      commitItem(
        makePlacedItem(
          'room-office-cred',
          'buffet',
          'وحدة طابعة وأرشيف جانبية',
          'Side Printer & File Credenza',
          `على ${getWallNameAr(credSlot.wall)}`,
          `Along ${getWallNameEn(credSlot.wall)}`,
          credSlot.wall,
          credSlot.posXCm,
          credSlot.posZCm,
          credSlot.rotationYRad,
          { widthCm: credSlot.widthCm, heightCm: 78, depthCm: 44, doorsCount: 2, drawersCount: 2, dividersCount: 1 },
          input.woodType,
          input.sheetPriceEgp,
          credSlot.underWindow
        )
      );
    }

    walkwayClearanceCm = Math.max(90, Math.round(Math.min(L, W) - 115));
    headlineAr = `أوضة مكتب متفصلة على الشباك والباب (${L}×${W} سم · ${areaM2} م²)`;
    headlineEn = `Home Office Plan Adapted to Daylight & Door (${L}×${W} cm · ${areaM2} m²)`;
    recommendationAr = `حطّينا المكتب للاستفادة من نور الشباك، والمكتبة الطويلة على الحيطة المصمتة بعيد عن الباب مع مساحة كرسي وحركة ~${walkwayClearanceCm} سم.`;
    recommendationEn = `Oriented the desk toward daylight while anchoring the tall bookcase on a solid wall with ~${walkwayClearanceCm} cm chair zone.`;
    alternativeUsesAr.push(
      'أوضة جيمنج بمكتب عريض وشاشات مزدوجة',
      'دريسينج روم مدمج مع تسريحة'
    );
    alternativeUsesEn.push(
      'Dual-monitor gaming studio',
      'Compact walk-in closet + vanity'
    );
    ergonomicTipsAr.push(
      'ارتفاع المكتب 76 سم بيدخل تحت الشباك بكل سهولة وبيريح العين وقت الشغل.',
      'افتح فتحة كابلات 60مم في زاوية القرصة لتنظيم الأسلاك.'
    );
    ergonomicTipsEn.push(
      '76 cm desk height clears standard windowsills cleanly.',
      'Drill a 60 mm cable grommet at the rear desktop corner.'
    );
  } else if (resolvedType === 'living') {
    // 1. TV Media Console: strictly prefers a solid wall (avoiding backlight glare from window!)
    const tvSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst,
      minWidthCm: 140,
      idealWidthCm: clamp(L * 0.54, 160, 250),
      maxWidthCm: 260,
      depthCm: 42,
      heightCm: 52,
      allowUnderWindow: true,
      preferUnderWindow: false,
      preferCenter: true,
    });

    if (tvSlot) {
      commitItem(
        makePlacedItem(
          'room-tv',
          'tv_unit',
          'وحدة تليفزيون وميديا رئيسية',
          'TV Media Console',
          `على ${getWallNameAr(tvSlot.wall)} المصمتة (من غير انعكاس شمس الشباك)`,
          `On solid ${getWallNameEn(tvSlot.wall)} (glare-free)`,
          tvSlot.wall,
          tvSlot.posXCm,
          tvSlot.posZCm,
          tvSlot.rotationYRad,
          { widthCm: tvSlot.widthCm, heightCm: 52, depthCm: 42, doorsCount: 2, drawersCount: 2, dividersCount: 2 },
          input.woodType,
          input.sheetPriceEgp,
          tvSlot.underWindow
        )
      );
    }

    // 2. Buffet Sideboard on another clear wall (can go under a window cleanly at 84cm!)
    const buffetSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst.filter((w) => w !== tvSlot?.wall).concat(allWalls),
      minWidthCm: 115,
      idealWidthCm: clamp(Math.min(L, W) * 0.46, 135, 190),
      maxWidthCm: 200,
      depthCm: 44,
      heightCm: 84,
      allowUnderWindow: true,
      preferCenter: true,
    });

    if (buffetSlot) {
      commitItem(
        makePlacedItem(
          'room-buffet',
          'buffet',
          'بوفيه سفرة مودرن',
          'Dining Sideboard Buffet',
          buffetSlot.underWindow
            ? `تحت الشباك على ${getWallNameAr(buffetSlot.wall)}`
            : `على ${getWallNameAr(buffetSlot.wall)} بعيد عن الباب`,
          buffetSlot.underWindow
            ? `Beneath window on ${getWallNameEn(buffetSlot.wall)}`
            : `Along ${getWallNameEn(buffetSlot.wall)}`,
          buffetSlot.wall,
          buffetSlot.posXCm,
          buffetSlot.posZCm,
          buffetSlot.rotationYRad,
          { widthCm: buffetSlot.widthCm, heightCm: 84, depthCm: 44, doorsCount: 4, drawersCount: 3, dividersCount: 2 },
          input.woodType,
          input.sheetPriceEgp,
          buffetSlot.underWindow
        )
      );
    }

    // 3. Tall Display Bookshelf on a remaining solid segment
    const bookSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst,
      minWidthCm: 65,
      idealWidthCm: 95,
      maxWidthCm: 115,
      depthCm: 34,
      heightCm: Math.min(210, maxCabinetH),
      allowUnderWindow: false,
      preferCenter: false,
    });

    if (bookSlot) {
      commitItem(
        makePlacedItem(
          'room-bookcase',
          'bookshelf',
          'مكتبة ديكور وكتب جانبية',
          'Display Bookshelf',
          `على ${getWallNameAr(bookSlot.wall)} المصمتة`,
          `On solid ${getWallNameEn(bookSlot.wall)}`,
          bookSlot.wall,
          bookSlot.posXCm,
          bookSlot.posZCm,
          bookSlot.rotationYRad,
          { widthCm: bookSlot.widthCm, heightCm: Math.min(210, maxCabinetH), depthCm: 34, shelvesCount: 5, dividersCount: 1 },
          input.woodType,
          input.sheetPriceEgp
        )
      );
    }

    // 4. Dining / Family Table in the clearest open center zone
    if (L >= 290 && W >= 270) {
      const tblW = clamp(L * 0.44, 130, 200);
      const tblD = clamp(W * 0.25, 80, 96);
      const offsets: [number, number][] = [
        [0, 20],
        [0, -15],
        [-30, 20],
        [30, 20],
        [0, 45],
      ];
      for (const [ox, oz] of offsets) {
        const rect = furnitureRect(ox, oz, tblW, tblD, 0);
        if (isRectFree(rect, 38)) {
          commitItem(
            makePlacedItem(
              'room-dining-table',
              'table',
              'ترابيزة سفرة / تجمع عائلي',
              'Dining / Family Table',
              'في المنطقة الوسطى المفتوحة بعيد عن مسار الباب',
              'Centered in open floor zone clear of doorway',
              'center',
              ox,
              oz,
              0,
              { widthCm: tblW, heightCm: 76, depthCm: tblD },
              input.woodType,
              input.sheetPriceEgp
            )
          );
          break;
        }
      }
    }

    walkwayClearanceCm = Math.max(90, Math.round(Math.min(L, W) * 0.28));
    headlineAr = `ليفينج وريسبشن متفصل على تفاصيل الأوضة (${L}×${W} سم · ${areaM2} م²)`;
    headlineEn = `Living & Dining Layout Adapted to Openings (${L}×${W} cm · ${areaM2} m²)`;
    recommendationAr = `ركّبنا وحدة التليفزيون على حيطة مصمتة عشان مفيش شمس تضرب في الشاشة، ووزّعنا البوفيه والسفرة بعيد عن الباب والشباك.`;
    recommendationEn = `Placed the TV console on a glare-free solid wall and balanced the sideboard & dining zone clear of all openings.`;
    alternativeUsesAr.push(
      'ليفينج + ركن مكتب منزلي فاصل بمكتبة مفتوحة',
      'ريسبشن استقبال بوفيه + كونسول مدخل'
    );
    alternativeUsesEn.push(
      'Living lounge + open bookshelf home office nook',
      'Formal dining suite with entryway console'
    );
    ergonomicTipsAr.push(
      'ارتفاع وحدة الـ TV بين 48–55 سم بيحط الشاشة في مستوى نظر مريح.',
      'اترك 85–90 سم حول ترابيزة السفرة لسحب الكراسي بسهولة.'
    );
    ergonomicTipsEn.push(
      '48–55 cm TV console height keeps screen centered at eye level.',
      'Leave 85–90 cm clearance around the dining table for chairs.'
    );
  } else {
    // Entryway / Compact Nook
    const shoeSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst,
      minWidthCm: 70,
      idealWidthCm: clamp(L * 0.5, 85, 130),
      maxWidthCm: 140,
      depthCm: 36,
      heightCm: 108,
      allowUnderWindow: true,
      preferCenter: false,
    });

    if (shoeSlot) {
      commitItem(
        makePlacedItem(
          'room-shoe',
          'shoe_rack',
          'جزامة مدخل مودرن بدرج علوي',
          'Entryway Shoe Cabinet',
          `على ${getWallNameAr(shoeSlot.wall)} بعيد عن فتحة الباب`,
          `Along ${getWallNameEn(shoeSlot.wall)}, clear of door swing`,
          shoeSlot.wall,
          shoeSlot.posXCm,
          shoeSlot.posZCm,
          shoeSlot.rotationYRad,
          { widthCm: shoeSlot.widthCm, heightCm: 108, depthCm: 36, doorsCount: 2, shelvesCount: 5, drawersCount: 1 },
          input.woodType,
          input.sheetPriceEgp,
          shoeSlot.underWindow
        )
      );
    }

    const coatSlot = findBestWallSlot({
      preferredWalls: solidWallsFirst,
      minWidthCm: 70,
      idealWidthCm: 100,
      maxWidthCm: 120,
      depthCm: 46,
      heightCm: Math.min(215, maxCabinetH),
      allowUnderWindow: false,
      preferCenter: false,
    });

    if (coatSlot) {
      commitItem(
        makePlacedItem(
          'room-nook-wardrobe',
          'wardrobe',
          'دولاب عبايات وجواكت مدخل',
          'Coat & Utility Closet',
          `على ${getWallNameAr(coatSlot.wall)} المصمتة`,
          `Along solid ${getWallNameEn(coatSlot.wall)}`,
          coatSlot.wall,
          coatSlot.posXCm,
          coatSlot.posZCm,
          coatSlot.rotationYRad,
          { widthCm: coatSlot.widthCm, heightCm: Math.min(215, maxCabinetH), depthCm: 46, doorsCount: 2, shelvesCount: 3, drawersCount: 1, dividersCount: 0 },
          input.woodType,
          input.sheetPriceEgp
        )
      );
    }

    walkwayClearanceCm = Math.max(75, Math.round(Math.min(L, W) - 46));
    headlineAr = `مدخل / ركن عملي متفصل على مكان الباب (${L}×${W} سم · ${areaM2} م²)`;
    headlineEn = `Compact Entryway Adapted to Door Swing (${L}×${W} cm · ${areaM2} m²)`;
    recommendationAr = `استغلينا الحوائط السليمة بجزامة عمقها نحيف 36 سم${
      items.length >= 2 ? ' + دولاب عبايات وجواكت' : ''
    } بحيث الباب يفتح بالكامل بممر واسع ${walkwayClearanceCm} سم.`;
    recommendationEn = `Placed slim 36 cm cabinetry on solid walls so the entrance door swings freely with a ${walkwayClearanceCm} cm walkway.`;
    alternativeUsesAr.push(
      'ركن مكتب دراسة مدمج 110×55 سم مع أرفف حائط',
      'ركن كوفي كورنر وبوفيه ضيافة صغير'
    );
    alternativeUsesEn.push(
      'Compact 110×55 cm study nook with floating shelves',
      'Coffee bar & hospitality console'
    );
    ergonomicTipsAr.push(
      'في المداخل لا تتجاوز عمق 36–40 سم عشان ما تضيقش الدخول.',
      'مرآة فوق الجزامة بتضاعف إحساس الوسع في المدخل.'
    );
    ergonomicTipsEn.push(
      'Keep hall cabinets 36–40 cm deep for easy passage.',
      'Hang a mirror above the shoe cabinet to visually widen the hall.'
    );
  }

  // Build crisp architectural summary explaining the room details reflected in the drawing
  const archPartsAr: string[] = [];
  const archPartsEn: string[] = [];
  if (resolvedDoor) {
    archPartsAr.push(
      `باب بعرض ${resolvedDoor.widthCm} سم على ${getWallNameAr(resolvedDoor.wall)}`
    );
    archPartsEn.push(
      `${resolvedDoor.widthCm} cm door on ${getWallNameEn(resolvedDoor.wall)}`
    );
  }
  if (resolvedWindow) {
    archPartsAr.push(
      `${resolvedWindow.isBalcony ? 'باب بلكونة' : 'شباك'} ${resolvedWindow.widthCm}×${
        resolvedWindow.heightCm
      } سم على ${getWallNameAr(resolvedWindow.wall)}`
    );
    archPartsEn.push(
      `${resolvedWindow.isBalcony ? 'balcony door' : 'window'} ${resolvedWindow.widthCm}×${
        resolvedWindow.heightCm
      } cm on ${getWallNameEn(resolvedWindow.wall)}`
    );
  }
  if (resolvedColumn) {
    archPartsAr.push(`عمود خرسانة ${resolvedColumn.sizeCm}×${resolvedColumn.sizeCm} سم`);
    archPartsEn.push(`${resolvedColumn.sizeCm}×${resolvedColumn.sizeCm} cm corner column`);
  }

  const architecturalSummaryAr =
    archPartsAr.length > 0
      ? `تم الرسم والتوزيع على أساس: ${archPartsAr.join(' + ')}.`
      : 'الغرفة مصمتة بالكامل (بدون فتحات) وتم استغلال الحوائط الأربعة.';
  const architecturalSummaryEn =
    archPartsEn.length > 0
      ? `Layout engineered around: ${archPartsEn.join(' + ')}.`
      : 'Solid perimeter room with maximum wall utilization.';

  const totalSheets = items.reduce((s, x) => s + x.sheetsCount, 0);
  const totalPieces = items.reduce((s, x) => s + x.piecesCount, 0);
  const totalRoomCostEgp = items.reduce((s, x) => s + x.estimatedCostEgp, 0);

  return {
    resolvedType,
    areaM2,
    lengthCm: L,
    widthCm: W,
    ceilingCm: H,
    details,
    resolvedDoor,
    resolvedWindow,
    resolvedColumn,
    doorClearanceBox,
    balconyClearanceBox,
    headlineAr,
    headlineEn,
    recommendationAr,
    recommendationEn,
    architecturalSummaryAr,
    architecturalSummaryEn,
    alternativeUsesAr,
    alternativeUsesEn,
    walkwayClearanceCm,
    ergonomicTipsAr,
    ergonomicTipsEn,
    items,
    totalSheets,
    totalPieces,
    totalRoomCostEgp,
  };
}
