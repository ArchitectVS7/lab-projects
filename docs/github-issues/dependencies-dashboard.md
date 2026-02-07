# Phase 2: Implement Dependencies Dashboard with Force-Directed Graph

**Labels**: enhancement, phase-2, visualization
**Priority**: Medium
**Estimated Effort**: 8-12 hours

## Description

Add a dedicated Dependencies Dashboard page with visual graph representation of task dependencies.

## Background

As identified in Phase 1 review (see docs/PHASE-1-REVIEW-REPORT.md), dependency badges show basic information, but users need a holistic view of the dependency graph to understand:
- Critical paths through projects
- Bottlenecks (highly blocking tasks)
- Circular dependencies (if any)
- Task interconnections

## Requirements

### Visualization
- Force-directed graph using react-force-graph or D3
- Nodes represent tasks (colored by status)
- Edges represent dependencies (directed arrows)
- Node size reflects number of dependent tasks
- Highlight critical path

### Interactions
- Click node to view task details
- Hover to show task title and status
- Filter by project
- Zoom and pan
- Layout algorithm options (force, hierarchical, radial)

### Navigation
- Add 'Dependencies' to main navigation
- Accessible via /dependencies route
- Link from dependency badges on task cards

## Acceptance Criteria

- [ ] Dependencies page accessible from main nav
- [ ] Graph renders all tasks with dependencies
- [ ] Nodes colored by status (TODO, IN_PROGRESS, etc.)
- [ ] Clicking node opens task detail modal
- [ ] Filter by project works
- [ ] Zoom/pan controls functional
- [ ] Performance acceptable with 100+ tasks
- [ ] Mobile responsive (fallback to list view)

## Technical Notes

- Consider react-force-graph-2d for initial implementation
- Use WebGL for better performance if >200 tasks
- Store layout preferences in localStorage
- Debounce layout calculations

## Related

- Phase 1 Remediation commit: 168752d
- Remediation plan: docs/REMEDIATION-PLAN.md section 1.3
