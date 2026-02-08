/**
 * Traceability Tools
 * Tools to ensure bidirectional traceability between code and PRD specifications
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { MetadataEnrichmentTools } from './metadata-enrichment-tools';
import { PRDSectionTaggingSystem } from './prd-tagging-system';
import { MetadataValidationSystem } from './metadata-validation';

// Interface for traceability report
interface TraceabilityReport {
  codeToSpec: {
    mapped: number;
    unmapped: number;
    details: Array<{ codePath: string; specSection: string; featureId: string; status: string }>;
  };
  specToCode: {
    implemented: number;
    notImplemented: number;
    details: Array<{ specSection: string; featureId: string; codePath: string; status: string }>;
  };
  overallCompliance: number;
  recommendations: string[];
}

// Interface for sync status
interface SyncStatus {
  isSynced: boolean;
  lastSync: string;
  codeChangesSinceSync: number;
  specChangesSinceSync: number;
  outOfSyncItems: Array<{ type: 'code' | 'spec'; path: string; changeType: string }>;
}

export class TraceabilityTools {
  private metadataTools: MetadataEnrichmentTools;
  private taggingSystem: PRDSectionTaggingSystem;
  private validationSystem: MetadataValidationSystem;
  private prdPath: string;
  private codeBasePath: string;

  constructor(prdPath: string = './docs/PRD.md', codeBasePath: string = './') {
    this.prdPath = prdPath;
    this.codeBasePath = codeBasePath;
    this.metadataTools = new MetadataEnrichmentTools(prdPath, codeBasePath);
    this.taggingSystem = new PRDSectionTaggingSystem(undefined, prdPath);
    this.validationSystem = new MetadataValidationSystem(undefined, prdPath);
  }

  /**
   * Generate a comprehensive traceability report
   */
  async generateTraceabilityReport(): Promise<TraceabilityReport> {
    // Load all tags from codebase
    const tags = await this.taggingSystem.scanForTags();
    
    // Load all content blocks from PRD
    const { PRDDocumentParser } = await import('./parser');
    const parser = new PRDDocumentParser();
    const parsedDoc = await parser.parse(this.prdPath);
    
    // Create mappings
    const codeToSpec = {
      mapped: 0,
      unmapped: 0,
      details: [] as Array<{ codePath: string; specSection: string; featureId: string; status: string }>
    };
    
    const specToCode = {
      implemented: 0,
      notImplemented: 0,
      details: [] as Array<{ specSection: string; featureId: string; codePath: string; status: string }>
    };
    
    // Map code to spec
    for (const tag of tags) {
      codeToSpec.details.push({
        codePath: tag.codeLocation,
        specSection: tag.prdSection,
        featureId: tag.featureId,
        status: tag.status
      });
      codeToSpec.mapped++;
    }
    
    // Find unmapped code elements
    const allCodeFiles = await this.scanCodeFiles();
    for (const file of allCodeFiles) {
      const content = await fs.readFile(file, 'utf-8');
      // Look for feature references that might not be properly tagged
      const potentialFeatures = content.match(/featureId:\s*['"]([^'"]+)['"]/g);
      if (potentialFeatures) {
        for (const feature of potentialFeatures) {
          const featureId = feature.split(/['"]/)[1];
          const hasTag = tags.some(t => t.featureId === featureId);
          if (!hasTag) {
            codeToSpec.details.push({
              codePath: file,
              specSection: 'unknown',
              featureId,
              status: 'unmapped'
            });
            codeToSpec.unmapped++;
          }
        }
      }
    }
    
    // Map spec to code
    for (const block of parsedDoc.blocks) {
      if (block.metadata.featureId) {
        const tag = tags.find(t => t.featureId === block.metadata.featureId);
        if (tag) {
          specToCode.details.push({
            specSection: block.title,
            featureId: block.metadata.featureId,
            codePath: tag.codeLocation,
            status: tag.status
          });
          specToCode.implemented++;
        } else {
          specToCode.details.push({
            specSection: block.title,
            featureId: block.metadata.featureId,
            codePath: 'not implemented',
            status: 'not implemented'
          });
          specToCode.notImplemented++;
        }
      }
    }
    
    // Calculate overall compliance
    const totalSpecItems = specToCode.implemented + specToCode.notImplemented;
    const overallCompliance = totalSpecItems > 0 ? Math.round((specToCode.implemented / totalSpecItems) * 100) : 0;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (codeToSpec.unmapped > 0) {
      recommendations.push(`Add tags to ${codeToSpec.unmapped} code elements that reference features`);
    }
    
    if (specToCode.notImplemented > 0) {
      recommendations.push(`Implement ${specToCode.notImplemented} features that are specified in the PRD but not in code`);
    }
    
    if (overallCompliance < 80) {
      recommendations.push(`Improve traceability compliance - currently at ${overallCompliance}%`);
    }
    
    return {
      codeToSpec,
      specToCode,
      overallCompliance,
      recommendations
    };
  }

  /**
   * Check if code and spec are in sync
   */
  async checkSyncStatus(): Promise<SyncStatus> {
    // For this implementation, we'll check git status to see recent changes
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      // Check git status for recent changes
      const { stdout: codeChanges } = await execAsync('git log --since="1 week ago" --name-only --pretty=format:', { cwd: this.codeBasePath });
      const { stdout: specChanges } = await execAsync(`git log --since="1 week ago" --name-only --pretty=format: ${this.prdPath}`, { cwd: path.dirname(this.prdPath) });
      
      const codeChangeFiles = codeChanges.split('\n').filter(f => f.trim() !== '');
      const specChangeFiles = specChanges.split('\n').filter(f => f.trim() !== '');
      
      // Check if any spec changes are not reflected in code
      const outOfSyncItems: Array<{ type: 'code' | 'spec'; path: string; changeType: string }> = [];
      
      // For each spec change, check if there are corresponding code changes
      for (const specFile of specChangeFiles) {
        if (specFile.includes('PRD.md')) {
          // Check if there are related code changes
          const tags = await this.taggingSystem.scanForTags();
          const relatedCodeExists = tags.some(tag => 
            codeChangeFiles.some(codeFile => codeFile.includes(tag.featureId.split('.')[0]))
          );
          
          if (!relatedCodeExists && codeChangeFiles.length > 0) {
            outOfSyncItems.push({
              type: 'spec',
              path: specFile,
              changeType: 'no corresponding code changes'
            });
          }
        }
      }
      
      // For each code change, check if there are corresponding spec changes
      for (const codeFile of codeChangeFiles) {
        if (!codeFile.includes('test') && !codeFile.includes('.spec.') && !codeFile.includes('__tests__')) {
          // Check if there are related spec changes
          const tags = await this.taggingSystem.scanForTags();
          const tagInChangedFile = tags.filter(tag => tag.codeLocation.includes(codeFile));
          
          if (tagInChangedFile.length > 0) {
            // Check if spec was updated
            let specUpdated = false;
            for (const tag of tagInChangedFile) {
              if (specChangeFiles.some(specFile => specFile.includes(tag.prdSection) || specFile.includes(tag.featureId))) {
                specUpdated = true;
                break;
              }
            }
            
            if (!specUpdated) {
              outOfSyncItems.push({
                type: 'code',
                path: codeFile,
                changeType: 'no corresponding spec changes'
              });
            }
          }
        }
      }
      
      return {
        isSynced: outOfSyncItems.length === 0,
        lastSync: new Date().toISOString(),
        codeChangesSinceSync: codeChangeFiles.length,
        specChangesSinceSync: specChangeFiles.length,
        outOfSyncItems
      };
    } catch (error) {
      // If git is not available or there are no commits, return a default status
      return {
        isSynced: true,
        lastSync: new Date().toISOString(),
        codeChangesSinceSync: 0,
        specChangesSinceSync: 0,
        outOfSyncItems: []
      };
    }
  }

  /**
   * Create a traceability matrix
   */
  async createTraceabilityMatrix(): Promise<string[][]> {
    // Load all tags from codebase
    const tags = await this.taggingSystem.scanForTags();
    
    // Load all content blocks from PRD
    const { PRDDocumentParser } = await import('./parser');
    const parser = new PRDDocumentParser();
    const parsedDoc = await parser.parse(this.prdPath);
    
    // Create matrix: PRD sections x Code files
    const prdSections = Array.from(new Set(parsedDoc.blocks.map(b => b.title).filter(t => t)));
    const codeFiles = Array.from(new Set(tags.map(t => t.codeLocation.split(':')[0])));
    
    // Create header row
    const matrix: string[][] = [];
    const headerRow = ['PRD Section', ...codeFiles, 'Status'];
    matrix.push(headerRow);
    
    // Create data rows
    for (const section of prdSections) {
      const row = [section];
      let hasImplementation = false;
      
      for (const file of codeFiles) {
        const hasTag = tags.some(t => 
          t.prdSection === section && t.codeLocation.startsWith(file)
        );
        
        row.push(hasTag ? '✓' : '');
        if (hasTag) hasImplementation = true;
      }
      
      // Add status column
      row.push(hasImplementation ? 'Implemented' : 'Not Implemented');
      matrix.push(row);
    }
    
    return matrix;
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
   * Generate a traceability dashboard
   */
  async generateTraceabilityDashboard(): Promise<string> {
    const report = await this.generateTraceabilityReport();
    const syncStatus = await this.checkSyncStatus();
    
    let dashboard = '# Traceability Dashboard\n\n';
    dashboard += `Last updated: ${new Date().toISOString()}\n\n`;
    
    dashboard += `## Overall Compliance: ${report.overallCompliance}%\n\n`;
    
    dashboard += `## Code to Spec Mapping\n`;
    dashboard += `- Mapped: ${report.codeToSpec.mapped}\n`;
    dashboard += `- Unmapped: ${report.codeToSpec.unmapped}\n\n`;
    
    dashboard += `## Spec to Code Mapping\n`;
    dashboard += `- Implemented: ${report.specToCode.implemented}\n`;
    dashboard += `- Not Implemented: ${report.specToCode.notImplemented}\n\n`;
    
    dashboard += `## Sync Status\n`;
    dashboard += `- In Sync: ${syncStatus.isSynced ? 'Yes' : 'No'}\n`;
    dashboard += `- Code Changes Since Sync: ${syncStatus.codeChangesSinceSync}\n`;
    dashboard += `- Spec Changes Since Sync: ${syncStatus.specChangesSinceSync}\n\n`;
    
    if (syncStatus.outOfSyncItems.length > 0) {
      dashboard += `## Out of Sync Items (${syncStatus.outOfSyncItems.length})\n\n`;
      for (const item of syncStatus.outOfSyncItems) {
        dashboard += `- **${item.type.toUpperCase()}**: ${item.path} - ${item.changeType}\n`;
      }
      dashboard += '\n';
    }
    
    if (report.recommendations.length > 0) {
      dashboard += `## Recommendations (${report.recommendations.length})\n\n`;
      for (const recommendation of report.recommendations) {
        dashboard += `- ${recommendation}\n`;
      }
      dashboard += '\n';
    }
    
    // Add top unmapped features
    if (report.specToCode.notImplemented > 0) {
      dashboard += `## Top Unimplemented Features\n`;
      const unimplemented = report.specToCode.details
        .filter(d => d.status === 'not implemented')
        .slice(0, 5);
      
      for (const item of unimplemented) {
        dashboard += `- ${item.featureId} in "${item.specSection}"\n`;
      }
      dashboard += '\n';
    }
    
    // Add top unmapped code elements
    if (report.codeToSpec.unmapped > 0) {
      dashboard += `## Top Unmapped Code Elements\n`;
      const unmapped = report.codeToSpec.details
        .filter(d => d.status === 'unmapped')
        .slice(0, 5);
      
      for (const item of unmapped) {
        dashboard += `- ${item.featureId} in ${item.codePath}\n`;
      }
      dashboard += '\n';
    }
    
    return dashboard;
  }

  /**
   * Trigger validation when code changes are detected
   */
  async onCodeChange(filePath: string): Promise<void> {
    console.log(`Code change detected in: ${filePath}`);
    
    // Check if the changed file contains feature references
    const content = await fs.readFile(filePath, 'utf-8');
    const featureRefs = content.match(/featureId:\s*['"]([^'"]+)['"]/g);
    
    if (featureRefs) {
      console.log(`Feature references found: ${featureRefs.join(', ')}`);
      
      // Validate that these features exist in PRD
      for (const ref of featureRefs) {
        const featureId = ref.split(/['"]/)[1];
        const { PRDDocumentParser } = await import('./parser');
        const parser = new PRDDocumentParser();
        const parsedDoc = await parser.parse(this.prdPath);
        
        const hasSpec = parsedDoc.blocks.some(block => 
          block.metadata.featureId === featureId
        );
        
        if (!hasSpec) {
          console.warn(`Feature ${featureId} implemented in code but not found in PRD specification`);
        }
      }
    }
  }

  /**
   * Trigger validation when PRD changes are detected
   */
  async onPRDChange(): Promise<void> {
    console.log('PRD change detected');
    
    // Reload tags from codebase
    await this.taggingSystem.scanForTags();
    
    // Generate new traceability report
    const report = await this.generateTraceabilityReport();
    
    // Check for features that are in PRD but not implemented
    const unimplemented = report.specToCode.details.filter(d => d.status === 'not implemented');
    
    if (unimplemented.length > 0) {
      console.log(`Found ${unimplemented.length} features specified in PRD but not implemented in code:`);
      for (const item of unimplemented) {
        console.log(`- ${item.featureId} in "${item.specSection}"`);
      }
    }
  }

  /**
   * Create a traceability hook for Git
   */
  async createGitHooks(): Promise<void> {
    const hooksDir = path.join(this.codeBasePath, '.git', 'hooks');
    
    // Create pre-commit hook to validate traceability
    const preCommitHook = `#!/bin/sh
# Traceability validation pre-commit hook
echo "Validating traceability between code and PRD..."

# Run traceability validation
node -e "
  const { TraceabilityTools } = require('./.docs-automation/traceability-tools');
  const tools = new TraceabilityTools();
  tools.checkSyncStatus().then(status => {
    if (!status.isSynced) {
      console.error('ERROR: Code and PRD are out of sync!');
      console.error('Please update either code or PRD before committing.');
      process.exit(1);
    }
    console.log('Traceability validation passed');
  }).catch(err => {
    console.error('Traceability validation failed:', err);
    process.exit(1);
  });
"
`;

    const preCommitPath = path.join(hooksDir, 'pre-commit');
    await fs.writeFile(preCommitPath, preCommitHook);
    await fs.chmod(preCommitPath, '755'); // Make executable

    console.log('Git pre-commit hook created for traceability validation');
  }

  /**
   * Validate that a code change has corresponding spec change
   */
  async validateCodeToSpecMapping(codePath: string, featureId: string): Promise<boolean> {
    // Check if the feature exists in PRD
    const { PRDDocumentParser } = await import('./parser');
    const parser = new PRDDocumentParser();
    const parsedDoc = await parser.parse(this.prdPath);
    
    const hasSpec = parsedDoc.blocks.some(block => 
      block.metadata.featureId === featureId
    );
    
    if (!hasSpec) {
      console.error(`Feature ${featureId} implemented in ${codePath} but not found in PRD specification`);
      return false;
    }
    
    // Check if the implementation has proper tags
    const tags = await this.taggingSystem.scanForTags();
    const hasTag = tags.some(tag => 
      tag.codeLocation.includes(codePath) && tag.featureId === featureId
    );
    
    if (!hasTag) {
      console.error(`Missing PRD tag for feature ${featureId} in ${codePath}`);
      return false;
    }
    
    return true;
  }

  /**
   * Validate that a spec change has corresponding code change
   */
  async validateSpecToCodeMapping(featureId: string): Promise<boolean> {
    // Check if the feature has been implemented in code
    const tags = await this.taggingSystem.scanForTags();
    const implemented = tags.some(tag => tag.featureId === featureId);
    
    if (!implemented) {
      console.warn(`Feature ${featureId} specified in PRD but not implemented in code`);
      // This might be OK for planned features, so we don't necessarily fail
    }
    
    return true;
  }
}

// Example usage
if (require.main === module) {
  const traceabilityTools = new TraceabilityTools();
  console.log('Traceability Tools initialized');
  console.log('Available methods: generateTraceabilityReport, checkSyncStatus, createTraceabilityMatrix, generateTraceabilityDashboard');
}