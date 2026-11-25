import React, { useEffect, useRef, useState } from 'react';

/**
 * Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits and Arabic decimal separators
 * into standard ASCII numeric characters so Arabic mobile keyboards work effortlessly.
 */
export function normalizeNumericInput(raw: string): string {
  const arabicMap: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    '٫': '.',
    ',': '.',
  };
  return raw.replace(/[٠-٩۰-۹٫,]/g, (ch) => arabicMap[ch] ?? ch);
}

interface ManualNumberInputProps {
  id?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  emptyAsZero?: boolean;
  unit?: string;
  showSteppers?: boolean;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

/**
 * Phone-first manual numeric input with built-in (− / +) steppers inside every box:
 * - Always provides direct typing (English 0-9 & Arabic ٠-٩) AND one-tap (− / +) adjustment.
 * - Never snaps back while deleting/typing digits.
 * - Auto-selects on tap so replacing a value takes 1 tap.
 * - Gently clamps to [min, max] on blur or Enter.
 */
export const ManualNumberInput: React.FC<ManualNumberInputProps> = ({
  id,
  value,
  onChange,
  min = 0,
  max = 1000000,
  step = 1,
  allowDecimal = false,
  emptyAsZero = false,
  unit,
  showSteppers = true,
  ariaLabel,
  className = '',
  inputClassName = '',
  placeholder,
}) => {
  const [draft, setDraft] = useState<string>(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const clampAndRound = (num: number): number => {
    const clamped = Math.max(min, Math.min(max, num));
    return allowDecimal ? Math.round(clamped * 100) / 100 : Math.round(clamped);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeNumericInput(e.target.value);
    const cleaned = allowDecimal
      ? normalized.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
      : normalized.replace(/[^0-9]/g, '');

    setDraft(cleaned);

    if (cleaned === '' || cleaned === '.') {
      if (emptyAsZero && min === 0) {
        onChange(0);
      }
      return;
    }
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      onChange(allowDecimal ? Math.round(parsed * 100) / 100 : Math.round(parsed));
    }
  };

  const commitDraft = () => {
    focusedRef.current = false;
    const normalized = normalizeNumericInput(draft).trim();
    if (normalized === '' || normalized === '.') {
      if (emptyAsZero && min === 0) {
        onChange(0);
        setDraft('0');
        return;
      }
      setDraft(String(value));
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const finalVal = clampAndRound(parsed);
    onChange(finalVal);
    setDraft(String(finalVal));
  };

  const handleStep = (delta: number) => {
    const next = clampAndRound(value + delta);
    onChange(next);
    setDraft(String(next));
  };

  if (showSteppers) {
    return (
      <div
        dir="ltr"
        className={`flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#111315] p-1 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/20 ${className}`}
      >
        <button
          type="button"
          onClick={() => handleStep(-step)}
          disabled={value <= min}
          aria-label="نقص"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 active:scale-95 text-stone-800 dark:text-stone-100 font-bold text-base leading-none flex items-center justify-center disabled:opacity-35 transition-transform shrink-0 select-none"
        >
          −
        </button>

        <div className="flex-1 min-w-0 flex items-center justify-center gap-0.5 px-0.5">
          <input
            id={id}
            type="text"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            dir="ltr"
            aria-label={ariaLabel}
            placeholder={placeholder}
            value={draft}
            onFocus={(e) => {
              focusedRef.current = true;
              e.currentTarget.select();
            }}
            onChange={handleTextChange}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={`w-full min-w-[34px] h-8 bg-transparent text-center font-mono tabular-nums font-bold text-sm text-stone-900 dark:text-stone-100 focus:outline-none ${inputClassName}`}
          />
          {unit && (
            <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 shrink-0">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleStep(step)}
          disabled={value >= max}
          aria-label="زوّد"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 active:scale-95 text-amber-900 dark:text-amber-300 font-bold text-base leading-none flex items-center justify-center disabled:opacity-35 transition-transform shrink-0 select-none"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#111315] px-2.5 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/20 ${className}`}
    >
      <input
        id={id}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        dir="ltr"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        onFocus={(e) => {
          focusedRef.current = true;
          e.currentTarget.select();
        }}
        onChange={handleTextChange}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className={`w-full min-w-[48px] h-10 bg-transparent text-center font-mono tabular-nums font-bold text-sm text-stone-900 dark:text-stone-100 focus:outline-none ${inputClassName}`}
      />
      {unit && (
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 shrink-0">
          {unit}
        </span>
      )}
    </div>
  );
};
