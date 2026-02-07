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
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Fields</h4>
      {fields.map((field: CustomFieldDefinition) => (
        <div key={field.id}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {field.name} {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'TEXT' && (
            <input
              type="text"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          )}
          {field.type === 'NUMBER' && (
            <input
              type="number"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          )}
          {field.type === 'DATE' && (
            <input
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          )}
          {field.type === 'DROPDOWN' && (
            <select
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
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
