import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { apiClient } from '../api/client';

export default function SkillGraphView({ role, user }: { role: string; user?: any }) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[]; stats: any }>({ nodes: [], edges: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [nodeDetails, setNodeDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  
  const graphRef = useRef<any>(null);

  const loadGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Constructing query string for filters
      const params = new URLSearchParams();
      // Wait, node type filtering is mostly client side. 
      // API currently supports filtering by explicit IDs: employeeId, skillId, etc.
      // For the full graph, we don't pass any ID filters unless requested.
      const response = await apiClient.get('/nexus/skill-graph');
      if (response.data.success) {
        setGraphData({
          nodes: response.data.nodes,
          edges: response.data.edges,
          stats: response.data.stats
        });
      } else {
        setError('Failed to load graph data.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'An error occurred loading the graph.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const loadNodeDetails = async (node: any) => {
    setSelectedNode(node);
    setNodeDetails(null); // reset while loading

    if (node.type === 'employee' || node.type === 'project') {
      try {
        setLoadingDetails(true);
        // Call the Skill Gap Engine API if it's an employee
        if (node.type === 'employee') {
          // We can request skill-gap for this employee against their designation.
          // Wait, the skill-gap API needs a designationId or projectId.
          // Let's check what designation this employee has from the edges or metadata.
          // Wait, the API might fail if we don't pass designationId or projectId.
          // Actually, let's just use the metadata.designation name for now or find the designation edge.
          
          let designationId;
          const roleEdge = graphData.edges.find((e: any) => e.source === node.id && e.type === 'HAS_ROLE');
          if (roleEdge) designationId = roleEdge.target;
          
          if (designationId) {
             const res = await apiClient.get(`/nexus/employees/${node.id}/skill-gap?designationId=${designationId}`);
             if (res.data.success) {
               setNodeDetails(res.data);
             }
          }
        }
      } catch (err) {
        console.error('Failed to load node details', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleNodeClick = (node: any) => {
    loadNodeDetails(node);
  };

  const handleBackgroundClick = () => {
    setSelectedNode(null);
    setNodeDetails(null);
  };

  const filteredData = useMemo(() => {
    let nodes = graphData.nodes;
    if (nodeTypeFilter !== 'all') {
      nodes = nodes.filter((n: any) => n.type === nodeTypeFilter);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n: any) => n.label.toLowerCase().includes(q) || (n.metadata?.designation || '').toLowerCase().includes(q));
    }
    
    // Only include edges where both source and target exist in the filtered nodes
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const edges = graphData.edges.filter((e: any) => {
      // react-force-graph mutates edges to replace source/target strings with node objects, 
      // so we have to handle both cases.
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return nodeIds.has(srcId) && nodeIds.has(tgtId);
    });

    return { nodes, links: edges };
  }, [graphData, nodeTypeFilter, searchQuery]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'employee': return '#3b82f6'; // Blue
      case 'skill': return '#10b981'; // Green
      case 'designation': return '#8b5cf6'; // Purple
      case 'project': return '#f59e0b'; // Amber
      default: return '#9ca3af';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>Workforce Intelligence: Skill Graph</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
             Interactive visualization of workforce capabilities and requirements.
          </p>
        </div>
        
        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="input-group" style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '18px' }}>search</span>
            <input 
              type="text" 
              placeholder="Search graph..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', borderRadius: '20px', border: '1px solid var(--cutout-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', width: '220px' }}
            />
          </div>
          
          <select 
            value={nodeTypeFilter} 
            onChange={(e) => setNodeTypeFilter(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--cutout-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', cursor: 'pointer' }}
          >
            <option value="all">All Types</option>
            <option value="employee">Employees</option>
            <option value="skill">Skills</option>
            <option value="designation">Roles</option>
            <option value="project">Projects</option>
          </select>
          
          <button className="btn btn-glass" onClick={() => { if (graphRef.current) graphRef.current.zoomToFit(400); }} title="Fit to Screen">
             <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fit_screen</span>
          </button>
          
          <button className="btn btn-glass" onClick={loadGraph} title="Refresh Data">
             <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
        
        {/* Graph Container */}
        <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--cutout-border)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-secondary)' }}>
              Loading Graph Data...
            </div>
          ) : error ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ef4444' }}>
              {error}
            </div>
          ) : filteredData.nodes.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-secondary)' }}>
              No nodes match your filter criteria.
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={filteredData}
              nodeLabel="label"
              nodeColor={(n: any) => getNodeColor(n.type)}
              nodeRelSize={6}
              linkColor={() => 'rgba(255,255,255,0.2)'}
              linkWidth={1.5}
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={d => d.type === 'HAS_SKILL' ? 0.005 : 0}
              onNodeClick={handleNodeClick}
              onBackgroundClick={handleBackgroundClick}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.label;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                ctx.fillStyle = getNodeColor(node.type);
                ctx.fill();
                
                // Only show label if zoomed in enough or if selected
                if (globalScale > 1.5 || selectedNode?.id === node.id) {
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'rgba(255,255,255,0.9)';
                  ctx.fillText(label, node.x, node.y + 8);
                }
                
                // Highlight selected node
                if (selectedNode?.id === node.id) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 2 / globalScale;
                  ctx.stroke();
                }
              }}
            />
          )}
          
          {/* Legend Overlay */}
          {!loading && !error && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '12px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'var(--color-text)' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', opacity: 0.8 }}>Legend</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getNodeColor('employee') }}></div> Employee</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getNodeColor('skill') }}></div> Skill</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getNodeColor('designation') }}></div> Role</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getNodeColor('project') }}></div> Project</div>
              </div>
            </div>
          )}
          
          {/* Stats Overlay */}
          {!loading && !error && graphData.stats && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '12px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'var(--color-text)' }}>
              <div style={{ display: 'flex', gap: '16px', opacity: 0.9 }}>
                <div><strong>{graphData.stats.employees || 0}</strong> Employees</div>
                <div><strong>{graphData.stats.skills || 0}</strong> Canonical Skills</div>
                <div><strong>{graphData.stats.edges || 0}</strong> Relationships</div>
              </div>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <div className="glass-panel" style={{ width: '360px', flexShrink: 0, borderRadius: '16px', border: '1px solid var(--cutout-border)', padding: '24px', overflowY: 'auto' }}>
          {!selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)', textAlign: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>touch_app</span>
              <p style={{ margin: 0 }}>Select a node in the graph to view its intelligence profile and relationships.</p>
            </div>
          ) : (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: getNodeColor(selectedNode.type) }}>
                  {selectedNode.type === 'employee' ? 'person' : selectedNode.type === 'skill' ? 'psychology' : selectedNode.type === 'designation' ? 'work' : 'assignment'}
                </span>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {selectedNode.type === 'designation' ? 'Role' : selectedNode.type}
                </span>
              </div>
              
              <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--color-text)' }}>
                {selectedNode.label}
              </h2>
              
              {/* Type-specific basic metadata */}
              {selectedNode.type === 'employee' && selectedNode.metadata?.designation && (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                   <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Current Role</div>
                   <div style={{ fontWeight: 500 }}>{selectedNode.metadata.designation}</div>
                </div>
              )}
              
              {selectedNode.type === 'skill' && selectedNode.metadata?.category && (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                   <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Category</div>
                   <div style={{ fontWeight: 500 }}>{selectedNode.metadata.category}</div>
                </div>
              )}
              
              {/* Connected Edges Summary */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--cutout-border)', paddingBottom: '8px' }}>Relationships</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {graphData.edges.filter((e: any) => 
                     (typeof e.source === 'object' ? e.source.id === selectedNode.id : e.source === selectedNode.id) || 
                     (typeof e.target === 'object' ? e.target.id === selectedNode.id : e.target === selectedNode.id)
                  ).slice(0, 15).map((edge: any, i: number) => {
                    const isSource = typeof edge.source === 'object' ? edge.source.id === selectedNode.id : edge.source === selectedNode.id;
                    const otherNodeId = isSource ? (typeof edge.target === 'object' ? edge.target.id : edge.target) : (typeof edge.source === 'object' ? edge.source.id : edge.source);
                    const otherNode = graphData.nodes.find((n: any) => n.id === otherNodeId);
                    
                    if (!otherNode) return null;
                    
                    return (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                           {edge.type.replace(/_/g, ' ')}
                        </span>
                        <strong style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {otherNode.label}
                        </strong>
                      </li>
                    );
                  })}
                  {graphData.edges.filter((e: any) => 
                     (typeof e.source === 'object' ? e.source.id === selectedNode.id : e.source === selectedNode.id) || 
                     (typeof e.target === 'object' ? e.target.id === selectedNode.id : e.target === selectedNode.id)
                  ).length > 15 && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '8px' }}>
                       + More relationships omitted
                    </div>
                  )}
                </ul>
              </div>
              
              {/* Skill Gap Analysis Section (Loaded Dynamically) */}
              {(selectedNode.type === 'employee' || selectedNode.type === 'project') && (
                <div>
                   <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--cutout-border)', paddingBottom: '8px' }}>Skill Gap Analysis</h3>
                   
                   {loadingDetails ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                        Running gap analysis...
                      </div>
                   ) : nodeDetails && nodeDetails.coverage ? (
                     <div>
                       <div style={{ marginBottom: '16px' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                           <span>Coverage</span>
                           <span style={{ fontWeight: 600 }}>{nodeDetails.coverage.percentage}%</span>
                         </div>
                         <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                           <div style={{ height: '100%', background: nodeDetails.coverage.percentage >= 80 ? '#10b981' : nodeDetails.coverage.percentage >= 50 ? '#f59e0b' : '#ef4444', width: `${nodeDetails.coverage.percentage}%` }}></div>
                         </div>
                         <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                           {nodeDetails.coverage.matched} of {nodeDetails.coverage.required} required skills
                         </div>
                       </div>
                       
                       {nodeDetails.matchedSkills?.length > 0 && (
                         <div style={{ marginBottom: '12px' }}>
                           <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', marginBottom: '6px' }}>Matched Skills</div>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                             {nodeDetails.matchedSkills.map((ms: any, i: number) => (
                               <span key={i} style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                 ✓ {ms.skill}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                       
                       {nodeDetails.skillGaps?.length > 0 && (
                         <div>
                           <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '6px' }}>Skill Gaps</div>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                             {nodeDetails.skillGaps.map((gap: any, i: number) => (
                               <span key={i} style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                 ⚠ {gap.skill}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                       No requirement data available to run analysis.
                     </div>
                   )}
                </div>
              )}
              
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
