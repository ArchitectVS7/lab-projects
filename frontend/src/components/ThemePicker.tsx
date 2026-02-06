import { useThemeStore } from '../store/theme';
import { COLOR_THEMES } from '../lib/themes';
import { Check } from 'lucide-react';

export default function ThemePicker() {
    const { colorTheme, setColorTheme } = useThemeStore();

    return (
        <div className="grid grid-cols-5 gap-2">
            {COLOR_THEMES.map((theme) => {
                // Construct the HSL string for background color style
                const hslColor = `hsl(${theme.colors.primary})`;

                return (
                    <button
                        key={theme.id}
                        onClick={() => setColorTheme(theme.id)}
                        className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all
              ${colorTheme === theme.id ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : 'hover:scale-105 active:scale-95'}
            `}
                        style={{ backgroundColor: hslColor }}
                        title={theme.name}
                        aria-label={`Select ${theme.name} theme`}
                    >
                        {colorTheme === theme.id && (
                            <Check className="w-5 h-5 text-white drop-shadow-md" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
