# Documentation Build Pipeline

This module implements the build pipeline for the Documentation Automation system. It processes PRD content and generates documentation for different surfaces.

## Overview

The build pipeline performs the following steps:
1. Parses the PRD.md file using the PRD Document Parser
2. Processes and enriches content blocks with metadata
3. Generates user manual content
4. Generates in-app help content
5. Prepares database-ready content objects
6. Creates a build manifest

## Components

- `build-pipeline.ts`: Main build pipeline implementation
- `content-generator.ts`: Functions for generating different documentation formats
- `build.mjs`: Executable script to run the build pipeline
- `documentation-schema.prisma`: Database schema for documentation content
- `test-build-pipeline.ts`: Test script to verify pipeline functionality

## Usage

### Run the build pipeline:
```bash
npx tsx build.mjs [path-to-PRD.md] [output-directory] [version]
```

Example:
```bash
npx tsx build.mjs ../docs/PRD.md ./output v1.0.0
```

### Use programmatically:
```typescript
import { DocumentationBuildPipeline } from './build-pipeline';

const pipeline = new DocumentationBuildPipeline('./output');
const versionInfo = {
  version: '1.0.0',
  title: 'Documentation Title',
  description: 'Documentation Description',
  blocks: []
};

await pipeline.build('../docs/PRD.md', versionInfo);
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

## Content Generation

The system can generate different types of documentation:

- **User Manual**: Long-form documentation for users
- **In-App Help**: Context-sensitive help for specific features/routes
- **API Documentation**: Technical documentation for developers
- **Changelog**: Version-specific changes
- **Database Objects**: Structured data for storage

## Metadata Extraction

The pipeline extracts metadata from PRD content:
- `featureId`: Unique identifier for features
- `route`: Associated UI route
- `audience`: Target audience (user, admin, developer)
- `surface`: Target surface (docs, help, tooltips)
- `tags`: Additional categorization tags

## Database Schema

The Prisma schema defines the database structure for storing documentation content, including:
- Features with documentation
- Content blocks with metadata
- User manual sections
- In-app help articles
- Versioning and change tracking

## Phase 2 Completed

This implements Phase 2 of the documentation automation system by creating an automated build pipeline that processes PRD content and generates modular help content for different surfaces.