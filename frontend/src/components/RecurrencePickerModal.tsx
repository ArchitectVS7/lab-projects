import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Repeat } from 'lucide-react';
import type { RecurrenceFrequency } from '../types';

interface RecurrencePickerModalProps {
  onClose: () => void;
  onSubmit: (config: RecurrenceConfig) => void;
  isSubmitting: boolean;
}

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: string;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string | null;
}

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function RecurrencePickerModal({
  onClose,
  onSubmit,
  isSubmitting,
}: RecurrencePickerModalProps) {
  const [config, setConfig] = useState<RecurrenceConfig>({
    frequency: 'DAILY',
    interval: 1,
    startDate: new Date().toISOString().split('T')[0],
  });

  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalConfig: RecurrenceConfig = {
      ...config,
      daysOfWeek:
        config.frequency === 'WEEKLY' && selectedDays.length > 0
          ? selectedDays.sort((a, b) => a - b).join(',')
          : undefined,
    };

    onSubmit(finalConfig);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        className="glass-card dark:glass-card-dark rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Repeat size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Make Task Recurring
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency *
            </label>
            <select
              required
              value={config.frequency}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  frequency: e.target.value as RecurrenceFrequency,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Repeat every * (
              {config.frequency === 'DAILY' && 'days'}
              {config.frequency === 'WEEKLY' && 'weeks'}
              {config.frequency === 'MONTHLY' && 'months'}
              {config.frequency === 'CUSTOM' && 'days'})
            </label>
            <input
              type="number"
              required
              min={1}
              max={365}
              value={config.interval}
              onChange={(e) =>
                setConfig((c) => ({ ...c, interval: parseInt(e.target.value) || 1 }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Days of Week (for WEEKLY) */}
          {config.frequency === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repeat on
              </label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`flex-1 py-2 px-1 text-xs font-medium rounded-md transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month (for MONTHLY) */}
          {config.frequency === 'MONTHLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day of month (1-31)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={config.dayOfMonth || ''}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    dayOfMonth: parseInt(e.target.value) || undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Optional (defaults to current day)"
              />
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start date *
            </label>
            <input
              type="date"
              required
              value={config.startDate}
              onChange={(e) => setConfig((c) => ({ ...c, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End date (optional)
            </label>
            <input
              type="date"
              value={config.endDate || ''}
              onChange={(e) =>
                setConfig((c) => ({ ...c, endDate: e.target.value || null }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Make Recurring'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
