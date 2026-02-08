/**
 * Documentation CMS UI Components
 * React components for managing documentation content
 */

import React, { useState, useEffect } from 'react';

// Interfaces for TypeScript
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

// Main CMS Dashboard Component
export const DocumentationCMS: React.FC = () => {
  const [blocks, setBlocks] = useState<DocumentationBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<DocumentationBlock | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'comparison' | 'structure'>('editor');

  // Load documentation blocks on component mount
  useEffect(() => {
    fetchDocumentationBlocks();
  }, []);

  const fetchDocumentationBlocks = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the CMS API
      // const response = await fetch('/api/docs/blocks');
      // const data = await response.json();
      // setBlocks(data.blocks);
      
      // For demo purposes, we'll create mock data
      const mockBlocks: DocumentationBlock[] = [
        {
          id: 'auth-login',
          title: 'Authentication Login',
          content: 'The login functionality allows users to securely access their accounts using email and password.',
          metadata: {
            featureId: 'auth.login',
            route: '/login',
            audience: ['user'],
            surface: ['docs', 'help']
          },
          level: 2,
          filePath: 'docs/auth.md',
          lastModified: new Date().toISOString()
        },
        {
          id: 'tasks-create',
          title: 'Creating Tasks',
          content: 'Users can create new tasks by clicking the "New Task" button and filling out the required fields.',
          metadata: {
            featureId: 'tasks.create',
            route: '/tasks',
            audience: ['user'],
            surface: ['docs', 'help']
          },
          level: 2,
          filePath: 'docs/tasks.md',
          lastModified: new Date().toISOString()
        }
      ];
      setBlocks(mockBlocks);
    } catch (error) {
      console.error('Error fetching documentation blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonResult = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the comparison API
      // const response = await fetch('/api/compare/features');
      // const data = await response.json();
      // setComparisonResult(data);
      
      // For demo purposes, we'll create mock data
      const mockComparison: ComparisonResult = {
        prdOnly: [
          {
            id: 'feature-a',
            name: 'Feature A',
            description: 'A feature described in PRD but not implemented',
            section: 'Section 2.1',
            status: 'not-implemented',
            prdReference: 'Section 2.1 of PRD',
          }
        ],
        codeOnly: [
          {
            id: 'feature-x',
            name: 'Feature X',
            description: 'A feature implemented in code but not in PRD',
            section: 'Code Implementation',
            status: 'implemented',
            codeLocation: 'src/components/XComponent.tsx',
            prdReference: 'Unknown',
          }
        ],
        matched: [
          {
            prd: {
              id: 'feature-c',
              name: 'Feature C',
              description: 'A feature in both PRD and code',
              section: 'Section 3.1',
              status: 'implemented',
              codeLocation: 'src/components/CComponent.tsx',
              prdReference: 'Section 3.1 of PRD',
            },
            code: {
              id: 'feature-c',
              name: 'Feature C',
              description: 'A feature in both PRD and code',
              section: 'Code Implementation',
              status: 'implemented',
              codeLocation: 'src/components/CComponent.tsx',
              prdReference: 'Section 3.1 of PRD',
            }
          }
        ],
        summary: {
          totalPrdFeatures: 10,
          totalCodeFeatures: 8,
          matchedFeatures: 7,
          prdOnlyCount: 2,
          codeOnlyCount: 1,
        }
      };
      setComparisonResult(mockComparison);
    } catch (error) {
      console.error('Error fetching comparison result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUpdate = async (updatedBlock: DocumentationBlock) => {
    try {
      // In a real implementation, this would call the API to update the block
      // const response = await fetch(`/api/docs/blocks/${updatedBlock.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedBlock)
      // });
      
      // Update the local state
      setBlocks(blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b));
      setSelectedBlock(updatedBlock);
      
      alert('Documentation block updated successfully!');
    } catch (error) {
      console.error('Error updating block:', error);
      alert('Failed to update documentation block');
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the sync API
      // await fetch('/api/sync', { method: 'POST' });
      
      alert('Documentation synced successfully!');
      fetchDocumentationBlocks(); // Refresh the blocks
    } catch (error) {
      console.error('Error syncing documentation:', error);
      alert('Failed to sync documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async (message: string) => {
    try {
      // In a real implementation, this would call the commit API
      // const response = await fetch('/api/docs/commit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message })
      // });
      
      alert('Changes committed successfully!');
    } catch (error) {
      console.error('Error committing changes:', error);
      alert('Failed to commit changes');
    }
  };

  // Filter blocks based on search query
  const filteredBlocks = blocks.filter(block => 
    block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.metadata.featureId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentation CMS</h1>
        <p className="text-gray-600">Manage and compare documentation between PRD and codebase</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-md ${activeTab === 'editor' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Documentation Editor
        </button>
        <button 
          onClick={() => { setActiveTab('comparison'); fetchComparisonResult(); }}
          className={`px-4 py-2 rounded-md ${activeTab === 'comparison' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Feature Comparison
        </button>
        <button 
          onClick={() => setActiveTab('structure')}
          className={`px-4 py-2 rounded-md ${activeTab === 'structure' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Documentation Structure
        </button>
        
        <div className="ml-auto flex gap-2">
          <button 
            onClick={handleSync}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Syncing...' : 'Sync Documentation'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && (
        <>
          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Block List Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Documentation Blocks</h2>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search blocks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="p-2 max-h-[600px] overflow-y-auto">
                    {filteredBlocks.map(block => (
                      <div 
                        key={block.id}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedBlock?.id === block.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => setSelectedBlock(block)}
                      >
                        <h3 className="font-medium text-gray-900">{block.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{block.content.substring(0, 60)}...</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {block.metadata.featureId && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Feature: {block.metadata.featureId}</span>
                          )}
                          {block.metadata.route && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Route: {block.metadata.route}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor Panel */}
              <div className="lg:col-span-2">
                {selectedBlock ? (
                  <DocumentationEditor 
                    block={selectedBlock} 
                    onUpdate={handleBlockUpdate}
                    onCommit={handleCommit}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-500">Select a documentation block to edit</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <FeatureComparisonView comparisonResult={comparisonResult} />
          )}

          {activeTab === 'structure' && (
            <DocumentationStructureView />
          )}
        </>
      )}
    </div>
  );
};

// Documentation Editor Component
const DocumentationEditor: React.FC<{ 
  block: DocumentationBlock; 
  onUpdate: (block: DocumentationEditor) => void;
  onCommit: (message: string) => void;
}> = ({ block, onUpdate, onCommit }) => {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  const [featureId, setFeatureId] = useState(block.metadata.featureId || '');
  const [route, setRoute] = useState(block.metadata.route || '');
  const [audience, setAudience] = useState(block.metadata.audience?.join(', ') || '');
  const [surface, setSurface] = useState(block.metadata.surface?.join(', ') || '');
  const [tags, setTags] = useState(block.metadata.tags?.join(', ') || '');
  const [commitMessage, setCommitMessage] = useState('');

  const handleSave = () => {
    const updatedBlock: DocumentationBlock = {
      ...block,
      title,
      content,
      metadata: {
        featureId: featureId || undefined,
        route: route || undefined,
        audience: audience ? audience.split(',').map(a => a.trim()) : [],
        surface: surface ? surface.split(',').map(s => s.trim()) : [],
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
      }
    };
    onUpdate(updatedBlock);
  };

  const handleCommitChanges = () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }
    onCommit(commitMessage);
    setCommitMessage('');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Edit Documentation Block</h2>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border rounded-md font-mono text-sm"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feature ID</label>
            <input
              type="text"
              value={featureId}
              onChange={(e) => setFeatureId(e.target.value)}
              placeholder="e.g., auth.login"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
            <input
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g., /login"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., user, admin"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Surface</label>
            <input
              type="text"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="e.g., docs, help"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., security, authentication"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save Changes
          </button>
          
          <div className="flex-1"></div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="px-3 py-2 border rounded-md"
            />
            <button
              onClick={handleCommitChanges}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Commit to Git
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Feature Comparison View Component
const FeatureComparisonView: React.FC<{ comparisonResult: ComparisonResult | null }> = ({ comparisonResult }) => {
  if (!comparisonResult) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Run feature comparison to see results</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Run Comparison
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Comparison Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{comparisonResult.summary.totalPrdFeatures}</div>
            <div className="text-gray-600">Features in PRD</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{comparisonResult.summary.totalCodeFeatures}</div>
            <div className="text-gray-600">Features in Code</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{comparisonResult.summary.matchedFeatures}</div>
            <div className="text-gray-600">Matched Features</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRD Only Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-red-600">Features in PRD Only ({comparisonResult.prdOnly.length})</h3>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {comparisonResult.prdOnly.map(feature => (
              <div key={feature.id} className="p-3 border-b">
                <h4 className="font-medium text-gray-900">{feature.name}</h4>
                <p className="text-sm text-gray-500">{feature.description}</p>
                <div className="mt-1 text-xs text-gray-400">{feature.section}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Matched Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-green-600">Matched Features ({comparisonResult.matched.length})</h3>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {comparisonResult.matched.map((match, idx) => (
              <div key={idx} className="p-3 border-b">
                <h4 className="font-medium text-gray-900">{match.prd.name}</h4>
                <p className="text-sm text-gray-500">{match.prd.description}</p>
                <div className="mt-2 text-xs">
                  <div className="text-blue-500">PRD: {match.prd.prdReference}</div>
                  <div className="text-green-500">Code: {match.code.codeLocation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Only Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-yellow-600">Features in Code Only ({comparisonResult.codeOnly.length})</h3>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {comparisonResult.codeOnly.map(feature => (
              <div key={feature.id} className="p-3 border-b">
                <h4 className="font-medium text-gray-900">{feature.name}</h4>
                <p className="text-sm text-gray-500">{feature.description}</p>
                <div className="mt-1 text-xs text-gray-400">{feature.codeLocation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Documentation Structure View Component
const DocumentationStructureView: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Documentation Structure</h2>
      </div>
      <div className="p-4">
        <div className="text-gray-500 text-center py-8">
          <p>Documentation file structure visualization would appear here</p>
          <p className="mt-2">This would show the hierarchy of documentation files in the repository</p>
        </div>
      </div>
    </div>
  );
};