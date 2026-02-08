/**
 * Content Structuring Guidelines
 * Guidelines for structuring content for optimal extraction and traceability
 */

import fs from 'fs/promises';
import path from 'path';

// Interface for content structure guidelines
interface ContentGuideline {
  id: string;
  title: string;
  description: string;
  examples: string[];
  antiPatterns: string[];
  extractionTips: string[];
}

export class ContentStructuringGuidelines {
  private guidelines: ContentGuideline[] = [];
  private prdPath: string;

  constructor(prdPath: string = './docs/PRD.md') {
    this.prdPath = prdPath;
    this.initializeGuidelines();
  }

  /**
   * Initialize the content structuring guidelines
   */
  private initializeGuidelines(): void {
    this.guidelines = [
      {
        id: 'consistent-headings',
        title: 'Consistent Heading Structure',
        description: 'Use consistent heading levels to create a logical document structure that can be properly parsed',
        examples: [
          '# Feature Area',
          '## Sub-feature',
          '### Implementation Details',
          '#### Technical Specifications'
        ],
        antiPatterns: [
          '# Random heading level changes',
          '## Skipping heading levels (e.g., # to ###)',
          'Using bold text instead of proper headings'
        ],
        extractionTips: [
          'Headings become the basis for content blocks',
          'Maintain hierarchical structure',
          'Use descriptive but concise heading titles'
        ]
      },
      {
        id: 'feature-identification',
        title: 'Feature Identification',
        description: 'Clearly identify features with consistent identifiers that can be traced to code',
        examples: [
          '## Authentication System (feature: auth.system)',
          '### Login Functionality (feature: auth.login)',
          '### Password Reset (feature: auth.password-reset)'
        ],
        antiPatterns: [
          '## User Login',
          '## How to log in',
          '## The login process'
        ],
        extractionTips: [
          'Include feature IDs in parentheses after headings',
          'Use consistent naming convention (e.g., area.functionality)',
          'Feature IDs should match code references'
        ]
      },
      {
        id: 'metadata-blocks',
        title: 'Metadata Blocks',
        description: 'Include structured metadata in designated blocks to enhance traceability',
        examples: [
          '<!--',
          'featureId: auth.login',
          'status: implemented',
          'codeRefs:',
          '  - src/auth/login.ts',
          '  - src/components/LoginForm.tsx',
          'authors:',
          '  - Jane Developer',
          'relatedSections:',
          '  - auth.password-reset',
          '  - auth.session-management',
          'version: 1.2.0',
          '-->'
        ],
        antiPatterns: [
          '// Feature: auth.login',
          '/* Status: done */',
          'TODO: Implement auth.login'
        ],
        extractionTips: [
          'Use YAML-style comments for metadata',
          'Include code file references',
          'Maintain authorship information',
          'Link to related sections'
        ]
      },
      {
        id: 'implementation-notes',
        title: 'Implementation Notes',
        description: 'Include specific implementation notes that can guide developers',
        examples: [
          '### Implementation Requirements',
          '- Must use JWT tokens',
          '- Passwords must be hashed with bcrypt',
          '- Sessions expire after 30 minutes',
          '',
          '### API Endpoints',
          '- `POST /api/auth/login` - Authenticate user',
          '- `POST /api/auth/logout` - End session'
        ],
        antiPatterns: [
          'Just implement login',
          'Make it work somehow',
          'Handle authentication'
        ],
        extractionTips: [
          'Be specific about technical requirements',
          'List API endpoints with methods',
          'Specify security requirements',
          'Include performance expectations'
        ]
      },
      {
        id: 'validation-criteria',
        title: 'Validation Criteria',
        description: 'Define clear validation criteria for features',
        examples: [
          '### Acceptance Criteria',
          '- User can log in with valid credentials',
          '- User receives error for invalid credentials',
          '- Session persists for 30 minutes of inactivity',
          '',
          '### Error Handling',
          '- Invalid credentials return 401 status',
          '- Account locked returns 403 status'
        ],
        antiPatterns: [
          'It should work',
          'Handle errors appropriately',
          'Validate inputs'
        ],
        extractionTips: [
          'Define measurable outcomes',
          'Specify error conditions',
          'Include status codes where relevant',
          'Describe edge cases'
        ]
      }
    ];
  }

  /**
   * Get all content structuring guidelines
   */
  getGuidelines(): ContentGuideline[] {
    return this.guidelines;
  }

  /**
   * Get a specific guideline by ID
   */
  getGuideline(id: string): ContentGuideline | undefined {
    return this.guidelines.find(g => g.id === id);
  }

  /**
   * Generate a content structure template based on guidelines
   */
  generateTemplate(featureArea: string, featureName: string): string {
    const featureId = `${featureArea}.${featureName}`.toLowerCase().replace(/\s+/g, '-');
    
    return `# ${featureArea}

## ${featureName} (feature: ${featureId})

<!-- 
featureId: ${featureId}
status: planned
codeRefs: []
authors: []
relatedSections: []
version: 1.0.0
-->

### Overview
Brief description of the ${featureName} feature.

### Implementation Requirements
- Requirement 1
- Requirement 2
- Requirement 3

### API Endpoints
- \`METHOD /api/path\` - Description

### Acceptance Criteria
- Criterion 1
- Criterion 2

### Error Handling
- Error condition and response

### Dependencies
- Other features this depends on

### Security Considerations
- Security requirements for this feature

### Performance Expectations
- Performance requirements for this feature
`;
  }

  /**
   * Analyze existing PRD content for structural compliance
   */
  async analyzePRDStructure(): Promise<{
    compliantSections: number;
    nonCompliantSections: number;
    issues: Array<{ section: string; issue: string; severity: 'high' | 'medium' | 'low' }>;
    suggestions: string[];
  }> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    const lines = content.split('\n');
    
    const issues: Array<{ section: string; issue: string; severity: 'high' | 'medium' | 'low' }> = [];
    let currentSection = '';
    let compliantSections = 0;
    let nonCompliantSections = 0;
    const suggestions: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        currentSection = headingMatch[2].trim();
        
        // Check if section has feature ID
        const hasFeatureId = this.containsFeatureId(line);
        
        if (!hasFeatureId) {
          issues.push({
            section: currentSection,
            issue: 'Missing feature ID in heading',
            severity: 'high'
          });
          nonCompliantSections++;
        } else {
          compliantSections++;
        }
        
        // Check if next few lines contain metadata block
        let hasMetadataBlock = false;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].trim() === '<!--') {
            hasMetadataBlock = true;
            break;
          }
        }
        
        if (!hasMetadataBlock) {
          issues.push({
            section: currentSection,
            issue: 'Missing metadata block after heading',
            severity: 'medium'
          });
        }
      }
      
      // Check for common anti-patterns
      if (this.isAntiPattern(line)) {
        issues.push({
          section: currentSection,
          issue: `Potential anti-pattern: "${line.trim()}"`,
          severity: 'medium'
        });
      }
    }
    
    // Add suggestions based on findings
    if (nonCompliantSections > 0) {
      suggestions.push(`Add feature IDs to ${nonCompliantSections} section${nonCompliantSections > 1 ? 's' : ''}`);
    }
    
    if (issues.filter(i => i.issue.includes('metadata block')).length > 0) {
      suggestions.push('Consider adding metadata blocks to sections for better traceability');
    }
    
    return {
      compliantSections,
      nonCompliantSections,
      issues,
      suggestions
    };
  }

  /**
   * Check if a line contains a feature ID
   */
  private containsFeatureId(line: string): boolean {
    return /\bfeature:\s*[a-zA-Z0-9.-]+\b/.test(line);
  }

  /**
   * Check if a line matches known anti-patterns
   */
  private isAntiPattern(line: string): boolean {
    const antiPatternRegexes = [
      /^#+\s+.*how to.*$/i,
      /^#+\s+.*the .* process$/i,
      /^#+\s+.*just .*$/i,
      /^\/\/\s+Feature:\s+[a-zA-Z0-9.-]+/i,
      /^\/\*\*\s+Feature:\s+[a-zA-Z0-9.-]+\s+\*\//i
    ];
    
    return antiPatternRegexes.some(regex => regex.test(line));
  }

  /**
   * Generate a PRD structure compliance report
   */
  async generateComplianceReport(): Promise<string> {
    const analysis = await this.analyzePRDStructure();
    
    let report = '# PRD Structure Compliance Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n`;
    report += `- Compliant sections: ${analysis.compliantSections}\n`;
    report += `- Non-compliant sections: ${analysis.nonCompliantSections}\n`;
    report += `- Total issues found: ${analysis.issues.length}\n\n`;
    
    if (analysis.issues.length > 0) {
      report += `## Issues Found (${analysis.issues.length})\n\n`;
      
      // Group issues by severity
      const highIssues = analysis.issues.filter(i => i.severity === 'high');
      const mediumIssues = analysis.issues.filter(i => i.severity === 'medium');
      const lowIssues = analysis.issues.filter(i => i.severity === 'low');
      
      if (highIssues.length > 0) {
        report += `### High Severity (${highIssues.length})\n`;
        for (const issue of highIssues) {
          report += `- **${issue.section}**: ${issue.issue}\n`;
        }
        report += '\n';
      }
      
      if (mediumIssues.length > 0) {
        report += `### Medium Severity (${mediumIssues.length})\n`;
        for (const issue of mediumIssues) {
          report += `- **${issue.section}**: ${issue.issue}\n`;
        }
        report += '\n';
      }
      
      if (lowIssues.length > 0) {
        report += `### Low Severity (${lowIssues.length})\n`;
        for (const issue of lowIssues) {
          report += `- **${issue.section}**: ${issue.issue}\n`;
        }
        report += '\n';
      }
    }
    
    if (analysis.suggestions.length > 0) {
      report += `## Suggestions for Improvement (${analysis.suggestions.length})\n\n`;
      for (const suggestion of analysis.suggestions) {
        report += `- ${suggestion}\n`;
      }
      report += '\n';
    }
    
    report += `## Content Structure Guidelines\n\n`;
    report += `Follow these guidelines to ensure your PRD content is optimally structured:\n\n`;
    
    for (const guideline of this.guidelines) {
      report += `### ${guideline.title}\n\n`;
      report += `${guideline.description}\n\n`;
      
      if (guideline.examples.length > 0) {
        report += `**Examples:**\n`;
        for (const example of guideline.examples) {
          report += `\`\`\`\n${example}\n\`\`\`\n`;
        }
        report += `\n`;
      }
      
      if (guideline.antiPatterns.length > 0) {
        report += `**Anti-patterns to avoid:**\n`;
        for (const antiPattern of guideline.antiPatterns) {
          report += `- ${antiPattern}\n`;
        }
        report += `\n`;
      }
      
      if (guideline.extractionTips.length > 0) {
        report += `**Extraction tips:**\n`;
        for (const tip of guideline.extractionTips) {
          report += `- ${tip}\n`;
        }
        report += `\n`;
      }
    }
    
    return report;
  }

  /**
   * Apply structural improvements to PRD content
   */
  async applyStructuralImprovements(): Promise<{
    changesMade: number;
    issuesFixed: string[];
    issuesRemaining: string[];
  }> {
    const content = await fs.readFile(this.prdPath, 'utf-8');
    const lines = content.split('\n');
    const newLines: string[] = [];
    let changesMade = 0;
    const issuesFixed: string[] = [];
    const issuesRemaining: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let modified = false;
      
      // Check for headings without feature IDs and suggest adding them
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch && !this.containsFeatureId(line)) {
        // Try to generate a feature ID based on the heading
        const headingText = headingMatch[2].trim();
        const featureId = this.generateFeatureId(headingText);
        
        // Add feature ID to the heading
        newLines.push(`${headingMatch[1]} ${headingText} (feature: ${featureId})`);
        issuesFixed.push(`Added feature ID to section: ${headingText}`);
        changesMade++;
        modified = true;
      }
      
      if (!modified) {
        newLines.push(line);
      }
    }
    
    // Write the improved content back to the file
    await fs.writeFile(this.prdPath, newLines.join('\n'));
    
    // Analyze again to see what remains unfixed
    const analysis = await this.analyzePRDStructure();
    issuesRemaining.push(...analysis.issues.map(i => `${i.section}: ${i.issue}`));
    
    return {
      changesMade,
      issuesFixed,
      issuesRemaining: Array.from(new Set(issuesRemaining)) // Remove duplicates
    };
  }

  /**
   * Generate a feature ID from text
   */
  private generateFeatureId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }

  /**
   * Validate a section against guidelines
   */
  validateSection(sectionContent: string, sectionTitle: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for feature ID in title
    if (!this.containsFeatureId(sectionTitle)) {
      issues.push('Section heading missing feature ID');
      suggestions.push(`Add feature ID to heading: ${sectionTitle} (feature: area.functionality)`);
    }
    
    // Check for metadata block
    if (!sectionContent.includes('<!--') || !sectionContent.includes('-->')) {
      issues.push('Section missing metadata block');
      suggestions.push('Add metadata block with featureId, status, codeRefs, etc.');
    }
    
    // Check for implementation requirements
    if (!sectionContent.toLowerCase().includes('requirement')) {
      issues.push('Section missing implementation requirements');
      suggestions.push('Add specific implementation requirements');
    }
    
    // Check for acceptance criteria
    if (!sectionContent.toLowerCase().includes('acceptance') && 
        !sectionContent.toLowerCase().includes('criterion')) {
      issues.push('Section missing acceptance criteria');
      suggestions.push('Add measurable acceptance criteria');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Create a content structure checker
   */
  createStructureChecker(): (content: string, title: string) => {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    return (content: string, title: string) => this.validateSection(content, title);
  }
}

// Example usage
if (require.main === module) {
  const guidelines = new ContentStructuringGuidelines();
  console.log('Content Structuring Guidelines initialized');
  console.log('Available methods: analyzePRDStructure, generateComplianceReport, applyStructuralImprovements');
}