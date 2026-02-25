import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinsApi, domainsApi } from '../lib/api';
import { ClipboardList, Zap, Flame } from 'lucide-react';
import type { Domain } from '../types';

export default function CheckinPage() {
  const queryClient = useQueryClient();
  const [priorities, setPriorities] = useState('');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [blockers, setBlockers] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const { data: todayCheckin } = useQuery({
    queryKey: ['checkins', 'today'],
    queryFn: async () => {
      try {
        return await checkinsApi.getToday();
      } catch {
        return null;
      }
    },
  });

  const { data: streakData } = useQuery({
    queryKey: ['checkins', 'streak'],
    queryFn: checkinsApi.getStreak,
  });

  const { data: history } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => checkinsApi.getAll({ limit: 5 }),
  });

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.getAll,
  });

  useEffect(() => {
    if (todayCheckin) {
      setPriorities(todayCheckin.priorities);
      setEnergyLevel(todayCheckin.energyLevel);
      setBlockers(todayCheckin.blockers ?? '');
      setSelectedDomains(todayCheckin.focusDomains);
    }
  }, [todayCheckin]);

  const saveMutation = useMutation({
    mutationFn: checkinsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      priorities,
      energyLevel,
      blockers: blockers || undefined,
      focusDomains: selectedDomains,
    });
  };

  const toggleDomain = (domainId: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-[var(--primary-base)]" size={28} />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Check-in</h1>
            </div>
            {streakData && streakData.streak > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full text-sm font-medium">
                <Flame size={16} />
                <span>{streakData.streak} day{streakData.streak !== 1 ? 's' : ''} streak</span>
              </div>
            )}
          </div>

          {/* Priorities */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <label htmlFor="priorities" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Today&apos;s Priorities
            </label>
            <textarea
              id="priorities"
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
              placeholder={"1.\n2.\n3."}
              rows={6}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] resize-none"
            />
          </div>

          {/* Energy Level */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <span className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" />
                Energy Level (1-10)
              </span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setEnergyLevel(n)}
                  className={`w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                    energyLevel === n
                      ? 'bg-[var(--primary-base)] text-white shadow-md scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Blockers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Blockers <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="What might slow you down today?"
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] resize-none"
            />
          </div>

          {/* Focus Domains */}
          {domains && domains.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Focus Areas
              </label>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain: Domain) => (
                  <button
                    key={domain.id}
                    onClick={() => toggleDomain(domain.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      selectedDomains.includes(domain.id)
                        ? 'border-current opacity-100 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-80'
                    }`}
                    style={
                      selectedDomains.includes(domain.id)
                        ? { borderColor: domain.color, color: domain.color }
                        : {}
                    }
                  >
                    <span>{domain.icon}</span>
                    <span>{domain.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          {todayCheckin && (
            <p className="text-xs text-center text-[var(--primary-base)] font-medium -mb-2">
              Editing today&apos;s check-in
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !priorities.trim()}
            className="w-full py-3 px-6 bg-[var(--primary-base)] text-white rounded-xl font-semibold text-base transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Saving...' : todayCheckin ? 'Update Check-in' : 'Save Check-in'}
          </button>

          {saveMutation.isSuccess && (
            <p className="text-center text-sm text-green-600 dark:text-green-400">
              Check-in saved successfully!
            </p>
          )}
          {saveMutation.isError && (
            <p className="text-center text-sm text-red-600 dark:text-red-400">
              {(saveMutation.error as Error).message}
            </p>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Today's Check-in Summary */}
          {todayCheckin && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Today&apos;s Check-in
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Energy</span>
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {todayCheckin.energyLevel}/10
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Priorities</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line line-clamp-4">
                    {todayCheckin.priorities}
                  </p>
                </div>
                {todayCheckin.blockers && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Blockers</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                      {todayCheckin.blockers}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Check-ins */}
          {history && history.checkins.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Recent Check-ins
              </h2>
              <div className="space-y-3">
                {history.checkins.map((checkin) => {
                  const firstLine = checkin.priorities.split('\n')[0] ?? '';
                  const dateStr = new Date(checkin.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <div
                      key={checkin.id}
                      className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{dateStr}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{firstLine}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap size={12} className="text-yellow-500" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {checkin.energyLevel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
