/**
 * Feature Comparison Module
 * Compares features in PRD vs features implemented in code
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Interfaces for feature comparison
interface FeatureSpec {
  id: string;
  name: string;
  description: string;
  section: string;
  status: 'implemented' | 'not-implemented' | 'partially-implemented';
  codeLocation?: string;
  prdReference: string;
}

interface ComparisonResult {
  prdOnly: FeatureSpec[];
  codeOnly: FeatureSpec[];
  matched: Array<{ prd: FeatureSpec; code: FeatureSpec }>;
  summary: {
    totalPrdFeatures: number;
    totalCodeFeatures: number;
    matchedFeatures: number;
    prdOnlyCount: number;
    codeOnlyCount: number;
  };
}

export class FeatureComparator {
  private prdPath: string;
  private codeBasePath: string;

  constructor(prdPath: string = './docs/PRD.md', codeBasePath: string = './') {
    this.prdPath = prdPath;
    this.codeBasePath = codeBasePath;
  }

  /**
   * Compare features in PRD vs features implemented in code
   * @returns Comparison result showing differences
   */
  async compare(): Promise<ComparisonResult> {
    console.log('Starting feature comparison...');
    
    // Extract features from PRD
    const prdFeatures = await this.extractPRDFunctions();
    console.log(`Found ${prdFeatures.length} features in PRD`);
    
    // Extract features from codebase
    const codeFeatures = await this.extractCodeFeatures();
    console.log(`Found ${codeFeatures.length} features in codebase`);
    
    // Perform comparison
    const result = this.performComparison(prdFeatures, codeFeatures);
    
    console.log('Feature comparison completed');
    return result;
  }

  /**
   * Extract features from PRD document
   */
  private async extractPRDFunctions(): Promise<FeatureSpec[]> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    const lines = content.split('\n');
    const features: FeatureSpec[] = [];
    
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect section headers
      const sectionMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (sectionMatch) {
        currentSection = sectionMatch[2].trim();
        continue;
      }
      
      // Look for feature-like patterns in the content
      // This is a simplified approach - in reality, we'd use more sophisticated parsing
      if (line.toLowerCase().includes('feature') || 
          line.toLowerCase().includes('function') || 
          line.toLowerCase().includes('capability') ||
          line.toLowerCase().includes('requirement')) {
        
        // Extract feature name and description
        const featureText = line.trim();
        const featureName = this.extractFeatureName(featureText);
        
        if (featureName) {
          features.push({
            id: this.generateId(featureName),
            name: featureName,
            description: featureText,
            section: currentSection,
            status: 'not-implemented', // Initially assume not implemented
            prdReference: `${currentSection} - Line ${i + 1}`,
          });
        }
      }
    }
    
    return features;
  }

  /**
   * Extract features from codebase by scanning for feature-related code
   */
  private async extractCodeFeatures(): Promise<FeatureSpec[]> {
    const features: FeatureSpec[] = [];
    
    // Scan for feature-related files and functions
    const files = await this.scanCodeFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for function definitions, component names, etc.
        if (this.isFeatureIndicator(line)) {
          const featureName = this.extractFeatureFromCode(line);
          
          if (featureName) {
            features.push({
              id: this.generateId(featureName),
              name: featureName,
              description: line.trim(),
              section: 'Code Implementation',
              status: 'implemented',
              codeLocation: `${file}:${i + 1}`,
              prdReference: 'Unknown',
            });
          }
        }
      }
    }
    
    return features;
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
              dirent.name !== 'build') {
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
   * Check if a line contains a feature indicator
   */
  private isFeatureIndicator(line: string): boolean {
    const featurePatterns = [
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /class\s+\w+/,
      /export\s+.+\s+from/,
      /import\s+.+\s+from/,
      /component/i,
      /hook/i,
      /service/i,
      /api/i,
      /route/i,
      /endpoint/i,
      /controller/i,
      /model/i,
      /view/i,
      /screen/i,
      /page/i,
      /module/i,
      /provider/i,
      /context/i,
      /reducer/i,
      /action/i,
      /mutation/i,
      /query/i,
      /subscription/i,
      /validator/i,
      /middleware/i,
      /plugin/i,
      /extension/i,
      /handler/i,
      /util/i,
      /helper/i,
      /config/i,
      /setting/i,
      /environment/i,
      /constant/i,
      /enum/i,
      /interface/i,
      /type/i,
      /schema/i,
      /migration/i,
      /seed/i,
      /factory/i,
      /stub/i,
      /mock/i,
      /test/i,
      /spec/i,
      /benchmark/i,
      /perf/i,
      /debug/i,
      /logger/i,
      /cache/i,
      /storage/i,
      /database/i,
      /connection/i,
      /pool/i,
      /transaction/i,
      /session/i,
      /auth/i,
      /security/i,
      /permission/i,
      /role/i,
      /access/i,
      /validation/i,
      /error/i,
      /exception/i,
      /handler/i,
      /formatter/i,
      /serializer/i,
      /deserializer/i,
      /mapper/i,
      /adapter/i,
      /bridge/i,
      /decorator/i,
      /annotation/i,
      /directive/i,
      /pipe/i,
      /guard/i,
      /resolver/i,
      /directive/i,
      /subscription/i,
      /publisher/i,
      /subscriber/i,
      /observer/i,
      /subject/i,
      /event/i,
      /message/i,
      /queue/i,
      /worker/i,
      /scheduler/i,
      /cron/i,
      /timer/i,
      /interval/i,
      /timeout/i,
      /retry/i,
      /backoff/i,
      /circuit/i,
      /breaker/i,
      /throttle/i,
      /debounce/i,
      /rate/i,
      /limit/i,
      /bucket/i,
      /token/i,
      /bucket/i,
      /leaky/i,
      /algorithm/i,
      /strategy/i,
      /pattern/i,
      /factory/i,
      /builder/i,
      /prototype/i,
      /singleton/i,
      /observer/i,
      /command/i,
      /state/i,
      /chain/i,
      /flyweight/i,
      /facade/i,
      /proxy/i,
      /adapter/i,
      /bridge/i,
      /composite/i,
      /decorator/i,
      /facade/i,
      /flyweight/i,
      /proxy/i,
      /chain/i,
      /command/i,
      /interpreter/i,
      /iterator/i,
      /mediator/i,
      /memento/i,
      /observer/i,
      /state/i,
      /strategy/i,
      /template/i,
      /visitor/i,
    ];
    
    return featurePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract feature name from a line of code
   */
  private extractFeatureFromCode(line: string): string | null {
    // Match function declarations
    const funcMatch = line.match(/function\s+(\w+)/);
    if (funcMatch) return funcMatch[1];
    
    // Match const/let/var assignments
    const assignmentMatch = line.match(/(?:const|let|var)\s+(\w+)/);
    if (assignmentMatch) return assignmentMatch[1];
    
    // Match class declarations
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];
    
    // Match component exports
    const exportMatch = line.match(/export\s+(?:default\s+)?(\w+)/);
    if (exportMatch) return exportMatch[1];
    
    // Look for other feature-like patterns
    const patterns = [
      /(\w+)Component/,
      /(\w+)Hook/,
      /(\w+)Service/,
      /(\w+)Controller/,
      /(\w+)Model/,
      /(\w+)View/,
      /(\w+)Screen/,
      /(\w+)Page/,
      /(\w+)Util/,
      /(\w+)Helper/,
      /(\w+)Manager/,
      /(\w+)Provider/,
      /(\w+)Context/,
      /(\w+)Reducer/,
      /(\w+)Action/,
      /(\w+)Middleware/,
      /(\w+)Plugin/,
      /(\w+)Extension/,
      /(\w+)Handler/,
      /(\w+)Validator/,
      /(\w+)Formatter/,
      /(\w+)Serializer/,
      /(\w+)Mapper/,
      /(\w+)Adapter/,
      /(\w+)Bridge/,
      /(\w+)Decorator/,
      /(\w+)Directive/,
      /(\w+)Guard/,
      /(\w+)Resolver/,
      /(\w+)Subscription/,
      /(\w+)Publisher/,
      /(\w+)Subscriber/,
      /(\w+)Observer/,
      /(\w+)Subject/,
      /(\w+)Event/,
      /(\w+)Message/,
      /(\w+)Queue/,
      /(\w+)Worker/,
      /(\w+)Scheduler/,
      /(\w+)Cron/,
      /(\w+)Timer/,
      /(\w+)Interval/,
      /(\w+)Timeout/,
      /(\w+)Retry/,
      /(\w+)Backoff/,
      /(\w+)Circuit/,
      /(\w+)Breaker/,
      /(\w+)Throttle/,
      /(\w+)Debounce/,
      /(\w+)Rate/,
      /(\w+)Limit/,
      /(\w+)Bucket/,
      /(\w+)Token/,
      /(\w+)Leaky/,
      /(\w+)Algorithm/,
      /(\w+)Strategy/,
      /(\w+)Pattern/,
      /(\w+)Factory/,
      /(\w+)Builder/,
      /(\w+)Prototype/,
      /(\w+)Singleton/,
      /(\w+)Observer/,
      /(\w+)Command/,
      /(\w+)State/,
      /(\w+)Chain/,
      /(\w+)Flyweight/,
      /(\w+)Facade/,
      /(\w+)Proxy/,
      /(\w+)Adapter/,
      /(\w+)Bridge/,
      /(\w+)Composite/,
      /(\w+)Decorator/,
      /(\w+)Template/,
      /(\w+)Visitor/,
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Extract feature name from PRD text
   */
  private extractFeatureName(text: string): string {
    // Simplified extraction - in reality, we'd use more sophisticated NLP
    const cleaned = text
      .replace(/[#*`~_]/g, '') // Remove markdown characters
      .replace(/feature[:\s]+/i, '') // Remove "feature:" prefix
      .replace(/function[:\s]+/i, '') // Remove "function:" prefix
      .replace(/requirement[:\s]+/i, '') // Remove "requirement:" prefix
      .replace(/capability[:\s]+/i, '') // Remove "capability:" prefix
      .trim();
    
    // Extract first phrase or sentence
    const parts = cleaned.split(/[.:;]/);
    return parts[0].trim();
  }

  /**
   * Generate an ID from a name
   */
  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Perform the actual comparison between PRD and code features
   */
  private performComparison(prdFeatures: FeatureSpec[], codeFeatures: FeatureSpec[]): ComparisonResult {
    const prdOnly: FeatureSpec[] = [];
    const codeOnly: FeatureSpec[] = [];
    const matched: Array<{ prd: FeatureSpec; code: FeatureSpec }> = [];
    
    // Create maps for easier lookup
    const prdMap = new Map(prdFeatures.map(f => [f.id, f]));
    const codeMap = new Map(codeFeatures.map(f => [f.id, f]));
    
    // Find matches and PRD-only features
    for (const [id, prdFeature] of prdMap) {
      if (codeMap.has(id)) {
        // Match found
        matched.push({
          prd: prdFeature,
          code: codeMap.get(id)!
        });
        
        // Update PRD feature status
        prdFeature.status = 'implemented';
      } else {
        // Feature only in PRD
        prdOnly.push(prdFeature);
      }
    }
    
    // Find code-only features
    for (const [id, codeFeature] of codeMap) {
      if (!prdMap.has(id)) {
        // Feature only in code
        codeOnly.push(codeFeature);
      }
    }
    
    // Update PRD-only features status
    for (const feature of prdOnly) {
      feature.status = 'not-implemented';
    }
    
    // Update code-only features status
    for (const feature of codeOnly) {
      feature.status = 'implemented';
    }
    
    return {
      prdOnly,
      codeOnly,
      matched,
      summary: {
        totalPrdFeatures: prdFeatures.length,
        totalCodeFeatures: codeFeatures.length,
        matchedFeatures: matched.length,
        prdOnlyCount: prdOnly.length,
        codeOnlyCount: codeOnly.length,
      }
    };
  }

  /**
   * Generate a detailed report of the comparison
   */
  generateReport(result: ComparisonResult): string {
    let report = '# Feature Comparison Report\n\n';
    
    report += `## Summary\n\n`;
    report += `- Total PRD Features: ${result.summary.totalPrdFeatures}\n`;
    report += `- Total Code Features: ${result.summary.totalCodeFeatures}\n`;
    report += `- Matched Features: ${result.summary.matchedFeatures}\n`;
    report += `- PRD Only: ${result.summary.prdOnlyCount}\n`;
    report += `- Code Only: ${result.summary.codeOnlyCount}\n\n`;
    
    if (result.prdOnly.length > 0) {
      report += `## Features in PRD but not implemented in code (${result.prdOnly.length})\n\n`;
      for (const feature of result.prdOnly) {
        report += `- **${feature.name}** (${feature.section}) - ${feature.description}\n`;
        report += `  - Reference: ${feature.prdReference}\n\n`;
      }
    }
    
    if (result.codeOnly.length > 0) {
      report += `## Features implemented in code but not in PRD (${result.codeOnly.length})\n\n`;
      for (const feature of result.codeOnly) {
        report += `- **${feature.name}** - ${feature.description}\n`;
        report += `  - Location: ${feature.codeLocation}\n\n`;
      }
    }
    
    if (result.matched.length > 0) {
      report += `## Matched Features (${result.matched.length})\n\n`;
      for (const match of result.matched) {
        report += `- **${match.prd.name}**\n`;
        report += `  - PRD: ${match.prd.prdReference}\n`;
        report += `  - Code: ${match.code.codeLocation}\n\n`;
      }
    }
    
    return report;
  }
}

// Example usage
if (require.main === module) {
  const comparator = new FeatureComparator();
  
  comparator.compare()
    .then(result => {
      console.log('Comparison completed!');
      console.log(comparator.generateReport(result));
    })
    .catch(err => {
      console.error('Error during comparison:', err);
    });
}