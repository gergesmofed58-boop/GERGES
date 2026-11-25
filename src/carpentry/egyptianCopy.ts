/**
 * Egyptian Colloquial Carpentry Measurements & Formatting Helpers
 * Writes every measurement naturally the way Egyptian carpenters speak in the workshop.
 */

export function formatEgyptianNumber(cm: number): string {
  const clean = Math.round(cm * 10) / 10;
  return Number.isInteger(clean) ? String(clean) : clean.toFixed(1);
}

/**
 * Formats a single dimension in Egyptian colloquial Arabic:
 * e.g. 180 -> "180 سنتي", or in mm mode -> "1800 مللي"
 */
export function egDim(cm: number, unit: 'cm' | 'mm' = 'cm'): string {
  if (unit === 'mm') {
    return `${Math.round(cm * 10)} مللي`;
  }
  return `${formatEgyptianNumber(cm)} سنتي`;
}

/**
 * Converts a cm measurement into natural spoken Egyptian carpenter phrasing:
 * 100 -> "متر بالظبط"
 * 180 -> "متر و80 سنتي"
 * 200 -> "مترين بالظبط"
 * 220 -> "مترين و20 سنتي"
 * 340 -> "3 متر و40 سنتي"
 * 60  -> "60 سنتي"
 */
export function egSpokenLength(cm: number): string {
  const rounded = Math.round(cm * 10) / 10;
  if (rounded < 100) {
    return `${formatEgyptianNumber(rounded)} سنتي`;
  }
  const meters = Math.floor(rounded / 100);
  const rem = Math.round((rounded - meters * 100) * 10) / 10;

  let meterWord = '';
  if (meters === 1) meterWord = 'متر';
  else if (meters === 2) meterWord = 'مترين';
  else meterWord = `${meters} متر`;

  if (rem === 0) {
    return `${meterWord} بالظبط`;
  }
  return `${meterWord} و${formatEgyptianNumber(rem)} سنتي`;
}

/**
 * Compact Egyptian measurement with spoken helper for key dimension inputs:
 * e.g. 180 -> "180 سنتي (متر و80)"
 */
export function egDimWithSpoken(cm: number): string {
  if (cm < 100) return `${formatEgyptianNumber(cm)} سنتي`;
  return `${formatEgyptianNumber(cm)} سنتي (${egSpokenLength(cm)})`;
}

/**
 * Full 3D box dimensions in Egyptian colloquial:
 * e.g. "عرض 180 سنتي × ارتفاع 220 سنتي × عمق 60 سنتي"
 */
export function egBoxDims(widthCm: number, heightCm: number, depthCm: number): string {
  return `عرض ${formatEgyptianNumber(widthCm)} سنتي × ارتفاع ${formatEgyptianNumber(
    heightCm
  )} سنتي × عمق ${formatEgyptianNumber(depthCm)} سنتي`;
}

/**
 * Compact 2D board dimensions in Egyptian colloquial:
 * e.g. "طول 220 سنتي × عرض 60 سنتي"
 */
export function egBoardDims(
  lengthCm: number,
  widthCm: number,
  unit: 'cm' | 'mm' = 'cm'
): string {
  if (unit === 'mm') {
    return `${Math.round(lengthCm * 10)} × ${Math.round(widthCm * 10)} مللي`;
  }
  return `${formatEgyptianNumber(lengthCm)} × ${formatEgyptianNumber(widthCm)} سنتي`;
}

export function egThickness(mm: number): string {
  return `تخانة ${mm} مللي`;
}

export function egEdgeBandingText(longSides: number, shortSides: number): string {
  if (longSides === 0 && shortSides === 0) return 'من غير شريط حرف';
  if (longSides === 2 && shortSides === 2) return 'شريط حرف 4 جوانب داير ما يدور';
  const parts: string[] = [];
  if (longSides === 1) parts.push('حرف واحد طويل');
  else if (longSides === 2) parts.push('حرفين طوال');
  if (shortSides === 1) parts.push('حرف واحد قصير');
  else if (shortSides === 2) parts.push('حرفين قصيرين');
  return `شريط ${parts.join(' + ')}`;
}

export function egQtyPieces(qty: number): string {
  if (qty === 1) return 'حتة واحدة';
  if (qty === 2) return 'حتتين';
  if (qty <= 10) return `${qty} حتت`;
  return `${qty} حتة`;
}

export function egQtySheets(qty: number): string {
  if (qty === 1) return 'لوح واحد';
  if (qty === 2) return 'لوحين';
  if (qty <= 10) return `${qty} ألواح`;
  return `${qty} لوح`;
}
