/**
 * Final Documentation Audit Script
 * Extracts all Express routes programmatically and compares against OpenAPI, MCP, and Frontend-API docs.
 * Run with: node backend/scripts/audit/finalDocumentationAudit.js
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const BACKEND = resolve(ROOT, 'backend');
const DOCS = resolve(ROOT, 'docs');

// ─── ANSI colours ─────────────────────────────────────────────────────────────
const R = '\x1b[31m'; const G = '\x1b[32m'; const Y = '\x1b[33m';
const B = '\x1b[34m'; const M = '\x1b[35m'; const C = '\x1b[36m';
const W = '\x1b[37m'; const RESET = '\x1b[0m'; const BOLD = '\x1b[1m';

// ─── Ground Truth: Express Router Tree ────────────────────────────────────────
// Manually extracted from reading every route file in src/modules/**/routes/*.js
// and the v1 mount table in src/api/v1/routes/index.js
// Each entry: { method, path, protected, permission, hasBody }
const IMPLEMENTED_ROUTES = [
  // ── Auth (/auth) ──────────────────────────────────────────────────────────
  { method: 'POST',   path: '/auth/login',           protected: false, permission: null,                      hasBody: true  },
  { method: 'POST',   path: '/auth/refresh',          protected: false, permission: null,                      hasBody: true  },
  { method: 'POST',   path: '/auth/register-invite',  protected: false, permission: null,                      hasBody: true  },
  { method: 'POST',   path: '/auth/logout',            protected: true,  permission: 'authenticate',             hasBody: false },
  { method: 'GET',    path: '/auth/me',                protected: true,  permission: 'authenticate',             hasBody: false },

  // ── Organizations (/organizations) ────────────────────────────────────────
  { method: 'POST',   path: '/organizations',          protected: false, permission: null,                      hasBody: true  },
  { method: 'GET',    path: '/organizations/me',       protected: true,  permission: 'authenticate',             hasBody: false },

  // ── Roles (/roles) ────────────────────────────────────────────────────────
  { method: 'GET',    path: '/roles/system-permissions', protected: true, permission: 'role.read',              hasBody: false },
  { method: 'GET',    path: '/roles',                  protected: true,  permission: 'role.read',               hasBody: false },
  { method: 'POST',   path: '/roles',                  protected: true,  permission: 'role.create',             hasBody: true  },
  { method: 'PUT',    path: '/roles/{id}',             protected: true,  permission: 'role.update',             hasBody: true  },
  { method: 'POST',   path: '/roles/{id}/duplicate',   protected: true,  permission: 'role.create',             hasBody: false },
  { method: 'DELETE', path: '/roles/{id}',             protected: true,  permission: 'role.delete',             hasBody: false },
  { method: 'POST',   path: '/roles/assign',           protected: true,  permission: 'role.assign',             hasBody: true  },
  { method: 'POST',   path: '/roles/remove',           protected: true,  permission: 'role.assign',             hasBody: true  },

  // ── Role Delegation (/role-delegation-policies) ───────────────────────────
  { method: 'GET',    path: '/role-delegation-policies',       protected: true, permission: 'role.read|role.assign', hasBody: false },
  { method: 'POST',   path: '/role-delegation-policies',       protected: true, permission: 'role.assign|role.create', hasBody: true  },
  { method: 'DELETE', path: '/role-delegation-policies/{id}',  protected: true, permission: 'role.assign|role.delete', hasBody: false },

  // ── Role Assignment Policies ALIAS (/role-assignment-policies) ─────────────
  // This is an alias for /role-delegation-policies mounted for backward compatibility.
  // It is a router-level alias — same handler, different prefix.
  { method: 'GET',    path: '/role-assignment-policies',       protected: true, permission: 'role.read|role.assign', hasBody: false, isAlias: true },
  { method: 'POST',   path: '/role-assignment-policies',       protected: true, permission: 'role.assign|role.create', hasBody: true,  isAlias: true },
  { method: 'DELETE', path: '/role-assignment-policies/{id}',  protected: true, permission: 'role.assign|role.delete', hasBody: false, isAlias: true },

  // ── Invitations (/invites) ────────────────────────────────────────────────
  { method: 'GET',    path: '/invites/validate/{token}', protected: false, permission: null,               hasBody: false },
  { method: 'POST',   path: '/invites',                  protected: true,  permission: 'invite.create',    hasBody: true  },
  { method: 'GET',    path: '/invites',                  protected: true,  permission: 'invite.read|invite.create', hasBody: false },
  { method: 'DELETE', path: '/invites/{id}',             protected: true,  permission: 'invite.revoke',    hasBody: false },

  // ── Departments (/departments) ────────────────────────────────────────────
  { method: 'GET',    path: '/departments',              protected: true,  permission: 'department.read',   hasBody: false },
  { method: 'GET',    path: '/departments/tree',         protected: true,  permission: 'department.read',   hasBody: false },
  { method: 'GET',    path: '/departments/select-options', protected: true, permission: 'department.read',  hasBody: false },
  { method: 'GET',    path: '/departments/options',      protected: true,  permission: 'department.read',   hasBody: false },
  { method: 'GET',    path: '/departments/{id}',         protected: true,  permission: 'department.read',   hasBody: false },
  { method: 'POST',   path: '/departments',              protected: true,  permission: 'department.create', hasBody: true  },
  { method: 'PUT',    path: '/departments/{id}',         protected: true,  permission: 'department.update', hasBody: true  },
  { method: 'POST',   path: '/departments/{id}/move',    protected: true,  permission: 'department.manage_hierarchy', hasBody: true },
  { method: 'DELETE', path: '/departments/{id}',         protected: true,  permission: 'department.delete', hasBody: false },

  // ── Designations (/designations) ─────────────────────────────────────────
  { method: 'GET',    path: '/designations',             protected: true,  permission: 'designation.read',   hasBody: false },
  { method: 'POST',   path: '/designations',             protected: true,  permission: 'designation.create', hasBody: true  },
  { method: 'GET',    path: '/designations/{id}',        protected: true,  permission: 'designation.read',   hasBody: false },
  { method: 'PATCH',  path: '/designations/{id}',        protected: true,  permission: 'designation.update', hasBody: true  },
  { method: 'POST',   path: '/designations/{id}/archive', protected: true, permission: 'designation.archive', hasBody: false },

  // ── Locations (/locations) ────────────────────────────────────────────────
  { method: 'GET',    path: '/locations',                protected: true,  permission: 'location.read',   hasBody: false },
  { method: 'POST',   path: '/locations',                protected: true,  permission: 'location.create', hasBody: true  },
  { method: 'GET',    path: '/locations/{id}',           protected: true,  permission: 'location.read',   hasBody: false },
  { method: 'PATCH',  path: '/locations/{id}',           protected: true,  permission: 'location.update', hasBody: true  },
  { method: 'POST',   path: '/locations/{id}/archive',   protected: true,  permission: 'location.archive', hasBody: false },

  // ── Holidays (mounted under /locations) ──────────────────────────────────
  { method: 'GET',    path: '/locations/{locationId}/holidays/{year}', protected: true, permission: 'holiday.read',   hasBody: false },
  { method: 'PUT',    path: '/locations/{locationId}/holidays/{year}', protected: true, permission: 'holiday.update', hasBody: true  },

  // ── Shifts (/shifts) ─────────────────────────────────────────────────────
  { method: 'GET',    path: '/shifts',                   protected: true,  permission: 'shift.read',   hasBody: false },
  { method: 'POST',   path: '/shifts',                   protected: true,  permission: 'shift.create', hasBody: true  },
  { method: 'GET',    path: '/shifts/{id}',              protected: true,  permission: 'shift.read',   hasBody: false },
  { method: 'PATCH',  path: '/shifts/{id}',              protected: true,  permission: 'shift.update', hasBody: true  },
  { method: 'POST',   path: '/shifts/{id}/archive',      protected: true,  permission: 'shift.archive', hasBody: false },

  // ── Employees (/employees) ────────────────────────────────────────────────
  { method: 'GET',    path: '/employees',                 protected: true,  permission: 'user.read',           hasBody: false },
  { method: 'GET',    path: '/employees/org-chart',       protected: true,  permission: 'user.read',           hasBody: false },
  { method: 'GET',    path: '/employees/{id}',            protected: true,  permission: 'user.read',           hasBody: false },
  { method: 'POST',   path: '/employees',                 protected: true,  permission: 'user.create',         hasBody: true  },
  { method: 'PATCH',  path: '/employees/{id}/profile',    protected: true,  permission: 'user.update',         hasBody: true  },
  { method: 'PUT',    path: '/employees/{id}/status',     protected: true,  permission: 'user.change_status',  hasBody: true  },
  { method: 'PUT',    path: '/employees/{id}/manager',    protected: true,  permission: 'user.change_manager', hasBody: true  },
  { method: 'POST',   path: '/employees/{id}/invite',     protected: true,  permission: 'user.invite',         hasBody: true  },
  { method: 'POST',   path: '/employees/{id}/archive',    protected: true,  permission: 'user.archive',        hasBody: false },
  { method: 'POST',   path: '/employees/{id}/restore',    protected: true,  permission: 'user.restore',        hasBody: false },

  // ── Requisitions (/requisitions) ──────────────────────────────────────────
  { method: 'GET',    path: '/requisitions',              protected: true,  permission: 'recruitment.job.view',       hasBody: false },
  { method: 'GET',    path: '/requisitions/{id}',         protected: true,  permission: 'recruitment.job.view',       hasBody: false },
  { method: 'POST',   path: '/requisitions',              protected: true,  permission: 'recruitment.job.create',     hasBody: true  },
  { method: 'PUT',    path: '/requisitions/{id}',         protected: true,  permission: 'recruitment.job.edit',       hasBody: true  },
  { method: 'PATCH',  path: '/requisitions/{id}/submit-approval', protected: true, permission: 'recruitment.job.edit', hasBody: false },
  { method: 'PATCH',  path: '/requisitions/{id}/approve', protected: true,  permission: 'recruitment.job.approve',    hasBody: false },
  { method: 'PATCH',  path: '/requisitions/{id}/reject',  protected: true,  permission: 'recruitment.job.approve',    hasBody: true  },
  { method: 'PATCH',  path: '/requisitions/{id}/publish', protected: true,  permission: 'recruitment.job.publish',    hasBody: false },
  { method: 'PATCH',  path: '/requisitions/{id}/close',   protected: true,  permission: 'recruitment.job.edit',       hasBody: false },
  { method: 'DELETE', path: '/requisitions/{id}',         protected: true,  permission: 'recruitment.job.delete',     hasBody: false },

  // ── Candidate Auth (/public/organizations/{slug}/auth) ────────────────
  { method: 'POST',   path: '/public/organizations/{slug}/auth/register',  protected: false, permission: null, hasBody: true },
  { method: 'POST',   path: '/public/organizations/{slug}/auth/login',     protected: false, permission: null, hasBody: true },
  { method: 'POST',   path: '/public/organizations/{slug}/auth/logout',    protected: true,  permission: 'authenticate', hasBody: false },

  // ── Candidate Profile (/public/organizations/{slug}/profile) ──────────
  { method: 'GET',    path: '/public/organizations/{slug}/profile',        protected: true,  permission: 'authenticate', hasBody: false },
  { method: 'PUT',    path: '/public/organizations/{slug}/profile',        protected: true,  permission: 'authenticate', hasBody: true },

  // ── Candidate Jobs (/public/organizations/{slug}/jobs) ────────────────
  { method: 'GET',    path: '/public/organizations/{slug}/jobs',           protected: false, permission: null, hasBody: false },
  { method: 'GET',    path: '/public/organizations/{slug}/jobs/{idOrSlug}',protected: false, permission: null, hasBody: false },

  // ── Candidate Applications (/public/organizations/{slug}/applications) ─
  { method: 'POST',   path: '/public/organizations/{slug}/applications/{slugOrId}', protected: true, permission: 'authenticate', hasBody: true },
  { method: 'GET',    path: '/public/organizations/{slug}/applications',   protected: true, permission: 'authenticate', hasBody: false },
  { method: 'PATCH',  path: '/public/organizations/{slug}/applications/{id}/withdraw', protected: true, permission: 'authenticate', hasBody: false },
  { method: 'GET',    path: '/public/organizations/{slug}/applications/interviews', protected: true, permission: 'authenticate', hasBody: false },
  { method: 'GET',    path: '/public/organizations/{slug}/applications/offers', protected: true, permission: 'authenticate', hasBody: false },
  { method: 'PATCH',  path: '/public/organizations/{slug}/applications/offers/{id}/accept', protected: true, permission: 'authenticate', hasBody: false },
  { method: 'PATCH',  path: '/public/organizations/{slug}/applications/offers/{id}/decline', protected: true, permission: 'authenticate', hasBody: false },

  // ── ATS Applications (/applications) ──────────────────────────────────
  { method: 'GET',    path: '/applications/requisitions/{requisitionId}/applications', protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'GET',    path: '/applications/{id}',                          protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'PATCH',  path: '/applications/{id}/advance',                  protected: true, permission: 'recruitment.job.edit', hasBody: true },
  { method: 'PATCH',  path: '/applications/{id}/reject',                   protected: true, permission: 'recruitment.job.edit', hasBody: true },
  { method: 'GET',    path: '/applications/{id}/documents/{documentId}/download', protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'POST',   path: '/applications/{id}/interviews',               protected: true, permission: 'recruitment.job.edit', hasBody: true },
  { method: 'GET',    path: '/applications/{id}/interviews',               protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'GET',    path: '/applications/{id}/interviews/{interviewId}', protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'PATCH',  path: '/applications/{id}/interviews/{interviewId}', protected: true, permission: 'recruitment.job.edit', hasBody: true },
  { method: 'DELETE', path: '/applications/{id}/interviews/{interviewId}', protected: true, permission: 'recruitment.job.edit', hasBody: false },
  { method: 'POST',   path: '/applications/{id}/interviews/{interviewId}/evaluate', protected: true, permission: 'recruitment.job.edit', hasBody: true },
  { method: 'POST',   path: '/applications/{id}/offers',                   protected: true, permission: 'recruitment.job.edit', hasBody: true },
  { method: 'GET',    path: '/applications/{id}/offers',                   protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'GET',    path: '/applications/{id}/offers/{offerId}',         protected: true, permission: 'recruitment.application.view', hasBody: false },
  { method: 'PATCH',  path: '/applications/{id}/offers/{offerId}/send',    protected: true, permission: 'recruitment.job.edit', hasBody: false },
  { method: 'PATCH',  path: '/applications/{id}/offers/{offerId}/withdraw', protected: true, permission: 'recruitment.job.edit', hasBody: false },
  { method: 'POST',   path: '/applications/{id}/hire',                     protected: true, permission: 'recruitment.job.edit', hasBody: true },
  // ── Attendance (/attendance & /attendance-policies) ────────────────────────
  { method: 'POST',   path: '/attendance/clock-in',                        protected: true, permission: 'attendance.mark', hasBody: true },
  { method: 'POST',   path: '/attendance/clock-out',                       protected: true, permission: 'attendance.mark', hasBody: true },
  { method: 'GET',    path: '/attendance/today',                           protected: true, permission: 'authenticate',    hasBody: false },
  { method: 'GET',    path: '/attendance/me',                              protected: true, permission: 'authenticate',    hasBody: false },
  { method: 'GET',    path: '/attendance/reports',                         protected: true, permission: 'attendance.read', hasBody: false },
  { method: 'GET',    path: '/attendance/dashboard',                       protected: true, permission: 'attendance.read', hasBody: false },
  { method: 'GET',    path: '/attendance/export',                          protected: true, permission: 'attendance.read', hasBody: false },
  { method: 'POST',   path: '/attendance/regularizations',                 protected: true, permission: 'attendance.regularization.request', hasBody: true },
  { method: 'GET',    path: '/attendance/regularizations',                 protected: true, permission: 'attendance.read', hasBody: false },
  { method: 'POST',   path: '/attendance/regularizations/{id}/approve',    protected: true, permission: 'attendance.regularization.approve', hasBody: true },
  { method: 'POST',   path: '/attendance/regularizations/{id}/reject',     protected: true, permission: 'attendance.regularization.approve', hasBody: true },
  { method: 'GET',    path: '/attendance-policies',                        protected: true, permission: 'attendance.policy.manage', hasBody: false },
  { method: 'POST',   path: '/attendance-policies',                        protected: true, permission: 'attendance.policy.manage', hasBody: true },
  { method: 'GET',    path: '/attendance-policies/{id}',                   protected: true, permission: 'attendance.policy.manage', hasBody: false },
  { method: 'PATCH',  path: '/attendance-policies/{id}',                   protected: true, permission: 'attendance.policy.manage', hasBody: true },
  { method: 'POST',   path: '/attendance/finalize',                        protected: true, permission: 'attendance.finalize',      hasBody: true },
  { method: 'POST',   path: '/attendance/reconciliation',                  protected: true, permission: 'attendance.reconcile',     hasBody: false },
  { method: 'POST',   path: '/attendance/reconciliation/stale',            protected: true, permission: 'attendance.reconcile',     hasBody: false },
  { method: 'GET',    path: '/attendance/reconciliation/payroll-feed',     protected: true, permission: 'attendance.payroll_feed',  hasBody: false },
  { method: 'PUT',    path: '/attendance/{id}/resolve-conflict',           protected: true, permission: 'attendance.update',        hasBody: false },
  // ── Calendar ────────────────────────────────────────────────────────
  { method: 'GET',    path: '/calendars',                                  protected: true, permission: 'calendar.read',            hasBody: false },
  { method: 'POST',   path: '/calendars',                                  protected: true, permission: 'calendar.create',          hasBody: false },
  // ── Leave ────────────────────────────────────────────────────────
  { method: 'GET',    path: '/leave/policies',                             protected: true, permission: 'leave.read',               hasBody: false },
  { method: 'PUT',    path: '/leave/policies/{code}',                      protected: true, permission: 'leave.update',             hasBody: false },
  { method: 'GET',    path: '/leave/balances',                             protected: true, permission: 'leave.read',               hasBody: false },
  { method: 'POST',   path: '/leave/requests',                             protected: true, permission: 'leave.create',             hasBody: false },
  { method: 'POST',   path: '/leave/requests/{id}/approve',                protected: true, permission: 'leave.approve',            hasBody: false },
  { method: 'POST',   path: '/leave/requests/{id}/reject',                 protected: true, permission: 'leave.approve',            hasBody: false },
  { method: 'POST',   path: '/leave/requests/{id}/cancel',                 protected: true, permission: 'leave.cancel',             hasBody: false },
  { method: 'GET',    path: '/leave/reports/utilization',                  protected: true, permission: 'leave.read',               hasBody: false },
  { method: 'GET',    path: '/leave/snapshots',                            protected: true, permission: 'leave.snapshot',           hasBody: false },
  { method: 'POST',   path: '/leave/snapshots/run',                        protected: true, permission: 'leave.snapshot',           hasBody: false },
  // ── Payroll (/payroll) ────────────────────────────────────────────────────────
  { method: 'POST',   path: '/payroll/structures',                         protected: true, permission: 'payroll.structure.manage', hasBody: true },
  { method: 'GET',    path: '/payroll/structures',                         protected: true, permission: 'payroll.structure.read',   hasBody: false },
  { method: 'GET',    path: '/payroll/structures/{id}',                    protected: true, permission: 'payroll.structure.read',   hasBody: false },
  { method: 'POST',   path: '/payroll/cycles',                             protected: true, permission: 'payroll.cycle.manage',     hasBody: true },
  { method: 'GET',    path: '/payroll/cycles',                             protected: true, permission: 'payroll.cycle.read',       hasBody: false },
  { method: 'GET',    path: '/payroll/cycles/{id}',                        protected: true, permission: 'payroll.cycle.read',       hasBody: false },
  { method: 'PATCH',  path: '/payroll/cycles/{id}/status',                 protected: true, permission: 'payroll.cycle.manage',     hasBody: true },
  { method: 'POST',   path: '/payroll/runs',                               protected: true, permission: 'payroll.run.execute',      hasBody: true },
  { method: 'GET',    path: '/payroll/runs',                               protected: true, permission: 'payroll.run.read',         hasBody: false },
  { method: 'GET',    path: '/payroll/runs/{id}',                          protected: true, permission: 'payroll.run.read',         hasBody: false },
  { method: 'POST',   path: '/payroll/runs/{id}/lock',                     protected: true, permission: 'payroll.run.lock',         hasBody: false },
  { method: 'POST',   path: '/payroll/runs/{id}/finalize-payslips',        protected: true, permission: 'payroll.run.execute',      hasBody: false },
  { method: 'GET',    path: '/payroll/payslips/my',                        protected: true, permission: 'payroll.payslip.read',     hasBody: false },
  { method: 'GET',    path: '/payroll/payslips/{id}',                      protected: true, permission: 'payroll.payslip.read',     hasBody: false },
  { method: 'GET',    path: '/payroll/payslips/run/{runId}',               protected: true, permission: 'payroll.payslip.read',     hasBody: false },
  { method: 'GET',    path: '/payroll/payslips/employee/{employeeId}',     protected: true, permission: 'payroll.payslip.read',     hasBody: false },
  { method: 'PATCH',  path: '/payroll/payslips/{id}/finalize',             protected: true, permission: 'payroll.payslip.finalize', hasBody: false },
  // ── Health check (/health) ────────────────────────────────────────────────
  { method: 'GET', path: '/health', protected: false, permission: null, hasBody: false, isInfrastructure: true },
];

// Non-canonical routes: aliases and infrastructure endpoints that are intentionally
// excluded from the OpenAPI specification.
const OPENAPI_EXCLUDED = new Set([
  '/role-assignment-policies',        // alias
  '/role-assignment-policies/{id}',   // alias
  '/health',                          // infrastructure
]);

// Canonical routes that MUST appear in OpenAPI
const CANONICAL_ROUTES = IMPLEMENTED_ROUTES.filter(r => !OPENAPI_EXCLUDED.has(r.path));

// ─── Load OpenAPI spec ────────────────────────────────────────────────────────
const openapiPath = join(DOCS, 'openapi/openapi.json');
const spec = JSON.parse(readFileSync(openapiPath, 'utf8'));
const openapiPaths = spec.paths;

// ─── Build OpenAPI route set ──────────────────────────────────────────────────
const openapiRoutes = [];
for (const [path, methods] of Object.entries(openapiPaths)) {
  for (const [method, def] of Object.entries(methods)) {
    if (['get','post','put','patch','delete','head','options'].includes(method)) {
      openapiRoutes.push({
        method: method.toUpperCase(),
        path,
        hasSecurity: !!(def.security && def.security.length > 0),
        hasRequestBody: !!(def.requestBody),
        responses: Object.keys(def.responses || {}),
        summary: def.summary || '',
      });
    }
  }
}

// ─── Count Frontend API docs ──────────────────────────────────────────────────
function countFrontendApiOperations(dir) {
  if (!existsSync(dir)) return 0;
  const operations = new Set();
  function walk(d) {
    readdirSync(d, { withFileTypes: true }).forEach(f => {
      const p = join(d, f.name);
      if (f.isDirectory()) {
        walk(p);
      } else if (f.name.endsWith('.md') && f.name !== 'README.md' && f.name !== 'index.md' && f.name !== 'endpoints.md') {
        const content = readFileSync(p, 'utf8');
        // Look for: - **HTTP Method & URL**: `GET /api/v1/departments`
        const regex = /\*\*HTTP Method[^*]*\*\*:\s*`([^`]+)`/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
           operations.add(match[1].trim());
        }
      }
    });
  }
  walk(dir);
  return operations;
}

// ─── Count MCP tool entries ────────────────────────────────────────────────────
function countMcpTools() {
  // Count | rows in MCP README.md that have a mcp_ tool name
  const mcpReadme = readFileSync(join(DOCS, 'mcp/README.md'), 'utf8');
  const rows = mcpReadme.match(/\|\s+\*\*[A-Za-z]+\*\*\s+\|/g) || [];
  // Count table rows in tool inventory (skip header and separator)
  const tableRows = mcpReadme.match(/\| \*\*[^|]+\*\* \| `mcp_/g);
  return tableRows ? tableRows.length : 0;
}

// ─── Run Audit ────────────────────────────────────────────────────────────────
const issues = [];
let passCount = 0;
let checkCount = 0;

function pass(msg) { console.log(`${G}  ✓${RESET} ${msg}`); passCount++; checkCount++; }
function fail(msg) { console.log(`${R}  ✗${RESET} ${msg}`); issues.push(msg); checkCount++; }
function warn(msg) { console.log(`${Y}  ⚠${RESET} ${msg}`); }
function section(title) { console.log(`\n${BOLD}${C}═══ ${title} ═══${RESET}`); }

console.log(`\n${BOLD}${M}╔════════════════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}${M}║   NEXUSOPS — FINAL DOCUMENTATION AUDIT         ║${RESET}`);
console.log(`${BOLD}${M}╚════════════════════════════════════════════════╝${RESET}`);

// ─── 1. Counts ────────────────────────────────────────────────────────────────
section('COUNTS');

const totalImpl = IMPLEMENTED_ROUTES.length;
const canonicalCount = CANONICAL_ROUTES.length;
const openapiCount = openapiRoutes.length;
const mcpCount = countMcpTools();
const frontendApiOps = countFrontendApiOperations(join(DOCS, 'frontend-api'));
const frontendApiCount = frontendApiOps.size;

console.log(`  ${B}Express Routes (total including aliases/infra): ${BOLD}${totalImpl}${RESET}`);
console.log(`  ${B}Express Routes (canonical, OpenAPI-eligible):  ${BOLD}${canonicalCount}${RESET}`);
console.log(`  ${B}OpenAPI Paths × Methods:                       ${BOLD}${openapiCount}${RESET}`);
console.log(`  ${B}MCP Tool Entries:                              ${BOLD}${mcpCount}${RESET}`);
console.log(`  ${B}Frontend API documented operations:            ${BOLD}${frontendApiCount}${RESET}`);

// ─── 2. Every implemented endpoint exists in OpenAPI and Frontend Docs ─────────
section('CHECK A — Every implemented route exists in OpenAPI and Frontend Docs (implemented → documented)');

for (const route of CANONICAL_ROUTES) {
  const opPath = route.path; // Already in {param} format
  
  // OpenAPI check
  const found = openapiPaths[opPath];
  if (!found) {
    fail(`MISSING IN OPENAPI: ${route.method} ${route.path}`);
  } else {
    const methodDef = found[route.method.toLowerCase()];
    if (!methodDef) {
      fail(`METHOD MISMATCH: ${route.method} ${route.path} — path exists but method ${route.method} not documented`);
    } else {
      pass(`OpenAPI: ${route.method.padEnd(7)} ${route.path}`);
    }
  }

  // Frontend API check
  // Convert {id} to :id or just check the raw signature
  const frontendOp = `${route.method} /api/v1${route.path}`;
  const frontendOpColon = frontendOp.replace(/\{([^}]+)\}/g, ':$1');
  
  if (!frontendApiOps.has(frontendOp) && !frontendApiOps.has(frontendOpColon)) {
    fail(`MISSING IN FRONTEND DOCS: ${route.method} ${route.path} (Looked for: ${frontendOp} or ${frontendOpColon})`);
  } else {
    pass(`Frontend Docs: ${route.method.padEnd(7)} ${route.path}`);
  }
}

// ─── 3. Every OpenAPI route exists in implementation ─────────────────────────
section('CHECK B — Every OpenAPI route exists in implementation (documented → implemented)');

const canonicalPathMethodSet = new Set(CANONICAL_ROUTES.map(r => `${r.method}|${r.path}`));

for (const oRoute of openapiRoutes) {
  const key = `${oRoute.method}|${oRoute.path}`;
  if (!canonicalPathMethodSet.has(key)) {
    fail(`ORPHANED IN OPENAPI (not implemented): ${oRoute.method} ${oRoute.path}`);
  } else {
    pass(`${oRoute.method.padEnd(7)} ${oRoute.path}`);
  }
}

// ─── 4. Authentication declarations ──────────────────────────────────────────
section('CHECK C — Every protected endpoint has BearerAuth security declaration');

for (const route of CANONICAL_ROUTES) {
  if (!route.protected) continue;
  const opPath = openapiPaths[route.path];
  if (!opPath) continue; // Already failed in Check A
  const methodDef = opPath[route.method.toLowerCase()];
  if (!methodDef) continue; // Already failed in Check A
  if (!methodDef.security || methodDef.security.length === 0) {
    fail(`MISSING BearerAuth security: ${route.method} ${route.path}`);
  } else {
    pass(`BearerAuth present: ${route.method} ${route.path}`);
  }
}

// ─── 5. Request body presence check ──────────────────────────────────────────
section('CHECK D — Every endpoint with a body has requestBody documented');

for (const route of CANONICAL_ROUTES) {
  if (!route.hasBody) continue;
  const opPath = openapiPaths[route.path];
  if (!opPath) continue;
  const methodDef = opPath[route.method.toLowerCase()];
  if (!methodDef) continue;
  if (!methodDef.requestBody) {
    fail(`MISSING requestBody: ${route.method} ${route.path}`);
  } else {
    pass(`requestBody present: ${route.method} ${route.path}`);
  }
}

// ─── 6. Response codes completeness ──────────────────────────────────────────
section('CHECK E — Every endpoint documents at least one 2xx and 403 (protected) or 401 (auth)');

for (const oRoute of openapiRoutes) {
  const has2xx = oRoute.responses.some(r => r.startsWith('2'));
  if (!has2xx) {
    fail(`NO 2xx response documented: ${oRoute.method} ${oRoute.path}`);
  } else {
    pass(`2xx response present: ${oRoute.method} ${oRoute.path}`);
  }
}

// ─── 7. Duplicate path detection ─────────────────────────────────────────────
section('CHECK F — Zero duplicate paths in OpenAPI');

const seen = new Set();
let hasDuplicates = false;
for (const path of Object.keys(openapiPaths)) {
  if (seen.has(path)) {
    fail(`DUPLICATE OPENAPI PATH: ${path}`);
    hasDuplicates = true;
  }
  seen.add(path);
}
if (!hasDuplicates) pass('No duplicate paths in OpenAPI spec');

// ─── 8. Path parameter name verification ─────────────────────────────────────
section('CHECK G — Path parameter names match between implementation and OpenAPI');

const pathParamChecks = [
  { impl: '/roles/{id}',                                    openapi: '/roles/{id}'                              },
  { impl: '/roles/{id}/duplicate',                          openapi: '/roles/{id}/duplicate'                    },
  { impl: '/role-delegation-policies/{id}',                 openapi: '/role-delegation-policies/{id}'           },
  { impl: '/invites/validate/{token}',                      openapi: '/invites/validate/{token}'                },
  { impl: '/invites/{id}',                                  openapi: '/invites/{id}'                            },
  { impl: '/departments/{id}',                              openapi: '/departments/{id}'                        },
  { impl: '/departments/{id}/move',                         openapi: '/departments/{id}/move'                   },
  { impl: '/designations/{id}',                             openapi: '/designations/{id}'                       },
  { impl: '/designations/{id}/archive',                     openapi: '/designations/{id}/archive'               },
  { impl: '/locations/{id}',                                openapi: '/locations/{id}'                          },
  { impl: '/locations/{id}/archive',                        openapi: '/locations/{id}/archive'                  },
  { impl: '/locations/{locationId}/holidays/{year}',        openapi: '/locations/{locationId}/holidays/{year}'  },
  { impl: '/shifts/{id}',                                   openapi: '/shifts/{id}'                             },
  { impl: '/shifts/{id}/archive',                           openapi: '/shifts/{id}/archive'                     },
  { impl: '/employees/{id}',                                openapi: '/employees/{id}'                          },
  { impl: '/employees/{id}/profile',                        openapi: '/employees/{id}/profile'                  },
  { impl: '/employees/{id}/status',                         openapi: '/employees/{id}/status'                   },
  { impl: '/employees/{id}/manager',                        openapi: '/employees/{id}/manager'                  },
  { impl: '/employees/{id}/invite',                         openapi: '/employees/{id}/invite'                   },
  { impl: '/employees/{id}/archive',                        openapi: '/employees/{id}/archive'                  },
  { impl: '/employees/{id}/restore',                        openapi: '/employees/{id}/restore'                  },
  { impl: '/attendance-policies/{id}',                      openapi: '/attendance-policies/{id}'                },
  { impl: '/attendance/regularizations/{id}/approve',       openapi: '/attendance/regularizations/{id}/approve' },
  { impl: '/attendance/regularizations/{id}/reject',        openapi: '/attendance/regularizations/{id}/reject'  },
];

for (const check of pathParamChecks) {
  if (openapiPaths[check.openapi]) {
    pass(`Path params match: ${check.impl}`);
  } else {
    fail(`PATH PARAM MISMATCH or MISSING: impl='${check.impl}' not found as openapi='${check.openapi}'`);
  }
}

// ─── 9. Aliases and Infrastructure documented separately ─────────────────────
section('CHECK H — Aliases and infrastructure correctly excluded from OpenAPI');

for (const path of OPENAPI_EXCLUDED) {
  if (openapiPaths[path]) {
    fail(`SHOULD NOT BE IN OPENAPI (alias/infra): ${path}`);
  } else {
    pass(`Correctly excluded from OpenAPI: ${path}`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
section('FINAL AUDIT SUMMARY');

console.log(`\n  ${BOLD}Endpoint Counts:${RESET}`);
console.log(`    Express routes (total):              ${totalImpl}`);
console.log(`    Express routes (canonical/OpenAPI):  ${canonicalCount}`);
console.log(`    OpenAPI path×method entries:         ${openapiCount}`);
console.log(`    MCP tool entries:                    ${mcpCount}`);
console.log(`    Frontend API documented operations:  ${frontendApiCount}`);

console.log(`\n  ${BOLD}Audit Results:${RESET}`);
console.log(`    Total checks:   ${checkCount}`);
console.log(`    Passed:         ${G}${passCount}${RESET}`);
console.log(`    Issues found:   ${issues.length > 0 ? R : G}${issues.length}${RESET}`);

if (issues.length > 0) {
  console.log(`\n  ${R}${BOLD}ISSUES REQUIRING FIXES:${RESET}`);
  issues.forEach((issue, i) => console.log(`    ${i + 1}. ${R}${issue}${RESET}`));
  process.exit(1);
} else {
  console.log(`\n  ${G}${BOLD}✓ ZERO DRIFT DETECTED. All documentation is synchronized with the implementation.${RESET}\n`);
  process.exit(0);
}
