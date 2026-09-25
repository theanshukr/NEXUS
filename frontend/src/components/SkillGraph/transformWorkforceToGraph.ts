import type { Edge, Node } from '@xyflow/react';
// @ts-expect-error The existing JavaScript seed has no TypeScript declaration file.
import { INDIAN_ENGINEERING_SAMPLES } from '../../../../backend/src/modules/nexus/seeders/indianEngineeringSamples.js';
import roleRequirementsSource from '../../data/roleSkillRequirements.json?raw';
import projectRequirementsSource from '../../data/projectSkillRequirements.json?raw';

export type EntityKind = 'employee' | 'skill' | 'role' | 'project';

export interface EntityData extends Record<string, unknown> {
  kind: EntityKind;
  label: string;
  subtitle?: string;
  skills?: string[];
  department?: string;
}

export interface WorkforceGraph {
  nodes: Node<EntityData>[];
  edges: Edge[];
  metrics: Record<EntityKind, number>;
}

interface Requirement {
  role_id?: string;
  role_name?: string;
  project_id?: string;
  project_name?: string;
  required_skills: string[];
}

interface SeedEmployee {
  code: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  skills: Array<{ name: string }>;
}

const roleRequirements = JSON.parse(roleRequirementsSource) as Requirement[];
const projectRequirements = JSON.parse(projectRequirementsSource) as Requirement[];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const makeId = (kind: EntityKind, value: string) => `${kind}:${slug(value)}`;

export function transformWorkforceToGraph(): WorkforceGraph {
  const rolesByName = new Map(roleRequirements.map(role => [role.role_name!, role]));
  const focusedEmployees = (INDIAN_ENGINEERING_SAMPLES as SeedEmployee[]).filter(employee => rolesByName.has(employee.designation));
  const nodes = new Map<string, Node<EntityData>>();
  const edges: Edge[] = [];

  const addNode = (id: string, data: EntityData, position: { x: number; y: number }) => {
    if (!nodes.has(id)) nodes.set(id, { id, type: 'entity', data, position });
  };
  const addEdge = (source: string, target: string, label: string) => {
    const id = `${source}->${target}`;
    if (!edges.some(edge => edge.id === id)) edges.push({ id, source, target, label, type: 'smoothstep', animated: false });
  };

  focusedEmployees.forEach((employee, index) => {
    const employeeId = makeId('employee', employee.code);
    const employeeSkills = employee.skills.map(skill => skill.name);
    addNode(employeeId, {
      kind: 'employee',
      label: `${employee.firstName} ${employee.lastName}`,
      subtitle: employee.designation,
      department: employee.department,
      skills: employeeSkills,
    }, { x: 0, y: index * 118 });

    const role = rolesByName.get(employee.designation)!;
    const roleId = makeId('role', role.role_name!);
    addNode(roleId, { kind: 'role', label: role.role_name!, skills: role.required_skills }, { x: 650, y: roleRequirements.findIndex(item => item.role_name === role.role_name) * 118 });
    addEdge(employeeId, roleId, 'HAS ROLE');

    employeeSkills.forEach((skill, skillIndex) => {
      const skillId = makeId('skill', skill);
      addNode(skillId, { kind: 'skill', label: skill }, { x: 330, y: (index * 118) + (skillIndex * 8) });
      addEdge(employeeId, skillId, 'HAS SKILL');
    });

    role.required_skills.forEach((skill, skillIndex) => {
      const skillId = makeId('skill', skill);
      addNode(skillId, { kind: 'skill', label: skill }, { x: 330, y: (index * 118) + (skillIndex * 8) });
      addEdge(roleId, skillId, 'REQUIRES');
    });
  });

  projectRequirements.forEach((project, index) => {
    const projectId = makeId('project', project.project_name!);
    addNode(projectId, { kind: 'project', label: project.project_name!, skills: project.required_skills }, { x: 930, y: index * 138 });
    project.required_skills.forEach((skill, skillIndex) => {
      const skillId = makeId('skill', skill);
      addNode(skillId, { kind: 'skill', label: skill }, { x: 330, y: (index * 138) + (skillIndex * 10) });
      addEdge(projectId, skillId, 'REQUIRES');
    });
  });

  const graphNodes = [...nodes.values()];
  return {
    nodes: graphNodes,
    edges,
    metrics: {
      employee: graphNodes.filter(node => node.data.kind === 'employee').length,
      skill: graphNodes.filter(node => node.data.kind === 'skill').length,
      role: graphNodes.filter(node => node.data.kind === 'role').length,
      project: graphNodes.filter(node => node.data.kind === 'project').length,
    },
  };
}
