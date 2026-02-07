import { useQuery } from '@tanstack/react-query';
import { customFieldsApi } from '../lib/api';
import type { CustomFieldDefinition } from '../types';

interface CustomFieldsFormProps {
  projectId: string;
  values: Record<string, string>; // fieldId -> value
  onChange: (fieldId: string, value: string) => void;
}

export default function CustomFieldsForm({ projectId, values, onChange }: CustomFieldsFormProps) {
  const { data: fields = [] } = useQuery({
    queryKey: ['customFields', projectId],
    queryFn: () => customFieldsApi.getByProject(projectId),
    enabled: !!projectId,
  });

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4 p-4 rounded-lg border-2" style={{ borderColor: 'var(--primary-base)', backgroundColor: 'color-mix(in srgb, var(--primary-base) 5%, transparent)' }}>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <span>🔧</span> Custom Fields
      </h4>
      {fields.map((field: CustomFieldDefinition) => (
        <div key={field.id} className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'TEXT' && (
            <input
              type="text"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent transition-colors"
            />
          )}
          {field.type === 'NUMBER' && (
            <input
              type="number"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent transition-colors"
            />
          )}
          {field.type === 'DATE' && (
            <input
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent transition-colors"
            />
          )}
          {field.type === 'DROPDOWN' && (
            <select
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent transition-colors"
            >
              <option value="">Select...</option>
              {(() => {
                try {
                  const opts = JSON.parse(field.options || '[]');
                  return opts.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ));
                } catch { return null; }
              })()}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
