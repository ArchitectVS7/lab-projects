import clsx from 'clsx';

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  );
}

// --- Dashboard Skeletons ---

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-7 w-12" />
        </div>
        <SkeletonPulse className="w-12 h-12 rounded-full" />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-2">
        <SkeletonPulse className="h-5 w-3/4" />
        <SkeletonPulse className="h-5 w-14" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <SkeletonPulse className="h-5 w-20" />
        <SkeletonPulse className="h-3 w-3 rounded-full" />
        <SkeletonPulse className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <SkeletonPulse className="w-3 h-3 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonPulse className="h-4 w-32" />
        <SkeletonPulse className="h-3 w-16" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <SkeletonPulse className="h-8 w-40 mb-6" />

      {/* Insights placeholder */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <SkeletonPulse className="h-5 w-32 mb-3" />
          <SkeletonPulse className="h-4 w-full mb-2" />
          <SkeletonPulse className="h-4 w-2/3" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <SkeletonPulse className="h-6 w-32" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <SkeletonPulse className="h-6 w-36" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {Array.from({ length: 5 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Projects Page Skeleton ---

export function ProjectsPageSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SkeletonPulse className="h-8 w-28" />
        <SkeletonPulse className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <SkeletonPulse className="h-2 rounded-t-lg rounded-b-none" />
            <div className="p-4 space-y-3">
              <SkeletonPulse className="h-5 w-3/4" />
              <SkeletonPulse className="h-4 w-full" />
              <div className="flex items-center gap-4 mt-3">
                <SkeletonPulse className="h-4 w-16" />
                <SkeletonPulse className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Tasks Page Skeleton ---

export function TasksTableSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SkeletonPulse className="h-8 w-20" />
        <div className="flex items-center gap-3">
          <SkeletonPulse className="h-9 w-40 rounded-md" />
          <SkeletonPulse className="h-9 w-24 rounded-md" />
          <SkeletonPulse className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Filter bar placeholder */}
      <div className="flex gap-3 items-end flex-wrap mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <SkeletonPulse className="h-3 w-14" />
            <SkeletonPulse className="h-8 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Table rows */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {['w-1/4', 'w-20', 'w-16', 'w-24', 'w-20', 'w-20', 'w-16'].map((w, i) => (
            <SkeletonPulse key={i} className={`h-4 ${w}`} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <div className="w-1/4 space-y-1">
              <SkeletonPulse className="h-4 w-full" />
              <SkeletonPulse className="h-3 w-2/3" />
            </div>
            <SkeletonPulse className="h-6 w-20 rounded" />
            <SkeletonPulse className="h-5 w-16 rounded" />
            <div className="flex items-center gap-1.5 w-24">
              <SkeletonPulse className="w-2.5 h-2.5 rounded-full" />
              <SkeletonPulse className="h-3 w-16" />
            </div>
            <SkeletonPulse className="h-4 w-20" />
            <SkeletonPulse className="h-4 w-20" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
