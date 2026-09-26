import type { Edge, Node } from '@xyflow/react';

/**
 * Adapter between the real NEXUS Skill Graph API (GET /api/v1/nexus/skill-graph)
 * and the existing React Flow visualization.
 *
 * The API is the single source of truth: no seed data, no temporary JSON,
 * no client-side edge generation. This module only maps shapes and computes
 * deterministic node positions.
 */

export type EntityKind = 'employee' | 'skill' | 'role' | 'project';

export interface EntityData extends Record<string, unknown> {
  kind: EntityKind;
  label: string;
  subtitle?: string;
  skills?: string[];
  department?: string;
  totalExperienceYears?: number;
  projectsWorkedCount?: number;
}

export interface WorkforceGraph {
  nodes: Node<EntityData>[];
  edges: Edge[];
  metrics: Record<EntityKind, number>;
}

// ---- Live API contract (GET /api/v1/nexus/skill-graph) ----------------------

export type SkillGraphNode = {
  id: string;
  type: 'employee' | 'skill' | 'designation' | 'project';
  label: string;
  metadata?: {
    designation?: string;
    category?: string;
    [key: string]: unknown;
  };
};

export type SkillGraphEdgeType = 'HAS_ROLE' | 'HAS_SKILL' | 'REQUIRES_SKILL' | 'HAS_MEMBER';

export type SkillGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: SkillGraphEdgeType;
  metadata?: Record<string, unknown>;
};

export type SkillGraphResponse = {
  success: boolean;
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
  stats?: {
    employees?: number;
    skills?: number;
    designations?: number;
    projects?: number;
    edges?: number;
  };
};

// ---- Mapping -----------------------------------------------------------------

// HAS_SKILL is by far the most common edge (165 of 268) — its label is omitted
// to keep the canvas light. Relationship semantics stay visible in the details
// panel and via the per-type edge CSS classes.
const EDGE_LABELS: Partial<Record<SkillGraphEdgeType, string>> = {
  HAS_ROLE: 'HAS ROLE',
  REQUIRES_SKILL: 'REQUIRES',
  HAS_MEMBER: 'MEMBER OF',
};

// Deterministic four-band layout (same left→right structure as before):
// employees → skills → roles → projects. Skills form rank-ordered columns so
// the 130 canonical skills remain readable without a layout library.
const EMPLOYEE_COLUMN_X = 0;
const EMPLOYEE_ROW_HEIGHT = 46;
const SKILL_COLUMN_X = 330;
const SKILL_COLUMN_GAP = 320;
const SKILL_ROW_HEIGHT = 40;
const SKILLS_PER_COLUMN = 14;
const ROLE_COLUMN_GAP = 40;
const ROLE_ROW_HEIGHT = 56;
const PROJECT_COLUMN_GAP = 280;
const PROJECT_ROW_HEIGHT = 138;

// Position cache: node positions only change when the graph data itself changes,
// never during pan/zoom/filter interactions.
const positionCache = new Map<string, { key: string; position: { x: number; y: number } }>();

export function mapSkillGraphResponse(response: SkillGraphResponse): WorkforceGraph {
  const apiNodes = Array.isArray(response.nodes) ? response.nodes : [];
  const apiEdges = Array.isArray(response.edges) ? response.edges : [];

  // Group incident edges per node so the details panel can show real
  // relationships from the API (no synthesized data).
  const skillsByNodeId = new Map<string, string[]>();
  const labelByNodeId = new Map<string, string>();
  const degreeByNodeId = new Map<string, number>();

  const typeByNodeId = new Map<string, SkillGraphNode['type']>();

  for (const node of apiNodes) {
    typeByNodeId.set(node.id, node.type);
    labelByNodeId.set(node.id, node.label);
  }

  for (const edge of apiEdges) {
    degreeByNodeId.set(edge.source, (degreeByNodeId.get(edge.source) || 0) + 1);
    degreeByNodeId.set(edge.target, (degreeByNodeId.get(edge.target) || 0) + 1);

    // Both REQUIRES_SKILL (role/project → skill) and HAS_SKILL (employee → skill)
    // mean "this entity is associated with that skill".
    if (edge.type === 'HAS_SKILL' || edge.type === 'REQUIRES_SKILL') {
      for (const [owner, skill] of [[edge.source, edge.target], [edge.target, edge.source]] as const) {
        const ownerType = typeByNodeId.get(owner);
        if (ownerType === 'employee' || ownerType === 'designation' || ownerType === 'project') {
          const skillLabel = labelByNodeId.get(skill);
          if (!skillLabel) continue;
          const list = skillsByNodeId.get(owner) || [];
          if (!list.includes(skillLabel)) list.push(skillLabel);
          skillsByNodeId.set(owner, list);
        }
      }
    }
  }

  // ---- Deterministic layout ----
  const employees = apiNodes.filter(n => n.type === 'employee');
  const designations = apiNodes.filter(n => n.type === 'designation').sort((a, b) => a.label.localeCompare(b.label));
  const projects = apiNodes.filter(n => n.type === 'project').sort((a, b) => a.label.localeCompare(b.label));
  const skills = apiNodes
    .filter(n => n.type === 'skill')
    .sort((a, b) => {
      const degreeDiff = (degreeByNodeId.get(b.id) || 0) - (degreeByNodeId.get(a.id) || 0);
      return degreeDiff !== 0 ? degreeDiff : a.label.localeCompare(b.label);
    });

  const skillColumns = Math.max(1, Math.ceil(skills.length / SKILLS_PER_COLUMN));
  const roleColumnX = SKILL_COLUMN_X + skillColumns * SKILL_COLUMN_GAP + ROLE_COLUMN_GAP;
  const projectColumnX = roleColumnX + PROJECT_COLUMN_GAP;

  const computePosition = (id: string, key: string, x: number, y: number): { x: number; y: number } => {
    const cached = positionCache.get(id);
    if (cached && cached.key === key) return cached.position;
    const position = { x, y };
    positionCache.set(id, { key, position });
    return position;
  };

  const nodes: Node<EntityData>[] = [];
  const nodeById = new Map<string, Node<EntityData>>();

  employees.forEach((node, index) => {
    const data: EntityData = {
      kind: 'employee',
      label: node.label,
      subtitle: node.metadata?.designation as string | undefined,
      skills: skillsByNodeId.get(node.id),
      totalExperienceYears: node.metadata?.totalExperienceYears as number | undefined,
      projectsWorkedCount: node.metadata?.projectsWorkedCount as number | undefined,
    };
    const graphNode: Node<EntityData> = {
      id: node.id,
      type: 'entity',
      data,
      position: computePosition(node.id, `emp:${index}`, EMPLOYEE_COLUMN_X, index * EMPLOYEE_ROW_HEIGHT),
    };
    nodes.push(graphNode);
    nodeById.set(node.id, graphNode);
  });

  skills.forEach((node, index) => {
    const column = Math.floor(index / SKILLS_PER_COLUMN);
    const row = index % SKILLS_PER_COLUMN;
    const data: EntityData = {
      kind: 'skill',
      label: node.label,
      subtitle: node.metadata?.category as string | undefined,
    };
    const graphNode: Node<EntityData> = {
      id: node.id,
      type: 'entity',
      data,
      position: computePosition(node.id, `skill:${column}:${row}`, SKILL_COLUMN_X + column * SKILL_COLUMN_GAP, row * SKILL_ROW_HEIGHT),
    };
    nodes.push(graphNode);
    nodeById.set(node.id, graphNode);
  });

  designations.forEach((node, index) => {
    const data: EntityData = {
      kind: 'role',
      label: node.label,
      skills: skillsByNodeId.get(node.id),
    };
    const graphNode: Node<EntityData> = {
      id: node.id,
      type: 'entity',
      data,
      position: computePosition(node.id, `role:${index}`, roleColumnX, index * ROLE_ROW_HEIGHT),
    };
    nodes.push(graphNode);
    nodeById.set(node.id, graphNode);
  });

  projects.forEach((node, index) => {
    const data: EntityData = {
      kind: 'project',
      label: node.label,
      skills: skillsByNodeId.get(node.id),
    };
    const graphNode: Node<EntityData> = {
      id: node.id,
      type: 'entity',
      data,
      position: computePosition(node.id, `proj:${index}`, projectColumnX, index * PROJECT_ROW_HEIGHT),
    };
    nodes.push(graphNode);
    nodeById.set(node.id, graphNode);
  });

  // Pass API edges through 1:1 — no new edges are generated here.
  const edges: Edge[] = [];
  for (const edge of apiEdges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    const edgeNode: Edge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'straight',
      className: `edge-${edge.type.toLowerCase()}`,
      data: {
        relationLabel: EDGE_LABELS[edge.type],
        ...(edge.metadata?.proficiency !== undefined
          ? { 
              proficiency: edge.metadata.proficiency, 
              source: edge.metadata.source, 
              verificationStatus: edge.metadata.verificationStatus,
              yearsOfExperience: edge.metadata.yearsOfExperience
            }
          : {})
      }
    };
    edges.push(edgeNode);
  }

  const metrics: Record<EntityKind, number> = {
    employee: employees.length,
    skill: skills.length,
    role: designations.length,
    project: projects.length,
  };

  return { nodes, edges, metrics };
}
