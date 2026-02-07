import { useThemeStore } from '../store/theme';
import { Moon, Sun, Contrast, Zap, Sparkles } from 'lucide-react';

export default function AccessibilityControls() {
  const { 
    theme, 
    setTheme, 
    highContrast, 
    setHighContrast, 
    performanceMode, 
    setPerformanceMode 
  } = useThemeStore();

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white/10 dark:bg-gray-800/20 rounded-lg">
      {/* Theme Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme('light')}
          className={`p-2 rounded-full ${theme === 'light' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title="Light theme"
        >
          <Sun size={16} />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`p-2 rounded-full ${theme === 'dark' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title="Dark theme"
        >
          <Moon size={16} />
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`p-2 rounded-full ${theme === 'system' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title="System theme"
        >
          <Sparkles size={16} />
        </button>
      </div>

      {/* High Contrast Toggle */}
      <div className="flex items-center gap-2">
        <Contrast size={16} className="text-gray-500 dark:text-gray-400" />
        <button
          onClick={() => setHighContrast(highContrast === 'normal' ? 'high-contrast' : 'normal')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            highContrast === 'high-contrast'
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {highContrast === 'high-contrast' ? 'High Contrast' : 'Normal'}
        </button>
      </div>

      {/* Performance Mode Toggle */}
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-gray-500 dark:text-gray-400" />
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
          <button
            onClick={() => setPerformanceMode('performance')}
            className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              performanceMode === 'performance'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Perf
          </button>
          <button
            onClick={() => setPerformanceMode('balanced')}
            className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              performanceMode === 'balanced'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Bal
          </button>
          <button
            onClick={() => setPerformanceMode('quality')}
            className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              performanceMode === 'quality'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Qual
          </button>
        </div>
      </div>
    </div>
  );
}