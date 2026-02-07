import { useState, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dependenciesApi, projectsApi } from '../lib/api';
import { Loader2, GitBranch, ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import clsx from 'clsx';
import type { TaskStatus, GraphNode } from '../types';
import ForceGraph2D from 'react-force-graph-2d';

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#9ca3af',       // gray
  IN_PROGRESS: '#3b82f6', // blue
  IN_REVIEW: '#f59e0b',   // amber
  DONE: '#22c55e',         // green
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

interface GraphData {
  nodes: (GraphNode & { val?: number; color?: string; isCritical?: boolean })[];
  links: { source: string; target: string; id: string; isCritical?: boolean }[];
}

export default function DependenciesDashboardPage() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');

  const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['project-dependencies', projectId],
    queryFn: () => dependenciesApi.getProjectGraph(projectId),
    enabled: !!projectId,
  });

  const { data: criticalPath } = useQuery({
    queryKey: ['critical-path', projectId],
    queryFn: () => dependenciesApi.getCriticalPath(projectId),
    enabled: !!projectId,
  });

  // Build critical path node/link sets
  const criticalNodeIds = useMemo(() => {
    if (!criticalPath?.path) return new Set<string>();
    return new Set(criticalPath.path.map(t => t.id));
  }, [criticalPath]);

  const criticalLinkKeys = useMemo(() => {
    if (!criticalPath?.path || criticalPath.path.length < 2) return new Set<string>();
    const keys = new Set<string>();
    for (let i = 0; i < criticalPath.path.length - 1; i++) {
      keys.add(`${criticalPath.path[i].id}->${criticalPath.path[i + 1].id}`);
    }
    return keys;
  }, [criticalPath]);

  // Connection count per node for sizing
  const connectionCounts = useMemo(() => {
    if (!graphData) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const link of graphData.links) {
      counts.set(link.source, (counts.get(link.source) || 0) + 1);
      counts.set(link.target, (counts.get(link.target) || 0) + 1);
    }
    return counts;
  }, [graphData]);

  // Filter and prepare graph data
  const processedGraph: GraphData | null = useMemo(() => {
    if (!graphData) return null;

    const filteredNodes = statusFilter === 'ALL'
      ? graphData.nodes
      : graphData.nodes.filter(n => n.status === statusFilter);

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(
      l => nodeIds.has(l.source) && nodeIds.has(l.target)
    );

    return {
      nodes: filteredNodes.map(n => ({
        ...n,
        val: Math.max(4, Math.min(12, (connectionCounts.get(n.id) || 0) + 3)),
        color: STATUS_COLORS[n.status],
        isCritical: criticalNodeIds.has(n.id),
      })),
      links: filteredLinks.map(l => ({
        ...l,
        isCritical: criticalLinkKeys.has(`${l.source}->${l.target}`),
      })),
    };
  }, [graphData, statusFilter, connectionCounts, criticalNodeIds, criticalLinkKeys]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    navigate(`/tasks?q=${encodeURIComponent(node.title)}`);
  }, [navigate]);

  const handleZoomIn = () => graphRef.current?.zoom(1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(0.67, 300);
  const handleResetView = () => graphRef.current?.zoomToFit(400);

  // Node canvas rendering
  const paintNode = useCallback((node: GraphNode & { val?: number; color?: string; isCritical?: boolean; x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
    const size = (node.val || 5) * 1.2;
    const x = node.x || 0;
    const y = node.y || 0;

    // Critical path glow
    if (node.isCritical) {
      ctx.beginPath();
      ctx.arc(x, y, size + 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(var(--primary-base-rgb, 99, 102, 241), 0.3)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();
    }

    // Main circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color || '#9ca3af';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.closePath();

    // Label
    ctx.font = '3px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#374151';
    const label = node.title.length > 20 ? node.title.slice(0, 18) + '...' : node.title;
    ctx.fillText(label, x, y + size + 2);
  }, []);

  // Node tooltip
  const nodeLabel = useCallback((node: GraphNode) => {
    return `<div style="padding:8px;background:#1f2937;color:white;border-radius:6px;font-size:12px;max-width:200px">
      <strong>${node.title}</strong><br/>
      Status: ${STATUS_LABELS[node.status]}<br/>
      Priority: ${node.priority}${node.dueDate ? `<br/>Due: ${new Date(node.dueDate).toLocaleDateString()}` : ''}
    </div>`;
  }, []);

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
        <GitBranch size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No Projects</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create a project to view dependencies.</p>
      </div>
    );
  }

  const hasNoDeps = processedGraph && processedGraph.links.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dependencies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visualize task dependencies across your project.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
              className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--primary-base)]"
            >
              <option value="ALL">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Project Selector */}
          <select
            value={projectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--primary-base)]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {graphLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!graphLoading && hasNoDeps && (
        <div className="text-center py-16">
          <GitBranch size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No Dependencies</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add dependencies between tasks to see them visualized here.
          </p>
        </div>
      )}

      {/* Graph (desktop) / List (mobile) */}
      {!graphLoading && processedGraph && processedGraph.links.length > 0 && (
        <>
          {/* Desktop: Force Graph */}
          <div className="hidden md:flex flex-1 relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ForceGraph2D
              ref={graphRef}
              graphData={processedGraph}
              nodeId="id"
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node: GraphNode & { val?: number; x?: number; y?: number }, color: string, ctx: CanvasRenderingContext2D) => {
                const size = (node.val || 5) * 1.2;
                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, size + 2, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              nodeLabel={nodeLabel}
              onNodeClick={handleNodeClick}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.15}
              linkColor={(link: { isCritical?: boolean }) => link.isCritical ? '#6366f1' : '#d1d5db'}
              linkWidth={(link: { isCritical?: boolean }) => link.isCritical ? 2.5 : 1}
              backgroundColor="transparent"
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />

            {/* Zoom controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <button onClick={handleZoomIn} className="p-2 bg-white dark:bg-gray-700 rounded-md shadow border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600" title="Zoom in">
                <ZoomIn size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={handleZoomOut} className="p-2 bg-white dark:bg-gray-700 rounded-md shadow border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600" title="Zoom out">
                <ZoomOut size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={handleResetView} className="p-2 bg-white dark:bg-gray-700 rounded-md shadow border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600" title="Fit to view">
                <Maximize2 size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span>{STATUS_LABELS[status as TaskStatus]}</span>
                </div>
              ))}
              {criticalPath && criticalPath.path.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-transparent" />
                  <span>Critical Path</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: List fallback */}
          <div className="md:hidden space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {processedGraph.nodes.length} tasks, {processedGraph.links.length} dependencies
            </p>
            {processedGraph.links.map((link) => {
              const sourceNode = processedGraph.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : (link.source as GraphNode).id));
              const targetNode = processedGraph.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : (link.target as GraphNode).id));
              if (!sourceNode || !targetNode) return null;

              return (
                <div
                  key={link.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border',
                    link.isCritical
                      ? 'border-indigo-300 dark:border-indigo-700'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[sourceNode.status] }} />
                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{sourceNode.title}</span>
                  </div>
                  <GitBranch size={14} className="text-gray-400 flex-shrink-0 rotate-90" />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[targetNode.status] }} />
                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{targetNode.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
