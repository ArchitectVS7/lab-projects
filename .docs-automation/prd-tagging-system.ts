/**
 * PRD Section Tagging System
 * Implements physical tags in code that link back to PRD sections
 * for automatic traceability between code and specifications
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

// Interface for PRD tag
interface PRDTag {
  id: string;           // Unique identifier for the tag
  prdSection: string;   // Section in the PRD this tag refers to
  featureId: string;    // Feature identifier
  codeLocation: string; // File and line where the tag is placed
  description: string;  // Description of the implementation
  lastVerified: string; // Last verification timestamp
  status: 'implemented' | 'in-progress' | 'planned' | 'deprecated';
}

// Interface for tag configuration
interface TagConfig {
  tagPrefix: string;    // Prefix for tags (default: "PRD:")
  allowedSections: string[]; // List of allowed PRD sections
  validationRules: {
    requiredFields: string[];
    formatRegex: string;
  };
}

export class PRDSectionTaggingSystem {
  private config: TagConfig;
  private tags: PRDTag[] = [];
  private prdPath: string;

  constructor(config?: Partial<TagConfig>, prdPath: string = './docs/PRD.md') {
    this.config = {
      tagPrefix: config?.tagPrefix || 'PRD:',
      allowedSections: config?.allowedSections || [],
      validationRules: config?.validationRules || {
        requiredFields: ['featureId', 'prdSection'],
        formatRegex: 'PRD:\\s*([^,]+),\\s*feature:\\s*([^,]+)'
      }
    };
    this.prdPath = prdPath;
  }

  /**
   * Scan codebase for PRD tags
   */
  async scanForTags(): Promise<PRDTag[]> {
    this.tags = [];
    
    const files = await this.scanCodeFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for PRD tags in the line
        const tagMatches = this.extractTagsFromLine(line, file, i + 1);
        this.tags.push(...tagMatches);
      }
    }
    
    return this.tags;
  }

  /**
   * Extract PRD tags from a line of code
   */
  private extractTagsFromLine(line: string, file: string, lineNumber: number): PRDTag[] {
    const tags: PRDTag[] = [];
    
    // Look for tags in the format: PRD: section-name, feature: feature-id
    const tagRegex = new RegExp(`${this.config.tagPrefix}\\s*([^\\n]*)`, 'gi');
    let match;
    
    while ((match = tagRegex.exec(line)) !== null) {
      const tagContent = match[1].trim();
      
      // Parse the tag content
      const tagData = this.parseTagContent(tagContent, file, lineNumber);
      if (tagData) {
        tags.push({
          id: this.generateTagId(tagData.prdSection, tagData.featureId, file, lineNumber),
          ...tagData,
          codeLocation: `${file}:${lineNumber}`,
          lastVerified: new Date().toISOString(),
          status: 'implemented' // Default status
        });
      }
    }
    
    return tags;
  }

  /**
   * Parse tag content to extract structured data
   */
  private parseTagContent(tagContent: string, file: string, lineNumber: number): 
    { prdSection: string; featureId: string; description: string } | null {
    
    // Expected format: "section-name, feature: feature-id, description: description"
    const parts = tagContent.split(',').map(part => part.trim());
    
    let prdSection = '';
    let featureId = '';
    let description = '';
    
    for (const part of parts) {
      if (part.includes('feature:')) {
        featureId = part.split('feature:')[1].trim();
      } else if (part.includes('description:')) {
        description = part.split('description:')[1].trim();
      } else if (!part.includes('feature:') && !part.includes('description:')) {
        // Assume this is the section name if it doesn't contain other keywords
        prdSection = part.trim();
      }
    }
    
    // If we couldn't parse properly, try alternative format
    if (!featureId && !prdSection) {
      // Try format like: "section-name:feature-id"
      const colonSplit = tagContent.split(':');
      if (colonSplit.length >= 2) {
        prdSection = colonSplit[0].trim();
        featureId = colonSplit[1].trim();
      }
    }
    
    if (featureId && prdSection) {
      return {
        prdSection,
        featureId,
        description: description || `Implementation of ${featureId} from ${prdSection}`
      };
    }
    
    return null;
  }

  /**
   * Generate a unique tag ID
   */
  private generateTagId(prdSection: string, featureId: string, file: string, lineNumber: number): string {
    return `${prdSection}-${featureId}-${file.replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}-${lineNumber}`;
  }

  /**
   * Scan codebase for relevant files
   */
  private async scanCodeFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string) => {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      
      for (const dirent of dirents) {
        const fullPath = path.join(dir, dirent.name);
        
        if (dirent.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (dirent.name !== 'node_modules' && 
              dirent.name !== '.git' && 
              dirent.name !== 'dist' && 
              dirent.name !== 'build' &&
              dirent.name !== '.docs-automation') {
            await scanDir(fullPath);
          }
        } else if (this.isCodeFile(dirent.name)) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDir(path.dirname(this.prdPath).replace('/docs', '')); // Start from project root
    return files;
  }

  /**
   * Check if a filename represents a code file
   */
  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Add a PRD tag to a code file
   */
  async addTagToFile(filePath: string, tag: Omit<PRDTag, 'id' | 'codeLocation' | 'lastVerified'>): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // For simplicity, we'll add the tag as a comment on the first line
      // In a real implementation, we might want to add it near relevant code
      const tagComment = `// ${this.config.tagPrefix} ${tag.prdSection}, feature: ${tag.featureId}${tag.description ? `, description: ${tag.description}` : ''}`;
      
      // Add the tag as a comment at the beginning of the file
      lines.unshift(tagComment);
      
      await fs.writeFile(filePath, lines.join('\n'));
      
      // Update our tags array
      const newTag: PRDTag = {
        id: this.generateTagId(tag.prdSection, tag.featureId, filePath, 1),
        ...tag,
        codeLocation: `${filePath}:1`,
        lastVerified: new Date().toISOString(),
        status: tag.status || 'implemented'
      };
      
      this.tags.push(newTag);
      
      return true;
    } catch (error) {
      console.error(`Error adding tag to file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Verify that tags correspond to actual PRD sections
   */
  async verifyTagsAgainstPRD(): Promise<{
    validTags: PRDTag[];
    invalidTags: Array<{ tag: PRDTag; reason: string }>;
  }> {
    const prdContent = await fs.readFile(this.prdPath, 'utf-8');
    const validTags: PRDTag[] = [];
    const invalidTags: Array<{ tag: PRDTag; reason: string }> = [];
    
    for (const tag of this.tags) {
      // Check if the PRD section exists in the document
      const sectionExists = await this.prdSectionExists(prdContent, tag.prdSection);
      
      if (sectionExists) {
        // Check if the feature ID is mentioned in the section
        const featureMentioned = await this.featureMentionedInSection(prdContent, tag.prdSection, tag.featureId);
        
        if (featureMentioned) {
          validTags.push(tag);
        } else {
          invalidTags.push({
            tag,
            reason: `Feature ID '${tag.featureId}' not mentioned in section '${tag.prdSection}'`
          });
        }
      } else {
        invalidTags.push({
          tag,
          reason: `PRD section '${tag.prdSection}' does not exist`
        });
      }
    }
    
    return { validTags, invalidTags };
  }

  /**
   * Check if a PRD section exists in the content
   */
  private async prdSectionExists(content: string, sectionName: string): Promise<boolean> {
    // Look for headings that contain the section name
    const headingRegex = new RegExp(`^#+\\s+.*${sectionName}.*$`, 'mi');
    return headingRegex.test(content);
  }

  /**
   * Check if a feature is mentioned in a specific PRD section
   */
  private async featureMentionedInSection(content: string, sectionName: string, featureId: string): Promise<boolean> {
    // Find the section content
    const sectionRegex = new RegExp(`^#+\\s+.*${sectionName}.*$([\\s\\S]*?)(?=^#+\\s+|$)`, 'mi');
    const match = content.match(sectionRegex);
    
    if (!match) return false;
    
    // Check if the feature ID is mentioned in the section
    return match[0].toLowerCase().includes(featureId.toLowerCase());
  }

  /**
   * Generate a traceability report
   */
  async generateTraceabilityReport(): Promise<string> {
    const verification = await this.verifyTagsAgainstPRD();
    
    let report = '# PRD Traceability Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n`;
    report += `- Valid tags: ${verification.validTags.length}\n`;
    report += `- Invalid tags: ${verification.invalidTags.length}\n`;
    report += `- Total tags found: ${this.tags.length}\n\n`;
    
    if (verification.validTags.length > 0) {
      report += `## Valid Tags (${verification.validTags.length})\n\n`;
      for (const tag of verification.validTags) {
        report += `- **${tag.featureId}** in [${tag.codeLocation}](${tag.codeLocation.replace(process.cwd(), '')})\n`;
        report += `  - PRD Section: ${tag.prdSection}\n`;
        report += `  - Status: ${tag.status}\n\n`;
      }
    }
    
    if (verification.invalidTags.length > 0) {
      report += `## Invalid Tags (${verification.invalidTags.length})\n\n`;
      for (const { tag, reason } of verification.invalidTags) {
        report += `- **${tag.featureId}** in [${tag.codeLocation}](${tag.codeLocation.replace(process.cwd(), '')})\n`;
        report += `  - PRD Section: ${tag.prdSection}\n`;
        report += `  - Reason: ${reason}\n\n`;
      }
    }
    
    // Check for features in PRD that don't have code tags
    const unimplementedFeatures = await this.findUnimplementedFeatures();
    if (unimplementedFeatures.length > 0) {
      report += `## Features in PRD Without Implementation (${unimplementedFeatures.length})\n\n`;
      for (const feature of unimplementedFeatures) {
        report += `- **${feature.featureId}** in section "${feature.section}"\n`;
        report += `  - Description: ${feature.description}\n\n`;
      }
    }
    
    return report;
  }

  /**
   * Find features in PRD that don't have corresponding code tags
   */
  private async findUnimplementedFeatures(): Promise<Array<{featureId: string, section: string, description: string}>> {
    const prdContent = await fs.readFile(this.prdPath, 'utf-8');
    const lines = prdContent.split('\n');
    
    const unimplemented: Array<{featureId: string, section: string, description: string}> = [];
    let currentSection = '';
    
    for (const line of lines) {
      // Update current section if this is a heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        currentSection = headingMatch[2].trim();
        continue;
      }
      
      // Look for feature identifiers in the content
      const featureMatches = line.match(/feature[:\-]?\s*([a-zA-Z0-9.-]+)/gi);
      if (featureMatches) {
        for (const match of featureMatches) {
          const featureId = match.split(/[:\-]/)[1]?.trim();
          
          // Check if this feature has a corresponding tag in our code
          const hasTag = this.tags.some(tag => 
            tag.featureId.toLowerCase() === featureId.toLowerCase() &&
            tag.prdSection.toLowerCase() === currentSection.toLowerCase()
          );
          
          if (!hasTag) {
            unimplemented.push({
              featureId,
              section: currentSection,
              description: line.substring(0, 100) + '...'
            });
          }
        }
      }
    }
    
    return unimplemented;
  }

  /**
   * Update tag status
   */
  async updateTagStatus(tagId: string, status: PRDTag['status']): Promise<boolean> {
    const tagIndex = this.tags.findIndex(tag => tag.id === tagId);
    
    if (tagIndex !== -1) {
      this.tags[tagIndex].status = status;
      this.tags[tagIndex].lastVerified = new Date().toISOString();
      return true;
    }
    
    return false;
  }

  /**
   * Get all tags
   */
  getAllTags(): PRDTag[] {
    return this.tags;
  }

  /**
   * Get tags by feature ID
   */
  getTagsByFeatureId(featureId: string): PRDTag[] {
    return this.tags.filter(tag => 
      tag.featureId.toLowerCase() === featureId.toLowerCase()
    );
  }

  /**
   * Get tags by PRD section
   */
  getTagsByPRDSection(section: string): PRDTag[] {
    return this.tags.filter(tag => 
      tag.prdSection.toLowerCase() === section.toLowerCase()
    );
  }

  /**
   * Get tags by status
   */
  getTagsByStatus(status: PRDTag['status']): PRDTag[] {
    return this.tags.filter(tag => tag.status === status);
  }
}

// Example usage
if (require.main === module) {
  const taggingSystem = new PRDSectionTaggingSystem();
  console.log('PRD Section Tagging System initialized');
  console.log('Available methods: scanForTags, verifyTagsAgainstPRD, generateTraceabilityReport');
}