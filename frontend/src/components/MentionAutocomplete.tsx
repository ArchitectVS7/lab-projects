import { useState, useEffect, useRef } from 'react';
import type { ProjectMember } from '../types';

interface MentionAutocompleteProps {
  members: ProjectMember[];
  query: string;
  position: { top: number; left: number };
  onSelect: (member: ProjectMember) => void;
  onClose: () => void;
}

export default function MentionAutocomplete({
  members,
  query,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = members.filter((m) =>
    m.user.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((member, i) => (
        <button
          key={member.userId}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
            i === selectedIndex
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          onClick={() => onSelect(member)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
            {member.user.name.charAt(0).toUpperCase()}
          </div>
          <span>{member.user.name}</span>
        </button>
      ))}
    </div>
  );
}
