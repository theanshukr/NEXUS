import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DOCS_DIR = path.resolve(__dirname, '../../ai-docs');

function run() {
  console.log('--- AI Routing Verification ---');
  const toolSelection = fs.readFileSync(path.join(AI_DOCS_DIR, 'tool-selection.md'), 'utf8');
  
  // Extract all `- \`filename.md\`` references
  const regex = /- `([a-zA-Z0-9_\-]+)\.md`/g;
  let match;
  const references = [];
  while ((match = regex.exec(toolSelection)) !== null) {
    references.push(match[1] + '.md');
  }

  let allGood = true;
  console.log(`Found ${references.length} documentation references in tool-selection.md.`);

  for (const ref of references) {
    const exists = fs.existsSync(path.join(AI_DOCS_DIR, ref));
    if (!exists) {
      console.log(`❌ Invalid Route: ${ref} does not exist in ai-docs/`);
      allGood = false;
    } else {
      console.log(`✅ Valid Route: ${ref}`);
    }
  }
  
  if (allGood) {
    console.log('\n✅ All AI Routing logic points to valid documentation files.');
  }
  process.exit(allGood ? 0 : 1);
}

run();
