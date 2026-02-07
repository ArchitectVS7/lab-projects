import { useDensityStore, DensityMode } from '../store/density';
import { AlignJustify, LayoutList, StretchHorizontal } from 'lucide-react';

const DENSITIES: { id: DensityMode; name: string; description: string; icon: React.ElementType; padding: string }[] = [
  { id: 'compact', name: 'Compact', description: 'Tighter spacing, smaller text', icon: AlignJustify, padding: 'p-2' },
  { id: 'comfortable', name: 'Comfortable', description: 'Default balanced spacing', icon: LayoutList, padding: 'p-3' },
  { id: 'spacious', name: 'Spacious', description: 'More breathing room', icon: StretchHorizontal, padding: 'p-4' },
];

export default function DensityPicker() {
  const { density, setDensity } = useDensityStore();

  return (
    <div className="grid grid-cols-3 gap-2">
      {DENSITIES.map((d) => (
        <button
          key={d.id}
          onClick={() => setDensity(d.id)}
          className={`
            flex flex-col items-center justify-center ${d.padding} rounded-lg border transition-all
            ${density === d.id
              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }
          `}
        >
          <d.icon className="w-6 h-6 mb-2" />
          <span className="text-xs font-medium">{d.name}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 text-center leading-tight">{d.description}</span>
        </button>
      ))}
    </div>
  );
}
