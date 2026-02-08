import { PRDDocumentParser } from './parser';

async function testParser() {
  console.log('Testing PRD Document Parser...');
  
  try {
    const parser = new PRDDocumentParser();
    
    // Parse the actual PRD file
    const result = await parser.parse('../docs/PRD.md');
    
    console.log(`Parsed ${result.blocks.length} content blocks`);
    console.log(`Generated TOC with ${result.toc.length} entries`);
    
    // Print first few blocks as examples
    console.log('\nFirst 3 blocks:');
    result.blocks.slice(0, 3).forEach((block, index) => {
      console.log(`\nBlock ${index + 1}:`);
      console.log(`ID: ${block.id}`);
      console.log(`Title: ${block.title}`);
      console.log(`Level: ${block.level}`);
      console.log(`Metadata:`, block.metadata);
      console.log(`Content preview: ${block.content.substring(0, 100)}...`);
    });
    
    // Test filtering
    console.log('\nTesting filter functionality...');
    const filteredBlocks = parser.filterBlocks(result.blocks, { level: 2 });
    console.log(`Found ${filteredBlocks.length} level 2 blocks`);
    
    // Test conversion
    console.log('\nTesting conversion functionality...');
    const jsonOutput = parser.convertBlocks(result.blocks.slice(0, 2), 'json');
    console.log('JSON conversion successful (first 2 blocks)');
    
    console.log('\nParser test completed successfully!');
  } catch (error) {
    console.error('Error during parsing:', error);
  }
}

// Run the test
testParser();