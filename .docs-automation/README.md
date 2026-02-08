# Documentation Automation System

This folder contains the complete tools for automating documentation from the PRD source, implementing a full documentation lifecycle management system.

## Overview

The documentation automation system extracts structured content blocks from `docs/PRD.md` to generate various documentation outputs (user manual, in-app help, etc.) and provides a complete content management system for maintaining documentation throughout the development lifecycle.

## System Architecture

The system consists of multiple phases that work together:

### Phase 1: Content Parser
- **File**: `parser.ts`
- Extracts content blocks with metadata from PRD.md
- Identifies headings and associated content
- Extracts metadata like featureId, route, audience, surface, tags

### Phase 2: Build Pipeline
- **Files**: `build-pipeline.ts`, `content-generator.ts`, `build.mjs`
- Processes PRD content and generates documentation for different surfaces
- Creates user manual, in-app help, and API documentation
- Generates database-ready content objects

### Phase 3: Content Management System
- **Files**: `cms-api.ts`, `cms-ui-components.tsx`
- Provides API and UI for managing documentation content
- Enables human editing of generated documentation
- Includes Git integration for version control

### Phase 4: Metadata Enrichment
- **Files**: `metadata-enrichment-tools.ts`, `content-structuring-guidelines.ts`, `metadata-validation.ts`
- Tools to help contributors add proper metadata to PRD sections
- Guidelines for structuring content for optimal extraction
- Validation for metadata completeness

### Phase 5: Traceability & Tagging
- **Files**: `prd-tagging-system.ts`, `traceability-tools.ts`
- Implements physical tags in code that link back to PRD sections
- Ensures bidirectional traceability between code and specifications
- Provides compliance and synchronization checks

## Key Features

### Content Block Structure
Each parsed block has the following structure:
```typescript
interface ContentBlock {
  id: string;          // Generated URL-friendly ID
  title: string;       // Heading title
  content: string;     // Content under the heading
  metadata: {          // Extracted metadata
    featureId?: string;    // Stable identifier (e.g., auth.login)
    route?: string;        // UI route or view (e.g., /login)
    audience?: string[];   // Target audience (user, admin, developer)
    surface?: string[];    // Target surface (docs, help, tooltip)
    tags?: string[];       // Additional categorization tags
  };
  level: number;       // Heading level (1-6)
}
```

### Documentation Generation
The system can generate:
- **User Manual**: Long-form documentation for users
- **In-App Help**: Context-sensitive help for specific features/routes
- **API Documentation**: Technical documentation for developers
- **Changelog**: Version-specific changes
- **Database Objects**: Structured data for storage

### Traceability System
- Physical tags in code link back to PRD sections
- Bidirectional verification between code and specifications
- Compliance reporting and gap analysis
- Git integration for change tracking

## Usage

### Run the complete pipeline:
```bash
node build.mjs [path-to-PRD.md] [output-directory] [version]
```

Example:
```bash
node build.mjs ../docs/PRD.md ./output v1.0.0
```

### Use the parser directly:
```bash
npx tsx parser.ts
```

### Test the parser:
```bash
npx tsx test-parser.ts
```

### Start the CMS API:
```bash
npx tsx cms-api.ts
```

## Output Structure

The build pipeline generates the following outputs:

### User Manual
- Location: `./output/manual/user-manual.md`
- Contains: Complete user manual with table of contents

### In-App Help
- Location: `./output/help/`
- Contains: Context-specific help files

### Database Content
- Location: `./output/database/`
- Contains: JSON files ready for database import:
  - `documentation_version.json` - Version information
  - `features.json` - Feature definitions
  - `content_blocks.json` - Content blocks with metadata
  - `manual_sections.json` - Manual sections
  - `help_articles.json` - Help articles

### Build Manifest
- Location: `./output/manifest.json`
- Contains: Build information and statistics

## Integration Points

The system connects to:
- User manual site generation
- In-app help menus and tooltips
- Content management system
- Git version control for change tracking
- Database for dynamic content loading

## Validation & Compliance

The system includes:
- Metadata validation to ensure content blocks meet requirements
- Compliance checking between code and PRD specifications
- Gap analysis to identify missing or incomplete content
- Traceability reporting to verify bidirectional links

## Workflow Automation

The system supports:
- Automatic parsing when PRD.md is updated
- Validation to ensure content blocks meet requirements
- Feedback loop to identify missing or incomplete content
- Git hooks for automatic validation on commits

## Database Schema

The Prisma schema (`documentation-schema.prisma`) defines the database structure for storing documentation content, including:
- Features with documentation
- Content blocks with metadata
- User manual sections
- In-app help articles
- Versioning and change tracking

## Phase 5 Completed

This implements the complete Documentation Automation system with all five phases:
1. Content Parser - Extract structured content from PRD
2. Build Pipeline - Generate documentation for different surfaces
3. Content Management System - Manage and edit documentation
4. Metadata Enrichment - Tools and validation for proper metadata
5. Traceability System - Bidirectional links between code and specs