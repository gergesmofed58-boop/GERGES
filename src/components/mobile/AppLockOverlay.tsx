import React, { useState } from 'react';
import { Fingerprint, Lock } from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';

interface Props {
  store: NetPulseStore;
}

export const AppLockOverlay: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === store.appLock.pin) {
      setError(false);
      setPinInput('');
      store.setIsAppLocked(false);
    } else {
      setError(true);
    }
  };

  const handleBiometricUnlock = () => {
    setError(false);
    setPinInput('');
    store.setIsAppLocked(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-50/98 dark:bg-[#0B1120]/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-teal-600/10 dark:bg-teal-400/10 border border-teal-600/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
        <Lock className="w-7 h-7" />
      </div>

      <div className="flex flex-col gap-1 max-w-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {t.lockedScreenTitle}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.lockedScreenSubtitle}
        </p>
      </div>

      <form
        onSubmit={handleVerifyPin}
        className="w-full max-w-[240px] flex flex-col gap-3"
      >
        <input
          type="password"
          dir="ltr"
          inputMode="numeric"
          maxLength={4}
          value={pinInput}
          onChange={(e) => {
            setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError(false);
          }}
          placeholder="••••"
          className="h-12 text-center tracking-[0.6em] font-mono text-lg font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
        />
        {error && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            {t.wrongPin}
          </p>
        )}
        <button
          type="submit"
          className="h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
        >
          {t.unlockBtn}
        </button>
      </form>

      {store.appLock.biometricEnabled && (
        <button
          type="button"
          onClick={handleBiometricUnlock}
          className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Fingerprint className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>{t.unlockBiometric}</span>
        </button>
      )}

      <p className="text-[11px] font-mono text-slate-400">
        PIN: {store.appLock.pin}
      </p>
    </div>
  );
};
