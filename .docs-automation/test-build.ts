import { DocumentationBuildPipeline } from './build-pipeline';

async function testBuildPipeline() {
  console.log('Testing Documentation Build Pipeline...');
  
  try {
    // Initialize the build pipeline
    const pipeline = new DocumentationBuildPipeline('./test-output');
    
    // Define version information
    const versionInfo = {
      version: '1.0.0',
      title: 'TaskMan Documentation',
      description: 'Complete documentation for TaskMan platform',
      blocks: [] // This will be populated by the parser
    };
    
    // Run the build process
    await pipeline.build('../docs/PRD.md', versionInfo);
    
    console.log('Build pipeline test completed successfully!');
    console.log('Outputs generated in ./test-output/');
    console.log('- User manual: ./test-output/manual/user-manual.md');
    console.log('- In-app help: ./test-output/help/');
    console.log('- Database content: ./test-output/database/');
    console.log('- Build manifest: ./test-output/manifest.json');
    
  } catch (error) {
    console.error('Error during build pipeline test:', error);
  }
}

// Run the test
testBuildPipeline();