import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
  Globe,
  Grid2x2,
  Hammer,
  Home,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Moon,
  Plus,
  Ruler,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Table2,
  TrendingDown,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { isRunningInsideNativeApk } from './apiBase';
import { ApkExportView } from './ApkExportView';
import { AssemblyGuideView } from './AssemblyGuideView';
import { Blueprint2DSVG } from './Blueprint2DSVG';
import {
  FURNITURE_TEMPLATES,
  getTemplateSpec,
  getWoodSpec,
  WOOD_MATERIALS,
} from './catalog';
import { CutListAndCostView } from './CutListAndCostView';
import {
  egBoxDims,
  egDim,
  egEdgeBandingText,
  egQtyPieces,
  egSpokenLength,
  egThickness,
} from './egyptianCopy';
import { calculateCarpentryProject } from './engine';
import { ManualNumberInput } from './ManualNumberInput';
import { PhotoToDesignView } from './PhotoToDesignView';
import { RoomSpaceDesignerView } from './RoomSpaceDesignerView';
import { SheetOptimizerView } from './SheetOptimizerView';
import { ThreeDFurnitureViewport } from './ThreeDFurnitureViewport';
import {
  AppLocale,
  CarpentryWorkspaceTab,
  CustomExtraPiece,
  FurnitureTemplateId,
  PricingConfig,
  ProjectParams,
  SavedCarpentryProject,
  TemplateRoomCategory,
  ThemeMode,
  ViewerMode,
  WoodTypeId,
} from './types';
import { useOnlineStatus, usePWAInstall } from './usePwaOffline';
import {
  LocalWoodPricesSnapshot,
  loadCachedWoodPrices,
  updateManualWoodPrice,
} from './woodPricesService';
import { WorkshopToolsView } from './WorkshopToolsView';

const STORAGE_KEY = 'ostanagar_3d_saved_jobs_v1';

function loadSavedProjects(): SavedCarpentryProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const OstaNagarApp: React.FC = () => {
  const [locale, setLocale] = useState<AppLocale>('ar');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<CarpentryWorkspaceTab>('designer');
  const [sheetsSubTab, setSheetsSubTab] = useState<'sheets' | 'guide' | 'tools'>('sheets');
  const [viewerMode, setViewerMode] = useState<ViewerMode>('3d');
  const [roomFilter, setRoomFilter] = useState<TemplateRoomCategory>('all');
  const [previewUnit, setPreviewUnit] = useState<'cm' | 'mm'>('cm');
  const [showAdvancedManual, setShowAdvancedManual] = useState(false);
  const [showHardwarePrices, setShowHardwarePrices] = useState(false);

  const isNativeApk = useMemo(() => isRunningInsideNativeApk(), []);
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Manually Editable Local Wood Prices (Saved on Device)
  const [marketPrices, setMarketPrices] = useState<LocalWoodPricesSnapshot>(() =>
    loadCachedWoodPrices()
  );

  const initialTemplate = FURNITURE_TEMPLATES[0];
  const [params, setParams] = useState<ProjectParams>({
    ...initialTemplate.defaults,
    projectTitle: initialTemplate.nameAr,
    clientName: '',
    customPieces: [],
  });

  const [pricing, setPricing] = useState<PricingConfig>(() => {
    const cached = loadCachedWoodPrices();
    const initialWood = initialTemplate.defaults.woodType;
    return {
      sheetPriceEgp:
        cached.prices[initialWood] ?? getWoodSpec(initialWood).sheetPriceEgp,
      backSheetPriceEgp: cached.prices.backSheet6mm ?? 580,
      edgeBandingPricePerMeterEgp: cached.prices.edgeBandingPerMeter ?? 18,
      laborAndProfitPct: 45,
      finishingFixedEgp: 350,
      hardwarePriceOverrides: {},
    };
  });

  const [checkedCutIds, setCheckedCutIds] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedCarpentryProject[]>(() =>
    loadSavedProjects()
  );
  const [saveToast, setSaveToast] = useState(false);

  const isRtl = locale === 'ar';

  const currencyLabel = isRtl ? 'جنيه' : 'EGP';

  useEffect(() => {
    const html = document.documentElement;
    html.dir = isRtl ? 'rtl' : 'ltr';
    html.lang = locale;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isRtl, locale, theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProjects));
    } catch {
      // ignore storage quota error
    }
  }, [savedProjects]);

  const template = getTemplateSpec(params.templateId);
  const wood = getWoodSpec(params.woodType);
  const calc = useMemo(() => calculateCarpentryProject(params), [params]);

  const filteredTemplates = useMemo(() => {
    if (roomFilter === 'all') return FURNITURE_TEMPLATES;
    return FURNITURE_TEMPLATES.filter((t) => t.room === roomFilter);
  }, [roomFilter]);

  const sheetAreaM2 = (wood.sheetWidthCm * wood.sheetHeightCm) / 10000;
  const pricePerM2Main = pricing.sheetPriceEgp / sheetAreaM2;
  const pricePerM2Back = pricing.backSheetPriceEgp / sheetAreaM2;

  const costSummary = useMemo(() => {
    const mainSheetsCost = calc.sheets.mainSheets.length * pricing.sheetPriceEgp;
    const backCost = calc.sheets.backSheetsCount * pricing.backSheetPriceEgp;
    const edgeCost = Math.round(
      calc.totalEdgeBandingMeters * pricing.edgeBandingPricePerMeterEgp
    );
    const hwCost = calc.hardware.reduce(
      (sum, h) =>
        sum + h.qty * (pricing.hardwarePriceOverrides?.[h.id] ?? h.unitPriceEgp),
      0
    );
    const rawMaterials =
      mainSheetsCost + backCost + edgeCost + hwCost + pricing.finishingFixedEgp;
    const totalQuote = Math.round(
      rawMaterials * (1 + pricing.laborAndProfitPct / 100)
    );
    const wasteCostEgp = Math.round(mainSheetsCost * (calc.sheets.wastePct / 100));
    return {
      mainSheetsCost,
      rawMaterials,
      totalQuote,
      wasteCostEgp,
    };
  }, [calc, pricing]);

  // Manual wood price update: persists immediately for the active wood type!
  const handleManualSheetPriceChange = (nextPrice: number) => {
    const safe = Math.max(0, Math.round(nextPrice));
    setPricing((prev) => ({ ...prev, sheetPriceEgp: safe }));
    setMarketPrices((prev) => updateManualWoodPrice(prev, params.woodType, safe));
  };

  const handleUpdatePricing = (patch: Partial<PricingConfig>) => {
    setPricing((prev) => ({ ...prev, ...patch }));
    if (typeof patch.sheetPriceEgp === 'number') {
      setMarketPrices((prev) =>
        updateManualWoodPrice(prev, params.woodType, patch.sheetPriceEgp!)
      );
    }
    if (typeof patch.backSheetPriceEgp === 'number') {
      setMarketPrices((prev) =>
        updateManualWoodPrice(prev, 'backSheet6mm', patch.backSheetPriceEgp!)
      );
    }
    if (typeof patch.edgeBandingPricePerMeterEgp === 'number') {
      setMarketPrices((prev) =>
        updateManualWoodPrice(
          prev,
          'edgeBandingPerMeter',
          patch.edgeBandingPricePerMeterEgp!
        )
      );
    }
  };

  const handleSelectTemplate = (templateId: FurnitureTemplateId) => {
    const spec = getTemplateSpec(templateId);
    const nextWood = spec.defaults.woodType;
    const wSpec = getWoodSpec(nextWood);
    setParams({
      ...spec.defaults,
      projectTitle: isRtl ? spec.nameAr : spec.nameEn,
      clientName: params.clientName,
      customPieces: [],
    });
    setPricing((prev) => ({
      ...prev,
      sheetPriceEgp: marketPrices.prices[nextWood] ?? wSpec.sheetPriceEgp,
    }));
    setCheckedCutIds([]);
    setCompletedSteps([]);
  };

  const handleSelectWood = (woodId: WoodTypeId) => {
    const wSpec = getWoodSpec(woodId);
    setParams((prev) => ({
      ...prev,
      woodType: woodId,
      boardThicknessMm: wSpec.defaultThicknessMm,
    }));
    setPricing((prev) => ({
      ...prev,
      sheetPriceEgp: marketPrices.prices[woodId] ?? wSpec.sheetPriceEgp,
    }));
  };

  const handleOpenRoomPieceInDesigner = (pieceParams: ProjectParams) => {
    const wSpec = getWoodSpec(pieceParams.woodType);
    setParams({
      ...pieceParams,
      customPieces: pieceParams.customPieces ?? [],
    });
    setPricing((prev) => ({
      ...prev,
      sheetPriceEgp: marketPrices.prices[pieceParams.woodType] ?? wSpec.sheetPriceEgp,
    }));
    setCheckedCutIds([]);
    setCompletedSteps([]);
    setViewerMode('3d');
    setActiveTab('designer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddCustomPiece = (piece: CustomExtraPiece) => {
    setParams((prev) => ({
      ...prev,
      customPieces: [...(prev.customPieces ?? []), piece],
    }));
  };

  const handleRemoveCustomPiece = (id: string) => {
    setParams((prev) => ({
      ...prev,
      customPieces: (prev.customPieces ?? []).filter((p) => p.id !== id),
    }));
  };

  const handleSaveCurrentProject = () => {
    const entry: SavedCarpentryProject = {
      id: `job-${Date.now()}`,
      savedAt: new Date().toISOString(),
      params: { ...params, customPieces: [...(params.customPieces ?? [])] },
      pricing: { ...pricing },
      totalQuoteEgp: costSummary.totalQuote,
      sheetsCount: calc.sheets.mainSheets.length,
    };
    setSavedProjects((prev) => [entry, ...prev].slice(0, 30));
    setSaveToast(true);
    window.setTimeout(() => setSaveToast(false), 1800);
  };

  const handleLoadProject = (job: SavedCarpentryProject) => {
    setParams({
      ...job.params,
      customPieces: job.params.customPieces ?? [],
    });
    setPricing(job.pricing);
    setCheckedCutIds([]);
    setCompletedSteps([]);
    setActiveTab('designer');
  };

  const handleDeleteProject = (id: string) => {
    setSavedProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleCutChecked = (id: string) => {
    setCheckedCutIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleStepDone = (stepNumber: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((x) => x !== stepNumber)
        : [...prev, stepNumber]
    );
  };

  const formatDim = (cm: number) =>
    previewUnit === 'cm' ? `${cm}` : `${Math.round(cm * 10)}`;

  const roomTabs: {
    id: TemplateRoomCategory;
    ar: string;
    en: string;
    count: number;
  }[] = [
    { id: 'all', ar: 'الكل', en: 'All', count: FURNITURE_TEMPLATES.length },
    {
      id: 'bedroom',
      ar: 'نوم',
      en: 'Bedroom',
      count: FURNITURE_TEMPLATES.filter((t) => t.room === 'bedroom').length,
    },
    {
      id: 'kitchen_dining',
      ar: 'مطبخ وسفرة',
      en: 'Kitchen',
      count: FURNITURE_TEMPLATES.filter((t) => t.room === 'kitchen_dining').length,
    },
    {
      id: 'living_office',
      ar: 'ليفينج ومكتب',
      en: 'Living',
      count: FURNITURE_TEMPLATES.filter((t) => t.room === 'living_office').length,
    },
  ];

  // Spacious 5-item primary nav (clean & uncrowded on 360px phones AND crisp on desktop!)
  const navItems: {
    id: 'designer' | 'photo' | 'room' | 'cutlist' | 'sheets';
    labelAr: string;
    labelEn: string;
    mobileAr: string;
    mobileEn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'designer',
      labelAr: 'المصمم 3D',
      labelEn: '3D Piece',
      mobileAr: 'المصمم',
      mobileEn: '3D',
      icon: Box,
    },
    {
      id: 'photo',
      labelAr: 'صمم من صورة',
      labelEn: 'From Photo',
      mobileAr: 'من صورة',
      mobileEn: 'Photo',
      icon: ImagePlus,
    },
    {
      id: 'room',
      labelAr: 'أوضة 3D',
      labelEn: 'Room 3D',
      mobileAr: 'أوضة 3D',
      mobileEn: 'Room',
      icon: Home,
    },
    {
      id: 'cutlist',
      labelAr: 'التقطيع والسعر',
      labelEn: 'Cut & Price',
      mobileAr: 'الحساب',
      mobileEn: 'Price',
      icon: Table2,
    },
    {
      id: 'sheets',
      labelAr: 'الألواح والورشة',
      labelEn: 'Sheets & Tools',
      mobileAr: 'الألواح',
      mobileEn: 'Sheets',
      icon: Grid2x2,
    },
  ];

  const isSheetsGroupActive =
    activeTab === 'sheets' || activeTab === 'guide' || activeTab === 'tools';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col bg-[#F8F7F4] dark:bg-[#111315] text-stone-900 dark:text-stone-100 transition-colors pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-10"
    >
      {/* Top Bar Contract: strictly 3 clean zones with Android Safe-Area top padding */}
      <header className="sticky top-0 z-40 pt-safe bg-white/95 dark:bg-[#191C20]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-[1380px] mx-auto h-14 sm:h-16 px-3.5 sm:px-6 flex items-center justify-between gap-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('designer')}
            className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <Ruler className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span dir="ltr" className="tracking-wide font-extrabold">BOLA WOOD 3D</span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Links (Desktop) */}
          <nav
            aria-label="Primary Carpentry Sections"
            className="hidden lg:flex items-center gap-6"
          >
            {navItems.map((item) => {
              const active =
                item.id === 'sheets'
                  ? isSheetsGroupActive
                  : activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    active
                      ? 'border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-400'
                      : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {isRtl ? item.labelAr : item.labelEn}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action CTA (Save when inside native APK; APK Export on web) */}
          <div className="flex items-center shrink-0">
            {isNativeApk ? (
              <button
                type="button"
                onClick={handleSaveCurrentProject}
                className="min-h-[38px] px-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {saveToast
                    ? isRtl
                      ? 'اتحفظت!'
                      : 'Saved!'
                    : isRtl
                    ? 'حفظ المقايسة'
                    : 'Save Job'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('apk')}
                className="min-h-[38px] px-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>{isRtl ? 'تطبيق APK' : 'Android APK'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Compact Single-Line Utility Strip */}
      <div className="max-w-[1380px] mx-auto w-full px-3.5 sm:px-6 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 min-w-0">
          <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
            {params.projectTitle || (isRtl ? template.nameAr : template.nameEn)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums font-semibold text-amber-800 dark:text-amber-400 whitespace-nowrap">
            {params.widthCm}×{params.heightCm}×{params.depthCm}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline-flex items-center gap-1 font-semibold whitespace-nowrap">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  {isRtl ? 'متصل' : 'Online'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-700 dark:text-amber-400">
                  {isRtl ? 'أوفلاين' : 'Offline'}
                </span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isInstalled && !isNativeApk && (isInstallable || isIOS) && (
            <button
              type="button"
              onClick={() => {
                if (isInstallable) void install();
                else setShowIOSGuide(true);
              }}
              className="min-h-[34px] px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRtl ? 'تثبيت أوفلاين' : 'Install'}</span>
            </button>
          )}

          {!isNativeApk && (
            <button
              type="button"
              onClick={handleSaveCurrentProject}
              className="min-h-[34px] px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#191C20] text-[11px] font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{saveToast ? (isRtl ? 'اتحفظت' : 'Saved') : isRtl ? 'حفظ' : 'Save'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="min-h-[34px] px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#191C20] text-[11px] font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1 whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>{locale === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="min-h-[34px] min-w-[34px] rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#191C20] text-stone-700 dark:text-stone-200 flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-[1380px] mx-auto w-full px-3.5 sm:px-6 pt-3 flex-1">
        {activeTab === 'designer' && (
          <div className="flex flex-col gap-5">
            {/* Compact 12-Design Catalog: Horizontal Swipeable Strip on Phones, Grid on Desktop */}
            <section aria-label="Furniture Templates" className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {isRtl ? 'اختار التصميم (12 موديل)' : 'Choose Design (12 Models)'}
                </h2>

                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-200/70 dark:bg-stone-800/80 overflow-x-auto no-scrollbar max-w-full">
                  {roomTabs.map((rt) => {
                    const active = roomFilter === rt.id;
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setRoomFilter(rt.id)}
                        className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                            : 'text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {isRtl ? rt.ar : rt.en} ({rt.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile: Compact Horizontal Swipeable Carousel | Desktop: Clean Multi-Col Grid */}
              <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2.5 overflow-x-auto md:overflow-visible snap-x snap-mandatory no-scrollbar pb-1">
                {filteredTemplates.map((tpl) => {
                  const selected = params.templateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`snap-start w-[124px] md:w-auto shrink-0 group rounded-2xl overflow-hidden border text-start transition-all bg-white dark:bg-[#191C20] ${
                        selected
                          ? 'border-amber-700 ring-2 ring-amber-700/20 dark:border-amber-400'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                        <img
                          src={tpl.imageUrl}
                          alt={isRtl ? tpl.nameAr : tpl.nameEn}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {isRtl ? tpl.nameAr : tpl.nameEn}
                        </p>
                        <p className="hidden md:block text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {isRtl ? tpl.subtitleAr : tpl.subtitleEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Primary Split Workbench: 3D Stage FIRST on Phones, Side-by-Side on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-[410px_1fr] gap-5 items-start">
              {/* Visual Stage (Order 1 on Mobile so 3D is Immediately Visible!) */}
              <div className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/70 dark:bg-stone-800/80 overflow-x-auto no-scrollbar w-full sm:w-auto">
                    {(
                      [
                        { id: '3d', ar: 'مجسم 3D', en: '3D View', icon: Box },
                        { id: 'blueprint', ar: 'رسم هندسي', en: '2D Plan', icon: Compass },
                        { id: 'photo', ar: 'صورة واقعية', en: 'Photo', icon: ImageIcon },
                      ] as const
                    ).map((mode) => {
                      const Icon = mode.icon;
                      const active = viewerMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setViewerMode(mode.id)}
                          className={`flex-1 sm:flex-initial min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                              : 'text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{isRtl ? mode.ar : mode.en}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="hidden sm:inline text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                    {isRtl
                      ? `الوتر للزاوية 90°: ${calc.diagonalCheckCm} سنتي`
                      : `90° Diagonal: ${calc.diagonalCheckCm} cm`}
                  </span>
                </div>

                {viewerMode === '3d' && (
                  <ThreeDFurnitureViewport
                    params={params}
                    locale={locale}
                    theme={theme}
                    sheetPriceEgp={pricing.sheetPriceEgp}
                    currencyLabel={currencyLabel}
                  />
                )}

                {viewerMode === 'blueprint' && (
                  <Blueprint2DSVG params={params} locale={locale} />
                )}

                {viewerMode === 'photo' && (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 aspect-[4/3] max-h-[460px] w-full">
                    <img
                      src={template.imageUrl}
                      alt={isRtl ? template.nameAr : template.nameEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-sm sm:text-base font-bold">
                          {isRtl ? template.nameAr : template.nameEn}
                        </p>
                        <p className="text-xs text-stone-200 mt-0.5">
                          {isRtl ? wood.descriptionAr : wood.descriptionEn}
                        </p>
                      </div>
                      <span dir="ltr" className="font-mono text-xs font-bold">
                        {params.widthCm} × {params.heightCm} × {params.depthCm} cm
                      </span>
                    </div>
                  </div>
                )}

                {/* 4-Column Live Engineering & Cost KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSheetsSubTab('sheets');
                      setActiveTab('sheets');
                    }}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] hover:border-amber-600 p-3 text-start transition-colors"
                  >
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {isRtl ? 'الألواح 122×244' : 'Sheets'}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400 mt-0.5">
                      {calc.sheets.mainSheets.length}{' '}
                      <span className="text-xs font-sans font-semibold text-stone-600 dark:text-stone-300">
                        {isRtl ? 'لوح' : 'pcs'}
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5 font-mono tabular-nums truncate">
                      {costSummary.mainSheetsCost.toLocaleString()} {currencyLabel}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSheetsSubTab('sheets');
                      setActiveTab('sheets');
                    }}
                    className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-start transition-colors"
                  >
                    <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                      {isRtl ? 'الهالك' : 'Waste'}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400 mt-0.5">
                      {calc.sheets.wastePct}%
                    </p>
                    <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 mt-0.5 font-mono tabular-nums truncate">
                      {costSummary.wasteCostEgp.toLocaleString()} {currencyLabel}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('cutlist')}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] hover:border-amber-600 p-3 text-start transition-colors"
                  >
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {isRtl ? 'الحتت والقشاط' : 'Pieces'}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100 mt-0.5">
                      {calc.totalPiecesCount}{' '}
                      <span className="text-xs font-sans font-semibold text-stone-600 dark:text-stone-300">
                        {isRtl ? 'حتة' : 'pcs'}
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5 font-mono tabular-nums truncate">
                      {calc.totalEdgeBandingMeters} {isRtl ? 'م شريط' : 'm PVC'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('cutlist')}
                    className="rounded-2xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 p-3 text-start transition-colors"
                  >
                    <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                      {isRtl ? 'سعر التسليم' : 'Client Quote'}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-800 dark:text-amber-400 mt-0.5">
                      {costSummary.totalQuote.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-amber-800/85 dark:text-amber-300/85 mt-0.5 font-mono tabular-nums truncate">
                      {currencyLabel}
                    </p>
                  </button>
                </div>

                {/* Individual Pieces Preview */}
                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-3.5 sm:p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100">
                      <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <span>
                        {isRtl
                          ? `مقاس كل حتة لوحدها (${egQtyPieces(calc.totalPiecesCount)})`
                          : `Every Piece (${calc.totalPiecesCount} pcs)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <div className="flex items-center rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPreviewUnit('cm')}
                          className={`px-2.5 py-1 text-[11px] ${
                            previewUnit === 'cm'
                              ? 'bg-amber-700 text-white'
                              : 'text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {isRtl ? 'سنتي' : 'cm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewUnit('mm')}
                          className={`px-2.5 py-1 text-[11px] ${
                            previewUnit === 'mm'
                              ? 'bg-amber-700 text-white'
                              : 'text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {isRtl ? 'مللي' : 'mm'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('cutlist')}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-amber-800 dark:text-amber-400 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'زود حتة' : 'Add'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {calc.pieces.map((p) => {
                      const pieceAreaM2 = (p.lengthCm * p.widthCm) / 10000;
                      const rate =
                        p.materialKind === 'back' ? pricePerM2Back : pricePerM2Main;
                      const rowCost = Math.round(pieceAreaM2 * p.qty * rate);
                      const edgeText = isRtl
                        ? egEdgeBandingText(
                            p.edgeBanding.longSides,
                            p.edgeBanding.shortSides
                          )
                        : `${p.edgeBanding.longSides}L+${p.edgeBanding.shortSides}W`;

                      return (
                        <div
                          key={p.id}
                          className="rounded-xl bg-stone-50 dark:bg-[#111315] border border-stone-200/80 dark:border-stone-800 px-3 py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                {p.code}
                              </span>
                              <span className="font-bold text-stone-800 dark:text-stone-100 truncate">
                                {isRtl ? p.nameAr : p.nameEn}
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                              {isRtl
                                ? `${egThickness(p.thicknessMm)} · ${edgeText}`
                                : `${p.thicknessMm}mm · ${edgeText}`}
                            </span>
                          </div>

                          <div className="text-end shrink-0 flex flex-col items-end">
                            <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {isRtl
                                ? `${egDim(p.lengthCm, previewUnit)} × ${egDim(
                                    p.widthCm,
                                    previewUnit
                                  )} (${egQtyPieces(p.qty)})`
                                : `${formatDim(p.lengthCm)}×${formatDim(p.widthCm)} (×${p.qty})`}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              {rowCost.toLocaleString()} {currencyLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Manual Dimensions, Wood Sheet Price & Structural Controls Panel */}
              <section className="order-2 lg:order-1 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-4">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    {isRtl
                      ? 'المقاسات والأسعار (إدخال يدوي مبسط)'
                      : 'Simple Manual Dimensions & Prices'}
                  </h1>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {isRtl
                      ? 'اضغط على أي خانة واكتب الرقم بإيدك مباشرة (عربي أو إنجليزي)'
                      : 'Tap any box and type your number directly'}
                  </p>
                </div>

                {/* 1. Primary 3 Dimensions — Ultra-Simple 3-Column Direct Input Row */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800 dark:text-stone-100">
                      {isRtl ? '1. المقاسات الأساسية (بالسنتي)' : '1. Main Dimensions (cm)'}
                    </span>
                    {isRtl && (
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                        {egBoxDims(params.widthCm, params.heightCm, params.depthCm)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {(
                      [
                        {
                          key: 'widthCm',
                          labelAr:
                            params.templateId === 'bed'
                              ? 'العرض'
                              : params.templateId === 'table' || params.templateId === 'desk'
                              ? 'الطول'
                              : 'العرض',
                          labelEn: 'Width',
                          min: 20,
                          max: 600,
                        },
                        {
                          key: 'heightCm',
                          labelAr: 'الارتفاع',
                          labelEn: 'Height',
                          min: 20,
                          max: 400,
                        },
                        {
                          key: 'depthCm',
                          labelAr:
                            params.templateId === 'bed'
                              ? 'الطول'
                              : params.templateId === 'table'
                              ? 'العرض'
                              : 'العمق',
                          labelEn: 'Depth',
                          min: 15,
                          max: 300,
                        },
                      ] as const
                    ).map((dim) => (
                      <div key={dim.key} className="flex items-center justify-between gap-2.5">
                        <label
                          htmlFor={`dim-${dim.key}`}
                          className="text-xs font-bold text-stone-700 dark:text-stone-200 w-20 shrink-0"
                        >
                          {isRtl ? dim.labelAr : dim.labelEn}
                        </label>
                        <ManualNumberInput
                          id={`dim-${dim.key}`}
                          value={params[dim.key]}
                          onChange={(v) =>
                            setParams((prev) => ({ ...prev, [dim.key]: v }))
                          }
                          min={dim.min}
                          max={dim.max}
                          step={5}
                          unit={isRtl ? 'سم' : 'cm'}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Internal Structure + Board Thickness — Clean Compact Grid */}
                <div className="flex flex-col gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-100">
                    {isRtl ? '2. التقسيمة وتخانة الخشب' : '2. Layout & Thickness'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {template.supportsDoors && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                          {isRtl ? 'الضلف' : 'Doors'}
                        </span>
                        <ManualNumberInput
                          value={params.doorsCount}
                          onChange={(v) =>
                            setParams((prev) => ({ ...prev, doorsCount: v }))
                          }
                          min={0}
                          max={12}
                          emptyAsZero
                        />
                      </div>
                    )}
                    {template.supportsShelves && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                          {params.templateId === 'bed'
                            ? isRtl
                              ? 'المولل'
                              : 'Slats'
                            : isRtl
                            ? 'الرفوف'
                            : 'Shelves'}
                        </span>
                        <ManualNumberInput
                          value={params.shelvesCount}
                          onChange={(v) =>
                            setParams((prev) => ({ ...prev, shelvesCount: v }))
                          }
                          min={0}
                          max={20}
                          emptyAsZero
                        />
                      </div>
                    )}
                    {template.supportsDrawers && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                          {isRtl ? 'الأدراج' : 'Drawers'}
                        </span>
                        <ManualNumberInput
                          value={params.drawersCount}
                          onChange={(v) =>
                            setParams((prev) => ({ ...prev, drawersCount: v }))
                          }
                          min={0}
                          max={14}
                          emptyAsZero
                        />
                      </div>
                    )}
                    {template.supportsDividers && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                          {params.templateId === 'bed'
                            ? isRtl
                              ? 'كمرة وسطى'
                              : 'Center Beam'
                            : isRtl
                            ? 'القواطيع'
                            : 'Dividers'}
                        </span>
                        <ManualNumberInput
                          value={params.dividersCount}
                          onChange={(v) =>
                            setParams((prev) => ({ ...prev, dividersCount: v }))
                          }
                          min={0}
                          max={8}
                          emptyAsZero
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {isRtl ? 'تخانة اللوح' : 'Thickness'}
                      </span>
                      <ManualNumberInput
                        value={params.boardThicknessMm}
                        onChange={(v) =>
                          setParams((prev) => ({ ...prev, boardThicknessMm: v }))
                        }
                        min={6}
                        max={60}
                        unit={isRtl ? 'مللي' : 'mm'}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. ALL Prices in One Simple Manual Box */}
                <div className="rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 dark:text-amber-200">
                      {isRtl ? '3. كل الأسعار (اكتب بإيدك)' : '3. All Prices (Manual)'}
                    </span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                      {costSummary.totalQuote.toLocaleString()} {currencyLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="designer-sheet-price"
                        className="text-[11px] font-bold text-stone-700 dark:text-stone-300"
                      >
                        {isRtl ? `لوح الخشب (${currencyLabel})` : `Wood Sheet (${currencyLabel})`}
                      </label>
                      <ManualNumberInput
                        id="designer-sheet-price"
                        value={pricing.sheetPriceEgp}
                        onChange={handleManualSheetPriceChange}
                        min={0}
                        max={100000}
                        step={50}
                        emptyAsZero
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        {isRtl ? `لوح الظهر (${currencyLabel})` : `Back Sheet (${currencyLabel})`}
                      </span>
                      <ManualNumberInput
                        value={pricing.backSheetPriceEgp}
                        onChange={(v) => handleUpdatePricing({ backSheetPriceEgp: v })}
                        min={0}
                        max={50000}
                        step={25}
                        emptyAsZero
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        {isRtl ? `متر الشريط (${currencyLabel})` : `Edge / m (${currencyLabel})`}
                      </span>
                      <ManualNumberInput
                        value={pricing.edgeBandingPricePerMeterEgp}
                        onChange={(v) =>
                          handleUpdatePricing({ edgeBandingPricePerMeterEgp: v })
                        }
                        min={0}
                        max={2000}
                        step={2}
                        emptyAsZero
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        {isRtl ? `الدهان (${currencyLabel})` : `Paint (${currencyLabel})`}
                      </span>
                      <ManualNumberInput
                        value={pricing.finishingFixedEgp}
                        onChange={(v) => handleUpdatePricing({ finishingFixedEgp: v })}
                        min={0}
                        max={100000}
                        step={50}
                        emptyAsZero
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        {isRtl ? 'نسبة المصنعية والربح (%)' : 'Labor & Profit (%)'}
                      </span>
                      <ManualNumberInput
                        value={pricing.laborAndProfitPct}
                        onChange={(v) => handleUpdatePricing({ laborAndProfitPct: v })}
                        min={0}
                        max={300}
                        step={5}
                        emptyAsZero
                        unit="%"
                      />
                    </div>
                  </div>

                  {/* Expandable Hardware Unit Prices right inside the same simplified box */}
                  <button
                    type="button"
                    onClick={() => setShowHardwarePrices((s) => !s)}
                    className="min-h-[38px] px-3 rounded-lg border border-amber-300/80 dark:border-amber-800 bg-white dark:bg-[#111315] text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center justify-between"
                  >
                    <span>
                      {isRtl
                        ? `أسعار المفصلات والإكسسوارات (${calc.hardware.length} بنود)`
                        : `Hardware Unit Prices (${calc.hardware.length} items)`}
                    </span>
                    {showHardwarePrices ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {showHardwarePrices && (
                    <div className="flex flex-col gap-2 pt-1">
                      {calc.hardware.map((hw) => {
                        const unitPrice =
                          pricing.hardwarePriceOverrides?.[hw.id] ?? hw.unitPriceEgp;
                        return (
                          <div
                            key={hw.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 truncate flex-1">
                              {isRtl ? hw.nameAr : hw.nameEn} ({hw.qty})
                            </span>
                            <ManualNumberInput
                              value={unitPrice}
                              onChange={(v) =>
                                handleUpdatePricing({
                                  hardwarePriceOverrides: {
                                    ...(pricing.hardwarePriceOverrides ?? {}),
                                    [hw.id]: v,
                                  },
                                })
                              }
                              min={0}
                              max={20000}
                              step={5}
                              emptyAsZero
                              className="w-36 shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {calc.sheets.sheetsSavedIfRotated > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setParams((prev) => ({ ...prev, allowGrainRotation: true }))
                      }
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isRtl
                          ? `وفر ${calc.sheets.sheetsSavedIfRotated} لوح (${(
                              calc.sheets.sheetsSavedIfRotated * pricing.sheetPriceEgp
                            ).toLocaleString()} ${currencyLabel}) بتدوير 90°`
                          : `Save ${calc.sheets.sheetsSavedIfRotated} sheet(s) with 90° rotation`}
                      </span>
                    </button>
                  )}
                </div>

                {/* 4. Wood Color / Type Selector (Clean Swatches Only — No Hardcoded Prices) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
                    {isRtl ? '4. نوع ولون الخشب' : '4. Wood Finish'}
                  </span>

                  <div className="grid grid-cols-2 gap-1.5">
                    {WOOD_MATERIALS.map((w) => {
                      const active = params.woodType === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleSelectWood(w.id)}
                          className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-start flex items-center gap-2 transition-colors ${
                            active
                              ? 'border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-400'
                              : 'border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded border border-black/15 shrink-0"
                            style={{ backgroundColor: w.baseHex }}
                          />
                          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 leading-tight truncate">
                            {isRtl ? w.nameAr.split('(')[0] : w.nameEn.split('(')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expandable Extra Workshop Details */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedManual((s) => !s)}
                    className="min-h-[40px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center justify-between mt-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>
                        {isRtl
                          ? 'إعدادات دقيقة (الوزرة، الظهر، المنشار، العميل)'
                          : 'Extra Details (Plinth, Back, Kerf, Client)'}
                      </span>
                    </span>
                    {showAdvancedManual ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {showAdvancedManual && (
                    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#111315] p-3 flex flex-col gap-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {isRtl ? 'الوزرة (سم)' : 'Plinth'}
                          </span>
                          <ManualNumberInput
                            value={params.plinthHeightCm}
                            onChange={(v) =>
                              setParams((prev) => ({ ...prev, plinthHeightCm: v }))
                            }
                            min={0}
                            max={40}
                            emptyAsZero
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {isRtl ? 'المنشار (مم)' : 'Kerf'}
                          </span>
                          <ManualNumberInput
                            value={params.kerfMm}
                            onChange={(v) =>
                              setParams((prev) => ({ ...prev, kerfMm: v }))
                            }
                            min={0}
                            max={10}
                            emptyAsZero
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {isRtl ? 'الظهر (مم)' : 'Back'}
                          </span>
                          <ManualNumberInput
                            value={params.backThicknessMm}
                            onChange={(v) =>
                              setParams((prev) => ({ ...prev, backThicknessMm: v }))
                            }
                            min={3}
                            max={18}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              includeBackPanel: !prev.includeBackPanel,
                            }))
                          }
                          className={`min-h-[40px] px-3 rounded-xl border font-bold text-xs shrink-0 ${
                            params.includeBackPanel
                              ? 'border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300'
                              : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          {params.includeBackPanel
                            ? isRtl
                              ? 'بظهر أبلكاش ✓'
                              : 'Back ON'
                            : isRtl
                            ? 'بدون ظهر'
                            : 'No Back'}
                        </button>

                        <input
                          type="text"
                          value={params.clientName}
                          onChange={(e) =>
                            setParams((prev) => ({
                              ...prev,
                              clientName: e.target.value,
                            }))
                          }
                          placeholder={isRtl ? 'اسم العميل (اختياري)' : 'Client name'}
                          className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#191C20] text-stone-900 dark:text-stone-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'photo' && (
          <PhotoToDesignView
            locale={locale}
            isOnline={isOnline}
            sheetPriceEgp={pricing.sheetPriceEgp}
            currencyLabel={currencyLabel}
            onUpdateSheetPrice={handleManualSheetPriceChange}
            onApplyTo3D={handleOpenRoomPieceInDesigner}
          />
        )}

        {activeTab === 'room' && (
          <RoomSpaceDesignerView
            locale={locale}
            theme={theme}
            woodType={params.woodType}
            sheetPriceEgp={pricing.sheetPriceEgp}
            currencyLabel={currencyLabel}
            onSelectWood={handleSelectWood}
            onUpdateSheetPrice={handleManualSheetPriceChange}
            onOpenPieceInDesigner={handleOpenRoomPieceInDesigner}
          />
        )}

        {activeTab === 'cutlist' && (
          <CutListAndCostView
            params={params}
            calc={calc}
            pricing={pricing}
            currencyLabel={currencyLabel}
            onUpdatePricing={handleUpdatePricing}
            checkedCutIds={checkedCutIds}
            onToggleCutChecked={toggleCutChecked}
            onAddCustomPiece={handleAddCustomPiece}
            onRemoveCustomPiece={handleRemoveCustomPiece}
            locale={locale}
          />
        )}

        {isSheetsGroupActive && (
          <div className="flex flex-col gap-4">
            {/* Clean 3-Way Sub-Switcher: Sheets Map | Assembly Guide | Workshop Tools & Saved */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/70 dark:bg-stone-800/80 overflow-x-auto no-scrollbar w-full sm:w-fit">
              <button
                type="button"
                onClick={() => setSheetsSubTab('sheets')}
                className={`flex-1 sm:flex-initial min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  sheetsSubTab === 'sheets'
                    ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Grid2x2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isRtl ? 'الألواح والهالك' : 'Sheets & Waste'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetsSubTab('guide')}
                className={`flex-1 sm:flex-initial min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  sheetsSubTab === 'guide'
                    ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Hammer className="w-3.5 h-3.5 shrink-0" />
                <span>{isRtl ? 'خطوات التركيب' : 'Assembly Guide'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetsSubTab('tools')}
                className={`flex-1 sm:flex-initial min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  sheetsSubTab === 'tools'
                    ? 'bg-white dark:bg-[#191C20] text-amber-800 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isRtl
                    ? `الورشة (${savedProjects.length})`
                    : `Tools (${savedProjects.length})`}
                </span>
              </button>
            </div>

            {sheetsSubTab === 'sheets' && (
              <SheetOptimizerView
                params={params}
                calc={calc}
                sheetPriceEgp={pricing.sheetPriceEgp}
                onToggleGrainRotation={() =>
                  setParams((prev) => ({
                    ...prev,
                    allowGrainRotation: !prev.allowGrainRotation,
                  }))
                }
                locale={locale}
              />
            )}

            {sheetsSubTab === 'guide' && (
              <AssemblyGuideView
                params={params}
                calc={calc}
                completedSteps={completedSteps}
                onToggleStep={toggleStepDone}
                locale={locale}
              />
            )}

            {sheetsSubTab === 'tools' && (
              <WorkshopToolsView
                locale={locale}
                savedProjects={savedProjects}
                onSaveCurrentProject={handleSaveCurrentProject}
                onLoadProject={handleLoadProject}
                onDeleteProject={handleDeleteProject}
              />
            )}
          </div>
        )}

        {activeTab === 'apk' && <ApkExportView locale={locale} />}
      </main>

      {/* iOS Safari Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-700 p-6 shadow-xl">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl ? 'تثبيت البرنامج على iPhone / iPad' : 'Install on iOS'}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {isRtl
                ? '1. اضغط على زر المشاركة (Share) أسفل متصفح Safari.\n2. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).'
                : '1. Tap Share in Safari.\n2. Select "Add to Home Screen".'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-amber-700 text-white text-xs font-bold"
            >
              {isRtl ? 'حسناً' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {/* Spacious 5-Tab Mobile Bottom Navigation Bar with Safe-Area Bottom Padding */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-white/95 dark:bg-[#191C20]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800"
      >
        <div className="h-16 grid grid-cols-5 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === 'sheets' ? isSheetsGroupActive : activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-amber-700 dark:text-amber-400 font-bold'
                    : 'text-stone-500 dark:text-stone-400 font-medium'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[11px] leading-none whitespace-nowrap">
                  {isRtl ? item.mobileAr : item.mobileEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
