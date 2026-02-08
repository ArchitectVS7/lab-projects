import fs from 'fs/promises';
import path from 'path';

interface ContentBlock {
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

interface ParsedDocument {
  blocks: ContentBlock[];
  toc: { level: number; title: string; id: string }[];
}

/**
 * Parses a markdown document and extracts structured content blocks
 * with metadata for documentation automation
 */
export class PRDDocumentParser {
  /**
   * Parse the PRD markdown file and extract content blocks
   * @param filePath Path to the PRD.md file
   * @returns Structured content blocks with metadata
   */
  async parse(filePath: string): Promise<ParsedDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content);
  }

  /**
   * Parse markdown content string into structured blocks
   * @param content Markdown content to parse
   * @returns Structured content blocks with metadata
   */
  parseContent(content: string): ParsedDocument {
    const lines = content.split('\n');
    const blocks: ContentBlock[] = [];
    const toc: { level: number; title: string; id: string }[] = [];
    
    let currentBlock: ContentBlock | null = null;
    let currentContent: string[] = [];
    let inCodeBlock = false;
    let codeBlockMarker = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        codeBlockMarker = line.trim();
        currentContent.push(line);
        continue;
      }
      
      if (inCodeBlock) {
        currentContent.push(line);
        continue;
      }

      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // If we were building a previous block, save it
        if (currentBlock) {
          currentBlock.content = currentContent.join('\n').trim();
          blocks.push(currentBlock);
        }

        const level = headingMatch[1].length;
        let title = headingMatch[2].trim();
        
        // Extract potential metadata from title (e.g., "2.5.3 Task Creation (auth: user, surface: help)")
        const metadataMatch = title.match(/^(.+?)\s*\((.+)\)$/);
        let extractedMetadata: Record<string, any> = {};
        
        if (metadataMatch) {
          title = metadataMatch[1].trim();
          const metaString = metadataMatch[2];
          
          // Parse metadata like "auth: user, surface: help"
          const pairs = metaString.split(',').map(pair => pair.trim());
          for (const pair of pairs) {
            const [key, value] = pair.split(':').map(str => str.trim());
            if (key && value) {
              // Handle arrays (e.g., "surface: docs,help" -> ["docs", "help"])
              if (value.includes(',')) {
                extractedMetadata[key] = value.split(',').map(v => v.trim());
              } else {
                extractedMetadata[key] = value;
              }
            }
          }
        }

        // Create TOC entry
        const tocId = this.generateId(title);
        toc.push({ level, title, id: tocId });

        // Create new block
        currentBlock = {
          id: tocId,
          title,
          content: '',
          metadata: extractedMetadata,
          level
        };

        currentContent = [line]; // Start with the heading line
      } else {
        // Regular content line
        if (currentBlock) {
          currentContent.push(line);
        }
      }
    }

    // Save the last block if it exists
    if (currentBlock) {
      currentBlock.content = currentContent.join('\n').trim();
      blocks.push(currentBlock);
    }

    return { blocks, toc };
  }

  /**
   * Generate a URL-friendly ID from a title
   * @param title The title to convert to an ID
   * @returns URL-friendly ID string
   */
  generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
  }

  /**
   * Extract metadata from a content block based on patterns in the content
   * @param block The content block to analyze
   * @returns Updated block with extracted metadata
   */
  extractMetadata(block: ContentBlock): ContentBlock {
    // Look for common patterns in the content that might indicate metadata
    const content = block.content.toLowerCase();
    
    // Extract feature ID if it follows a pattern like "feature: auth.login"
    const featureMatch = content.match(/feature:\s*([a-z0-9.-]+)/i);
    if (featureMatch) {
      block.metadata.featureId = featureMatch[1];
    }
    
    // Extract route if it follows a pattern like "route: /login"
    const routeMatch = content.match(/route:\s*([a-z0-9/-]+)/i);
    if (routeMatch) {
      block.metadata.route = routeMatch[1];
    }
    
    // Extract audience if mentioned
    if (content.includes('user') || content.includes('end-user')) {
      if (!block.metadata.audience) block.metadata.audience = [];
      if (!block.metadata.audience.includes('user')) block.metadata.audience.push('user');
    }
    
    if (content.includes('admin') || content.includes('administrator')) {
      if (!block.metadata.audience) block.metadata.audience = [];
      if (!block.metadata.audience.includes('admin')) block.metadata.audience.push('admin');
    }
    
    if (content.includes('developer') || content.includes('api')) {
      if (!block.metadata.audience) block.metadata.audience = [];
      if (!block.metadata.audience.includes('developer')) block.metadata.audience.push('developer');
    }
    
    // Extract surface if mentioned
    if (content.includes('docs') || content.includes('documentation')) {
      if (!block.metadata.surface) block.metadata.surface = [];
      if (!block.metadata.surface.includes('docs')) block.metadata.surface.push('docs');
    }
    
    if (content.includes('help') || content.includes('tooltip') || content.includes('in-app')) {
      if (!block.metadata.surface) block.metadata.surface = [];
      if (!block.metadata.surface.includes('help')) block.metadata.surface.push('help');
    }
    
    return block;
  }

  /**
   * Filter blocks by specific criteria
   * @param blocks The blocks to filter
   * @param criteria The filtering criteria
   * @returns Filtered blocks
   */
  filterBlocks(blocks: ContentBlock[], criteria: {
    featureId?: string;
    route?: string;
    audience?: string;
    surface?: string;
    level?: number;
  }): ContentBlock[] {
    return blocks.filter(block => {
      if (criteria.featureId && block.metadata.featureId !== criteria.featureId) return false;
      if (criteria.route && block.metadata.route !== criteria.route) return false;
      if (criteria.audience && (!block.metadata.audience || !block.metadata.audience.includes(criteria.audience))) return false;
      if (criteria.surface && (!block.metadata.surface || !block.metadata.surface.includes(criteria.surface))) return false;
      if (criteria.level !== undefined && block.level !== criteria.level) return false;
      return true;
    });
  }

  /**
   * Convert blocks to different output formats
   * @param blocks The blocks to convert
   * @param format The target format ('markdown', 'json', 'html')
   * @returns Converted content
   */
  convertBlocks(blocks: ContentBlock[], format: 'markdown' | 'json' | 'html'): string {
    switch (format) {
      case 'markdown':
        return blocks.map(block => {
          const heading = '#'.repeat(block.level) + ' ' + block.title;
          const meta = Object.entries(block.metadata).length > 0 
            ? `\n<!-- metadata: ${JSON.stringify(block.metadata)} -->` 
            : '';
          return `${heading}${meta}\n\n${block.content}`;
        }).join('\n\n---\n\n');
      
      case 'json':
        return JSON.stringify(blocks, null, 2);
      
      case 'html':
        return blocks.map(block => {
          return `<section id="${block.id}" class="content-block level-${block.level}">
            <h${block.level}>${this.escapeHtml(block.title)}</h${block.level}>
            <div class="content">${this.markdownToHtml(block.content)}</div>
            <div class="metadata" style="display:none;">${JSON.stringify(block.metadata)}</div>
          </section>`;
        }).join('\n');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Simple HTML escaping utility
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Basic markdown to HTML conversion (simplified)
   */
  private markdownToHtml(md: string): string {
    // This is a simplified converter - in practice you'd use a proper MD library
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)(\*\*)/g, '<strong>$1</strong>')
      .replace(/\*(.*?)(\*)/g, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n$/g, '<br />');
  }
}

// Example usage
if (require.main === module) {
  const parser = new PRDDocumentParser();
  
  // Example of how to use the parser
  console.log('Documentation automation parser initialized.');
  console.log('Usage: await parser.parse("path/to/PRD.md")');
}