import { describe, it, expect } from 'vitest';
import ToolManager from '#ai/tools/ToolManager.js';
import authTools from '#ai/tools/definitions/auth.tools.js';
import organizationTools from '#ai/tools/definitions/organization.tools.js';
import departmentTools from '#ai/tools/definitions/department.tools.js';
import employeeTools from '#ai/tools/definitions/employee.tools.js';
import roleTools from '#ai/tools/definitions/role.tools.js';
import delegationTools from '#ai/tools/definitions/delegation.tools.js';
import invitationTools from '#ai/tools/definitions/invitation.tools.js';
import designationTools from '#ai/tools/definitions/designation.tools.js';
import locationTools from '#ai/tools/definitions/location.tools.js';
import shiftTools from '#ai/tools/definitions/shift.tools.js';
import holidayTools from '#ai/tools/definitions/holiday.tools.js';

describe('AI Tools Registry & Schemas Verification', () => {
  const allRealTools = [
    ...authTools,
    ...organizationTools,
    ...departmentTools,
    ...employeeTools,
    ...roleTools,
    ...delegationTools,
    ...invitationTools,
    ...designationTools,
    ...locationTools,
    ...shiftTools,
    ...holidayTools,
  ];

  it('should verify all 57 tools have correct names, schemas, and description formats', () => {
    // Register all real tools
    ToolManager.registerMany(allRealTools);

    const expectedToolNames = [
      'mcp_auth_login',
      'mcp_auth_refresh',
      'mcp_auth_register_via_invite',
      'mcp_auth_logout',
      'mcp_auth_get_me',
      'mcp_org_create',
      'mcp_org_get_my',
      'mcp_dept_list',
      'mcp_dept_get_tree',
      'mcp_dept_get_select_options',
      'mcp_dept_get_by_id',
      'mcp_dept_create',
      'mcp_dept_update',
      'mcp_dept_move',
      'mcp_dept_archive',
      'mcp_emp_list',
      'mcp_emp_get_org_chart',
      'mcp_emp_get_by_id',
      'mcp_emp_create',
      'mcp_emp_update_profile',
      'mcp_emp_change_status',
      'mcp_emp_change_manager',
      'mcp_emp_invite',
      'mcp_emp_archive',
      'mcp_emp_restore',
      'mcp_roles_get_system_permissions',
      'mcp_roles_list',
      'mcp_roles_create',
      'mcp_roles_update',
      'mcp_roles_duplicate',
      'mcp_roles_delete',
      'mcp_roles_assign',
      'mcp_roles_remove',
      'mcp_delegation_list',
      'mcp_delegation_create',
      'mcp_delegation_delete',
      'mcp_invites_validate',
      'mcp_invites_create',
      'mcp_invites_list',
      'mcp_invites_revoke',
      'mcp_desig_list',
      'mcp_desig_get_by_id',
      'mcp_desig_create',
      'mcp_desig_update',
      'mcp_desig_archive',
      'mcp_loc_list',
      'mcp_loc_get_by_id',
      'mcp_loc_create',
      'mcp_loc_update',
      'mcp_loc_archive',
      'mcp_shift_list',
      'mcp_shift_get_by_id',
      'mcp_shift_create',
      'mcp_shift_update',
      'mcp_shift_archive',
      'mcp_holidays_get_calendar',
      'mcp_holidays_create_or_update',
    ];

    expect(allRealTools.length).toBe(expectedToolNames.length);

    for (const toolName of expectedToolNames) {
      const tool = ToolManager.getTool(toolName);
      expect(tool).toBeDefined();
      expect(tool.name).toBe(toolName);
      expect(tool.description.length).toBeGreaterThan(5);
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeTypeOf('function');
    }
  });
});
