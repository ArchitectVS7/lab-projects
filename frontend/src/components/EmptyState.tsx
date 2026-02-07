import { Link } from 'react-router-dom';
import clsx from 'clsx';

// Simple inline SVG illustrations - no external dependencies needed

function TasksIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard */}
      <rect x="30" y="20" width="60" height="80" rx="6" className="fill-gray-100 dark:fill-gray-700 stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" />
      <rect x="42" y="14" width="36" height="12" rx="4" className="fill-gray-200 dark:fill-gray-600 stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" />
      {/* Checkboxes */}
      <rect x="40" y="40" width="12" height="12" rx="2" className="stroke-indigo-400 dark:stroke-indigo-500" strokeWidth="2" fill="none" />
      <path d="M43 46L46 49L51 43" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="58" y="43" width="24" height="6" rx="3" className="fill-gray-200 dark:fill-gray-600" />
      <rect x="40" y="60" width="12" height="12" rx="2" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" fill="none" />
      <rect x="58" y="63" width="20" height="6" rx="3" className="fill-gray-200 dark:fill-gray-600" />
      <rect x="40" y="80" width="12" height="12" rx="2" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" fill="none" />
      <rect x="58" y="83" width="16" height="6" rx="3" className="fill-gray-200 dark:fill-gray-600" />
    </svg>
  );
}

function ProjectsIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Folder */}
      <path d="M20 35C20 31.6863 22.6863 29 26 29H48L55 37H94C97.3137 37 100 39.6863 100 43V90C100 93.3137 97.3137 96 94 96H26C22.6863 96 20 93.3137 20 90V35Z" className="fill-indigo-100 dark:fill-indigo-900/40 stroke-indigo-300 dark:stroke-indigo-700" strokeWidth="2" />
      {/* Stars */}
      <circle cx="50" cy="65" r="3" className="fill-indigo-400 dark:fill-indigo-500" />
      <circle cx="60" cy="72" r="2" className="fill-indigo-300 dark:fill-indigo-600" />
      <circle cx="70" cy="63" r="2.5" className="fill-indigo-400 dark:fill-indigo-500" />
      {/* Plus */}
      <circle cx="60" cy="67" r="10" className="stroke-indigo-400 dark:stroke-indigo-500" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
    </svg>
  );
}

function DashboardIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chart bars */}
      <rect x="25" y="70" width="14" height="30" rx="3" className="fill-indigo-200 dark:fill-indigo-800" />
      <rect x="45" y="50" width="14" height="50" rx="3" className="fill-indigo-300 dark:fill-indigo-700" />
      <rect x="65" y="35" width="14" height="65" rx="3" className="fill-indigo-400 dark:fill-indigo-600" />
      <rect x="85" y="55" width="14" height="45" rx="3" className="fill-indigo-300 dark:fill-indigo-700" />
      {/* Trend line */}
      <path d="M32 65L52 45L72 30L92 50" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="65" r="3" className="fill-indigo-500 dark:fill-indigo-400" />
      <circle cx="52" cy="45" r="3" className="fill-indigo-500 dark:fill-indigo-400" />
      <circle cx="72" cy="30" r="3" className="fill-indigo-500 dark:fill-indigo-400" />
      <circle cx="92" cy="50" r="3" className="fill-indigo-500 dark:fill-indigo-400" />
    </svg>
  );
}

const illustrations = {
  tasks: TasksIllustration,
  projects: ProjectsIllustration,
  dashboard: DashboardIllustration,
} as const;

interface EmptyStateProps {
  type: keyof typeof illustrations;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  className,
}: EmptyStateProps) {
  const Illustration = illustrations[type];

  return (
    <div className={clsx('text-center py-12', className)}>
      <Illustration className="w-28 h-28 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
        {description}
      </p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md transition-colors"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
