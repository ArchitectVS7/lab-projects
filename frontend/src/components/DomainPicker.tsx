import type { Domain } from '../types';

interface DomainPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  domains: Domain[];
}

export default function DomainPicker({ selected, onChange, domains }: DomainPickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (domains.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">No domains available.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {domains.map((domain) => {
        const isSelected = selected.includes(domain.id);
        return (
          <button
            key={domain.id}
            type="button"
            onClick={() => toggle(domain.id)}
            aria-pressed={isSelected}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-all border"
            style={{
              backgroundColor: isSelected ? domain.color : `${domain.color}33`,
              borderColor: isSelected ? domain.color : 'transparent',
              color: isSelected ? '#ffffff' : domain.color,
            }}
          >
            <span>{domain.icon}</span>
            <span>{domain.name}</span>
          </button>
        );
      })}
    </div>
  );
}
