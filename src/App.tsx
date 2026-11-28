import React, { useState } from 'react';
import { ShiftTrackerApp } from './shiftTracker/ShiftTrackerApp';
import { MyWorkSalaryApp } from './workSalary/MyWorkSalaryApp';

type ActiveModule = 'salary' | 'shiftTracker';

const MODULE_KEY = 'active_app_module_v1';

export function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>(() => {
    try {
      const saved = localStorage.getItem(MODULE_KEY);
      if (saved === 'shiftTracker') return 'shiftTracker';
    } catch {
      // ignore
    }
    return 'salary';
  });

  const switchModule = (next: ActiveModule) => {
    setActiveModule(next);
    try {
      localStorage.setItem(MODULE_KEY, next);
    } catch {
      // ignore
    }
  };

  if (activeModule === 'shiftTracker') {
    return (
      <div>
        <ShiftTrackerApp />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 md:pb-6 flex justify-center">
          <button
            type="button"
            onClick={() => switchModule('salary')}
            className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          >
            التبديل إلى برنامج شغلي ومرتبي
          </button>
        </div>
      </div>
    );
  }

  return (
    <MyWorkSalaryApp onSwitchToShiftTracker={() => switchModule('shiftTracker')} />
  );
}

export default App;
