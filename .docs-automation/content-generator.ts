import { DocumentationBlock } from './build-pipeline';

/**
 * Content generation functions for different documentation surfaces
 */
export class ContentGenerator {
  /**
   * Generate user manual content from documentation blocks
   * @param blocks The documentation blocks to convert
   * @param title The title of the manual
   * @param description The description of the manual
   * @returns Generated user manual content in markdown format
   */
  static generateUserManual(blocks: DocumentationBlock[], title: string, description: string): string {
    let content = `# ${title}\n\n`;
    
    if (description) {
      content += `${description}\n\n`;
    }
    
    // Generate table of contents
    content += '## Table of Contents\n\n';
    for (const block of blocks) {
      const indent = '  '.repeat(Math.max(0, block.level - 2));
      content += `${indent}- [${block.title}](#${this.slugify(block.title)})\n`;
    }
    content += '\n';
    
    // Add each block with proper formatting
    for (const block of blocks) {
      content += `\n${'#'.repeat(block.level)} ${block.title}\n\n`;
      content += `${block.content}\n`;
      
      // Add metadata as comments for reference
      if (Object.keys(block.metadata).length > 0) {
        content += `\n<!-- Feature: ${block.metadata.featureId || 'N/A'} -->\n`;
        content += `<!-- Route: ${block.metadata.route || 'N/A'} -->\n`;
        content += `<!-- Audience: ${(block.metadata.audience || []).join(', ') || 'N/A'} -->\n`;
        content += `<!-- Surface: ${(block.metadata.surface || []).join(', ') || 'N/A'} -->\n`;
      }
    }
    
    return content;
  }

  /**
   * Generate in-app help content from documentation blocks
   * @param blocks The documentation blocks to convert
   * @param context The context for the help content (e.g., route, feature)
   * @returns Generated in-app help content
   */
  static generateInAppHelp(blocks: DocumentationBlock[], context: string): string {
    let content = `# Help for ${context}\n\n`;
    
    for (const block of blocks) {
      content += `## ${block.title}\n\n`;
      content += `${block.content}\n\n`;
      
      // Add context-specific metadata
      if (block.metadata.route) {
        content += `**Applies to**: ${block.metadata.route}\n\n`;
      }
      
      if (block.metadata.audience) {
        content += `**Audience**: ${block.metadata.audience.join(', ')}\n\n`;
      }
    }
    
    return content;
  }

  /**
   * Generate API documentation from documentation blocks
   * @param blocks The documentation blocks to convert
   * @returns Generated API documentation
   */
  static generateAPIDocs(blocks: DocumentationBlock[]): string {
    let content = '# API Documentation\n\n';
    
    const apiBlocks = blocks.filter(block => 
      block.metadata.audience?.includes('developer') || 
      block.title.toLowerCase().includes('api') ||
      block.content.toLowerCase().includes('endpoint')
    );
    
    for (const block of apiBlocks) {
      content += `## ${block.title}\n\n`;
      content += `${block.content}\n\n`;
      
      // Extract and format API-specific information
      const endpoints = this.extractEndpoints(block.content);
      if (endpoints.length > 0) {
        content += '### Endpoints\n\n';
        for (const endpoint of endpoints) {
          content += `- \`${endpoint.method}\` ${endpoint.path}\n`;
          content += `  - ${endpoint.description}\n\n`;
        }
      }
    }
    
    return content;
  }

  /**
   * Generate changelog from documentation blocks
   * @param blocks The documentation blocks to convert
   * @param version The version for the changelog
   * @returns Generated changelog content
   */
  static generateChangelog(blocks: DocumentationBlock[], version: string): string {
    let content = `# Changelog v${version}\n\n`;
    
    // Group blocks by change type (new, updated, deprecated, etc.)
    const newFeatures = blocks.filter(block => 
      block.title.toLowerCase().includes('new') || 
      block.content.toLowerCase().includes('added') ||
      block.content.toLowerCase().includes('introducing')
    );
    
    const updates = blocks.filter(block => 
      block.title.toLowerCase().includes('update') || 
      block.content.toLowerCase().includes('updated') ||
      block.content.toLowerCase().includes('improved')
    );
    
    const fixes = blocks.filter(block => 
      block.title.toLowerCase().includes('fix') || 
      block.content.toLowerCase().includes('fixed') ||
      block.content.toLowerCase().includes('resolved')
    );
    
    if (newFeatures.length > 0) {
      content += '## New Features\n\n';
      for (const block of newFeatures) {
        content += `- ${block.title}: ${this.getFirstSentence(block.content)}\n`;
      }
      content += '\n';
    }
    
    if (updates.length > 0) {
      content += '## Updates\n\n';
      for (const block of updates) {
        content += `- ${block.title}: ${this.getFirstSentence(block.content)}\n`;
      }
      content += '\n';
    }
    
    if (fixes.length > 0) {
      content += '## Fixes\n\n';
      for (const block of fixes) {
        content += `- ${block.title}: ${this.getFirstSentence(block.content)}\n`;
      }
      content += '\n';
    }
    
    return content;
  }

  /**
   * Generate database-ready content objects
   * @param blocks The documentation blocks to convert
   * @param versionId The ID of the documentation version
   * @returns Array of database-ready content objects
   */
  static generateDatabaseObjects(blocks: DocumentationBlock[], versionId: string): any[] {
    return blocks.map((block, index) => ({
      id: block.id,
      versionId,
      title: block.title,
      content: block.content,
      level: block.level,
      sortOrder: index,
      metadata: {
        featureId: block.metadata.featureId || null,
        route: block.metadata.route || null,
        audience: block.metadata.audience || [],
        surface: block.metadata.surface || [],
        tags: block.metadata.tags || [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Extract API endpoints from content
   * @param content The content to scan for endpoints
   * @returns Array of endpoint objects
   */
  private static extractEndpoints(content: string): Array<{method: string, path: string, description: string}> {
    const endpoints: Array<{method: string, path: string, description: string}> = [];
    
    // Regex to match common endpoint patterns
    const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+(`|'|")([^`'"]+)(`|'|")/gi;
    let match;
    
    while ((match = endpointRegex.exec(content)) !== null) {
      const method = match[1];
      const path = match[3];
      
      // Try to find a description near the endpoint
      const contentBefore = content.substring(0, match.index);
      const sentences = contentBefore.split(/[.!?]+/);
      const description = sentences[sentences.length - 1]?.trim() || 'API endpoint';
      
      endpoints.push({ method, path, description });
    }
    
    return endpoints;
  }

  /**
   * Get the first sentence from content
   * @param content The content to extract from
   * @returns The first sentence
   */
  private static getFirstSentence(content: string): string {
    // Split by sentence endings and return the first non-empty part
    const sentences = content.split(/[.!?]+/);
    return sentences[0]?.trim() || content.substring(0, 50) + '...';
  }

  /**
   * Convert a string to a URL-friendly slug
   * @param text The text to convert
   * @returns The URL-friendly slug
   */
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
  }
}