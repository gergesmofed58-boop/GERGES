import React, { useState } from 'react';
import {
  Bell,
  Gauge,
  Globe,
  Home,
  LogOut,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { getT } from '../../data/translations';
import { NetPulseStore } from '../../hooks/useNetPulseStore';
import { MobileTab } from '../../types/router';
import { AppLockOverlay } from './AppLockOverlay';
import { DashboardTab } from './DashboardTab';
import { DevicesTab } from './DevicesTab';
import { LoginScreen } from './LoginScreen';
import { QuotasTab } from './QuotasTab';
import { ToolsTab } from './ToolsTab';

interface Props {
  store: NetPulseStore;
}

export const MobileAppShell: React.FC<Props> = ({ store }) => {
  const t = getT(store.locale);
  const isRtl = store.locale === 'ar';
  const [showNotifs, setShowNotifs] = useState(false);

  const navItems: {
    id: MobileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'home', label: t.tabHome, icon: Home },
    {
      id: 'devices',
      label: t.tabDevices,
      icon: Smartphone,
      badge: store.unknownDevices.length || undefined,
    },
    { id: 'quotas', label: t.tabQuotas, icon: Gauge },
    { id: 'tools', label: t.tabTools, icon: Wrench },
  ];

  return (
    <div className="w-full lg:w-[412px] lg:shrink-0 rounded-none lg:rounded-[30px] border-0 lg:border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] overflow-hidden flex flex-col lg:h-[780px] relative shadow-none lg:shadow-sm">
      {/* Compact Mobile Top App Bar (54px) */}
      <div className="h-[54px] px-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 flex flex-col">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {store.isConnected
              ? store.activeProfile?.label ?? t.brandName
              : t.brandName}
          </span>
          {store.isConnected && (
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
              {store.activeProfile?.gatewayIp}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {store.isConnected && (
            <button
              type="button"
              onClick={() => setShowNotifs((v) => !v)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title={t.notificationsTitle}
              aria-label={t.notificationsTitle}
            >
              <Bell className="w-4 h-4" />
              {store.unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 end-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                  {store.unreadNotificationsCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              store.setLocale(store.locale === 'ar' ? 'en' : 'ar')
            }
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={
              store.locale === 'ar' ? 'Switch to English' : 'التبديل للعربية'
            }
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              store.setTheme(store.theme === 'dark' ? 'light' : 'dark')
            }
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={store.theme === 'dark' ? t.lightMode : t.darkMode}
            aria-label="Toggle theme"
          >
            {store.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          {store.isConnected && (
            <button
              type="button"
              onClick={() => store.setIsConnected(false)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t.disconnect}
              aria-label={t.disconnect}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Screen Body */}
      <div className="flex-1 overflow-y-auto">
        {!store.isConnected ? (
          <LoginScreen store={store} />
        ) : store.activeTab === 'home' ? (
          <DashboardTab store={store} />
        ) : store.activeTab === 'devices' ? (
          <DevicesTab store={store} />
        ) : store.activeTab === 'quotas' ? (
          <QuotasTab store={store} />
        ) : (
          <ToolsTab store={store} />
        )}
      </div>

      {/* Local Notifications Sheet */}
      {showNotifs && (
        <div className="absolute inset-x-0 top-[54px] bottom-0 z-30 bg-black/40 backdrop-blur-xs flex flex-col">
          <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 max-h-[75%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.notificationsTitle}
              </h3>
              <div className="flex items-center gap-2">
                {store.unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={store.markAllNotificationsRead}
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400"
                  >
                    {t.markAllRead}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifs(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {store.notifications.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                {t.noNotifications}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {store.notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-2.5 flex flex-col gap-0.5 ${
                      n.read ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span
                        className={`font-bold ${
                          n.type === 'exceeded100' || n.type === 'unknown'
                            ? 'text-red-600 dark:text-red-400'
                            : n.type === 'warning80'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-teal-700 dark:text-teal-400'
                        }`}
                      >
                        {isRtl ? n.titleAr : n.titleEn}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isRtl ? n.bodyAr : n.bodyEn}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className="flex-1"
            onClick={() => setShowNotifs(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Biometric / PIN App Lock Overlay */}
      {store.isAppLocked && <AppLockOverlay store={store} />}

      {/* Reboot Overlay */}
      {store.rebootCountdown !== null && (
        <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-base font-bold">{t.rebootingStatus}</p>
          <p className="text-xs font-mono tabular-nums text-slate-300">
            {t.reconnectingIn} {store.rebootCountdown} {t.seconds}
          </p>
        </div>
      )}

      {/* Bottom Tab Navigation Bar */}
      {store.isConnected && (
        <nav
          aria-label="Mobile Navigation"
          className="h-16 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center shrink-0"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = store.activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => store.setActiveTab(item.id)}
                className={`h-full flex flex-col items-center justify-center gap-1 relative transition-colors ${
                  active
                    ? 'text-teal-600 dark:text-teal-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -end-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-mono tabular-nums font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
