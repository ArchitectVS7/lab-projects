import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../lib/api';
import type { Tag } from '../types';
import { Plus, X } from 'lucide-react';
import TagBadge from './TagBadge';

interface TagPickerProps {
  projectId: string;
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
}

const TAG_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

export default function TagPicker({ projectId, selectedTagIds, onToggleTag }: TagPickerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', projectId],
    queryFn: () => tagsApi.getByProject(projectId),
    enabled: !!projectId,
  });

  const createTag = useMutation({
    mutationFn: (data: { name: string; color: string; projectId: string }) => tagsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', projectId] });
      setNewName('');
      setShowCreate(false);
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag: Tag) => (
          <button key={tag.id} onClick={() => onToggleTag(tag.id)}>
            <TagBadge
              name={tag.name}
              color={tag.color}
              size={selectedTagIds.includes(tag.id) ? 'md' : 'sm'}
              onRemove={selectedTagIds.includes(tag.id) ? () => onToggleTag(tag.id) : undefined}
            />
          </button>
        ))}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {showCreate && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name"
            className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
            autoFocus
          />
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: newColor === c ? '#fff' : 'transparent', boxShadow: newColor === c ? `0 0 0 2px ${c}` : 'none' }}
              />
            ))}
          </div>
          <button
            onClick={() => { if (newName.trim()) createTag.mutate({ name: newName.trim(), color: newColor, projectId }); }}
            disabled={!newName.trim() || createTag.isPending}
            className="px-2 py-1 text-xs font-medium text-white rounded bg-primary hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: newColor }}
          >
            Add
          </button>
          <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
