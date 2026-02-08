import { Moon, Sun, Monitor, Contrast, Zap, Activity } from 'lucide-react';
import { useThemeStore } from '../store/theme';
import type { AnimationIntensity } from '../store/theme';

export default function ThemeToggle() {
  const { theme, setTheme, highContrast, setHighContrast, performanceMode, setPerformanceMode, animationIntensity, setAnimationIntensity } = useThemeStore();

  return (
    <div className="flex flex-col gap-2">
      {/* Theme Toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          data-testid="theme-toggle-light"
          onClick={() => setTheme('light')}
          className={`p-2 rounded transition-colors ${theme === 'light'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          title="Light mode"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          data-testid="theme-toggle-system"
          onClick={() => setTheme('system')}
          className={`p-2 rounded transition-colors ${theme === 'system'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          title="System theme"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          data-testid="theme-toggle-dark"
          onClick={() => setTheme('dark')}
          className={`p-2 rounded transition-colors ${theme === 'dark'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          title="Dark mode"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>

      {/* High Contrast Toggle */}
      <div className="flex items-center gap-2">
        <Contrast size={16} className="text-gray-500 dark:text-gray-400" />
        <button
          data-testid="high-contrast-toggle"
          onClick={() => setHighContrast(highContrast === 'normal' ? 'high-contrast' : 'normal')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${highContrast === 'high-contrast'
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          HC
        </button>
      </div>

      {/* Performance Mode Toggle */}
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-gray-500 dark:text-gray-400" />
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
          <button
            onClick={() => setPerformanceMode('performance')}
            className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors ${performanceMode === 'performance'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            title="Performance mode (reduced animations, simpler effects)"
          >
            Perf
          </button>
          <button
            onClick={() => setPerformanceMode('balanced')}
            className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors ${performanceMode === 'balanced'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            title="Balanced mode (standard animations and effects)"
          >
            Bal
          </button>
          <button
            onClick={() => setPerformanceMode('quality')}
            className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors ${performanceMode === 'quality'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            title="Quality mode (enhanced animations and effects)"
          >
            Qual
          </button>
        </div>
      </div>

      {/* Motion / Animation Intensity Toggle */}
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-gray-500 dark:text-gray-400" />
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
          {([
            { value: 'normal' as AnimationIntensity, label: 'Full', title: 'Full animations' },
            { value: 'reduced' as AnimationIntensity, label: 'Reduced', title: 'Reduced motion (subtle animations)' },
            { value: 'none' as AnimationIntensity, label: 'Off', title: 'No animations' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAnimationIntensity(opt.value)}
              className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors ${animationIntensity === opt.value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              title={opt.title}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
