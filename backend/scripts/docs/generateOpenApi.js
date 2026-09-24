import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import { fileURLToPath, pathToFileURL } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');
const srcDir = path.join(rootDir, 'backend/src');

function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      findRouteFiles(fullPath, fileList);
    } else if (file.name.endsWith('Routes.js')) {
      if (!file.name.includes('storageTestRoutes')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

// Convert Zod to basic OpenAPI schema
function zodToOpenApi(zodObj) {
  if (!zodObj) return null;
  const def = zodObj._def;
  if (!def) return {};
  
  const typeName = def.typeName;
  
  if (typeName === 'ZodObject') {
    const shape = def.shape();
    const properties = {};
    const required = [];
    for (const [key, val] of Object.entries(shape)) {
      properties[key] = zodToOpenApi(val);
      if (!val.isOptional()) required.push(key);
    }
    const schema = { type: 'object', properties };
    if (required.length > 0) schema.required = required;
    return schema;
  }
  
  if (typeName === 'ZodString') {
    const schema = { type: 'string' };
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'min') schema.minLength = check.value;
        if (check.kind === 'max') schema.maxLength = check.value;
        if (check.kind === 'email') schema.format = 'email';
      }
    }
    return schema;
  }
  
  if (typeName === 'ZodNumber') {
    return { type: 'number' };
  }
  
  if (typeName === 'ZodBoolean') {
    return { type: 'boolean' };
  }
  
  if (typeName === 'ZodArray') {
    return {
      type: 'array',
      items: zodToOpenApi(def.type)
    };
  }
  
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    return zodToOpenApi(def.innerType);
  }
  
  if (typeName === 'ZodDefault') {
    const inner = zodToOpenApi(def.innerType);
    inner.default = def.defaultValue();
    return inner;
  }
  
  return { type: 'string' }; // fallback
}

// Minimal AST traverser
function traverse(node, visitors) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) traverse(child, visitors);
    return;
  }
  if (visitors[node.type]) visitors[node.type](node);
  for (const key in node) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end' || key === 'comments') continue;
    if (typeof node[key] === 'object') {
      traverse(node[key], visitors);
    }
  }
}

async function extractRoutes() {
  const routeFiles = findRouteFiles(srcDir);
  const openapiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Enterprise Workforce Management Platform",
      version: "1.0.0"
    },
    paths: {}
  };
  
  for (const filePath of routeFiles) {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // Import the router file to force validation schemas & controllers to load,
    // but we can't easily dynamically inspect the router structure, so we use AST to find bindings.
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: []
    });
    
    // Find imports to resolve controller files
    const imports = {}; // name -> fullpath
    traverse(ast, {
      ImportDeclaration(node) {
        const source = node.source.value;
        // resolve alias
        let resolvedPath = source.replace('#@/', srcDir + '/').replace('#/', srcDir + '/');
        if (resolvedPath.startsWith('.')) {
          resolvedPath = path.resolve(path.dirname(filePath), resolvedPath);
        }
        for (const specifier of node.specifiers) {
          imports[specifier.local.name] = resolvedPath;
        }
      }
    });

    // Find route definitions
    const routes = [];
    traverse(ast, {
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'router') {
          const method = node.callee.property.name;
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const routePath = node.arguments[0].value;
            if (!routePath) return; // e.g. router.use
            
            let permission = null;
            let validationSchemaName = null;
            let controllerName = null;
            let controllerMethod = null;
            let isProtected = code.includes('authenticate'); // rough heuristic
            
            for (let i = 1; i < node.arguments.length; i++) {
              const arg = node.arguments[i];
              if (arg.type === 'CallExpression') {
                if (arg.callee.name === 'hasPermission' || arg.callee.name === 'hasAnyPermission') {
                  permission = code.slice(arg.arguments[0].start, arg.arguments[0].end);
                } else if (arg.callee.name === 'validate') {
                  validationSchemaName = arg.arguments[0].name;
                }
              } else if (arg.type === 'Identifier' && (arg.name === 'authenticate' || arg.name === 'candidateAuthenticate')) {
                isProtected = true;
              } else if (arg.type === 'MemberExpression') {
                controllerName = arg.object.name;
                controllerMethod = arg.property.name;
              }
            }
            
            routes.push({ method, path: routePath, permission, validationSchemaName, controllerName, controllerMethod, isProtected, imports });
          }
        }
      }
    });
    
    // Load metadata and schemas dynamically
    for (const route of routes) {
      // Build full prefix (naive fallback if router is mounted, we just use /api/v1 prefix for now)
      // Since route mounts are in index.js, we approximate by looking at folder name
      const moduleName = path.basename(path.dirname(path.dirname(filePath)));
      // This is a bit naive, we'll try to map modules to their v1 mounts:
      const mountMap = {
        auth: '/auth', roles: '/roles', invitations: '/invites', organization: '/organizations',
        departments: '/departments', employees: '/employees'
        // designations, locations, shifts are in 'organization' module but mounted separately.
      };
      
      let baseMount = '';
      if (filePath.includes('designationRoutes')) baseMount = '/designations';
      else if (filePath.includes('locationRoutes')) baseMount = '/locations';
      else if (filePath.includes('shiftRoutes')) baseMount = '/shifts';
      else if (filePath.includes('holidayRoutes')) baseMount = '/locations';
      else if (filePath.includes('roleDelegationRoutes')) baseMount = '/role-delegation-policies';
      else if (filePath.includes('requisitionRoutes')) baseMount = '/requisitions';
      else if (filePath.includes('atsApplicationRoutes')) baseMount = '/applications';
      else if (filePath.includes('candidateAuthRoutes')) baseMount = '/public/organizations/:slug/auth';
      else if (filePath.includes('candidateProfileRoutes')) baseMount = '/public/organizations/:slug/profile';
      else if (filePath.includes('publicJobRoutes')) baseMount = '/public/organizations/:slug/jobs';
      else if (filePath.includes('publicApplicationRoutes')) baseMount = '/public/organizations/:slug/applications';
      else if (filePath.includes('attendanceReconciliationRoutes')) baseMount = '/attendance/reconciliation';
      else if (filePath.includes('attendanceRoutes')) baseMount = '/attendance';
      else if (filePath.includes('regularizationRoutes')) baseMount = '/attendance/regularizations';
      else if (filePath.includes('attendancePolicyRoutes')) baseMount = '/attendance-policies';
      else if (filePath.includes('AttendanceConflictRoutes')) baseMount = '/attendance';
      else if (filePath.includes('LeavePolicyRoutes')) baseMount = '/leave/policies';
      else if (filePath.includes('LeaveBalanceRoutes')) baseMount = '/leave/balances';
      else if (filePath.includes('LeaveRequestRoutes')) baseMount = '/leave/requests';
      else if (filePath.includes('LeaveReportRoutes')) baseMount = '/leave/reports';
      else if (filePath.includes('LeaveSnapshotRoutes')) baseMount = '/leave/snapshots';
      else if (filePath.includes('CalendarRoutes')) baseMount = '/calendars';
      else if (filePath.includes('SalaryStructureRoutes')) baseMount = '/payroll/structures';
      else if (filePath.includes('PayrollCycleRoutes')) baseMount = '/payroll/cycles';
      else if (filePath.includes('PayrollRunRoutes')) baseMount = '/payroll/runs';
      else if (filePath.includes('PayslipRoutes')) baseMount = '/payroll/payslips';
      else baseMount = mountMap[moduleName] || ('/' + moduleName);
      
      // Fix holiday routes which are mounted directly as is
      if (filePath.includes('holidayRoutes')) baseMount = '/locations';
      
      let fullPath = `${baseMount}${route.path}`.replace(/\/+/g, '/').replace(/\/$/, '');
      if (fullPath === '/locations' && filePath.includes('holidayRoutes')) {
         fullPath = `/locations${route.path}`; // It mounts holiday on /locations, but path in holidayRoutes is already /:locationId/holidays/:year
      }
      if (filePath.includes('designationRoutes')) fullPath = `/designations${route.path}`.replace(/\/$/, '');
      if (filePath.includes('locationRoutes')) fullPath = `/locations${route.path}`.replace(/\/$/, '');
      if (filePath.includes('shiftRoutes')) fullPath = `/shifts${route.path}`.replace(/\/$/, '');

      // Load controller metadata
      let metadata = {};
      if (route.controllerName && route.imports[route.controllerName]) {
        try {
          const mod = await import(pathToFileURL(route.imports[route.controllerName]).href);
          if (mod.openApiMetadata && mod.openApiMetadata[route.controllerMethod]) {
            metadata = mod.openApiMetadata[route.controllerMethod];
          }
        } catch(e) {}
      }
      
      // Load zod schema
      let openApiBody = null;
      let openApiParams = [];
      if (route.validationSchemaName) {
        // Find where it was imported from
        const schemaFile = route.imports[route.validationSchemaName];
        if (schemaFile) {
          try {
            const mod = await import(pathToFileURL(schemaFile).href);
            const schema = mod[route.validationSchemaName];
            if (schema) {
              const bodyZod = schema.shape?.body;
              if (bodyZod) {
                openApiBody = zodToOpenApi(bodyZod);
              }
              const paramsZod = schema.shape?.params;
              if (paramsZod) {
                const paramsSchema = zodToOpenApi(paramsZod);
                for (const key of Object.keys(paramsSchema.properties || {})) {
                   openApiParams.push({ name: key, in: 'path', required: true, schema: paramsSchema.properties[key] });
                }
              }
            }
          } catch(e) {}
        }
      }
      
      // Add implicit params if path has :id
      const matches = fullPath.match(/:([a-zA-Z0-9_]+)/g);
      if (matches) {
        for (const match of matches) {
          const paramName = match.substring(1);
          if (!openApiParams.find(p => p.name === paramName)) {
             openApiParams.push({ name: paramName, in: 'path', required: true, schema: { type: 'string' } });
          }
        }
      }
      
      // Format openapi path
      const openapiFormatPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      
      if (!openapiSpec.paths[openapiFormatPath]) {
        openapiSpec.paths[openapiFormatPath] = {};
      }
      
      const op = {
        summary: metadata.summary || route.controllerMethod || '',
        description: metadata.description || '',
        tags: metadata.tags || [],
        responses: {
          "200": { description: "Success" }
        }
      };
      
      if (metadata.security) {
        op.security = metadata.security;
      } else if (route.isProtected) {
        op.security = [{ BearerAuth: [] }];
        op.responses["403"] = { description: "Forbidden" };
      }
      
      if (openApiParams.length > 0) {
        op.parameters = openApiParams;
      }
      
      if (metadata.requestBody) {
        op.requestBody = metadata.requestBody;
      } else if (openApiBody && ['post', 'put', 'patch'].includes(route.method)) {
        op.requestBody = {
          content: {
            "application/json": {
              schema: openApiBody
            }
          }
        };
      } else if (fullPath === '/auth/refresh' && route.method === 'post') {
        op.requestBody = {
          content: {
            "application/json": {
              schema: { type: 'object', properties: { refreshToken: { type: 'string' } } }
            }
          }
        };
      }
      
      openapiSpec.paths[openapiFormatPath][route.method] = op;
    }
  }
  
  // Add security schemes
  openapiSpec.components = {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  };
  
  fs.writeFileSync(path.join(rootDir, 'docs/openapi/openapi.json'), JSON.stringify(openapiSpec, null, 2));
  fs.writeFileSync(path.join(rootDir, 'docs/openapi/openapi.yaml'), YAML.stringify(openapiSpec));
  console.log('Successfully generated OpenAPI JSON and YAML specifications.');
}

extractRoutes().catch(console.error);
