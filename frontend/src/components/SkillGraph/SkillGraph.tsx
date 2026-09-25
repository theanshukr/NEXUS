import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './SkillGraph.css';
import { type EntityData, type EntityKind, transformWorkforceToGraph } from './transformWorkforceToGraph';

const entityMeta: Record<EntityKind, { label: string; icon: string; color: string }> = {
  employee: { label: 'Employees', icon: 'group', color: '#38bdf8' },
  skill: { label: 'Skills', icon: 'database', color: '#10b981' },
  role: { label: 'Roles', icon: 'work', color: '#8b5cf6' },
  project: { label: 'Projects', icon: 'folder_open', color: '#f97316' },
};

function EntityNode({ data, selected }: NodeProps<any>) {
  const meta = entityMeta[data.kind as EntityKind];
  return (
    <div className={`skill-graph-node ${selected ? 'is-selected' : ''}`} style={{ '--node-color': meta.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} />
      <span className="material-symbols-outlined skill-graph-node-icon">{meta.icon}</span>
      <span className="skill-graph-node-label">{data.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function GraphCanvas({ onSelect }: { onSelect: (id: string) => void }) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = useMemo(transformWorkforceToGraph, []);
  const [query, setQuery] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<EntityKind>>(new Set(['employee', 'skill', 'role', 'project']));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNeighbors = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(edges.filter(edge => edge.source === selectedId || edge.target === selectedId).flatMap(edge => [edge.source, edge.target]));
  }, [edges, selectedId]);

  const visibleNodeIds = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    const directMatches = new Set(nodes.filter(node => node.data && activeKinds.has(node.data.kind) && (!loweredQuery || `${node.data.label} ${node.data.subtitle || ''}`.toLowerCase().includes(loweredQuery))).map(node => node.id));
    if (!loweredQuery) return directMatches;
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    edges.forEach(edge => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (source && target && directMatches.has(edge.source) && activeKinds.has(target.data.kind)) directMatches.add(edge.target);
      if (source && target && directMatches.has(edge.target) && activeKinds.has(source.data.kind)) directMatches.add(edge.source);
    });
    return directMatches;
  }, [activeKinds, edges, nodes, query]);

  const renderedNodes = useMemo(() => nodes
    .filter(node => visibleNodeIds.has(node.id))
    .map(node => ({ ...node, selected: node.id === selectedId, className: selectedId && !selectedNeighbors.has(node.id) ? 'is-dimmed' : '' })), [nodes, selectedId, selectedNeighbors, visibleNodeIds]);
  const renderedEdges = useMemo(() => edges
    .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    .map(edge => ({ ...edge, className: selectedId && !(edge.source === selectedId || edge.target === selectedId) ? 'is-dimmed' : '', style: selectedId && (edge.source === selectedId || edge.target === selectedId) ? { stroke: '#0ea5e9', strokeWidth: 2.4 } : undefined })), [edges, selectedId, visibleNodeIds]);

  const selectedNode = nodes.find(node => node.id === selectedId) || null;
  const selectedConnections = selectedNode ? edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id).map(edge => nodes.find(node => node.id === (edge.source === selectedNode.id ? edge.target : edge.source))!).filter(Boolean) : [];
  const toggleKind = (kind: EntityKind) => setActiveKinds(current => {
    const next = new Set(current);
    next.has(kind) ? next.delete(kind) : next.add(kind);
    return next;
  });
  const resetFilters = () => {
    setQuery('');
    setActiveKinds(new Set(['employee', 'skill', 'role', 'project']));
    setSelectedId(null);
    onSelect('');
    requestAnimationFrame(() => fitView({ padding: 0.18, duration: 300 }));
  };
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    setSelectedId(node.id);
    onSelect(node.id);
  }, [onSelect]);

  return (
    <div className="skill-graph-layout">
      <aside className="skill-graph-panel skill-graph-filters">
        <div className="skill-graph-panel-heading"><span className="material-symbols-outlined">filter_alt</span><span>Graph Filters</span><button type="button" onClick={resetFilters}>Reset</button></div>
        <label className="skill-graph-search"><span className="material-symbols-outlined">search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, skills, roles..." /></label>
        <div className="skill-graph-filter-list">
          {(Object.keys(entityMeta) as EntityKind[]).map(kind => (
            <button type="button" key={kind} className={activeKinds.has(kind) ? 'is-active' : ''} onClick={() => toggleKind(kind)}>
              <span className="material-symbols-outlined" style={{ color: entityMeta[kind].color }}>{entityMeta[kind].icon}</span>
              <span>{entityMeta[kind].label}</span>
              <strong>{nodes.filter(node => node.data.kind === kind).length}</strong>
            </button>
          ))}
        </div>
      </aside>

      <main className="skill-graph-canvas">
        <div className="skill-graph-canvas-heading">
          <div><h2>Workforce Skill Graph</h2><p>Explore the real relationships between people, skills, roles, and projects.</p></div>
          <button className="skill-graph-fit" type="button" onClick={() => fitView({ padding: 0.18, duration: 300 })}><span className="material-symbols-outlined">center_focus_strong</span>Fit view</button>
        </div>
        <div className="skill-graph-flow">
          <ReactFlow
            nodes={renderedNodes}
            edges={renderedEdges}
            nodeTypes={{ entity: EntityNode as any }}
            onNodeClick={handleNodeClick}
            onPaneClick={() => { setSelectedId(null); onSelect(''); }}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.28}
            maxZoom={1.7}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1} color="rgba(51, 65, 85, 0.14)" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor={node => entityMeta[node.data?.kind as EntityKind]?.color || '#94a3b8'} maskColor="rgba(247, 247, 245, 0.72)" />
          </ReactFlow>
        </div>
        <div className="skill-graph-legend">{(Object.keys(entityMeta) as EntityKind[]).map(kind => <span key={kind}><i style={{ background: entityMeta[kind].color }} />{entityMeta[kind].label.slice(0, -1)}</span>)}</div>
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
            {selectedNode.data.skills && <section><h4>{selectedNode.data.kind === 'employee' ? 'Skills' : 'Required skills'}</h4><div className="skill-graph-tags">{selectedNode.data.skills.map(skill => <span key={skill}>{skill}</span>)}</div></section>}
            <section><h4>Connected entities</h4><div className="skill-graph-connection-list">{selectedConnections.map(connection => <button type="button" key={connection.id} onClick={() => { setSelectedId(connection.id); onSelect(connection.id); }}><span className="material-symbols-outlined" style={{ color: entityMeta[connection.data.kind].color }}>{entityMeta[connection.data.kind].icon}</span>{connection.data.label}</button>)}</div></section>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function SkillGraph({ onBack }: { onBack: () => void }) {
  const graph = useMemo(transformWorkforceToGraph, []);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  return (
    <section className="skill-graph-view">
      <div className="skill-graph-page-header">
        <div className="skill-graph-title-row"><button type="button" className="skill-graph-back" onClick={onBack}><span className="material-symbols-outlined">arrow_back</span>Directory</button><div><h1>Workforce Skill Graph</h1><p>Workforce skill intelligence, mapped from existing NEXUS data.</p></div></div>
        <div className="skill-graph-metrics">{(Object.keys(entityMeta) as EntityKind[]).map(kind => <div key={kind}><span className="material-symbols-outlined" style={{ color: entityMeta[kind].color }}>{entityMeta[kind].icon}</span><div><small>{entityMeta[kind].label}</small><strong>{graph.metrics[kind]}</strong></div></div>)}</div>
      </div>
      <ReactFlowProvider><GraphCanvas onSelect={setSelectedNodeId} /></ReactFlowProvider>
      <span className="skill-graph-selection-status" aria-live="polite">{selectedNodeId ? 'Entity selected' : ''}</span>
    </section>
  );
}
