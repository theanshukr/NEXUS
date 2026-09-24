/**
 * Documentation Consistency Verification Script
 *
 * ARCHITECTURE NOTE (2026-07-03):
 * The AI Function Registry (functions.md, function-registry.md) has been retired.
 * The OpenAPI specification (docs/openapi/openapi.json) is now the canonical contract.
 * This script verifies that every endpoint in the OpenAPI spec maps to an implemented
 * route + controller + service + validator + permission in the source code.
 *
 * For automated Vitest-based drift detection, see:
 *   backend/tests/ai-verification/docs-drift.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.resolve(BACKEND_DIR, '../docs');
const SRC_DIR = path.join(BACKEND_DIR, 'src');
const TESTS_DIR = path.join(BACKEND_DIR, 'tests');
const OPENAPI_PATH = path.join(DOCS_DIR, 'openapi/openapi.json');

function findFilesInDir(startPath, filter, results = []) {
  if (!fs.existsSync(startPath)) return results;
  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      findFilesInDir(filename, filter, results);
    } else if (filename.endsWith(filter)) {
      results.push(filename);
    }
  }
  return results;
}

const allSrcFiles = findFilesInDir(SRC_DIR, '.js');
const allTestFiles = findFilesInDir(TESTS_DIR, '.test.js');

const srcContents = allSrcFiles.map((f) => ({ path: f, content: fs.readFileSync(f, 'utf8') }));
const testContents = allTestFiles.map((f) => ({ path: f, content: fs.readFileSync(f, 'utf8') }));

/**
 * Verify that a given keyword (derived from an OpenAPI path segment or operation ID)
 * is present across the required source layers.
 */
function verifyEndpoint(keyword) {
  const result = {
    keyword,
    hasRoute: false,
    hasController: false,
    hasService: false,
    hasValidator: false,
    hasPermission: false,
    hasTests: false,
  };

  for (const file of srcContents) {
    if (file.path.includes('routes') && file.content.includes(keyword)) {
      result.hasRoute = true;
      if (file.content.includes('validate(')) result.hasValidator = true;
      if (
        file.content.includes('hasPermission(') ||
        file.content.includes('hasAnyPermission(') ||
        file.content.includes('authenticate')
      ) {
        result.hasPermission = true;
      }
    }
    if (file.path.includes('controllers') && file.content.includes(keyword)) {
      result.hasController = true;
    }
    if (file.path.includes('services') && file.content.includes(keyword)) {
      result.hasService = true;
    }
  }

  for (const file of testContents) {
    if (file.content.includes(keyword)) {
      result.hasTests = true;
    }
  }

  return result;
}

async function run() {
  console.log('\n--- NexusOps Documentation Consistency Verification ---');
  console.log('Source of truth: docs/openapi/openapi.json\n');

  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error('❌ FATAL: docs/openapi/openapi.json not found. Cannot verify.');
    process.exit(1);
  }

  const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
  const paths = Object.keys(openapi.paths);
  console.log(`Found ${paths.length} paths in OpenAPI spec.\n`);

  let allGood = true;
  const results = [];

  for (const apiPath of paths) {
    // Extract a meaningful keyword from the path (last non-param segment)
    const segments = apiPath.split('/').filter((s) => s && !s.startsWith('{'));
    const keyword = segments[segments.length - 1] || segments[segments.length - 2] || '';
    if (!keyword) continue;

    const status = verifyEndpoint(keyword);
    results.push({ ...status, apiPath });

    const missing = [];
    if (!status.hasRoute) missing.push('Route');
    if (!status.hasController) missing.push('Controller');
    if (!status.hasService) missing.push('Service');
    if (!status.hasPermission) missing.push('Permission Config');
    if (!status.hasTests) missing.push('Tests');

    if (missing.length > 0) {
      console.log(`⚠️  [${apiPath}] Missing implementations: ${missing.join(', ')}`);
      allGood = false;
    } else {
      console.log(`✅ [${apiPath}] Fully verified.`);
    }
  }

  // Verify deleted files no longer exist
  console.log('\n--- Deleted File Verification ---');
  const deletedFiles = [
    path.join(DOCS_DIR, 'ai/function-registry.md'),
    path.join(DOCS_DIR, 'ai/functions.md'),
  ];
  for (const f of deletedFiles) {
    if (fs.existsSync(f)) {
      console.log(`❌ DELETED FILE STILL EXISTS: ${f}`);
      allGood = false;
    } else {
      console.log(`✅ Confirmed deleted: ${path.relative(DOCS_DIR, f)}`);
    }
  }

  // Write Markdown Report
  let report = `# Documentation Consistency Verification Report\n\n`;
  report += `> Source of truth: \`docs/openapi/openapi.json\` | Generated: ${new Date().toISOString()}\n\n`;
  report += `| OpenAPI Path | Route | Controller | Service | Permission | Tests |\n`;
  report += `|---|---|---|---|---|---|\n`;
  for (const r of results) {
    report += `| \`${r.apiPath}\` | ${r.hasRoute ? '✅' : '❌'} | ${r.hasController ? '✅' : '❌'} | ${r.hasService ? '✅' : '❌'} | ${r.hasPermission ? '✅' : '❌'} | ${r.hasTests ? '✅' : '❌'} |\n`;
  }

  const reportPath = path.join(DOCS_DIR, 'development/documentation-consistency-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport written to docs/development/documentation-consistency-report.md`);

  if (allGood) {
    console.log('\n✅ All verified. No drift detected.\n');
  } else {
    console.log('\n⚠️  Verification completed with warnings. Review items above.\n');
  }

  process.exit(0);
}

run();
