# Documentation Automation & Modular Help System

## Purpose

TaskMan is designed to treat the PRD as the single source of truth for user-facing documentation and in-app help. The goal is to keep feature specs, user manual pages, and contextual help content synchronized by deriving them from the same structured source content.

## Source of Truth

- **Primary source**: `docs/PRD.md`
- The PRD is organized by feature area (authentication, profiles, projects, etc.) and includes behaviors, validations, and UI expectations.
- These sections are intended to be decomposed into reusable, structured content blocks.

## Target Model (Modular Content)

Each feature should be broken into content blocks with metadata that can be reused in multiple places:

- **Manual sections**: long-form docs built by assembling blocks into a full narrative.
- **In-app help**: smaller snippets rendered on specific pages, dialogs, or tooltips.

A simple example of metadata to tag blocks:

- `featureId`: stable identifier (example: `auth.login`)
- `route`: UI route or view (example: `/login`)
- `audience`: `user`, `admin`, `developer`
- `surface`: `docs`, `help`, or both

## Current State vs. Intended Automation

- **Current**: The PRD is the authoritative document and updates to it are manual.
- **Intended**: A build step (or CMS sync) will parse PRD content into structured blocks that feed:
  - the user manual site
  - in-app help menus/tooltips

## Contributor Workflow

When updating or adding feature specs:

1. Update `docs/PRD.md` with the authoritative behavior and UI expectations.
2. Keep sections modular and discrete so they can be extracted into help content.
3. If a future automation pipeline is added, ensure new sections include metadata to support block reuse.

## Why This Matters

This approach avoids divergent docs and ensures that a single change in the PRD can propagate to both the long-form manual and contextual help surfaces.
