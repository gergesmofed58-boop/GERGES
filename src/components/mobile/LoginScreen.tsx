import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Radar,
  Router,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { ROUTER_DRIVER_SPECS } from '../../data/routerDriversData';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';
import { RouterDriverType, RouterProfile } from '../../types/router';

interface Props {
  store: NetPulseStore;
}

export const LoginScreen: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const [gatewayIp, setGatewayIp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [driverType, setDriverType] = useState<RouterDriverType>('universal_auto');
  const [saveProfile, setSaveProfile] = useState(true);
  const [profileLabel, setProfileLabel] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedBanner, setDetectedBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAutoDetect = () => {
    setDetecting(true);
    setDetectedBanner(null);
    const candidates = ['192.168.88.1', '192.168.1.1', '192.168.0.1', '192.168.8.1'];
    const currentIdx = candidates.indexOf(gatewayIp);
    const picked = candidates[(currentIdx + 1) % candidates.length];
    window.setTimeout(() => {
      setGatewayIp(picked);
      setDetecting(false);
      setDetectedBanner(`${t.detectedMsg}: ${picked}`);
    }, 480);
  };

  const applySavedProfile = (profile: RouterProfile) => {
    setGatewayIp(profile.gatewayIp);
    setUsername(profile.username);
    setPassword('saved_secure_vault_pwd');
    setDriverType(profile.driverType);
    setProfileLabel(profile.label);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const resolvedIp = gatewayIp.trim() || '192.168.1.1';
    const resolvedUser = username.trim() || 'admin';
    const ok = await store.connectWithCredentials({
      gatewayIp: resolvedIp,
      username: resolvedUser,
      password,
      driverType,
      saveProfile,
      label: profileLabel,
    });
    if (!ok) {
      setErrorMsg(
        store.locale === 'ar'
          ? 'اكتب كلمة سر الراوتر (أو اضغط جرّب وضع التجربة تحت عشان تشوف كل المميزات).'
          : 'Please enter your router password (or tap Try Demo Mode below).'
      );
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 pb-8">
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <Wifi className="w-5 h-5" />
          <span className="text-xs font-bold">{t.brandName}</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.loginTitle}
        </h2>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t.loginSubtitle}
        </p>
      </div>

      {store.profiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {t.savedProfiles}
          </span>
          <div className="flex flex-wrap gap-2">
            {store.profiles.map((prof) => {
              const selected =
                gatewayIp === prof.gatewayIp && driverType === prof.driverType;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => applySavedProfile(prof)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors text-start whitespace-nowrap shrink-0 ${
                    selected
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-teal-500'
                  }`}
                >
                  <span>{prof.label}</span>
                  <span className="mx-1.5 opacity-60">·</span>
                  <span className="font-mono tabular-nums opacity-85">
                    {prof.gatewayIp}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t.gatewayIp}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={gatewayIp}
              onChange={(e) => setGatewayIp(e.target.value)}
              placeholder="192.168.1.1 / 192.168.88.1"
              className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-mono text-sm tabular-nums focus:outline-none focus:border-teal-600"
            />
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={detecting}
              className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Radar
                className={`w-4 h-4 text-teal-600 dark:text-teal-400 ${detecting ? 'animate-spin' : ''}`}
              />
              <span>{detecting ? t.detecting : t.autoDetect}</span>
            </button>
          </div>
          {detectedBanner && (
            <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">
              {detectedBanner}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Router className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.routerDriver}</span>
          </label>
          <select
            value={driverType}
            onChange={(e) => {
              const next = e.target.value as RouterDriverType;
              setDriverType(next);
              const spec = ROUTER_DRIVER_SPECS.find((s) => s.id === next);
              if (spec && !gatewayIp) setGatewayIp(spec.defaultGateway);
            }}
            className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:border-teal-600"
          >
            {ROUTER_DRIVER_SPECS.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {store.locale === 'ar' ? spec.nameAr : spec.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t.adminUsername}
          </label>
          <input
            type="text"
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-600"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t.adminPassword}
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3 pe-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-1.5 min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>{showPassword ? t.hidePassword : t.showPassword}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <input
            type="text"
            value={profileLabel}
            onChange={(e) => setProfileLabel(e.target.value)}
            placeholder={t.profileLabel}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-teal-600"
          />
          <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[36px]">
            <input
              type="checkbox"
              checked={saveProfile}
              onChange={(e) => setSaveProfile(e.target.checked)}
              className="w-4 h-4 rounded accent-teal-600"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300">
              {t.saveProfile}
            </span>
          </label>
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={store.isAuthenticating}
          className="h-12 w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <KeyRound className="w-4 h-4" />
          <span>{store.isAuthenticating ? t.connecting : t.connectRouter}</span>
        </button>

        <button
          type="button"
          onClick={() => store.switchDriverLive('mikrotik_rest')}
          className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
        >
          {t.tryDemo}
        </button>
      </form>

      <div className="flex items-start gap-2.5 px-1 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <span>{t.secureStorageNote}</span>
      </div>
    </div>
  );
};
