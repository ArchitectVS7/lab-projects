import clsx from 'clsx';

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export default function TagBadge({ name, color, onRemove, size = 'sm' }: TagBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 font-bold"
        >
          ×
        </button>
      )}
    </span>
  );
}
