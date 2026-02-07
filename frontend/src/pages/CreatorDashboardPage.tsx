import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, projectsApi } from '../lib/api';
import { motion } from 'framer-motion';
import { staggerContainer, listItemVariant, slideUp } from '../lib/animations';
import {
  Users, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Clock, BarChart3, ArrowUpDown, Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import type { CreatorMetric, CreatorBadge, CreatorBottleneck } from '../types';

const BADGE_CONFIG: Record<CreatorBadge, { label: string; color: string; description: string }> = {
  delegator: {
    label: 'Delegator',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    description: '60%+ tasks delegated',
  },
  doer: {
    label: 'Doer',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    description: '80%+ tasks self-assigned',
  },
  balanced: {
    label: 'Balanced',
    color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    description: 'Healthy mix of delegation',
  },
  new: {
    label: 'New',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    description: 'No tasks created yet',
  },
};

function DelegationBar({ selfAssigned, delegated, total }: { selfAssigned: number; delegated: number; total: number }) {
  if (total === 0) return <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full" />;
  const selfPct = (selfAssigned / total) * 100;
  const delegatedPct = (delegated / total) * 100;
  const unassignedPct = 100 - selfPct - delegatedPct;

  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700" title={`Self: ${selfAssigned}, Delegated: ${delegated}, Unassigned: ${total - selfAssigned - delegated}`}>
      {selfPct > 0 && (
        <div className="bg-blue-400 dark:bg-blue-500" style={{ width: `${selfPct}%` }} />
      )}
      {delegatedPct > 0 && (
        <div className="bg-purple-400 dark:bg-purple-500" style={{ width: `${delegatedPct}%` }} />
      )}
      {unassignedPct > 0 && (
        <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${unassignedPct}%` }} />
      )}
    </div>
  );
}

function VelocityBar({ completedThisWeek, maxVelocity }: { completedThisWeek: number; maxVelocity: number }) {
  const pct = maxVelocity > 0 ? (completedThisWeek / maxVelocity) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{completedThisWeek}</span>
    </div>
  );
}

function CreatorRow({ creator, rank, maxVelocity }: { creator: CreatorMetric; rank: number; maxVelocity: number }) {
  const badge = BADGE_CONFIG[creator.badge];
  return (
    <motion.div
      variants={listItemVariant}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
    >
      {/* Rank */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
        rank === 1 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
        rank === 2 ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' :
        rank === 3 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
        'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      )}>
        {rank}
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 min-w-0 w-40">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-medium text-indigo-700 dark:text-indigo-300 flex-shrink-0">
          {creator.user.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{creator.user.name}</p>
          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', badge.color)}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Tasks Created */}
      <div className="text-center w-16 flex-shrink-0">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{creator.tasksCreated}</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">created</p>
      </div>

      {/* Delegation Ratio */}
      <div className="w-32 flex-shrink-0">
        <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
          <span>Self: {creator.selfAssigned}</span>
          <span>Deleg: {creator.delegated}</span>
        </div>
        <DelegationBar
          selfAssigned={creator.selfAssigned}
          delegated={creator.delegated}
          total={creator.tasksCreated}
        />
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 text-right">{creator.delegationRatio}% delegated</p>
      </div>

      {/* Weekly Velocity */}
      <div className="w-28 flex-shrink-0">
        <VelocityBar completedThisWeek={creator.completedThisWeek} maxVelocity={maxVelocity} />
        <div className={clsx(
          'flex items-center gap-0.5 text-[10px] mt-1 font-medium',
          creator.velocityChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
        )}>
          {creator.velocityChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          <span>{Math.abs(creator.velocityChange)}% vs last week</span>
        </div>
      </div>

      {/* Open / Stale */}
      <div className="text-center w-16 flex-shrink-0">
        <p className="text-sm text-gray-900 dark:text-gray-100">{creator.openTasks}</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">open</p>
      </div>

      {creator.staleTasks > 0 && (
        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 flex-shrink-0" title="Stale tasks (not updated in 7+ days)">
          <AlertTriangle size={14} />
          <span className="text-xs font-medium">{creator.staleTasks}</span>
        </div>
      )}
    </motion.div>
  );
}

function BottleneckCard({ bottleneck }: { bottleneck: CreatorBottleneck }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300 flex-shrink-0">
          {bottleneck.user.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{bottleneck.user.name}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{bottleneck.staleTasks} stale</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">of {bottleneck.openTasks} open</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <div className={clsx('p-3 rounded-full', color)}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function CreatorDashboardPage() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  // Filter to projects where user can see metrics (OWNER/ADMIN)
  // We show all projects in the dropdown since the backend enforces authorization
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Auto-select the first project once loaded
  const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');

  const { data: metrics, isLoading: metricsLoading, error } = useQuery({
    queryKey: ['creator-metrics', projectId],
    queryFn: () => analyticsApi.getCreatorMetrics(projectId),
    enabled: !!projectId,
  });

  const maxVelocity = metrics
    ? Math.max(1, ...metrics.creators.map((c) => c.completedThisWeek))
    : 1;

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No Projects</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create a project to see creator metrics.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creator Accountability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track who creates tasks, how they delegate, and where bottlenecks form.
          </p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {metricsLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          {error instanceof Error ? error.message : 'Failed to load creator metrics. You may not have permission to view this project.'}
        </div>
      )}

      {metrics && !metricsLoading && (
        <motion.div {...slideUp}>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <SummaryCard label="Total Tasks" value={metrics.summary.totalTasks} icon={BarChart3} color="bg-indigo-500" />
            <SummaryCard label="Completed" value={metrics.summary.totalDone} icon={CheckCircle2} color="bg-green-500" />
            <SummaryCard label="Open" value={metrics.summary.totalOpen} icon={Clock} color="bg-blue-500" />
            <SummaryCard label="Stale (7d+)" value={metrics.summary.totalStale} icon={AlertTriangle} color="bg-amber-500" />
            <SummaryCard label="Members" value={metrics.summary.memberCount} icon={Users} color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Creator Leaderboard */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown size={16} className="text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Creator Leaderboard</h2>
              </div>

              {metrics.creators.length > 0 ? (
                <motion.div {...staggerContainer} className="space-y-2">
                  {metrics.creators.map((creator, idx) => (
                    <CreatorRow
                      key={creator.user.id}
                      creator={creator}
                      rank={idx + 1}
                      maxVelocity={maxVelocity}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No task data available for this project.
                </div>
              )}

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 bg-blue-400 dark:bg-blue-500 rounded-sm" />
                  <span>Self-assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 bg-purple-400 dark:bg-purple-500 rounded-sm" />
                  <span>Delegated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 bg-gray-300 dark:bg-gray-600 rounded-sm" />
                  <span>Unassigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-sm" />
                  <span>This week's completions</span>
                </div>
              </div>

              {/* Badge Legend */}
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.entries(BADGE_CONFIG) as [CreatorBadge, typeof BADGE_CONFIG[CreatorBadge]][]).map(([key, cfg]) => (
                  <span key={key} className={clsx('text-[10px] px-2 py-0.5 rounded', cfg.color)} title={cfg.description}>
                    {cfg.label}: {cfg.description}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottlenecks Panel */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bottlenecks</h2>
              </div>

              {metrics.bottlenecks.length > 0 ? (
                <div className="space-y-2">
                  {metrics.bottlenecks.map((b) => (
                    <BottleneckCard key={b.user.id} bottleneck={b} />
                  ))}
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 text-center">
                  <CheckCircle2 size={24} className="mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">No bottlenecks detected</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All tasks are actively progressing.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
