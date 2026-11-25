import { WOOD_MATERIALS } from './catalog';
import { WoodTypeId } from './types';

export interface LocalWoodPricesSnapshot {
  currency: string;
  prices: Record<WoodTypeId, number> & {
    backSheet6mm: number;
    edgeBandingPerMeter: number;
  };
  updatedAt: string;
}

const CACHE_KEY = 'ostanagar_manual_wood_prices_v2';

export function getDefaultManualPrices(): LocalWoodPricesSnapshot {
  const prices = {
    oak18: WOOD_MATERIALS.find((w) => w.id === 'oak18')?.sheetPriceEgp ?? 1950,
    walnut18: WOOD_MATERIALS.find((w) => w.id === 'walnut18')?.sheetPriceEgp ?? 2250,
    counter18: WOOD_MATERIALS.find((w) => w.id === 'counter18')?.sheetPriceEgp ?? 1650,
    mdf18: WOOD_MATERIALS.find((w) => w.id === 'mdf18')?.sheetPriceEgp ?? 1350,
    beech22: WOOD_MATERIALS.find((w) => w.id === 'beech22')?.sheetPriceEgp ?? 2850,
    pine22: WOOD_MATERIALS.find((w) => w.id === 'pine22')?.sheetPriceEgp ?? 1450,
    backSheet6mm: 580,
    edgeBandingPerMeter: 18,
  };

  return {
    currency: 'EGP',
    prices,
    updatedAt: '',
  };
}

export function loadCachedWoodPrices(): LocalWoodPricesSnapshot {
  try {
    const raw =
      localStorage.getItem(CACHE_KEY) ||
      localStorage.getItem('ostanagar_live_wood_prices_v1');
    if (!raw) return getDefaultManualPrices();
    const parsed = JSON.parse(raw) as Partial<LocalWoodPricesSnapshot>;
    if (!parsed || !parsed.prices || typeof parsed.prices.oak18 !== 'number') {
      return getDefaultManualPrices();
    }
    return {
      currency: 'EGP',
      prices: {
        ...getDefaultManualPrices().prices,
        ...parsed.prices,
      },
      updatedAt: parsed.updatedAt ?? '',
    };
  } catch {
    return getDefaultManualPrices();
  }
}

export function saveCachedWoodPrices(snapshot: LocalWoodPricesSnapshot): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota errors
  }
}

export function updateManualWoodPrice(
  current: LocalWoodPricesSnapshot,
  woodId: WoodTypeId | 'backSheet6mm' | 'edgeBandingPerMeter',
  newPrice: number
): LocalWoodPricesSnapshot {
  const safePrice = Math.max(0, Math.round(newPrice));
  const updated: LocalWoodPricesSnapshot = {
    ...current,
    prices: {
      ...current.prices,
      [woodId]: safePrice,
    },
    updatedAt: new Date().toISOString(),
  };
  saveCachedWoodPrices(updated);
  return updated;
}
