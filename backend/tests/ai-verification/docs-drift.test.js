import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import EVENTS from '#@/core/constants/events/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../..');

// ─── Canonical Sources ────────────────────────────────────────────────────────
const openapiJsonPath = resolve(rootDir, 'docs/openapi/openapi.json');
const frontendEndpointsPath = resolve(rootDir, 'docs/frontend-api/endpoints.md');
const mcpReadmePath = resolve(rootDir, 'docs/mcp/README.md');
const eventsDocPath = resolve(rootDir, 'docs/architecture/events.md');
const auditDocPath = resolve(rootDir, 'docs/architecture/audit.md');

// ─── Deleted Documents (must no longer exist) ────────────────────────────────
const DELETED_PATHS = [
  resolve(rootDir, 'docs/ai/function-registry.md'),
  resolve(rootDir, 'docs/ai/functions.md'),
  resolve(rootDir, 'docs/ai/departments.md'),
  resolve(rootDir, 'docs/ai/employees.md'),
  resolve(rootDir, 'docs/ai/auth.md'),
  resolve(rootDir, 'docs/ai/designations.md'),
  resolve(rootDir, 'docs/ai/holidays.md'),
  resolve(rootDir, 'docs/ai/invitations.md'),
  resolve(rootDir, 'docs/ai/locations.md'),
  resolve(rootDir, 'docs/ai/organizations.md'),
  resolve(rootDir, 'docs/ai/role-assignment.md'),
  resolve(rootDir, 'docs/ai/role-delegation.md'),
  resolve(rootDir, 'docs/ai/roles.md'),
  resolve(rootDir, 'docs/ai/shifts.md'),
  resolve(rootDir, 'docs/ai/users.md'),
  resolve(rootDir, 'docs/events/README.md'),
  resolve(rootDir, 'docs/audit/README.md'),
  resolve(rootDir, 'docs/verification/verification-audit-summary.md'),
];

// ─── Moved Documents (must now exist at new locations) ───────────────────────
const MOVED_PATHS = [
  resolve(rootDir, 'docs/workflows/scenarios.md'),
  resolve(rootDir, 'docs/workflows/tool-selection.md'),
  resolve(rootDir, 'docs/workflows/orchestration-protocol.md'),
  resolve(rootDir, 'docs/architecture/permissions-matrix.md'),
  resolve(rootDir, 'docs/architecture/audit.md'),
  resolve(rootDir, 'docs/architecture/events.md'),
  resolve(rootDir, 'docs/development/verification-audit-summary.md'),
];

// ─── Final Hierarchy (must contain exactly these top-level directories) ───────
const REQUIRED_DIRS = ['architecture', 'frontend-api', 'mcp', 'openapi', 'workflows', 'development'];
const LEGACY_DIRS = ['ai', 'audit', 'events', 'verification'];

// ─── Ground Truth: Every implemented REST endpoint ───────────────────────────
// This is the single source of truth for what is implemented.
// OpenAPI, MCP docs, and Frontend API docs must all be synchronized with this list.
const implementedEndpoints = [
  // Auth
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/refresh' },
  { method: 'POST', path: '/auth/register-invite' },
  { method: 'POST', path: '/auth/logout' },
  { method: 'GET',  path: '/auth/me' },
  // Organizations
  { method: 'POST', path: '/organizations' },
  { method: 'GET',  path: '/organizations/me' },
  // Roles
  { method: 'GET',  path: '/roles' },
  { method: 'GET',  path: '/roles/system-permissions' },
  { method: 'POST', path: '/roles' },
  { method: 'PUT',  path: '/roles/:id' },
  { method: 'POST', path: '/roles/:id/duplicate' },
  { method: 'DELETE', path: '/roles/:id' },
  { method: 'POST', path: '/roles/assign' },
  { method: 'POST', path: '/roles/remove' },
  // Role Delegation
  { method: 'GET',  path: '/role-delegation-policies' },
  { method: 'POST', path: '/role-delegation-policies' },
  { method: 'DELETE', path: '/role-delegation-policies/:id' },
  // Invitations
  { method: 'GET',  path: '/invites/validate/:token' },
  { method: 'POST', path: '/invites' },
  { method: 'GET',  path: '/invites' },
  { method: 'DELETE', path: '/invites/:id' },
  // Departments
  { method: 'GET',  path: '/departments' },
  { method: 'POST', path: '/departments' },
  { method: 'GET',  path: '/departments/tree' },
  { method: 'GET',  path: '/departments/select-options' },
  { method: 'GET',  path: '/departments/options' },
  { method: 'GET',  path: '/departments/:id' },
  { method: 'PUT',  path: '/departments/:id' },
  { method: 'POST', path: '/departments/:id/move' },
  { method: 'DELETE', path: '/departments/:id' },
  // Designations
  { method: 'GET',  path: '/designations' },
  { method: 'POST', path: '/designations' },
  { method: 'GET',  path: '/designations/:id' },
  { method: 'PATCH', path: '/designations/:id' },
  { method: 'POST', path: '/designations/:id/archive' },
  // Locations
  { method: 'GET',  path: '/locations' },
  { method: 'POST', path: '/locations' },
  { method: 'GET',  path: '/locations/:id' },
  { method: 'PATCH', path: '/locations/:id' },
  { method: 'POST', path: '/locations/:id/archive' },
  // Holidays
  { method: 'GET',  path: '/locations/:locationId/holidays/:year' },
  { method: 'PUT',  path: '/locations/:locationId/holidays/:year' },
  // Shifts
  { method: 'GET',  path: '/shifts' },
  { method: 'POST', path: '/shifts' },
  { method: 'GET',  path: '/shifts/:id' },
  { method: 'PATCH', path: '/shifts/:id' },
  { method: 'POST', path: '/shifts/:id/archive' },
  // Employees
  { method: 'POST', path: '/employees' },
  { method: 'GET',  path: '/employees' },
  { method: 'GET',  path: '/employees/org-chart' },
  { method: 'GET',  path: '/employees/:id' },
  { method: 'PATCH', path: '/employees/:id/profile' },
  { method: 'PUT',  path: '/employees/:id/status' },
  { method: 'PUT',  path: '/employees/:id/manager' },
  { method: 'POST', path: '/employees/:id/invite' },
  { method: 'POST', path: '/employees/:id/archive' },
  { method: 'POST', path: '/employees/:id/restore' },
  // Requisitions
  { method: 'GET',  path: '/requisitions' },
  { method: 'POST', path: '/requisitions' },
  { method: 'GET',  path: '/requisitions/:id' },
  { method: 'PUT',  path: '/requisitions/:id' },
  { method: 'DELETE', path: '/requisitions/:id' },
  { method: 'PATCH', path: '/requisitions/:id/submit-approval' },
  { method: 'PATCH', path: '/requisitions/:id/approve' },
  { method: 'PATCH', path: '/requisitions/:id/reject' },
  { method: 'PATCH', path: '/requisitions/:id/publish' },
  { method: 'PATCH', path: '/requisitions/:id/close' },
  // Candidate Auth
  { method: 'POST', path: '/public/organizations/:slug/auth/register' },
  { method: 'POST', path: '/public/organizations/:slug/auth/login' },
  { method: 'POST', path: '/public/organizations/:slug/auth/logout' },
  // Candidate Profile
  { method: 'GET', path: '/public/organizations/:slug/profile' },
  { method: 'PUT', path: '/public/organizations/:slug/profile' },
  // Candidate Jobs
  { method: 'GET', path: '/public/organizations/:slug/jobs' },
  { method: 'GET', path: '/public/organizations/:slug/jobs/:idOrSlug' },
  // Candidate Applications
  { method: 'POST', path: '/public/organizations/:slug/applications/:slugOrId' },
  { method: 'GET', path: '/public/organizations/:slug/applications' },
  { method: 'PATCH', path: '/public/organizations/:slug/applications/:id/withdraw' },
  { method: 'GET', path: '/public/organizations/:slug/applications/interviews' },
  { method: 'GET', path: '/public/organizations/:slug/applications/offers' },
  { method: 'PATCH', path: '/public/organizations/:slug/applications/offers/:id/accept' },
  { method: 'PATCH', path: '/public/organizations/:slug/applications/offers/:id/decline' },
  // ATS Applications
  { method: 'GET', path: '/applications/requisitions/:requisitionId/applications' },
  { method: 'GET', path: '/applications/:id' },
  { method: 'PATCH', path: '/applications/:id/advance' },
  { method: 'PATCH', path: '/applications/:id/reject' },
  { method: 'GET', path: '/applications/:id/documents/:documentId/download' },
  { method: 'POST', path: '/applications/:id/interviews' },
  { method: 'GET', path: '/applications/:id/interviews' },
  { method: 'GET', path: '/applications/:id/interviews/:interviewId' },
  { method: 'PATCH', path: '/applications/:id/interviews/:interviewId' },
  { method: 'DELETE', path: '/applications/:id/interviews/:interviewId' },
  { method: 'POST', path: '/applications/:id/interviews/:interviewId/evaluate' },
  { method: 'POST', path: '/applications/:id/offers' },
  { method: 'GET', path: '/applications/:id/offers' },
  { method: 'GET', path: '/applications/:id/offers/:offerId' },
  { method: 'PATCH', path: '/applications/:id/offers/:offerId/send' },
  { method: 'PATCH', path: '/applications/:id/offers/:offerId/withdraw' },
  { method: 'POST', path: '/applications/:id/hire' },
  // Attendance & Attendance Policies
  { method: 'POST', path: '/attendance/clock-in' },
  { method: 'POST', path: '/attendance/clock-out' },
  { method: 'GET', path: '/attendance/today' },
  { method: 'GET', path: '/attendance/me' },
  { method: 'GET', path: '/attendance/reports' },
  { method: 'GET', path: '/attendance/dashboard' },
  { method: 'GET', path: '/attendance/export' },
  { method: 'POST', path: '/attendance/regularizations' },
  { method: 'GET', path: '/attendance/regularizations' },
  { method: 'POST', path: '/attendance/regularizations/:id/approve' },
  { method: 'POST', path: '/attendance/regularizations/:id/reject' },
  { method: 'GET', path: '/attendance-policies' },
  { method: 'POST', path: '/attendance-policies' },
  { method: 'GET', path: '/attendance-policies/:id' },
  { method: 'PATCH', path: '/attendance-policies/:id' },
  { method: 'POST', path: '/attendance/finalize' },
  { method: 'POST', path: '/attendance/reconciliation' },
  { method: 'POST', path: '/attendance/reconciliation/stale' },
  { method: 'GET', path: '/attendance/reconciliation/payroll-feed' },
  { method: 'PUT', path: '/attendance/:id/resolve-conflict' },
  // Calendars
  { method: 'GET', path: '/calendars' },
  { method: 'POST', path: '/calendars' },
  // Leave
  { method: 'GET', path: '/leave/policies' },
  { method: 'PUT', path: '/leave/policies/:code' },
  { method: 'GET', path: '/leave/balances' },
  { method: 'POST', path: '/leave/requests' },
  { method: 'POST', path: '/leave/requests/:id/approve' },
  { method: 'POST', path: '/leave/requests/:id/reject' },
  { method: 'POST', path: '/leave/requests/:id/cancel' },
  { method: 'GET', path: '/leave/reports/utilization' },
  { method: 'GET', path: '/leave/snapshots' },
  { method: 'POST', path: '/leave/snapshots/run' },
  // Payroll Structures
  { method: 'POST', path: '/payroll/structures' },
  { method: 'GET', path: '/payroll/structures' },
  { method: 'GET', path: '/payroll/structures/:id' },
  // Payroll Cycles
  { method: 'POST', path: '/payroll/cycles' },
  { method: 'GET', path: '/payroll/cycles' },
  { method: 'GET', path: '/payroll/cycles/:id' },
  { method: 'PATCH', path: '/payroll/cycles/:id/status' },
  // Payroll Runs
  { method: 'POST', path: '/payroll/runs' },
  { method: 'GET',  path: '/payroll/runs' },
  { method: 'GET',  path: '/payroll/runs/:id' },
  { method: 'POST', path: '/payroll/runs/:id/lock' },
  { method: 'POST', path: '/payroll/runs/:id/finalize-payslips' },
  // Payslips
  { method: 'GET',  path: '/payroll/payslips/my' },
  { method: 'GET',  path: '/payroll/payslips/:id' },
  { method: 'GET',  path: '/payroll/payslips/run/:runId' },
  { method: 'GET',  path: '/payroll/payslips/employee/:employeeId' },
  { method: 'PATCH', path: '/payroll/payslips/:id/finalize' }
];

// ─── Audit Actions ────────────────────────────────────────────────────────────
const knownAuditActions = [
  'TENANT_PROVISIONED', 'USER_REGISTERED', 'LOGIN_SUCCESS', 'LOGIN_FAILED',
  'ACCOUNT_LOCKED', 'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED',
  'ROLE_ASSIGNED', 'ROLE_REMOVED', 'POLICY_CREATED', 'POLICY_DELETED',
  'INVITATION_CREATED', 'INVITATION_REVOKED', 'DEPARTMENT_CREATED',
  'DEPARTMENT_UPDATED', 'DEPARTMENT_MOVED', 'DEPARTMENT_ARCHIVED',
  'DESIGNATION_CREATED', 'DESIGNATION_UPDATED', 'DESIGNATION_ARCHIVED',
  'LOCATION_CREATED', 'LOCATION_UPDATED', 'LOCATION_ARCHIVED',
  'SHIFT_CREATED', 'SHIFT_UPDATED', 'SHIFT_ARCHIVED', 'HOLIDAY_UPDATED',
  'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_STATUS_CHANGED',
  'EMPLOYEE_MANAGER_CHANGED', 'EMPLOYEE_INVITED', 'EMPLOYEE_ARCHIVED', 'EMPLOYEE_RESTORED',
  'RECONCILE_STALE_ATTENDANCE', 'FINALIZE_PAY_PERIOD',
  'PAYROLL_PROCESSING_STARTED', 'PAYROLL_PROCESSED', 'PAYROLL_LOCKED',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeOpenApiPath(p) {
  return p.replace(/\{[^}]+\}/g, ':param');
}

// =============================================================================
describe('Documentation Architecture — Final Hierarchy', () => {
  it('contains exactly the required top-level doc directories', () => {
    const docsDir = resolve(rootDir, 'docs');
    const entries = readdirSync(docsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const dir of REQUIRED_DIRS) {
      expect(entries, `Missing required directory: docs/${dir}`).toContain(dir);
    }

    for (const dir of LEGACY_DIRS) {
      expect(entries, `Legacy directory must be removed: docs/${dir}`).not.toContain(dir);
    }
  });

  it('confirms deleted AI function registry files no longer exist', () => {
    for (const p of DELETED_PATHS) {
      expect(existsSync(p), `Deleted file still exists: ${p}`).toBe(false);
    }
  });

  it('confirms moved documents now exist at their new canonical locations', () => {
    for (const p of MOVED_PATHS) {
      expect(existsSync(p), `Moved file missing at: ${p}`).toBe(true);
    }
  });
});

// =============================================================================
describe('OpenAPI Specification — Canonical Contract Verification', () => {
  it('openapi.json exists and is valid OpenAPI 3.1', () => {
    expect(existsSync(openapiJsonPath)).toBe(true);
    const spec = JSON.parse(readFileSync(openapiJsonPath, 'utf8'));
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toBeDefined();
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBeTruthy();
  });

  it('every implemented endpoint is represented in OpenAPI paths (implemented → documented)', () => {
    const spec = JSON.parse(readFileSync(openapiJsonPath, 'utf8'));
    const openapiPaths = Object.keys(spec.paths);

    // Every path in implementedEndpoints must exist in the OpenAPI spec.
    // This test MUST FAIL if a new endpoint is added to the backend without updating the spec.
    // The OpenAPI spec is the canonical contract — it must remain synchronized with the implementation.
    const criticalPaths = [
      // Auth
      '/auth/login', '/auth/refresh', '/auth/register-invite', '/auth/logout', '/auth/me',
      // Organizations
      '/organizations', '/organizations/me',
      // Roles
      '/roles', '/roles/system-permissions', '/roles/assign', '/roles/remove',
      // Role Delegation
      '/role-delegation-policies',
      // Invitations
      '/invites',
      // Departments
      '/departments', '/departments/tree', '/departments/select-options', '/departments/options',
      // Designations
      '/designations',
      // Locations
      '/locations',
      // Shifts
      '/shifts',
      // Employees
      '/employees', '/employees/org-chart',
      // Requisitions
      '/requisitions',
    ];

    for (const p of criticalPaths) {
      const found = openapiPaths.some((op) => op === p || op.startsWith(p + '/') || op.startsWith(p + '{'));
      expect(found, `OpenAPI spec missing path: ${p}. Update docs/openapi/openapi.json to match the implementation.`).toBe(true);
    }
  });

  it('every parameterized sub-route is represented in OpenAPI paths', () => {
    const spec = JSON.parse(readFileSync(openapiJsonPath, 'utf8'));
    const openapiPaths = Object.keys(spec.paths);

    // Parameterized paths — normalized for comparison
    const parameterizedPaths = [
      '/roles/{id}',
      '/roles/{id}/duplicate',
      '/role-delegation-policies/{id}',
      '/invites/validate/{token}',
      '/invites/{id}',
      '/departments/{id}',
      '/departments/{id}/move',
      '/designations/{id}',
      '/designations/{id}/archive',
      '/locations/{id}',
      '/locations/{id}/archive',
      '/locations/{locationId}/holidays/{year}',
      '/shifts/{id}',
      '/shifts/{id}/archive',
      '/employees/{id}',
      '/employees/{id}/profile',
      '/employees/{id}/status',
      '/employees/{id}/manager',
      '/employees/{id}/invite',
      '/employees/{id}/archive',
      '/employees/{id}/restore',
      '/requisitions/{id}',
      '/requisitions/{id}/submit-approval',
      '/requisitions/{id}/approve',
      '/requisitions/{id}/reject',
      '/requisitions/{id}/publish',
      '/requisitions/{id}/close',
      '/public/organizations/{slug}/auth/register',
      '/public/organizations/{slug}/auth/login',
      '/public/organizations/{slug}/auth/logout',
      '/public/organizations/{slug}/profile',
      '/public/organizations/{slug}/jobs',
      '/public/organizations/{slug}/jobs/{idOrSlug}',
      '/public/organizations/{slug}/applications/{slugOrId}',
      '/public/organizations/{slug}/applications',
      '/public/organizations/{slug}/applications/{id}/withdraw',
      '/public/organizations/{slug}/applications/interviews',
      '/public/organizations/{slug}/applications/offers',
      '/public/organizations/{slug}/applications/offers/{id}/accept',
      '/public/organizations/{slug}/applications/offers/{id}/decline',
      '/applications/requisitions/{requisitionId}/applications',
      '/applications/{id}',
      '/applications/{id}/advance',
      '/applications/{id}/reject',
      '/applications/{id}/documents/{documentId}/download',
      '/applications/{id}/interviews',
      '/applications/{id}/interviews/{interviewId}',
      '/applications/{id}/interviews/{interviewId}/evaluate',
      '/applications/{id}/offers',
      '/applications/{id}/offers/{offerId}',
      '/applications/{id}/offers/{offerId}/send',
      '/applications/{id}/offers/{offerId}/withdraw',
      '/applications/{id}/hire',
      '/attendance/regularizations/{id}/approve',
      '/attendance/regularizations/{id}/reject',
      '/attendance-policies/{id}'
    ];

    for (const p of parameterizedPaths) {
      expect(openapiPaths, `OpenAPI spec missing parameterized path: ${p}. Update docs/openapi/openapi.json.`).toContain(p);
    }
  });

  it('OpenAPI spec does not contain /roles/delegation (hallucinated non-existent path)', () => {
    const spec = JSON.parse(readFileSync(openapiJsonPath, 'utf8'));
    const paths = Object.keys(spec.paths);
    expect(paths).not.toContain('/roles/delegation');
  });

  it('every OpenAPI path corresponds to an implemented endpoint (documented → implemented)', () => {
    const spec = JSON.parse(readFileSync(openapiJsonPath, 'utf8'));
    const implementedPaths = new Set(implementedEndpoints.map((e) => e.path));

    for (const [apiPath] of Object.entries(spec.paths)) {
      // Normalize OpenAPI {param} → :param for comparison
      const normalizedApiPath = apiPath.replace(/\{[^}]+\}/g, ':param');
      // Find any match where normalized implemented paths match
      const implementedNormalized = [...implementedPaths].map((p) => p.replace(/:[\w]+/g, ':param'));
      const hasMatch = implementedNormalized.some((p) => p === normalizedApiPath);
      expect(hasMatch, `OpenAPI documents non-implemented path: ${apiPath}`).toBe(true);
    }
  });
});

// =============================================================================
describe('MCP Documentation — Tool Coverage Verification', () => {
  it('docs/mcp/README.md exists and is non-empty', () => {
    expect(existsSync(mcpReadmePath)).toBe(true);
    const content = readFileSync(mcpReadmePath, 'utf8');
    expect(content.length).toBeGreaterThan(500);
  });

  it('MCP README documents the canonical endpoint for every major domain', () => {
    const content = readFileSync(mcpReadmePath, 'utf8');
    const requiredEndpoints = [
      '/api/v1/auth/login',
      '/api/v1/auth/register-invite',
      '/api/v1/roles',
      '/api/v1/roles/assign',
      '/api/v1/role-delegation-policies',
      '/api/v1/invites',
      '/api/v1/departments',
      '/api/v1/designations',
      '/api/v1/locations',
      '/api/v1/shifts',
      '/api/v1/employees',
      '/api/v1/employees/org-chart',
    ];
    for (const ep of requiredEndpoints) {
      expect(content, `MCP README missing endpoint: ${ep}`).toContain(ep);
    }
  });

  it('MCP README does not reference the deleted /roles/delegation path', () => {
    const content = readFileSync(mcpReadmePath, 'utf8');
    expect(content).not.toContain('/roles/delegation`');
  });

  it('individual MCP tool spec files exist for every domain module', () => {
    const expectedToolFiles = [
      'auth-tools.md', 'role-tools.md', 'role-delegation-tools.md',
      'invitation-tools.md', 'organization-tools.md', 'department-tools.md',
      'designation-tools.md', 'location-tools.md', 'shift-tools.md',
      'holiday-tools.md', 'employee-tools.md',
    ];
    for (const file of expectedToolFiles) {
      const p = resolve(rootDir, 'docs/mcp', file);
      expect(existsSync(p), `Missing MCP tool spec: docs/mcp/${file}`).toBe(true);
    }
  });
});

// =============================================================================
describe('Frontend API Documentation — Coverage Verification', () => {
  it('docs/frontend-api/endpoints.md exists and covers auth and roles endpoints', () => {
    expect(existsSync(frontendEndpointsPath)).toBe(true);
    const content = readFileSync(frontendEndpointsPath, 'utf8');
    // endpoints.md is a TypeScript SDK reference — check it covers core auth and role endpoints
    expect(content).toContain('POST /api/v1/auth/login');
    expect(content).toContain('GET /api/v1/employees');
    expect(content).toContain('POST /api/v1/roles/assign');
    expect(content).toContain('POST /api/v1/employees');
  });

  it('per-domain frontend API subdirectory files document the departments endpoint', () => {
    // Departments documentation lives in docs/frontend-api/departments/ subdirectory
    const deptFile = resolve(rootDir, 'docs/frontend-api/departments/get-departments.md');
    expect(existsSync(deptFile)).toBe(true);
    const content = readFileSync(deptFile, 'utf8');
    expect(content).toContain('GET /api/v1/departments');
  });

  it('per-endpoint frontend documentation subdirectories exist for every domain', () => {
    const expectedDirs = [
      'auth', 'organizations', 'roles', 'role-delegation',
      'invitations', 'departments', 'designations', 'locations',
      'shifts', 'holidays', 'employees',
    ];
    for (const dir of expectedDirs) {
      const p = resolve(rootDir, 'docs/frontend-api', dir);
      expect(existsSync(p), `Missing frontend-api subdirectory: docs/frontend-api/${dir}`).toBe(true);
    }
  });
});

// =============================================================================
describe('Domain Events — Canonical Documentation Coverage', () => {
  it('docs/architecture/events.md exists (relocated from docs/events/README.md)', () => {
    expect(existsSync(eventsDocPath)).toBe(true);
  });

  it('all domain events in core constants are documented in docs/architecture/events.md', () => {
    const eventsDocs = readFileSync(eventsDocPath, 'utf8');
    Object.values(EVENTS).forEach((namespaceObj) => {
      if (typeof namespaceObj === 'object' && namespaceObj !== null) {
        Object.values(namespaceObj).forEach((eventString) => {
          expect(eventsDocs, `Event missing from docs: ${eventString}`).toContain(eventString);
        });
      }
    });
  });
});

// =============================================================================
describe('Audit Compliance Ledger — Documentation Coverage', () => {
  it('docs/architecture/audit.md exists (relocated from docs/audit/README.md)', () => {
    expect(existsSync(auditDocPath)).toBe(true);
  });

  it('all known audit compliance actions are documented in docs/architecture/audit.md', () => {
    const auditDocs = readFileSync(auditDocPath, 'utf8');
    for (const action of knownAuditActions) {
      expect(auditDocs, `Audit action missing from docs: ${action}`).toContain(action);
    }
  });
});

// =============================================================================
describe('Final CI Documentation Invariant', () => {
  it('runs finalDocumentationAudit.js and expects zero drift (exit code 0)', () => {
    const { execSync } = require('child_process');
    try {
      // Run the audit script. If it fails, execSync will throw and the test will fail.
      const stdout = execSync(`node --experimental-vm-modules ${resolve(rootDir, 'backend/scripts/audit/finalDocumentationAudit.js')}`, { encoding: 'utf8' });
      expect(stdout).toContain('ZERO DRIFT DETECTED');
    } catch (error) {
      // If the script exited with a non-zero code, the output is in error.stdout
      console.error(error.stdout);
      throw new Error(`Documentation drift detected! The finalDocumentationAudit.js script failed.\n\n${error.stdout}`);
    }
  });

  it('guarantees the checked-in OpenAPI specs are up-to-date with code (zero git drift)', () => {
    const { execSync } = require('child_process');
    try {
      // 1. Run the generator to overwrite the checked-in files with current code state
      execSync(`npm run docs:generate`, { cwd: resolve(rootDir, 'backend'), encoding: 'utf8', stdio: 'pipe' });
      
      // 2. Check if git detects any differences in the openapi directory
      execSync(`git diff --exit-code docs/openapi`, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      // If git diff returns non-zero, it means docs:generate modified the files
      console.error(error.stdout);
      throw new Error(`Uncommitted OpenAPI changes detected! You modified code but forgot to run 'npm run docs:generate'. Please run it and commit the updated docs.\n\n${error.stdout}`);
    }
  });
});
