/**
 * Metadata Enrichment Tools
 * Tools to help contributors add proper metadata to PRD sections
 * and ensure traceability between code and specifications
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Interface for PRD section metadata
interface PRDSectionMetadata {
  id: string;
  title: string;
  featureId: string;
  codeRefs: string[]; // References to code files/lines
  lastUpdated: string;
  authors: string[];
  status: 'draft' | 'review' | 'approved' | 'implemented';
  relatedSections: string[];
  version: string;
}

// Interface for code-to-spec mapping
interface CodeToSpecMapping {
  codePath: string;
  specPath: string;
  specSectionId: string;
  lastSync: string;
  syncStatus: 'synced' | 'outdated' | 'missing';
}

// Main metadata enrichment class
export class MetadataEnrichmentTools {
  private prdPath: string;
  private codeBasePath: string;
  private mappings: CodeToSpecMapping[] = [];

  constructor(prdPath: string = './docs/PRD.md', codeBasePath: string = './') {
    this.prdPath = prdPath;
    this.codeBasePath = codeBasePath;
  }

  /**
   * Add metadata tags to PRD sections
   * @param sectionTitle The title of the section to enrich
   * @param metadata The metadata to add
   * @returns Updated PRD content
   */
  async addMetadataToSection(sectionTitle: string, metadata: Partial<PRDSectionMetadata>): Promise<string> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    const lines = content.split('\n');
    const updatedLines: string[] = [];
    
    let inTargetSection = false;
    let sectionStartLine = -1;
    let sectionEndLine = -1;
    
    // Find the target section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is the start of the target section
      if (line.trim().startsWith('#') && line.includes(sectionTitle)) {
        inTargetSection = true;
        sectionStartLine = i;
        
        // Add metadata as YAML frontmatter after the heading
        updatedLines.push(line);
        
        // Add metadata block
        const metadataBlock = this.formatMetadata(metadata);
        updatedLines.push(metadataBlock);
      } 
      // Check if we're moving to the next section (higher level heading)
      else if (inTargetSection && line.trim().startsWith('#')) {
        inTargetSection = false;
        updatedLines.push(line);
      } 
      else {
        updatedLines.push(line);
      }
    }
    
    const updatedContent = updatedLines.join('\n');
    await fs.writeFile(this.prdPath, updatedContent);
    
    return updatedContent;
  }

  /**
   * Format metadata as YAML block
   */
  private formatMetadata(metadata: Partial<PRDSectionMetadata>): string {
    const yamlLines = ['<!--', 'metadata:'];
    
    if (metadata.featureId) yamlLines.push(`  featureId: ${metadata.featureId}`);
    if (metadata.codeRefs && metadata.codeRefs.length > 0) {
      yamlLines.push('  codeRefs:');
      metadata.codeRefs.forEach(ref => yamlLines.push(`    - ${ref}`));
    }
    if (metadata.authors && metadata.authors.length > 0) {
      yamlLines.push('  authors:');
      metadata.authors.forEach(author => yamlLines.push(`    - ${author}`));
    }
    if (metadata.status) yamlLines.push(`  status: ${metadata.status}`);
    if (metadata.relatedSections && metadata.relatedSections.length > 0) {
      yamlLines.push('  relatedSections:');
      metadata.relatedSections.forEach(section => yamlLines.push(`    - ${section}`));
    }
    if (metadata.version) yamlLines.push(`  version: ${metadata.version}`);
    
    yamlLines.push('-->');
    return yamlLines.join('\n');
  }

  /**
   * Scan codebase for references to PRD sections
   */
  async scanCodeForSpecReferences(): Promise<CodeToSpecMapping[]> {
    const mappings: CodeToSpecMapping[] = [];
    
    // Scan for featureId references in code
    const files = await this.scanCodeFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for featureId references in comments or strings
        const featureIdMatches = line.match(/featureId:\s*['"]([^'"]+)['"]/g);
        if (featureIdMatches) {
          for (const match of featureIdMatches) {
            const featureId = match.split(/['"]/)[1]; // Extract the ID
            
            // Find corresponding PRD section
            const specSection = await this.findPRDSectionByFeatureId(featureId);
            
            if (specSection) {
              mappings.push({
                codePath: file,
                specPath: this.prdPath,
                specSectionId: specSection.id,
                lastSync: new Date().toISOString(),
                syncStatus: 'synced'
              });
            } else {
              // Missing spec reference
              mappings.push({
                codePath: file,
                specPath: this.prdPath,
                specSectionId: featureId,
                lastSync: new Date().toISOString(),
                syncStatus: 'missing'
              });
            }
          }
        }
      }
    }
    
    this.mappings = mappings;
    return mappings;
  }

  /**
   * Find PRD section by feature ID
   */
  private async findPRDSectionByFeatureId(featureId: string): Promise<{id: string, title: string} | null> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for featureId in metadata blocks
      if (line.includes('featureId:') && line.includes(featureId)) {
        // Find the preceding heading
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          if (prevLine.trim().startsWith('#')) {
            const title = prevLine.replace(/^#+\s*/, '').trim();
            return { id: this.generateId(title), title };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Generate an ID from a title
   */
  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
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
    
    await scanDir(this.codeBasePath);
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
   * Create a mapping between code and spec
   */
  async createCodeSpecMapping(codePath: string, specSectionId: string): Promise<void> {
    // Check if mapping already exists
    const existingIndex = this.mappings.findIndex(
      m => m.codePath === codePath && m.specSectionId === specSectionId
    );
    
    if (existingIndex !== -1) {
      // Update existing mapping
      this.mappings[existingIndex].lastSync = new Date().toISOString();
      this.mappings[existingIndex].syncStatus = 'synced';
    } else {
      // Create new mapping
      this.mappings.push({
        codePath,
        specPath: this.prdPath,
        specSectionId,
        lastSync: new Date().toISOString(),
        syncStatus: 'synced'
      });
    }
    
    // Save mappings to file
    await this.saveMappings();
  }

  /**
   * Save mappings to a file for persistence
   */
  private async saveMappings(): Promise<void> {
    const mappingsPath = path.join(path.dirname(this.prdPath), 'spec-code-mappings.json');
    await fs.writeFile(mappingsPath, JSON.stringify(this.mappings, null, 2));
  }

  /**
   * Load existing mappings from file
   */
  async loadMappings(): Promise<CodeToSpecMapping[]> {
    const mappingsPath = path.join(path.dirname(this.prdPath), 'spec-code-mappings.json');
    
    try {
      const content = await fs.readFile(mappingsPath, 'utf-8');
      this.mappings = JSON.parse(content);
      return this.mappings;
    } catch (error) {
      // File doesn't exist, return empty array
      this.mappings = [];
      return [];
    }
  }

  /**
   * Check synchronization status between code and spec
   */
  async checkSyncStatus(): Promise<{
    synced: CodeToSpecMapping[];
    outdated: CodeToSpecMapping[];
    missingSpec: CodeToSpecMapping[];
    missingCode: CodeToSpecMapping[];
  }> {
    await this.loadMappings();
    
    const synced: CodeToSpecMapping[] = [];
    const outdated: CodeToSpecMapping[] = [];
    const missingSpec: CodeToSpecMapping[] = [];
    const missingCode: CodeToSpecMapping[] = [];
    
    for (const mapping of this.mappings) {
      // Check if spec section still exists
      const specExists = await this.prdSectionExists(mapping.specSectionId);
      
      if (!specExists) {
        missingSpec.push(mapping);
        continue;
      }
      
      // Check if code file still exists
      const codeExists = await this.fileExists(mapping.codePath);
      
      if (!codeExists) {
        missingCode.push(mapping);
        continue;
      }
      
      // For now, assume all existing mappings are synced
      // In a real implementation, we'd check timestamps or content hashes
      synced.push(mapping);
    }
    
    return { synced, outdated, missingSpec, missingCode };
  }

  /**
   * Check if a PRD section exists
   */
  private async prdSectionExists(sectionId: string): Promise<boolean> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    // Simple check - in reality we'd have a more sophisticated lookup
    return content.toLowerCase().includes(sectionId.toLowerCase());
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a report of spec-code synchronization
   */
  async generateSyncReport(): Promise<string> {
    const status = await this.checkSyncStatus();
    
    let report = '# Spec-Code Synchronization Report\n\n';
    
    report += `## Summary\n`;
    report += `- Synced: ${status.synced.length}\n`;
    report += `- Outdated: ${status.outdated.length}\n`;
    report += `- Missing Spec: ${status.missingSpec.length}\n`;
    report += `- Missing Code: ${status.missingCode.length}\n\n`;
    
    if (status.missingSpec.length > 0) {
      report += `## Code Implementations Without Spec Documentation (${status.missingSpec.length})\n\n`;
      for (const mapping of status.missingSpec) {
        report += `- **${mapping.codePath}** -> Feature ID: ${mapping.specSectionId}\n`;
      }
      report += '\n';
    }
    
    if (status.missingCode.length > 0) {
      report += `## Spec Sections Without Code Implementation (${status.missingCode.length})\n\n`;
      for (const mapping of status.missingCode) {
        report += `- **${mapping.specSectionId}** -> ${mapping.codePath}\n`;
      }
      report += '\n';
    }
    
    if (status.outdated.length > 0) {
      report += `## Outdated Mappings (${status.outdated.length})\n\n`;
      for (const mapping of status.outdated) {
        report += `- **${mapping.codePath}** <-> **${mapping.specSectionId}**\n`;
      }
      report += '\n';
    }
    
    return report;
  }

  /**
   * Automatically tag code files with spec references
   */
  async autoTagCodeFiles(): Promise<void> {
    // Scan for spec references in code
    const mappings = await this.scanCodeForSpecReferences();
    
    // Update mappings array
    this.mappings = mappings;
    
    // For each mapping, ensure bidirectional linking
    for (const mapping of mappings) {
      if (mapping.syncStatus === 'missing') {
        console.log(`Missing spec for code: ${mapping.codePath}, feature: ${mapping.specSectionId}`);
        // In a real implementation, we might prompt to create the missing spec
      }
    }
    
    // Save updated mappings
    await this.saveMappings();
  }

  /**
   * Validate metadata completeness for a section
   */
  async validateSectionMetadata(sectionTitle: string): Promise<{
    isValid: boolean;
    missingFields: string[];
    suggestions: string[];
  }> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    const lines = content.split('\n');
    
    let inTargetSection = false;
    let metadataBlock: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim().startsWith('#') && line.includes(sectionTitle)) {
        inTargetSection = true;
      } 
      else if (inTargetSection) {
        // Check if this is the start of a metadata block
        if (line.trim() === '<!--') {
          // Collect the entire metadata block
          for (let j = i; j < lines.length; j++) {
            metadataBlock.push(lines[j]);
            if (lines[j].trim() === '-->') {
              break;
            }
          }
          break;
        }
        // If we encounter another heading, we've moved to the next section
        else if (line.trim().startsWith('#')) {
          break;
        }
      }
    }
    
    // Parse the metadata block
    const metadata = this.parseMetadataBlock(metadataBlock);
    
    // Validate required fields
    const requiredFields = ['featureId', 'status'];
    const missingFields: string[] = [];
    const suggestions: string[] = [];
    
    for (const field of requiredFields) {
      if (!metadata[field as keyof PRDSectionMetadata]) {
        missingFields.push(field);
      }
    }
    
    // Add suggestions for improvement
    if (!metadata.codeRefs || metadata.codeRefs.length === 0) {
      suggestions.push('Add code references to link this specification to implementation');
    }
    
    if (!metadata.authors || metadata.authors.length === 0) {
      suggestions.push('Add author information for accountability');
    }
    
    if (!metadata.relatedSections || metadata.relatedSections.length === 0) {
      suggestions.push('Add related sections to improve navigation');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields,
      suggestions
    };
  }

  /**
   * Parse metadata block from lines
   */
  private parseMetadataBlock(lines: string[]): Partial<PRDSectionMetadata> {
    const metadata: Partial<PRDSectionMetadata> = {};
    
    // Join lines and extract YAML content
    const content = lines.join('\n');
    
    // Extract featureId
    const featureIdMatch = content.match(/featureId:\s*(.+)/);
    if (featureIdMatch) {
      metadata.featureId = featureIdMatch[1].trim();
    }
    
    // Extract status
    const statusMatch = content.match(/status:\s*(.+)/);
    if (statusMatch) {
      metadata.status = statusMatch[1].trim() as any;
    }
    
    // Extract code references
    const codeRefsMatch = content.match(/codeRefs:\s*((?:\s*-\s*.+\n?)*)/);
    if (codeRefsMatch) {
      const refs = codeRefsMatch[1].match(/-\s*(.+)/g);
      if (refs) {
        metadata.codeRefs = refs.map(r => r.substring(2).trim());
      }
    }
    
    // Extract authors
    const authorsMatch = content.match(/authors:\s*((?:\s*-\s*.+\n?)*)/);
    if (authorsMatch) {
      const authors = authorsMatch[1].match(/-\s*(.+)/g);
      if (authors) {
        metadata.authors = authors.map(a => a.substring(2).trim());
      }
    }
    
    // Extract related sections
    const relatedMatch = content.match(/relatedSections:\s*((?:\s*-\s*.+\n?)*)/);
    if (relatedMatch) {
      const related = relatedMatch[1].match(/-\s*(.+)/g);
      if (related) {
        metadata.relatedSections = related.map(r => r.substring(2).trim());
      }
    }
    
    // Extract version
    const versionMatch = content.match(/version:\s*(.+)/);
    if (versionMatch) {
      metadata.version = versionMatch[1].trim();
    }
    
    return metadata;
  }
}

// Example usage
if (require.main === module) {
  const tools = new MetadataEnrichmentTools();
  console.log('Metadata Enrichment Tools initialized');
  console.log('Available methods: addMetadataToSection, scanCodeForSpecReferences, checkSyncStatus, validateSectionMetadata');
}