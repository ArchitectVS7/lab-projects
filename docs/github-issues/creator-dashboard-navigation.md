# Phase 2: Enhance Creator Dashboard Navigation

**Labels**: enhancement, phase-2, ui-ux
**Priority**: Low
**Estimated Effort**: 1-2 hours

## Description

Add explicit navigation item for Creator Dashboard (Team Analytics) to main navigation sidebar.

## Background

The Creator Dashboard exists at `/creator-dashboard` and provides valuable team accountability metrics, but it's not prominently visible in the navigation. Phase 1 made creator avatars visible on tasks, but the dashboard itself needs better discoverability.

## Current State

- Creator Dashboard accessible via direct URL
- No dedicated nav item
- Users must know the route to access it

## Proposed Solution

Add "Team Analytics" navigation item to Layout.tsx main navigation:

```tsx
<Link to="/creator-dashboard">
  <BarChart3 size={20} />
  {layout !== 'minimal' && <span>Team Analytics</span>}
</Link>
```

### Icon Options
- BarChart3 (current in dashboard)
- Users (represents team)
- TrendingUp (represents metrics)

### Placement
- After "Dashboard"
- Before "Tasks"

### Permissions
- Visible to all users
- Non-creators see their own metrics
- Creators see team-wide data

## Acceptance Criteria

- [ ] "Team Analytics" nav item added to Layout
- [ ] Icon matches dashboard theme
- [ ] Active state highlights when on /creator-dashboard
- [ ] Layout collapses properly in minimal mode
- [ ] Tooltip shows "Team Analytics" in minimal mode

## Related

- Phase 1 review: docs/PHASE-1-REVIEW-REPORT.md
- Creator Dashboard: frontend/src/pages/CreatorDashboardPage.tsx
