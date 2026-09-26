import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './SkillGraph.css';
import { apiClient } from '../../api/client';
import {
  mapSkillGraphResponse,
  type EntityData,
  type EntityKind,
  type SkillGraphResponse,
  type WorkforceGraph,
} from './transformWorkforceToGraph';

const entityMeta: Record<EntityKind, { label: string; icon: string; color: string }> = {
  employee: { label: 'Employees', icon: 'group', color: '#38bdf8' },
  skill: { label: 'Skills', icon: 'database', color: '#10b981' },
  role: { label: 'Roles', icon: 'work', color: '#8b5cf6' },
  project: { label: 'Projects', icon: 'folder_open', color: '#f97316' },
};

const ALL_KINDS: EntityKind[] = ['employee', 'skill', 'role', 'project'];

// Memoized custom node: with 225 nodes, re-rendering every node during
// selection/pan was the main source of jank. Each node now only re-renders
// when its own props change.
const EntityNode = memo(function EntityNode({ data, selected }: NodeProps<Node<EntityData>>) {
  const meta = entityMeta[data.kind];
  return (
    <div className={`skill-graph-node ${selected ? 'is-selected' : ''}`} style={{ '--node-color': meta.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} />
      <span className="material-symbols-outlined skill-graph-node-icon">{meta.icon}</span>
      <span className="skill-graph-node-label">{data.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const nodeTypes = { entity: EntityNode };

function GraphCanvas({ graph, onSelect }: { graph: WorkforceGraph; onSelect: (id: string) => void }) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = graph;
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeKinds, setActiveKinds] = useState<Set<EntityKind>>(new Set(ALL_KINDS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState<number>(0);

  const nodesById = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  const selectedNeighbors = useMemo(() => {
    if (!selectedId) return null;
    const neighbors = new Set<string>([selectedId]);
    for (const edge of edges) {
      if (edge.source === selectedId) neighbors.add(edge.target);
      else if (edge.target === selectedId) neighbors.add(edge.source);
    }
    return neighbors;
  }, [edges, selectedId]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const loweredQuery = query.trim().toLowerCase();
    const results = nodes.filter(n => {
      const haystack = `${n.data.label} ${n.data.subtitle || ''}`.toLowerCase();
      return haystack.includes(loweredQuery);
    });
    return results.slice(0, 8);
  }, [nodes, query]);

  const visibleNodeIds = useMemo(() => {
    // In focus mode, filters are ignored for the core nodes, they are handled by renderedNodes directly.
    // If not in focus mode, we just respect the activeKinds filter (and NOT query, as query is now purely for the dropdown).
    const matches = new Set<string>();
    for (const node of nodes) {
      if (activeKinds.has(node.data.kind)) matches.add(node.id);
    }
    return matches;
  }, [activeKinds, nodes]);

  const renderedNodes = useMemo(() => {
    if (!selectedId || !selectedNeighbors) {
      return nodes.filter(node => visibleNodeIds.has(node.id));
    }
    
    // Focus Mode: only show selected node + neighbors
    const focusedNodes = nodes.filter(node => node.id === selectedId || selectedNeighbors.has(node.id));
    const selected = focusedNodes.find(n => n.id === selectedId);
    if (!selected) return [];
    
    const neighbors = focusedNodes.filter(n => n.id !== selectedId).sort((a, b) => a.data.kind.localeCompare(b.data.kind));
    const count = neighbors.length;
    
    let radius = 140;
    if (count > 6 && count <= 12) radius = 200;
    else if (count > 12) radius = 260;
    
    const angleStep = count > 0 ? (2 * Math.PI) / count : 0;
    
    const output: Node[] = [{ ...selected, position: { x: 0, y: 0 }, selected: true }];
    
    neighbors.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      const x = Math.cos(angle) * radius * 1.4; // Elliptical for text width
      const y = Math.sin(angle) * radius;
      output.push({ ...node, position: { x, y }, className: '' });
    });
    
    return output;
  }, [nodes, selectedId, selectedNeighbors, visibleNodeIds]);

  const renderedEdges = useMemo(() => {
    const output: Edge[] = [];
    for (const edge of edges) {
      if (!selectedId || !selectedNeighbors) {
        if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) continue;
        output.push(edge);
        continue;
      }
      // Focus Mode: only show edges connected to the selected node
      const isConnected = edge.source === selectedId || edge.target === selectedId;
      if (isConnected) {
        output.push({ 
          ...edge, 
          animated: true, 
          label: edge.data?.relationLabel as string | undefined, 
          style: { stroke: '#0ea5e9', strokeWidth: 1.5 } 
        });
      }
    }
    return output;
  }, [edges, selectedId, selectedNeighbors, visibleNodeIds]);

  const selectedNode = selectedId ? nodesById.get(selectedId) || null : null;
  const selectedConnections = useMemo(() => {
    if (!selectedId) return [];
    const connections: Array<{ id: string; label: string; kind: EntityKind }> = [];
    const seen = new Set<string>();
    for (const edge of edges) {
      const otherId = edge.source === selectedId ? edge.target : edge.target === selectedId ? edge.source : null;
      if (!otherId || seen.has(otherId)) continue;
      const node = nodesById.get(otherId);
      if (!node) continue;
      seen.add(otherId);
      connections.push({ id: node.id, label: node.data.label, kind: node.data.kind });
    }
    return connections;
  }, [edges, nodesById, selectedId]);

  const rankedEmployees = useMemo(() => {
    if (!selectedNode || selectedNode.data.kind !== 'skill') return [];
    const empEdges = edges.filter(e => e.target === selectedId && e.className === 'edge-has_skill');
    const employeesData = empEdges.map(edge => {
      const empNode = nodesById.get(edge.source);
      if (!empNode) return null;
      return {
        id: empNode.id,
        name: empNode.data.label,
        yearsOfExperience: (edge.data?.yearsOfExperience as number) || 0,
        projectsWorkedCount: (empNode.data.projectsWorkedCount as number) || 0,
      };
    }).filter(Boolean) as { id: string, name: string, yearsOfExperience: number, projectsWorkedCount: number }[];

    employeesData.sort((a, b) => {
      if (b.yearsOfExperience !== a.yearsOfExperience) return b.yearsOfExperience - a.yearsOfExperience;
      if (b.projectsWorkedCount !== a.projectsWorkedCount) return b.projectsWorkedCount - a.projectsWorkedCount;
      return a.name.localeCompare(b.name);
    });

    return employeesData;
  }, [edges, nodesById, selectedId, selectedNode]);

  const roleProjectLeaderboard = useMemo(() => {
    if (!selectedNode || (selectedNode.data.kind !== 'role' && selectedNode.data.kind !== 'project')) return null;

    const requiredSkillIds = new Set<string>();
    const requiredSkillsMap = new Map<string, { id: string, label: string }>();
    
    for (const edge of edges) {
      if (edge.className === 'edge-requires_skill' && (edge.source === selectedId || edge.target === selectedId)) {
        const skillId = edge.source === selectedId ? edge.target : edge.source;
        requiredSkillIds.add(skillId);
        const sNode = nodesById.get(skillId);
        if (sNode) {
          requiredSkillsMap.set(skillId, { id: skillId, label: sNode.data.label });
        }
      }
    }

    if (requiredSkillIds.size === 0) return { requiredSkills: [], candidates: [] };

    const employeeData = new Map<string, { 
      node: Node<EntityData>,
      skills: Map<string, number>
    }>();

    for (const node of nodes) {
      if (node.data.kind === 'employee') {
        employeeData.set(node.id, { node, skills: new Map() });
      }
    }

    for (const edge of edges) {
      if (edge.className === 'edge-has_skill') {
        const empId = employeeData.has(edge.source) ? edge.source : (employeeData.has(edge.target) ? edge.target : null);
        const skillId = empId === edge.source ? edge.target : edge.source;
        if (empId) {
          employeeData.get(empId)!.skills.set(skillId, (edge.data?.yearsOfExperience as number) || 0);
        }
      }
    }

    const candidates: Array<{
      id: string;
      name: string;
      matchedCount: number;
      coverage: number;
      relevantExperience: number;
      projectsWorkedCount: number;
      matchedSkills: Array<{ id: string; label: string; years: number }>;
      missingSkills: Array<{ id: string; label: string }>;
    }> = [];
    for (const [empId, info] of employeeData.entries()) {
      let matchedCount = 0;
      let relevantExp = 0;
      const matchedSkills = [];
      const missingSkills = [];

      for (const reqSkillId of requiredSkillIds) {
        const reqSkill = requiredSkillsMap.get(reqSkillId)!;
        if (info.skills.has(reqSkillId)) {
          matchedCount++;
          const exp = info.skills.get(reqSkillId)!;
          relevantExp += exp;
          matchedSkills.push({ ...reqSkill, years: exp });
        } else {
          missingSkills.push(reqSkill);
        }
      }

      if (matchedCount > 0) {
        candidates.push({
          id: empId,
          name: info.node.data.label,
          matchedCount,
          coverage: Math.round((matchedCount / requiredSkillIds.size) * 100),
          relevantExperience: Math.round(relevantExp * 10) / 10,
          projectsWorkedCount: (info.node.data.projectsWorkedCount as number) || 0,
          matchedSkills,
          missingSkills
        });
      }
    }

    candidates.sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      if (b.relevantExperience !== a.relevantExperience) return b.relevantExperience - a.relevantExperience;
      if (b.projectsWorkedCount !== a.projectsWorkedCount) return b.projectsWorkedCount - a.projectsWorkedCount;
      return a.name.localeCompare(b.name);
    });

    const requiredSkills = Array.from(requiredSkillsMap.values()).map(rs => {
      return { ...rs, employeeCount: candidates.filter(c => c.matchedSkills.some(m => m.id === rs.id)).length };
    });

    return { requiredSkills, candidates };
  }, [edges, nodes, nodesById, selectedId, selectedNode]);

  useEffect(() => {
    if (selectedId) {
      requestAnimationFrame(() => fitView({ padding: 0.25, duration: 400 }));
    }
  }, [selectedId, fitView]);

  const toggleKind = useCallback((kind: EntityKind) => {
    setActiveKinds(current => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setQuery('');
    setActiveKinds(new Set(ALL_KINDS));
    setSelectedId(null);
    onSelect('');
    requestAnimationFrame(() => fitView({ padding: 0.18, duration: 300 }));
  }, [fitView, onSelect]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    setSelectedId(node.id);
    onSelect(node.id);
  }, [onSelect]);

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    onSelect('');
  }, [onSelect]);

  return (
    <div className="skill-graph-layout">
      <aside className="skill-graph-panel skill-graph-filters">
        <div className="skill-graph-panel-heading"><span className="material-symbols-outlined">filter_alt</span><span>Graph Filters</span><button type="button" onClick={resetFilters}>Reset</button></div>
        
        <div className="skill-graph-search-container">
          <label className="skill-graph-search">
            <span className="material-symbols-outlined">search</span>
            <input 
              value={query} 
              onChange={event => setQuery(event.target.value)} 
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search employees, skills, roles..." 
            />
          </label>
          {searchFocused && query && searchResults.length > 0 && (
            <div className="skill-graph-search-dropdown">
              {searchResults.map(res => (
                <div key={res.id} className="skill-graph-search-item" onMouseDown={() => {
                   setSelectedId(res.id);
                   onSelect(res.id);
                   setQuery('');
                }}>
                   <span className="material-symbols-outlined" style={{ color: entityMeta[res.data.kind as EntityKind].color }}>
                     {entityMeta[res.data.kind as EntityKind].icon}
                   </span>
                   <div>
                     <strong>{res.data.label}</strong>
                     <small>{entityMeta[res.data.kind as EntityKind].label.slice(0, -1)}</small>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="skill-graph-filter-list">
          {ALL_KINDS.map(kind => (
            <button type="button" key={kind} className={activeKinds.has(kind) ? 'is-active' : ''} onClick={() => toggleKind(kind)}>
              <span className="material-symbols-outlined" style={{ color: entityMeta[kind].color }}>{entityMeta[kind].icon}</span>
              <span>{entityMeta[kind].label}</span>
              <strong>{graph.metrics[kind]}</strong>
            </button>
          ))}
        </div>
      </aside>

      <main className="skill-graph-canvas">
        <div className="skill-graph-canvas-heading">
          <div><h2>Workforce Skill Graph</h2><p>Explore the real relationships between people, skills, roles, and projects.</p></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedNode && (
              <button className="skill-graph-fit skill-graph-focus-clear" type="button" onClick={() => { setSelectedId(null); onSelect(''); requestAnimationFrame(() => fitView({ padding: 0.18, duration: 400 })); }}>
                <span className="material-symbols-outlined" style={{ color: entityMeta[selectedNode.data.kind].color }}>{entityMeta[selectedNode.data.kind].icon}</span>
                Focused: {selectedNode.data.label}
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
            <button className="skill-graph-fit" type="button" onClick={() => fitView({ padding: 0.18, duration: 300 })}><span className="material-symbols-outlined">center_focus_strong</span>Fit view</button>
          </div>
        </div>
        <div className="skill-graph-flow">
          <ReactFlow
            nodes={renderedNodes}
            edges={renderedEdges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.15}
            maxZoom={2.2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onlyRenderVisibleElements={true}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1} color="rgba(51, 65, 85, 0.14)" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor={node => entityMeta[(node as unknown as { data?: EntityData }).data?.kind as EntityKind]?.color || '#94a3b8'} maskColor="rgba(247, 247, 245, 0.72)" pannable zoomable />
          </ReactFlow>
        </div>
        <div className="skill-graph-legend">{ALL_KINDS.map(kind => <span key={kind}><i style={{ background: entityMeta[kind].color }} />{entityMeta[kind].label.slice(0, -1)}</span>)}</div>
      </main>

      <aside className="skill-graph-panel skill-graph-details">
        <div className="skill-graph-panel-heading"><span className="material-symbols-outlined">info</span><span>Entity Details</span></div>
        {!selectedNode ? (
          <div className="skill-graph-empty"><span className="material-symbols-outlined">ads_click</span><h3>Select an entity</h3><p>Click an employee, skill, role, or project to view details.</p></div>
        ) : (
          <div className="skill-graph-detail-content">
            <div className="skill-graph-detail-kind" style={{ color: entityMeta[selectedNode.data.kind].color }}><span className="material-symbols-outlined">{entityMeta[selectedNode.data.kind].icon}</span>{entityMeta[selectedNode.data.kind].label.slice(0, -1)}</div>
            <h3>{selectedNode.data.label}</h3>
            {selectedNode.data.subtitle && <p className="skill-graph-subtitle">{selectedNode.data.subtitle}</p>}
            {selectedNode.data.department && <p className="skill-graph-department">{selectedNode.data.department}</p>}
            {selectedNode.data.skills && selectedNode.data.skills.length > 0 && <section><h4>{selectedNode.data.kind === 'employee' ? 'Skills' : 'Required skills'}</h4><div className="skill-graph-tags">{selectedNode.data.skills.map(skill => <span key={skill}>{skill}</span>)}</div></section>}
            
            {selectedNode.data.kind === 'skill' && rankedEmployees.length > 0 && (
              <section className="skill-graph-ranking">
                <h4>Top Talent</h4>
                <div className="skill-graph-ranking-list">
                  {rankedEmployees.map((emp, idx) => (
                    <div key={emp.id} className="skill-graph-ranking-item" onClick={() => { setSelectedId(emp.id); onSelect(emp.id); }}>
                      <div className="ranking-badge">{idx + 1}</div>
                      <div>
                        <strong>{emp.name}</strong>
                        <span>{emp.yearsOfExperience} yrs · {emp.projectsWorkedCount} projects</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {roleProjectLeaderboard && (
              <section className="skill-graph-ranking">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0 }}>{selectedNode.data.kind === 'role' ? 'Best Matches for Role' : 'Best Matches for Project'}</h4>
                  {roleProjectLeaderboard.candidates.length > 0 && (
                    <select 
                      value={leaderboardFilter} 
                      onChange={e => setLeaderboardFilter(Number(e.target.value))}
                      style={{ padding: '2px 4px', fontSize: '10px', borderRadius: '4px', background: 'var(--cutout-bg)', color: 'var(--color-primary)', border: '1px solid var(--cutout-border)' }}>
                      <option value={0}>All Candidates</option>
                      <option value={100}>100% Match</option>
                      <option value={80}>80%+ Match</option>
                      <option value={60}>60%+ Match</option>
                    </select>
                  )}
                </div>
                {roleProjectLeaderboard.requiredSkills.length > 0 ? (
                  <div className="skill-graph-gap-insight">
                    <small>Skill Coverage:</small>
                    {roleProjectLeaderboard.requiredSkills.map(rs => (
                      <span key={rs.id} className="gap-badge" onClick={() => { setSelectedId(rs.id); onSelect(rs.id); }}>
                        {rs.label} ({rs.employeeCount})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="skill-graph-empty-text">No required skills defined for this {selectedNode.data.kind}.</p>
                )}

                {roleProjectLeaderboard.requiredSkills.length > 0 && roleProjectLeaderboard.candidates.length === 0 ? (
                  <p className="skill-graph-empty-text">No employees currently match the required skills.</p>
                ) : (
                  <div className="skill-graph-leaderboard-list">
                    {roleProjectLeaderboard.candidates.filter(c => c.coverage >= leaderboardFilter).map((emp, idx) => (
                      <details key={emp.id} className="skill-graph-leaderboard-item">
                        <summary>
                          <div className="ranking-badge">{idx + 1}</div>
                          <div className="leaderboard-item-header">
                            <strong>{emp.name}</strong>
                            <span>{emp.coverage}% skill coverage · {emp.relevantExperience} yrs relevant experience · {emp.projectsWorkedCount} {emp.projectsWorkedCount === 1 ? 'project' : 'projects'}</span>
                          </div>
                          <span className="material-symbols-outlined expand-icon">expand_more</span>
                        </summary>
                        <div className="leaderboard-item-details">
                          <button type="button" className="leaderboard-focus-btn" onClick={() => { setSelectedId(emp.id); onSelect(emp.id); }}>
                            <span className="material-symbols-outlined">target</span> Focus on Employee
                          </button>
                          <div className="leaderboard-skill-list">
                            {emp.matchedSkills.map(s => (
                              <div key={s.id} className="skill-match is-matched">
                                <span className="material-symbols-outlined">check</span>
                                {s.label} <small>{s.years} yrs</small>
                              </div>
                            ))}
                            {emp.missingSkills.map(s => (
                              <div key={s.id} className="skill-match is-missing">
                                <span className="material-symbols-outlined">close</span>
                                {s.label} <small>Missing</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section><h4>Connected entities</h4><div className="skill-graph-connection-list">{selectedConnections.map(connection => <button type="button" key={connection.id} onClick={() => { setSelectedId(connection.id); onSelect(connection.id); }}><span className="material-symbols-outlined" style={{ color: entityMeta[connection.kind].color }}>{entityMeta[connection.kind].icon}</span>{connection.label}</button>)}</div></section>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function SkillGraph({ onBack }: { onBack: () => void }) {
  const [graph, setGraph] = useState<WorkforceGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<SkillGraphResponse>('/nexus/skill-graph');
        if (cancelled) return;
        const payload = response.data;
        if (!payload?.success) {
          setError('Unable to load workforce skill graph.');
          setGraph(null);
        } else {
          setGraph(mapSkillGraphResponse(payload));
        }
      } catch (err) {
        console.error('Failed to load skill graph', err);
        if (!cancelled) {
          setError('Unable to load workforce skill graph.');
          setGraph(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <section className="skill-graph-view">
      <div className="skill-graph-page-header">
        <div className="skill-graph-title-row"><button type="button" className="skill-graph-back" onClick={onBack}><span className="material-symbols-outlined">arrow_back</span>Directory</button><div><h1>Workforce Skill Graph</h1><p>Workforce skill intelligence, mapped from existing NEXUS data.</p></div></div>
        <div className="skill-graph-metrics">{ALL_KINDS.map(kind => <div key={kind}><span className="material-symbols-outlined" style={{ color: entityMeta[kind].color }}>{entityMeta[kind].icon}</span><div><small>{entityMeta[kind].label}</small><strong>{graph ? graph.metrics[kind] : '—'}</strong></div></div>)}</div>
      </div>
      {isLoading ? (
        <div className="skill-graph-state"><span className="material-symbols-outlined skill-graph-state-icon is-loading">progress_activity</span><h3>Loading workforce skill graph...</h3></div>
      ) : error ? (
        <div className="skill-graph-state is-error">
          <span className="material-symbols-outlined skill-graph-state-icon">cloud_off</span>
          <h3>Unable to load workforce skill graph.</h3>
          <p>{error}</p>
          <button type="button" className="skill-graph-retry" onClick={() => setReloadToken(token => token + 1)}><span className="material-symbols-outlined">refresh</span>Retry</button>
        </div>
      ) : !graph || graph.nodes.length === 0 ? (
        <div className="skill-graph-state"><span className="material-symbols-outlined skill-graph-state-icon">hub</span><h3>No workforce graph data available.</h3></div>
      ) : (
        <ReactFlowProvider><GraphCanvas graph={graph} onSelect={setSelectedNodeId} /></ReactFlowProvider>
      )}
      <span className="skill-graph-selection-status" aria-live="polite">{selectedNodeId ? 'Entity selected' : ''}</span>
    </section>
  );
}
