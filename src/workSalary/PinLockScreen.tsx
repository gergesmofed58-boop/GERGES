import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';

interface PinLockScreenProps {
  expectedPin: string;
  onUnlock: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  expectedPin,
  onUnlock,
}) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      if (next === expectedPin) {
        onUnlock();
      } else {
        setError(true);
        window.setTimeout(() => {
          setEntered('');
        }, 380);
      }
    }
  };

  const handleBackspace = () => {
    setEntered((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xs rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            شغلي ومرتبي
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            أدخل الرقم السري المكوّن من 4 أرقام لفتح التطبيق
          </p>
        </div>

        {/* 4-dot PIN indicator */}
        <div className="flex items-center justify-center gap-3.5 py-1" dir="ltr">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < entered.length;
            return (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                  error
                    ? 'border-rose-500 bg-rose-500'
                    : filled
                    ? 'border-emerald-700 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 -mt-2">
            الرقم السري غير صحيح — جرّب تاني
          </p>
        )}

        {/* Touch Keypad */}
        <div className="grid grid-cols-3 gap-2.5" dir="ltr">
          {KEYS.map((key, idx) => {
            if (key === '') {
              return <div key={`spacer-${idx}`} />;
            }
            if (key === 'back') {
              return (
                <button
                  key="back"
                  type="button"
                  onClick={handleBackspace}
                  aria-label="مسح رقم"
                  className="min-h-[54px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                className="min-h-[54px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 text-lg font-mono font-bold text-slate-900 dark:text-slate-100 transition-all"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
