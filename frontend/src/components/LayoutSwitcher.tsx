import { useLayoutStore, LayoutVariant } from '../store/layout';
import { LayoutDashboard, Minimize2, Maximize2, Monitor } from 'lucide-react';

const LAYOUTS: { id: LayoutVariant; name: string; icon: React.ElementType }[] = [
    { id: 'compact', name: 'Compact', icon: Minimize2 },
    { id: 'default', name: 'Standard', icon: LayoutDashboard },
    { id: 'spacious', name: 'Spacious', icon: Maximize2 },
    { id: 'minimal', name: 'Minimal', icon: Monitor }, // Minimal usually hides sidebar or reduces distraction
];

export default function LayoutSwitcher() {
    const { layout, setLayout } = useLayoutStore();

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LAYOUTS.map((L) => (
                <button
                    key={L.id}
                    data-testid={`layout-option-${L.id}`}
                    onClick={() => setLayout(L.id)}
                    className={`
            flex flex-col items-center justify-center p-3 rounded-lg border transition-all
            ${layout === L.id
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }
          `}
                >
                    <L.icon className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium">{L.name}</span>
                </button>
            ))}
        </div>
    );
}
