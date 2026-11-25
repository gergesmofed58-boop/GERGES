export type AppLocale = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';

export type FurnitureTemplateId =
  | 'wardrobe'
  | 'dressing'
  | 'bed'
  | 'nightstand'
  | 'dresser'
  | 'kitchen'
  | 'buffet'
  | 'table'
  | 'tv_unit'
  | 'bookshelf'
  | 'desk'
  | 'shoe_rack';

export type TemplateRoomCategory =
  | 'all'
  | 'bedroom'
  | 'kitchen_dining'
  | 'living_office';

export type WoodTypeId =
  | 'counter18'
  | 'mdf18'
  | 'oak18'
  | 'walnut18'
  | 'beech22'
  | 'pine22';

export type CarpentryWorkspaceTab =
  | 'designer'
  | 'photo'
  | 'room'
  | 'cutlist'
  | 'sheets'
  | 'guide'
  | 'tools'
  | 'apk';

export type ViewerMode = '3d' | 'blueprint' | 'photo';

export interface CustomExtraPiece {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  qty: number;
  edgeSides: 'all' | '1L' | 'none';
}

export interface ProjectParams {
  templateId: FurnitureTemplateId;
  projectTitle: string;
  clientName: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  shelvesCount: number;
  drawersCount: number;
  dividersCount: number;
  plinthHeightCm: number;
  woodType: WoodTypeId;
  boardThicknessMm: number;
  backThicknessMm: number;
  kerfMm: number;
  allowGrainRotation: boolean;
  includeBackPanel: boolean;
  customPieces: CustomExtraPiece[];
}

export interface FurnitureTemplateSpec {
  id: FurnitureTemplateId;
  room: Exclude<TemplateRoomCategory, 'all'>;
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  imageUrl: string;
  defaults: Omit<ProjectParams, 'projectTitle' | 'clientName' | 'customPieces'>;
  limits: {
    width: [number, number];
    height: [number, number];
    depth: [number, number];
    doors: [number, number];
    shelves: [number, number];
    drawers: [number, number];
    dividers: [number, number];
  };
  supportsDoors: boolean;
  supportsShelves: boolean;
  supportsDrawers: boolean;
  supportsDividers: boolean;
  supportsPlinth: boolean;
  supportsBackPanel: boolean;
}

export interface WoodMaterialSpec {
  id: WoodTypeId;
  nameAr: string;
  nameEn: string;
  defaultThicknessMm: number;
  sheetPriceEgp: number;
  sheetWidthCm: number;
  sheetHeightCm: number;
  baseHex: string;
  grainHex: string;
  accentHex: string;
  roughness: number;
  descriptionAr: string;
  descriptionEn: string;
}

export interface EdgeBandingSpec {
  longSides: 0 | 1 | 2;
  shortSides: 0 | 1 | 2;
}

export interface CutPiece {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  lengthCm: number;
  widthCm: number;
  thicknessMm: number;
  qty: number;
  materialKind: 'main' | 'back' | 'solid';
  edgeBanding: EdgeBandingSpec;
  edgeMetersPerPiece: number;
  grainDirection: 'length' | 'width';
  category: 'carcass' | 'front' | 'internal' | 'drawer' | 'frame' | 'back';
  noteAr: string;
  noteEn: string;
  isCustom?: boolean;
}

export interface HardwareItem {
  id: string;
  nameAr: string;
  nameEn: string;
  qty: number;
  unitAr: string;
  unitEn: string;
  unitPriceEgp: number;
  specAr: string;
  specEn: string;
}

export interface AssemblyStep {
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  detailsAr: string;
  detailsEn: string;
  toolAr: string;
  toolEn: string;
  tipAr: string;
  tipEn: string;
  highlightDim: string;
  diagramType: 'carcass' | 'square' | 'shelves' | 'drawers' | 'doors' | 'finish';
}

export interface SheetPlacement {
  pieceCode: string;
  instanceLabel: string;
  nameAr: string;
  nameEn: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  category: CutPiece['category'];
}

export interface ReusableOffcut {
  sheetIndex: number;
  lengthCm: number;
  widthCm: number;
  areaM2: number;
  suggestedUseAr: string;
  suggestedUseEn: string;
}

export interface PackedSheet {
  sheetIndex: number;
  widthCm: number;
  heightCm: number;
  placements: SheetPlacement[];
  usedAreaCm2: number;
  totalAreaCm2: number;
  utilizationPct: number;
  wasteAreaM2: number;
}

export interface SheetOptimizationResult {
  sheetWidthCm: number;
  sheetHeightCm: number;
  mainSheets: PackedSheet[];
  backSheetsCount: number;
  totalSheetAreaM2: number;
  totalMainAreaM2: number;
  totalBackAreaM2: number;
  wasteAreaM2: number;
  averageUtilizationPct: number;
  wastePct: number;
  reusableOffcuts: ReusableOffcut[];
  sheetsSavedIfRotated: number;
}

export interface ProjectCalculation {
  pieces: CutPiece[];
  hardware: HardwareItem[];
  steps: AssemblyStep[];
  sheets: SheetOptimizationResult;
  totalPiecesCount: number;
  totalEdgeBandingMeters: number;
  diagonalCheckCm: number;
  estimatedHours: number;
}

export interface PricingConfig {
  sheetPriceEgp: number;
  backSheetPriceEgp: number;
  edgeBandingPricePerMeterEgp: number;
  laborAndProfitPct: number;
  finishingFixedEgp: number;
  hardwarePriceOverrides?: Record<string, number>;
}

export interface SavedCarpentryProject {
  id: string;
  savedAt: string;
  params: ProjectParams;
  pricing: PricingConfig;
  totalQuoteEgp: number;
  sheetsCount: number;
}
