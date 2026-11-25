import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Eye, EyeOff, QrCode } from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';

interface Props {
  store: NetPulseStore;
}

export const WifiQrCard: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const [target, setTarget] = useState<'main' | 'guest'>('main');
  const [showPwd, setShowPwd] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const ssid =
    target === 'main' ? store.mainWifi.ssid : store.guestWifi.ssid;
  const password =
    target === 'main' ? store.mainWifi.password : store.guestWifi.password;
  const hidden = target === 'main' ? store.mainWifi.hiddenSsid : false;

  useEffect(() => {
    const escapedSsid = ssid.replace(/([\\;,:"])/g, '\\$1');
    const escapedPwd = password.replace(/([\\;,:"])/g, '\\$1');
    const payload = `WIFI:T:WPA;S:${escapedSsid};P:${escapedPwd};H:${hidden ? 'true' : 'false'};;`;
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [ssid, password, hidden]);

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
          <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>{t.qrShareTitle}</span>
        </div>
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTarget('main')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
              target === 'main'
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t.qrMainTab}
          </button>
          <button
            type="button"
            onClick={() => setTarget('guest')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
              target === 'guest'
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t.qrGuestTab}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
        {qrDataUrl ? (
          <div className="p-2 rounded-xl bg-white border border-slate-200">
            <img
              src={qrDataUrl}
              alt={`Wi-Fi QR for ${ssid}`}
              className="w-40 h-40 block"
            />
          </div>
        ) : (
          <div className="w-40 h-40 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xs text-slate-400">
            QR
          </div>
        )}

        <div className="text-center">
          <p
            dir="ltr"
            className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100"
          >
            {ssid}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t.qrScanHint}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPwd((v) => !v)}
          className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
        >
          {showPwd ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          <span>
            {showPwd ? (
              <span dir="ltr" className="font-mono">
                {password}
              </span>
            ) : (
              t.qrShowPassword
            )}
          </span>
        </button>
      </div>
    </div>
  );
};
