/**
 * Documentation CMS API Layer
 * Provides endpoints for managing documentation content
 */

import express, { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Documentation content types
interface DocumentationBlock {
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
  filePath: string;
  lastModified: string;
}

interface FeatureSpec {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  prdReference: string;
  codeLocation: string;
}

interface ComparisonResult {
  prdOnly: FeatureSpec[];
  codeOnly: FeatureSpec[];
  matched: Array<{ prd: FeatureSpec; code: FeatureSpec }>;
}

// In-memory cache for documentation content
class DocumentationCache {
  private cache: Map<string, DocumentationBlock> = new Map();
  private lastUpdated: Date = new Date(0);

  get(id: string): DocumentationBlock | undefined {
    return this.cache.get(id);
  }

  getAll(): DocumentationBlock[] {
    return Array.from(this.cache.values());
  }

  set(id: string, block: DocumentationBlock): void {
    this.cache.set(id, block);
    this.lastUpdated = new Date();
  }

  clear(): void {
    this.cache.clear();
    this.lastUpdated = new Date();
  }

  getLastUpdated(): Date {
    return this.lastUpdated;
  }
}

// Main CMS API class
export class DocumentationCMS {
  private app: express.Application;
  private cache: DocumentationCache;
  private docsDir: string;
  private prdPath: string;

  constructor(docsDir: string = './docs', prdPath: string = './docs/PRD.md') {
    this.app = express();
    this.cache = new DocumentationCache();
    this.docsDir = docsDir;
    this.prdPath = prdPath;
    
    // Middleware
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Initialize routes
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Get all documentation blocks
    this.app.get('/api/docs/blocks', this.handleGetAllBlocks.bind(this));
    
    // Get documentation block by ID
    this.app.get('/api/docs/blocks/:id', this.handleGetBlockById.bind(this));
    
    // Search documentation blocks by metadata
    this.app.get('/api/docs/search', this.handleSearchBlocks.bind(this));
    
    // Update documentation block
    this.app.put('/api/docs/blocks/:id', this.handleUpdateBlock.bind(this));
    
    // Compare PRD vs Code features
    this.app.get('/api/compare/features', this.handleFeatureComparison.bind(this));
    
    // Trigger documentation sync
    this.app.post('/api/sync', this.handleSync.bind(this));
    
    // Get sync status
    this.app.get('/api/sync/status', this.handleSyncStatus.bind(this));
    
    // Get documentation file structure
    this.app.get('/api/docs/structure', this.handleGetStructure.bind(this));
    
    // Commit and push changes to Git
    this.app.post('/api/docs/commit', this.handleCommit.bind(this));
  }

  // Route handlers
  private async handleGetAllBlocks(req: Request, res: Response): Promise<void> {
    try {
      const blocks = this.cache.getAll();
      res.json({ blocks, count: blocks.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleGetBlockById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const block = this.cache.get(id);
      
      if (!block) {
        res.status(404).json({ error: 'Block not found' });
        return;
      }
      
      res.json(block);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleSearchBlocks(req: Request, res: Response): Promise<void> {
    try {
      const { featureId, route, audience, surface, tag, query } = req.query;
      let blocks = this.cache.getAll();
      
      // Apply filters
      if (featureId) {
        blocks = blocks.filter(b => b.metadata.featureId === featureId);
      }
      
      if (route) {
        blocks = blocks.filter(b => b.metadata.route === route);
      }
      
      if (audience) {
        blocks = blocks.filter(b => b.metadata.audience?.includes(String(audience)));
      }
      
      if (surface) {
        blocks = blocks.filter(b => b.metadata.surface?.includes(String(surface)));
      }
      
      if (tag) {
        blocks = blocks.filter(b => b.metadata.tags?.includes(String(tag)));
      }
      
      if (query) {
        const q = String(query).toLowerCase();
        blocks = blocks.filter(b => 
          b.title.toLowerCase().includes(q) || 
          b.content.toLowerCase().includes(q) ||
          b.metadata.featureId?.toLowerCase().includes(q)
        );
      }
      
      res.json({ blocks, count: blocks.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleUpdateBlock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, metadata } = req.body;
      
      const block = this.cache.get(id);
      if (!block) {
        res.status(404).json({ error: 'Block not found' });
        return;
      }
      
      // Update the block in cache
      block.title = title;
      block.content = content;
      block.metadata = metadata;
      block.lastModified = new Date().toISOString();
      
      // Update the file in the repository
      await this.updateDocumentationFile(block);
      
      res.json({ message: 'Block updated successfully', block });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleFeatureComparison(_req: Request, res: Response): Promise<void> {
    try {
      // This would typically call external services to scan the codebase
      // For now, we'll simulate the comparison
      const comparison: ComparisonResult = await this.comparePRDAndCode();
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleSync(_req: Request, res: Response): Promise<void> {
    try {
      await this.syncDocumentation();
      res.json({ message: 'Documentation synced successfully' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleSyncStatus(_req: Request, res: Response): Promise<void> {
    try {
      const lastUpdated = this.cache.getLastUpdated();
      const blockCount = this.cache.getAll().length;
      
      res.json({
        lastUpdated: lastUpdated.toISOString(),
        blockCount,
        isSynced: blockCount > 0
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleGetStructure(_req: Request, res: Response): Promise<void> {
    try {
      const structure = await this.getDocumentationStructure();
      res.json(structure);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  private async handleCommit(req: Request, res: Response): Promise<void> {
    try {
      const { message, author } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'Commit message is required' });
        return;
      }
      
      const commitResult = await this.commitChanges(message, author);
      res.json({ message: 'Changes committed successfully', result: commitResult });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // Helper methods
  private async loadDocumentation(): Promise<void> {
    this.cache.clear();
    
    // Read the PRD file and parse it
    const prdContent = await fs.readFile(this.prdPath, 'utf-8');
    
    // This is a simplified parsing - in reality, we'd use the parser from .docs-automation
    const lines = prdContent.split('\n');
    let currentBlock: DocumentationBlock | null = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // Save previous block if exists
        if (currentBlock) {
          currentBlock.content = currentContent.join('\n').trim();
          this.cache.set(currentBlock.id, currentBlock);
        }
        
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const id = this.generateId(title);
        
        // Create new block
        currentBlock = {
          id,
          title,
          content: '',
          metadata: {},
          level,
          filePath: this.prdPath,
          lastModified: new Date().toISOString()
        };
        
        currentContent = [line];
      } else {
        if (currentBlock) {
          currentContent.push(line);
        }
      }
    }
    
    // Save the last block
    if (currentBlock) {
      currentBlock.content = currentContent.join('\n').trim();
      this.cache.set(currentBlock.id, currentBlock);
    }
  }

  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async updateDocumentationFile(block: DocumentationBlock): Promise<void> {
    // In a real implementation, this would update the actual file
    // For now, we'll just update the cache and note that the file needs updating
    
    // This would involve:
    // 1. Reading the file
    // 2. Finding the appropriate section
    // 3. Updating the content
    // 4. Writing back to the file
    
    console.log(`Would update file ${block.filePath} with block ${block.id}`);
  }

  private async comparePRDAndCode(): Promise<ComparisonResult> {
    // This would typically involve:
    // 1. Scanning the PRD for features
    // 2. Scanning the codebase for implemented features
    // 3. Comparing the two
    
    // For simulation, we'll return some dummy data
    return {
      prdOnly: [
        { id: 'feature-a', name: 'Feature A', description: 'A feature described in PRD', implemented: false, prdReference: 'Section 2.1', codeLocation: '' },
        { id: 'feature-b', name: 'Feature B', description: 'Another PRD feature', implemented: false, prdReference: 'Section 3.2', codeLocation: '' }
      ],
      codeOnly: [
        { id: 'feature-x', name: 'Feature X', description: 'A feature implemented in code', implemented: true, prdReference: '', codeLocation: 'src/components/XComponent.tsx' },
        { id: 'feature-y', name: 'Feature Y', description: 'Another implemented feature', implemented: true, prdReference: '', codeLocation: 'src/services/YService.ts' }
      ],
      matched: [
        {
          prd: { id: 'feature-c', name: 'Feature C', description: 'A feature in both', implemented: true, prdReference: 'Section 4.1', codeLocation: 'src/components/CComponent.tsx' },
          code: { id: 'feature-c', name: 'Feature C', description: 'A feature in both', implemented: true, prdReference: 'Section 4.1', codeLocation: 'src/components/CComponent.tsx' }
        }
      ]
    };
  }

  private async syncDocumentation(): Promise<void> {
    // Reload documentation from files
    await this.loadDocumentation();
  }

  private async getDocumentationStructure(): Promise<any> {
    // Return the directory structure of documentation files
    const walk = async (dir: string): Promise<any> => {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const tree: any = {};
      
      for (const dirent of dirents) {
        const fullPath = path.join(dir, dirent.name);
        
        if (dirent.isDirectory()) {
          tree[dirent.name] = await walk(fullPath);
        } else if (dirent.isFile() && (dirent.name.endsWith('.md') || dirent.name.endsWith('.txt'))) {
          tree[dirent.name] = {
            path: fullPath,
            size: (await fs.stat(fullPath)).size,
            modified: (await fs.stat(fullPath)).mtime.toISOString()
          };
        }
      }
      
      return tree;
    };
    
    return await walk(this.docsDir);
  }

  private async commitChanges(message: string, author?: string): Promise<any> {
    // Execute git commands to commit changes
    try {
      // Add all changed files
      const { stdout: addOut, stderr: addErr } = await execAsync('git add .', { cwd: '.' });
      if (addErr) console.error('Git add error:', addErr);
      
      // Set author if provided
      if (author) {
        const [name, email] = author.split('<');
        const cleanEmail = email?.replace('>', '');
        if (name && cleanEmail) {
          await execAsync(`git config user.name "${name.trim()}"`, { cwd: '.' });
          await execAsync(`git config user.email "${cleanEmail.trim()}"`, { cwd: '.' });
        }
      }
      
      // Commit changes
      const { stdout: commitOut, stderr: commitErr } = await execAsync(`git commit -m "${message}"`, { cwd: '.' });
      if (commitErr) console.error('Git commit error:', commitErr);
      
      // Push changes
      const { stdout: pushOut, stderr: pushErr } = await execAsync('git push', { cwd: '.' });
      if (pushErr) console.error('Git push error:', pushErr);
      
      return {
        add: addOut,
        commit: commitOut,
        push: pushOut,
        success: true
      };
    } catch (error) {
      console.error('Git operation failed:', error);
      throw error;
    }
  }

  // Start the server
  async start(port: number = 3001): Promise<void> {
    // Load documentation on startup
    await this.loadDocumentation();
    
    this.app.listen(port, () => {
      console.log(`Documentation CMS API running on http://localhost:${port}`);
      console.log('Available endpoints:');
      console.log('  GET    /api/docs/blocks          - Get all documentation blocks');
      console.log('  GET    /api/docs/blocks/:id      - Get documentation block by ID');
      console.log('  GET    /api/docs/search         - Search documentation blocks');
      console.log('  PUT    /api/docs/blocks/:id     - Update documentation block');
      console.log('  GET    /api/compare/features    - Compare PRD vs Code features');
      console.log('  POST   /api/sync                - Sync documentation');
      console.log('  GET    /api/sync/status         - Get sync status');
      console.log('  GET    /api/docs/structure      - Get documentation structure');
      console.log('  POST   /api/docs/commit         - Commit changes to Git');
    });
  }
}

// Example usage
if (require.main === module) {
  const cms = new DocumentationCMS();
  cms.start(3001);
}