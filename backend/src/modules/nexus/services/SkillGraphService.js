import mongoose from 'mongoose';
import EmployeeProfileExtended from '../models/EmployeeProfileExtended.js';
import Skill from '../models/Skill.js';
import Designation from '../../organization/models/Designation.js';
import Project from '../../projects/models/Project.js';
import Employee from '../../employees/models/Employee.js';

class SkillGraphService {
  /**
   * Generates a read-only workforce skill graph scoped to a tenant.
   *
   * @param {string} organizationId
   * @param {Object} filters
   * @param {string} [filters.employeeId]
   * @param {string} [filters.skillId]
   * @param {string} [filters.designationId]
   * @param {string} [filters.projectId]
   * @param {string} [filters.departmentId]
   * @returns {Promise<Object>} Graph representation { nodes, edges, stats }
   */
  async getSkillGraph(organizationId, filters = {}) {
    // 1. Build initial filter criteria based on the requesting parameters
    const employeeMatch = { organizationId: new mongoose.Types.ObjectId(organizationId), archivedAt: null };
    if (filters.employeeId) employeeMatch._id = new mongoose.Types.ObjectId(filters.employeeId);
    if (filters.designationId) employeeMatch.designationId = new mongoose.Types.ObjectId(filters.designationId);
    if (filters.departmentId) employeeMatch.departmentId = new mongoose.Types.ObjectId(filters.departmentId);

    // Filter projects
    const projectMatch = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    if (filters.projectId) projectMatch._id = new mongoose.Types.ObjectId(filters.projectId);

    // Filter designations
    const designationMatch = { organizationId: new mongoose.Types.ObjectId(organizationId), archivedAt: null };
    if (filters.designationId) designationMatch._id = new mongoose.Types.ObjectId(filters.designationId);
    if (filters.departmentId) designationMatch.defaultDepartmentId = new mongoose.Types.ObjectId(filters.departmentId);

    // Data structures for building the graph
    const nodesMap = new Map(); // id -> node object
    const edgesMap = new Map(); // id -> edge object

    const addNode = (node) => {
      if (!nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
      }
    };

    const addEdge = (source, target, type, metadata = {}) => {
      const edgeId = `${source}_${type}_${target}`;
      if (!edgesMap.has(edgeId)) {
        edgesMap.set(edgeId, { id: edgeId, source, target, type, metadata });
      }
    };

    // If specific skill filter is provided, we need to filter the other collections that contain it.
    let targetSkillId = filters.skillId ? new mongoose.Types.ObjectId(filters.skillId) : null;

    // --- FETCH DATA ---
    
    // 1. Fetch relevant Employees & their Skills
    const employees = await Employee.find(employeeMatch).lean();
    const employeeIds = employees.map(e => e._id);
    
    // We only fetch profiles for the filtered employees
    const profiles = await EmployeeProfileExtended.find({
      organizationId,
      employeeId: { $in: employeeIds }
    }).lean();
    const profileMap = new Map(profiles.map(p => [p.employeeId.toString(), p]));

    // 2. Fetch relevant Projects
    // If we filtered by employee, only include projects they are in (unless projectId was explicit)
    if (filters.employeeId && !filters.projectId) {
      projectMatch['team.employeeId'] = new mongoose.Types.ObjectId(filters.employeeId);
    }
    const projects = await Project.find(projectMatch).lean();
    const projectIds = projects.map(p => p._id);

    // 3. Fetch relevant Designations
    // If we filtered by employee, only include their designations (unless designationId was explicit)
    if (filters.employeeId && !filters.designationId) {
      const empDesignations = [...new Set(employees.map(e => e.designationId.toString()))];
      designationMatch._id = { $in: empDesignations.map(id => new mongoose.Types.ObjectId(id)) };
    }
    const designations = await Designation.find(designationMatch).lean();
    
    // Collect all skill IDs needed to fetch from canonical Skill collection
    const skillIdsToFetch = new Set();
    if (targetSkillId) {
      skillIdsToFetch.add(targetSkillId.toString());
    }

    // Pass 1: Check what entities match the skill filter (if provided)
    const validEmployeeIds = new Set();
    const validProjectIds = new Set();
    const validDesignationIds = new Set();

    if (targetSkillId) {
      // Find employees with this skill
      for (const profile of profiles) {
        if (profile.employeeSkills && profile.employeeSkills.some(s => s.skillId.toString() === targetSkillId.toString())) {
          validEmployeeIds.add(profile.employeeId.toString());
        }
      }
      // Find projects requiring this skill
      for (const project of projects) {
        if (project.requiredSkillIds && project.requiredSkillIds.some(s => s.toString() === targetSkillId.toString())) {
          validProjectIds.add(project._id.toString());
        }
      }
      // Find designations requiring this skill
      for (const desig of designations) {
        if (desig.requiredSkillIds && desig.requiredSkillIds.some(s => s.toString() === targetSkillId.toString())) {
          validDesignationIds.add(desig._id.toString());
        }
      }
    }

    // Create a fast map for designation titles
    const designationTitleMap = new Map(designations.map(d => [d._id.toString(), d.title]));

    // Build Graph
    
    // Employees
    for (const emp of employees) {
      const empIdStr = emp._id.toString();
      
      // If filtering by skill, and this employee doesn't have it, and we didn't explicitly request this employee, skip.
      if (targetSkillId && !validEmployeeIds.has(empIdStr) && filters.employeeId !== empIdStr) {
        // Wait, if an employee is on a project that requires the skill, should they be shown?
        // Let's keep it simple: if filtering by skill, only show entities DIRECTLY connected to the skill.
        continue;
      }

      const designationTitle = designationTitleMap.get(emp.designationId?.toString()) || 'Unknown Designation';
      
      addNode({
        id: empIdStr,
        type: 'employee',
        label: `${emp.firstName} ${emp.lastName}`,
        metadata: {
          designation: designationTitle
        }
      });

      // Edge: HAS_ROLE
      if (emp.designationId) {
        const desigIdStr = emp.designationId.toString();
        // Add Designation Node if not added (will be updated/overwritten if fetched later, which is fine)
        if (designations.some(d => d._id.toString() === desigIdStr)) {
            addEdge(empIdStr, desigIdStr, 'HAS_ROLE');
        }
      }

      // Edge: HAS_SKILL
      const profile = profileMap.get(empIdStr);
      if (profile && profile.employeeSkills) {
        for (const skill of profile.employeeSkills) {
          const skillIdStr = skill.skillId.toString();
          if (targetSkillId && skillIdStr !== targetSkillId.toString()) continue;
          
          skillIdsToFetch.add(skillIdStr);
          addEdge(empIdStr, skillIdStr, 'HAS_SKILL', {
            proficiency: skill.proficiency,
            source: skill.source,
            confidence: skill.confidence,
            verificationStatus: skill.verificationStatus
          });
        }
      }
    }

    // Projects
    for (const project of projects) {
      const projIdStr = project._id.toString();
      
      if (targetSkillId && !validProjectIds.has(projIdStr) && filters.projectId !== projIdStr) {
        continue;
      }

      addNode({
        id: projIdStr,
        type: 'project',
        label: project.name
      });

      // Edge: REQUIRES_SKILL
      if (project.requiredSkillIds) {
        for (const skillId of project.requiredSkillIds) {
          const skillIdStr = skillId.toString();
          if (targetSkillId && skillIdStr !== targetSkillId.toString()) continue;
          
          skillIdsToFetch.add(skillIdStr);
          addEdge(projIdStr, skillIdStr, 'REQUIRES_SKILL');
        }
      }

      // Edge: HAS_MEMBER
      if (project.team) {
        for (const member of project.team) {
          if (member.employeeId) {
            const memberIdStr = member.employeeId.toString();
            // Only add edge if the employee node is part of our subset
            if (nodesMap.has(memberIdStr) || (!targetSkillId)) {
                // If the node isn't there, and we don't have a strict filter, we might not have loaded the employee
                // But since we loaded all employees in the org matching filters, they should be in nodesMap.
                addEdge(projIdStr, memberIdStr, 'HAS_MEMBER');
            }
          }
        }
      }
    }

    // Designations
    for (const desig of designations) {
      const desigIdStr = desig._id.toString();
      
      if (targetSkillId && !validDesignationIds.has(desigIdStr) && filters.designationId !== desigIdStr) {
        // Only skip if there are no HAS_ROLE edges pointing to it?
        // Actually, if we filter by skill, we only want designations requiring the skill.
        // Wait, if an employee is returned who HAS_ROLE this designation, we should probably include the designation.
        let isNeeded = false;
        for (const edge of edgesMap.values()) {
            if (edge.type === 'HAS_ROLE' && edge.target === desigIdStr) {
                isNeeded = true; break;
            }
        }
        if (!isNeeded) continue;
      }

      addNode({
        id: desigIdStr,
        type: 'designation',
        label: desig.title
      });

      // Edge: REQUIRES_SKILL
      if (desig.requiredSkillIds) {
        for (const skillId of desig.requiredSkillIds) {
          const skillIdStr = skillId.toString();
          if (targetSkillId && skillIdStr !== targetSkillId.toString()) continue;
          
          skillIdsToFetch.add(skillIdStr);
          addEdge(desigIdStr, skillIdStr, 'REQUIRES_SKILL');
        }
      }
    }

    // 4. Fetch Canonical Skills and add nodes
    const skillList = Array.from(skillIdsToFetch);
    const skills = await Skill.find({
      _id: { $in: skillList.map(id => new mongoose.Types.ObjectId(id)) },
      organizationId // Enforce tenant isolation
    }).lean();

    for (const skill of skills) {
      addNode({
        id: skill._id.toString(),
        type: 'skill',
        label: skill.canonicalName,
        metadata: {
          category: skill.category
        }
      });
    }

    // Clean up edges pointing to missing nodes (e.g. skills from other tenants that were incorrectly referenced, or filtered out nodes)
    const validEdges = [];
    for (const edge of edgesMap.values()) {
      if (nodesMap.has(edge.source) && nodesMap.has(edge.target)) {
        validEdges.push(edge);
      }
    }

    const finalNodes = Array.from(nodesMap.values());

    // Compute stats based on the exact filtered subset
    const stats = {
      employees: finalNodes.filter(n => n.type === 'employee').length,
      skills: finalNodes.filter(n => n.type === 'skill').length,
      designations: finalNodes.filter(n => n.type === 'designation').length,
      projects: finalNodes.filter(n => n.type === 'project').length,
      edges: validEdges.length
    };

    return {
      success: true,
      nodes: finalNodes,
      edges: validEdges,
      stats
    };
  }
}

export default new SkillGraphService();
