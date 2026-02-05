# OpenClaw Test Storage

This directory contains test results from VS7 context management system validation runs.

## Contents

### sequential-1770261977904/
Test run from 2026-02-04 comparing baseline (VS7 disabled) vs VS7 (context management enabled).

**Key Results:**
- **Baseline**: 171,268 tokens used
- **VS7**: 57,567 tokens used
- **Token Savings**: 66.4%

**Structure:**
- `baseline-workspace/` - App generated with VS7 disabled (36 source files)
- `vs7-workspace/` - App generated with VS7 enabled (45 source files, better architecture)
- `baseline/` - Individual test result JSON files
- `vs7/` - Individual test result JSON files

**Test Category:** task-management-saas (15 prompts building a Task Management SaaS app)

**Known Issues:**
- Token tracking in test runner shows 0 (data retrieved from session metadata instead)
- Timing bug caused some tests to complete instantly instead of waiting for full agentic loop
- Both generated apps are incomplete due to timing issues

## Purpose

These tests validate the VS7 context management system's ability to:
1. Reduce token usage while maintaining code quality
2. Preserve context across long coding sessions
3. Generate well-architected applications

## Related Files

- Test runner: `Dev/src/sequential-toggle-runner.ts`
- Test prompts: `Dev/test-prompts/task-management-saas/`
- Documentation: `Dev/README-SEQUENTIAL-TEST.md`
