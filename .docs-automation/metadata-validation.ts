/**
 * Metadata Validation System
 * Validates that content blocks meet requirements for proper extraction and traceability
 */

import fs from 'fs/promises';
import path from 'path';

// Interface for validation results
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Interface for validation rules
interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate: (content: string, metadata: any) => ValidationResult;
}

// Interface for validation configuration
interface ValidationConfig {
  requiredFields: string[];
  fieldPatterns: { [field: string]: RegExp };
  minLengths: { [field: string]: number };
  maxLengths: { [field: string]: number };
  customRules: ValidationRule[];
}

export class MetadataValidationSystem {
  private config: ValidationConfig;
  private prdPath: string;

  constructor(config?: Partial<ValidationConfig>, prdPath: string = './docs/PRD.md') {
    this.config = {
      requiredFields: config?.requiredFields || ['featureId', 'title', 'content'],
      fieldPatterns: config?.fieldPatterns || {
        featureId: /^[a-z0-9.-]+$/,
        title: /^.{1,100}$/
      },
      minLengths: config?.minLengths || {
        content: 20
      },
      maxLengths: config?.maxLengths || {
        title: 100,
        content: 10000
      },
      customRules: config?.customRules || []
    };
    this.prdPath = prdPath;
  }

  /**
   * Validate a single content block
   */
  validateContentBlock(contentBlock: {
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
  }): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check required fields
    for (const field of this.config.requiredFields) {
      if (!contentBlock.hasOwnProperty(field) || !contentBlock[field as keyof typeof contentBlock]) {
        result.errors.push(`Missing required field: ${field}`);
        result.isValid = false;
      }
    }

    // Validate featureId format
    if (contentBlock.metadata.featureId) {
      if (!this.config.fieldPatterns.featureId.test(contentBlock.metadata.featureId)) {
        result.errors.push(`Invalid featureId format: ${contentBlock.metadata.featureId}. Use lowercase letters, numbers, dots, and hyphens only.`);
        result.isValid = false;
      }
    }

    // Validate title
    if (contentBlock.title) {
      if (this.config.minLengths.title && contentBlock.title.length < this.config.minLengths.title) {
        result.errors.push(`Title is too short (minimum ${this.config.minLengths.title} characters)`);
        result.isValid = false;
      }
      if (this.config.maxLengths.title && contentBlock.title.length > this.config.maxLengths.title) {
        result.errors.push(`Title is too long (maximum ${this.config.maxLengths.title} characters)`);
        result.isValid = false;
      }
      if (!this.config.fieldPatterns.title.test(contentBlock.title)) {
        result.errors.push(`Title does not match required format`);
        result.isValid = false;
      }
    }

    // Validate content length
    if (contentBlock.content) {
      if (this.config.minLengths.content && contentBlock.content.length < this.config.minLengths.content) {
        result.errors.push(`Content is too short (minimum ${this.config.minLengths.content} characters)`);
        result.isValid = false;
      }
      if (this.config.maxLengths.content && contentBlock.content.length > this.config.maxLengths.content) {
        result.errors.push(`Content is too long (maximum ${this.config.maxLengths.content} characters)`);
        result.isValid = false;
      }
    }

    // Validate audience values
    if (contentBlock.metadata.audience) {
      const validAudiences = ['user', 'admin', 'developer'];
      for (const audience of contentBlock.metadata.audience) {
        if (!validAudiences.includes(audience)) {
          result.warnings.push(`Unrecognized audience value: ${audience}. Valid values are: ${validAudiences.join(', ')}`);
        }
      }
    }

    // Validate surface values
    if (contentBlock.metadata.surface) {
      const validSurfaces = ['docs', 'help', 'tooltip', 'in-app'];
      for (const surface of contentBlock.metadata.surface) {
        if (!validSurfaces.includes(surface)) {
          result.warnings.push(`Unrecognized surface value: ${surface}. Valid values are: ${validSurfaces.join(', ')}`);
        }
      }
    }

    // Run custom validation rules
    for (const rule of this.config.customRules) {
      const ruleResult = rule.validate(contentBlock.content, contentBlock.metadata);
      if (!ruleResult.isValid) {
        result.isValid = false;
        result.errors.push(...ruleResult.errors);
        result.warnings.push(...ruleResult.warnings);
        result.suggestions.push(...ruleResult.suggestions);
      }
    }

    // Add suggestions for improvement
    if (!contentBlock.metadata.route) {
      result.suggestions.push(`Consider adding a route to link this content to a specific UI location`);
    }

    if (!contentBlock.metadata.tags || contentBlock.metadata.tags.length === 0) {
      result.suggestions.push(`Consider adding tags to improve searchability and categorization`);
    }

    return result;
  }

  /**
   * Validate the entire PRD document
   */
  async validatePRDDocument(): Promise<{
    totalBlocks: number;
    validBlocks: number;
    invalidBlocks: number;
    results: Array<{ blockId: string; result: ValidationResult }>;
  }> {
    // Import the PRD parser to extract content blocks
    const { PRDDocumentParser } = await import('./parser');
    const parser = new PRDDocumentParser();
    const parsedDoc = await parser.parse(this.prdPath);

    const results: Array<{ blockId: string; result: ValidationResult }> = [];
    let validBlocks = 0;
    let invalidBlocks = 0;

    for (const block of parsedDoc.blocks) {
      const result = this.validateContentBlock(block);
      results.push({ blockId: block.id, result });

      if (result.isValid) {
        validBlocks++;
      } else {
        invalidBlocks++;
      }
    }

    return {
      totalBlocks: parsedDoc.blocks.length,
      validBlocks,
      invalidBlocks,
      results
    };
  }

  /**
   * Create a validation rule for featureId uniqueness
   */
  createFeatureIdUniquenessRule(): ValidationRule {
    return {
      id: 'feature-id-uniqueness',
      name: 'Feature ID Uniqueness',
      description: 'Ensures each featureId is unique across the document',
      validate: (content: string, metadata: any) => {
        // This would be implemented as part of a broader validation process
        // since it requires checking against all other blocks
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };
      }
    };
  }

  /**
   * Create a validation rule for content completeness
   */
  createContentCompletenessRule(): ValidationRule {
    return {
      id: 'content-completeness',
      name: 'Content Completeness',
      description: 'Ensures content has sufficient detail',
      validate: (content: string, metadata: any) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };

        // Check for common incomplete patterns
        if (content.toLowerCase().includes('tbd') || 
            content.toLowerCase().includes('to be defined') ||
            content.toLowerCase().includes('coming soon')) {
          result.warnings.push('Content contains TBD or placeholder text');
          result.isValid = false;
        }

        // Check for minimal content
        if (content.trim().split(/\s+/).length < 10) {
          result.warnings.push('Content appears to be minimal, consider adding more detail');
        }

        return result;
      }
    };
  }

  /**
   * Create a validation rule for metadata completeness
   */
  createMetadataCompletenessRule(): ValidationRule {
    return {
      id: 'metadata-completeness',
      name: 'Metadata Completeness',
      description: 'Ensures all important metadata fields are filled',
      validate: (content: string, metadata: any) => {
        const result: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };

        // Check for important metadata fields
        if (!metadata.route) {
          result.warnings.push('Missing route metadata - consider adding to link to UI');
        }

        if (!metadata.audience || metadata.audience.length === 0) {
          result.warnings.push('Missing audience metadata - specify target audience');
        }

        if (!metadata.surface || metadata.surface.length === 0) {
          result.warnings.push('Missing surface metadata - specify where content appears');
        }

        if (!metadata.tags || metadata.tags.length === 0) {
          result.warnings.push('Missing tags metadata - consider adding for categorization');
        }

        return result;
      }
    };
  }

  /**
   * Generate a validation report
   */
  async generateValidationReport(): Promise<string> {
    const validation = await this.validatePRDDocument();
    
    let report = '# PRD Metadata Validation Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n`;
    report += `- Total content blocks: ${validation.totalBlocks}\n`;
    report += `- Valid blocks: ${validation.validBlocks}\n`;
    report += `- Invalid blocks: ${validation.invalidBlocks}\n`;
    report += `- Validation rate: ${validation.validBlocks}/${validation.totalBlocks} (${validation.totalBlocks > 0 ? Math.round((validation.validBlocks/validation.totalBlocks)*100) : 0}%)\n\n`;
    
    if (validation.invalidBlocks > 0) {
      report += `## Invalid Content Blocks (${validation.invalidBlocks})\n\n`;
      
      for (const validationResult of validation.results) {
        if (!validationResult.result.isValid) {
          report += `### Block: ${validationResult.blockId}\n`;
          
          if (validationResult.result.errors.length > 0) {
            report += `**Errors:**\n`;
            for (const error of validationResult.result.errors) {
              report += `- ${error}\n`;
            }
            report += `\n`;
          }
          
          if (validationResult.result.warnings.length > 0) {
            report += `**Warnings:**\n`;
            for (const warning of validationResult.result.warnings) {
              report += `- ${warning}\n`;
            }
            report += `\n`;
          }
          
          if (validationResult.result.suggestions.length > 0) {
            report += `**Suggestions:**\n`;
            for (const suggestion of validationResult.result.suggestions) {
              report += `- ${suggestion}\n`;
            }
            report += `\n`;
          }
        }
      }
    }
    
    if (validation.validBlocks > 0) {
      report += `## Valid Content Blocks (${validation.validBlocks})\n`;
      report += `All valid blocks passed the metadata validation checks.\n\n`;
    }
    
    report += `## Validation Configuration\n\n`;
    report += `**Required Fields:** ${this.config.requiredFields.join(', ')}\n\n`;
    
    report += `**Field Patterns:**\n`;
    for (const [field, pattern] of Object.entries(this.config.fieldPatterns)) {
      report += `- ${field}: ${pattern.toString()}\n`;
    }
    report += `\n`;
    
    report += `**Length Requirements:**\n`;
    for (const [field, length] of Object.entries(this.config.minLengths)) {
      report += `- ${field} (min): ${length} characters\n`;
    }
    for (const [field, length] of Object.entries(this.config.maxLengths)) {
      report += `- ${field} (max): ${length} characters\n`;
    }
    report += `\n`;
    
    if (this.config.customRules.length > 0) {
      report += `**Custom Validation Rules:**\n`;
      for (const rule of this.config.customRules) {
        report += `- ${rule.name}: ${rule.description}\n`;
      }
      report += `\n`;
    }
    
    return report;
  }

  /**
   * Add a custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.config.customRules.push(rule);
  }

  /**
   * Set required fields for validation
   */
  setRequiredFields(fields: string[]): void {
    this.config.requiredFields = fields;
  }

  /**
   * Set field patterns for validation
   */
  setFieldPatterns(patterns: { [field: string]: RegExp }): void {
    this.config.fieldPatterns = { ...this.config.fieldPatterns, ...patterns };
  }

  /**
   * Set length requirements for validation
   */
  setLengthRequirements(minLengths: { [field: string]: number }, maxLengths: { [field: string]: number }): void {
    this.config.minLengths = { ...this.config.minLengths, ...minLengths };
    this.config.maxLengths = { ...this.config.maxLengths, ...maxLengths };
  }

  /**
   * Validate and fix common issues in PRD
   */
  async validateAndFix(): Promise<{
    fixedBlocks: number;
    remainingIssues: number;
    report: string;
  }> {
    // For now, we'll just generate a report
    // In a real implementation, this would attempt to fix common issues
    const validation = await this.validatePRDDocument();
    
    let fixedBlocks = 0;
    let remainingIssues = 0;
    
    for (const result of validation.results) {
      if (!result.result.isValid) {
        remainingIssues += result.result.errors.length + result.result.warnings.length;
      } else {
        fixedBlocks++;
      }
    }
    
    const report = await this.generateValidationReport();
    
    return {
      fixedBlocks,
      remainingIssues,
      report
    };
  }

  /**
   * Get validation statistics
   */
  async getValidationStats(): Promise<{
    totalBlocks: number;
    validBlocks: number;
    invalidBlocks: number;
    errorCount: number;
    warningCount: number;
    avgContentLength: number;
  }> {
    const validation = await this.validatePRDDocument();
    
    let errorCount = 0;
    let warningCount = 0;
    let totalContentLength = 0;
    
    for (const result of validation.results) {
      errorCount += result.result.errors.length;
      warningCount += result.result.warnings.length;
      
      // Find the original block to get content length
      const { PRDDocumentParser } = await import('./parser');
      const parser = new PRDDocumentParser();
      const parsedDoc = await parser.parse(this.prdPath);
      const block = parsedDoc.blocks.find(b => b.id === result.blockId);
      if (block) {
        totalContentLength += block.content.length;
      }
    }
    
    const avgContentLength = validation.totalBlocks > 0 ? Math.round(totalContentLength / validation.totalBlocks) : 0;
    
    return {
      totalBlocks: validation.totalBlocks,
      validBlocks: validation.validBlocks,
      invalidBlocks: validation.invalidBlocks,
      errorCount,
      warningCount,
      avgContentLength
    };
  }
}

// Example usage
if (require.main === module) {
  const validator = new MetadataValidationSystem();
  console.log('Metadata Validation System initialized');
  console.log('Available methods: validateContentBlock, validatePRDDocument, generateValidationReport');
}