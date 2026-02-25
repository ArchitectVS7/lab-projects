import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { tasksApi, domainsApi } from '../lib/api';

interface ProgressOverviewProps {
  className?: string;
}

export default function ProgressOverview({ className }: ProgressOverviewProps) {
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
  });

  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.getAll,
  });

  const isLoading = tasksLoading || domainsLoading;

  const totalTasks = tasks?.length ?? 0;
  const doneTasks = tasks?.filter((t) => t.status === 'DONE').length ?? 0;
  const overallPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const domainProgress = (domains ?? [])
    .map((domain) => {
      const domainTasks = tasks?.filter((t) => t.domains?.some((td) => td.domainId === domain.id)) ?? [];
      const domainDone = domainTasks.filter((t) => t.status === 'DONE').length;
      const pct = domainTasks.length === 0 ? 0 : Math.round((domainDone / domainTasks.length) * 100);
      return { domain, total: domainTasks.length, done: domainDone, pct };
    })
    .filter((d) => d.total > 0);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPct / 100) * circumference;

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className ?? ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--primary-base)]" />
          Progress Overview
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="flex justify-center">
            <div className="w-36 h-36 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (totalTasks === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className ?? ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--primary-base)]" />
          Progress Overview
        </h2>
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No tasks yet</p>
          <p className="text-xs mt-1">Create tasks to see progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className ?? ''}`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-[var(--primary-base)]" />
        Progress Overview
      </h2>

      <div className="space-y-6">
        {/* Ring + count */}
        <div className="flex flex-col items-center gap-2">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            aria-label={`Overall progress: ${overallPct}%`}
            role="img"
          >
            {/* Track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress arc */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={overallPct === 100 ? '#22c55e' : 'var(--primary-base)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              data-complete={overallPct === 100 ? 'true' : 'false'}
            />
            {/* Center text */}
            <text
              x="70"
              y="65"
              textAnchor="middle"
              className="fill-gray-900 dark:fill-white"
              fontSize="24"
              fontWeight="bold"
            >
              {overallPct}%
            </text>
            <text x="70" y="85" textAnchor="middle" className="fill-gray-500" fontSize="11">
              complete
            </text>
          </svg>
          <p className="text-sm text-gray-500">
            {doneTasks} of {totalTasks} tasks done
          </p>
        </div>

        {/* Per-domain bars */}
        {domainProgress.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">By Life Area</h3>
            {domainProgress.map(({ domain, total, done, pct }) => (
              <div key={domain.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span>{domain.icon}</span>
                    <span className="text-gray-700 dark:text-gray-300">{domain.name}</span>
                  </span>
                  <span className="text-gray-500 text-xs">
                    {done}/{total}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: domain.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
