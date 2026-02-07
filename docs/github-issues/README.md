# GitHub Issues for Phase 2+ Implementation

This directory contains issue templates for deferred items from Phase 1 remediation review.

## Quick Create

To create these issues on GitHub, use the GitHub CLI:

```bash
# Install gh CLI if not available
# https://cli.github.com/

# Create all issues
for file in docs/github-issues/*.md; do
  if [ "$file" != "docs/github-issues/README.md" ]; then
    gh issue create --body-file "$file" --title "$(head -n 1 $file | sed 's/# //')"
  fi
done
```

## Manual Creation

If `gh` CLI is not available, manually create issues by:

1. Go to https://github.com/ArchitectVS7/TaskMan/issues/new
2. Copy the title from the first line (# heading)
3. Copy the entire markdown content as the issue body
4. Add labels as specified in the file

## Issues Overview

### High Priority
- **color-contrast-audit.md** - Accessibility audit for theme colors
  - Effort: 2-3 hours
  - Impact: High (WCAG compliance)

### Medium Priority
- **dependencies-dashboard.md** - Visual dependency graph
  - Effort: 8-12 hours
  - Impact: Medium (enhancement)

- **animation-intensity-preference.md** - Animation settings
  - Effort: 3-4 hours
  - Impact: Medium (accessibility + UX)

### Low Priority
- **creator-dashboard-navigation.md** - Add nav item
  - Effort: 1-2 hours
  - Impact: Low (discoverability)

## Total Estimated Effort

**14-21 hours** across all Phase 2 enhancements

## Related Documentation

- Phase 1 Review: `../PHASE-1-REVIEW-REPORT.md`
- Remediation Plan: `../REMEDIATION-PLAN.md`
- Implementation Commit: `168752d`
