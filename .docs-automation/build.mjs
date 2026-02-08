#!/usr/bin/env node

import { DocumentationBuildPipeline } from './build-pipeline';
import fs from 'fs/promises';
import path from 'path';

async function runBuildPipeline() {
  const args = process.argv.slice(2);
  
  // Default values
  const prdPath = args[0] || '../docs/PRD.md';
  const outputPath = args[1] || './output';
  const version = args[2] || 'latest';
  
  console.log('🚀 Starting Documentation Build Pipeline...');
  console.log(`📄 Input PRD: ${prdPath}`);
  console.log(`📂 Output directory: ${outputPath}`);
  console.log(`🔖 Version: ${version}`);
  console.log('');
  
  try {
    // Check if PRD file exists
    await fs.access(prdPath);
    
    // Create output directory if it doesn't exist
    await fs.mkdir(outputPath, { recursive: true });
    
    // Initialize the build pipeline
    const pipeline = new DocumentationBuildPipeline(outputPath);
    
    // Define version information
    const versionInfo = {
      version,
      title: 'TaskMan Documentation',
      description: 'Automatically generated documentation from PRD',
      blocks: [] // This will be populated by the parser
    };
    
    // Run the build process
    await pipeline.build(prdPath, versionInfo);
    
    console.log('');
    console.log('✅ Documentation Build Pipeline completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during build pipeline execution:', error.message);
    process.exit(1);
  }
}

// Run the build pipeline
runBuildPipeline();