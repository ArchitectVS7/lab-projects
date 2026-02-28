import { Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import type { PlanTier } from '../types';

interface UpgradePromptProps {
  feature: string;
  requiredPlan?: PlanTier;
  compact?: boolean;
}

export default function UpgradePrompt({ feature, requiredPlan = 'PRO', compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <Link
        to="/billing"
        className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
      >
        <Zap className="h-3.5 w-3.5" />
        Upgrade to {requiredPlan}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 dark:border-indigo-800 dark:from-indigo-900/20 dark:to-purple-900/20">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-900/30">
          <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {feature} requires {requiredPlan} plan
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Upgrade your plan to unlock {feature.toLowerCase()} and other premium features.
          </p>
          <Link
            to="/billing"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            View Plans <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Small plan badge shown next to the user's name or in the sidebar */
export function PlanBadge({ plan }: { plan?: PlanTier }) {
  if (!plan || plan === 'FREE') return null;

  const colors = {
    PRO: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    TEAM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors[plan]}`}>
      {plan}
    </span>
  );
}
