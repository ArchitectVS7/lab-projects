import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';
import { TrendingUp, TrendingDown, Calendar, Lightbulb, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function InsightsWidget() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['analytics-insights'],
        queryFn: analyticsApi.getInsights,
    });

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[200px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-red-500">
                Failed to load insights.
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 shadow-sm" style={{
          borderColor: 'var(--primary-base)',
          background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-base) 8%, white), white)`
        }}>
            <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5" style={{ color: 'var(--primary-base)' }} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">💡 Your Productivity Insight</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Velocity */}
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Weekly Velocity</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.velocity.thisWeek}</span>
                        <span className="text-sm text-gray-500">tasks</span>
                    </div>

                    <div className={clsx("flex items-center gap-1 text-xs mt-2 font-medium",
                        data.velocity.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    )}>
                        {data.velocity.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{Math.abs(data.velocity.changePercent)}% from last week</span>
                    </div>
                </div>

                {/* Best Day */}
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Peak Performance</span>
                    <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <span className="text-xl font-medium text-gray-900 dark:text-gray-100">{data.patterns.mostProductiveDay}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Based on {data.patterns.tasksAnalyzed} recent tasks
                    </p>
                </div>

                {/* AI Insight */}
                <div className="bg-white/60 dark:bg-gray-700/50 p-3 rounded-md border-l-4" style={{ borderLeftColor: 'var(--primary-base)' }}>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                        "{data.insight}"
                    </p>
                </div>
            </div>
        </div>
    );
}
