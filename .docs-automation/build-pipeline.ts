import { PRDDocumentParser } from './parser';
import fs from 'fs/promises';
import path from 'path';

// Interface for the documentation content block
interface DocumentationBlock {
  id: string;
  title: string;
  content: string;
  metadata: {
    featureId?: string;
    route?: string;
    audience?: string[];
    surface?: string[];
    tags?: string[];
  };
  level: number;
}

// Interface for the documentation version
interface DocumentationVersion {
  version: string;
  title: string;
  description: string;
  blocks: DocumentationBlock[];
}

/**
 * Build pipeline for documentation automation
 * Processes PRD content and generates documentation for different surfaces
 */
export class DocumentationBuildPipeline {
  private parser: PRDDocumentParser;
  private outputPath: string;

  constructor(outputPath: string = './output') {
    this.parser = new PRDDocumentParser();
    this.outputPath = outputPath;
  }

  /**
   * Main build function that orchestrates the entire pipeline
   * @param prdPath Path to the PRD.md file
   * @param versionInfo Information about the current documentation version
   */
  async build(prdPath: string, versionInfo: DocumentationVersion): Promise<void> {
    console.log('Starting documentation build pipeline...');
    
    // Step 1: Parse the PRD content
    console.log('Step 1: Parsing PRD content...');
    const parsedDoc = await this.parser.parse(prdPath);
    
    // Step 2: Process and enrich content blocks
    console.log('Step 2: Processing and enriching content blocks...');
    const processedBlocks = this.processContentBlocks(parsedDoc.blocks);
    
    // Step 3: Generate different documentation surfaces
    console.log('Step 3: Generating documentation surfaces...');
    await this.generateUserManual(processedBlocks, versionInfo);
    await this.generateInAppHelp(processedBlocks, versionInfo);
    
    // Step 4: Generate content for database insertion
    console.log('Step 4: Preparing content for database...');
    await this.prepareDatabaseContent(processedBlocks, versionInfo);
    
    // Step 5: Create build manifest
    console.log('Step 5: Creating build manifest...');
    await this.createManifest(versionInfo, processedBlocks.length);
    
    console.log('Documentation build pipeline completed successfully!');
  }

  /**
   * Process and enrich content blocks with additional metadata
   * @param blocks The raw content blocks from the parser
   * @returns Processed blocks with enriched metadata
   */
  private processContentBlocks(blocks: DocumentationBlock[]): DocumentationBlock[] {
    return blocks.map(block => {
      // Apply the metadata extraction from the parser
      return this.parser.extractMetadata({ ...block });
    });
  }

  /**
   * Generate user manual from content blocks
   * @param blocks The processed content blocks
   * @param versionInfo Information about the current version
   */
  private async generateUserManual(blocks: DocumentationBlock[], versionInfo: DocumentationVersion): Promise<void> {
    // Filter blocks for user manual surface
    const manualBlocks = blocks.filter(block => 
      !block.metadata.surface || 
      block.metadata.surface.includes('docs') ||
      block.metadata.surface.includes('manual')
    );

    // Generate table of contents
    const toc = this.generateTOC(manualBlocks);

    // Create manual content
    const manualContent = this.createMarkdownDocument(
      `User Manual - ${versionInfo.title}`,
      versionInfo.description,
      toc,
      manualBlocks
    );

    // Write to file
    const manualPath = path.join(this.outputPath, 'manual');
    await fs.mkdir(manualPath, { recursive: true });
    await fs.writeFile(path.join(manualPath, 'user-manual.md'), manualContent);
    
    console.log(`Generated user manual with ${manualBlocks.length} sections`);
  }

  /**
   * Generate in-app help content from content blocks
   * @param blocks The processed content blocks
   * @param versionInfo Information about the current version
   */
  private async generateInAppHelp(blocks: DocumentationBlock[], versionInfo: DocumentationVersion): Promise<void> {
    // Filter blocks for in-app help surface
    const helpBlocks = blocks.filter(block => 
      block.metadata.surface?.includes('help') ||
      block.metadata.surface?.includes('tooltip') ||
      block.metadata.surface?.includes('in-app')
    );

    // Group help content by routes/features
    const groupedHelp = this.groupHelpByContext(helpBlocks);

    // Create help content for each context
    const helpPath = path.join(this.outputPath, 'help');
    await fs.mkdir(helpPath, { recursive: true });

    for (const [context, contextBlocks] of Object.entries(groupedHelp)) {
      const helpContent = this.createMarkdownDocument(
        `Help for ${context}`,
        `In-app help content for ${context}`,
        null, // No TOC for help articles
        contextBlocks
      );

      // Sanitize context for filename
      const sanitizedContext = context.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      await fs.writeFile(path.join(helpPath, `${sanitizedContext}.md`), helpContent);
    }

    console.log(`Generated in-app help for ${Object.keys(groupedHelp).length} contexts`);
  }

  /**
   * Prepare content for database insertion
   * @param blocks The processed content blocks
   * @param versionInfo Information about the current version
   */
  private async prepareDatabaseContent(blocks: DocumentationBlock[], versionInfo: DocumentationVersion): Promise<void> {
    // Create database-ready objects
    const dbObjects = {
      version: {
        version: versionInfo.version,
        title: versionInfo.title,
        description: versionInfo.description,
        isCurrent: true
      },
      features: this.extractFeatures(blocks),
      contentBlocks: blocks.map(block => ({
        blockId: block.id,
        title: block.title,
        content: block.content,
        level: block.level,
        sortOrder: 0, // Will be calculated based on document order
        metadata: block.metadata
      })),
      manualSections: this.createManualSections(blocks),
      helpArticles: this.createHelpArticles(blocks)
    };

    // Write database objects to JSON files for later import
    const dbPath = path.join(this.outputPath, 'database');
    await fs.mkdir(dbPath, { recursive: true });
    
    await fs.writeFile(
      path.join(dbPath, 'documentation_version.json'),
      JSON.stringify(dbObjects.version, null, 2)
    );
    
    await fs.writeFile(
      path.join(dbPath, 'features.json'),
      JSON.stringify(dbObjects.features, null, 2)
    );
    
    await fs.writeFile(
      path.join(dbPath, 'content_blocks.json'),
      JSON.stringify(dbObjects.contentBlocks, null, 2)
    );
    
    await fs.writeFile(
      path.join(dbPath, 'manual_sections.json'),
      JSON.stringify(dbObjects.manualSections, null, 2)
    );
    
    await fs.writeFile(
      path.join(dbPath, 'help_articles.json'),
      JSON.stringify(dbObjects.helpArticles, null, 2)
    );

    console.log(`Prepared database content for ${blocks.length} blocks`);
  }

  /**
   * Extract features from content blocks
   */
  private extractFeatures(blocks: DocumentationBlock[]): any[] {
    const featuresMap = new Map<string, any>();
    
    for (const block of blocks) {
      if (block.metadata.featureId) {
        if (!featuresMap.has(block.metadata.featureId)) {
          featuresMap.set(block.metadata.featureId, {
            featureId: block.metadata.featureId,
            name: block.metadata.featureId.split('.').pop() || block.metadata.featureId,
            description: `Documentation for ${block.metadata.featureId}`
          });
        }
      }
    }
    
    return Array.from(featuresMap.values());
  }

  /**
   * Create manual sections from content blocks
   */
  private createManualSections(blocks: DocumentationBlock[]): any[] {
    return blocks
      .filter(block => 
        !block.metadata.surface || 
        block.metadata.surface.includes('docs') ||
        block.metadata.surface.includes('manual')
      )
      .map((block, index) => ({
        slug: block.id,
        title: block.title,
        content: block.content,
        sortOrder: index,
        description: block.content.substring(0, 100) + '...'
      }));
  }

  /**
   * Create help articles from content blocks
   */
  private createHelpArticles(blocks: DocumentationBlock[]): any[] {
    const helpBlocks = blocks.filter(block => 
      block.metadata.surface?.includes('help') ||
      block.metadata.surface?.includes('tooltip') ||
      block.metadata.surface?.includes('in-app')
    );
    
    return helpBlocks.map((block, index) => ({
      slug: block.id,
      title: block.title,
      content: block.content,
      summary: block.content.substring(0, 100) + '...',
      contextRoute: block.metadata.route || '/',
      priority: index
    }));
  }

  /**
   * Generate table of contents from blocks
   */
  private generateTOC(blocks: DocumentationBlock[]): string {
    let toc = '\n## Table of Contents\n\n';
    
    for (const block of blocks) {
      // Create proper indentation based on heading level
      const indent = '  '.repeat(Math.max(0, block.level - 2));
      toc += `${indent}- [${block.title}](#${block.id})\n`;
    }
    
    return toc;
  }

  /**
   * Group help content by context (route, feature, etc.)
   */
  private groupHelpByContext(blocks: DocumentationBlock[]): Record<string, DocumentationBlock[]> {
    const grouped: Record<string, DocumentationBlock[]> = {};
    
    for (const block of blocks) {
      // Group by route first, then by feature if no route
      const context = block.metadata.route || 
                     block.metadata.featureId || 
                     'general';
      
      if (!grouped[context]) {
        grouped[context] = [];
      }
      
      grouped[context].push(block);
    }
    
    return grouped;
  }

  /**
   * Create a markdown document with TOC and content blocks
   */
  private createMarkdownDocument(
    title: string, 
    description: string, 
    toc: string | null, 
    blocks: DocumentationBlock[]
  ): string {
    let content = `# ${title}\n\n`;
    
    if (description) {
      content += `${description}\n\n`;
    }
    
    if (toc) {
      content += toc + '\n';
    }
    
    for (const block of blocks) {
      // Adjust heading levels to fit within the document structure
      const adjustedHeading = '#'.repeat(block.level) + ' ' + block.title;
      content += `\n${adjustedHeading}\n\n${block.content}\n`;
      
      // Add metadata as comments for reference
      if (Object.keys(block.metadata).length > 0) {
        content += `\n<!-- Metadata: ${JSON.stringify(block.metadata)} -->\n`;
      }
    }
    
    return content;
  }

  /**
   * Create a build manifest with information about the build
   */
  private async createManifest(versionInfo: DocumentationVersion, blockCount: number): Promise<void> {
    const manifest = {
      version: versionInfo.version,
      title: versionInfo.title,
      description: versionInfo.description,
      builtAt: new Date().toISOString(),
      blockCount,
      surfaces: ['user-manual', 'in-app-help'],
      outputPaths: {
        manual: path.join(this.outputPath, 'manual'),
        help: path.join(this.outputPath, 'help'),
        database: path.join(this.outputPath, 'database')
      }
    };

    const manifestPath = path.join(this.outputPath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

// Example usage
if (require.main === module) {
  console.log('Documentation Build Pipeline initialized.');
  console.log('To run the pipeline, instantiate DocumentationBuildPipeline and call build().');
}