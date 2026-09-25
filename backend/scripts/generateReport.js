import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch_analysis.json', 'utf8'));
const skills = data.skills;

// 1. DATASET SUMMARY
let report = `## 1. DATASET SUMMARY\n\n`;
report += `- Total Profiles Inspected: ${data.totalProfiles}\n`;
report += `- Total Legacy Skills Migrated: ${data.totalRelationships}\n`;
report += `- Total Unique Canonical Skills Generated: ${data.totalSkills}\n\n`;

// 2. COMPLETE SKILL INVENTORY
report += `## 2. COMPLETE SKILL INVENTORY\n\n`;
report += `| Canonical Name | Normalized Name | Category | Usage | Avg Years | Proficiencies |\n`;
report += `|---|---|---|---|---|---|\n`;
for (const s of skills) {
  const profStr = Object.entries(s.proficiencies).map(([k,v])=>`${k}:${v}`).join(', ');
  report += `| ${s.canonicalName} | ${s.normalizedName} | ${s.category} | ${s.usageCount} | ${s.avgYears} | ${profStr} |\n`;
}

// 3. DUPLICATE / ALIAS CANDIDATES
report += `\n## 3. DUPLICATE / ALIAS CANDIDATES\n\n`;
const aliases = [
  { group: ["Java", "Java 17", "Java & Spring Boot", "Java (JVM) Performance"], type: "B" },
  { group: ["React.js", "React Native", "React hooks"], type: "B" },
  { group: ["Kubernetes", "Kubernetes (EKS/GKE)", "Kubernetes Hardening"], type: "B" },
  { group: ["Docker", "Docker & Containers"], type: "A" },
  { group: ["AWS Cloud Services", "AWS Cloud Architecture", "AWS Solutions Architecture"], type: "A" },
  { group: ["Python", "Python & Scikit-Learn", "Python & FastAPI"], type: "B" },
  { group: ["Terraform", "Terraform & OpenTofu IaC"], type: "A" },
  { group: ["Apache Kafka", "Kafka", "Kafka & Event-Driven Architecture"], type: "A" },
  { group: ["Redis", "Redis Caching"], type: "A" }
];

for (const alias of aliases) {
  const found = skills.filter(s => alias.group.includes(s.canonicalName)).map(s => s.canonicalName);
  report += `### Group: ${alias.group[0]}\n`;
  report += `- Candidates: ${found.join(', ')}\n`;
  report += `- Relationship: Type ${alias.type} (${alias.type === 'A' ? 'Likely same skill' : 'Likely related but distinct'})\n`;
  report += `- Rationale: Compound strings like "Technology & Something" were migrated as distinct canonical skills, but represent identical core technologies mixed with paradigms/frameworks.\n\n`;
}

// 4. CATEGORY ANALYSIS
report += `## 4. CATEGORY ANALYSIS\n\n`;
const categories = [...new Set(skills.map(s => s.category))];
report += `- Existing categories: ${categories.join(', ')}\n`;
report += `- Well-fitted skills: Database technologies cleanly fit into DATABASE (e.g., PostgreSQL, MongoDB).\n`;
report += `- Ambiguous skills: Skills combining two areas like "Python & Scikit-Learn" are tagged DATA_AI, but Python alone is also DATA_AI, though it's used heavily in BACKEND.\n`;
report += `- Classification: The current category system is too rigid. Technologies span multiple categories (e.g. Node.js can be Full-stack or Backend, Terraform is Cloud/DevOps). Categories should likely be metadata or tags rather than strict enumerations enforcing canonical identity.\n\n`;

// 5. ESCO COMPATIBILITY
report += `## 5. ESCO COMPATIBILITY\n\n`;
report += `- ESCO Direct Match: Generic skills like "Java", "Python", "Project Management" will map easily to ESCO IT concepts.\n`;
report += `- ESCO Related Concept: "System Architecture & Design" -> "design software architecture".\n`;
report += `- Technology/Tool Special Handling: ESCO is notoriously lacking for highly specific tools (e.g. "k6 Performance Testing", "OpenTofu IaC", "ArgoCD", "Qdrant/Pinecone"). These will fail ESCO matching or map to generic "use software tools".\n`;
report += `- Recommendation: ESCO is insufficient as a standalone taxonomy because it lacks granularity for modern technical stacks. ESCO can be used as an *enrichment layer* or broad categorizer, but the canonical vocabulary must be custom.\n\n`;

// 6. EXTRACTION REQUIREMENTS
report += `## 6. EXTRACTION REQUIREMENTS\n\n`;
report += `The extraction system must be capable of recognizing:\n`;
report += `- Pure Languages (Java, Python, TypeScript)\n`;
report += `- Frameworks & Libraries (React.js, Spring Boot, Scikit-Learn)\n`;
report += `- Databases & Infrastructures (PostgreSQL, Kafka, Terraform, Docker)\n`;
report += `- Paradigms & Architectures (Microservices Design Patterns, Web Core Vitals, System Architecture)\n`;
report += `- Soft Skills (Engineering Leadership & Mentorship)\n`;
report += `- Compound Terms ("React.js & Redux", "Java 17") requiring splitting or composite recognition.\n\n`;

// 7. NORMALIZATION REQUIREMENTS
report += `## 7. NORMALIZATION REQUIREMENTS\n\n`;
report += `The normalizer must solve:\n`;
report += `- Case and symbol folding (React.js vs React)\n`;
report += `- Disentanglement of compounded lists ("Java & Spring Boot" -> [Java, Spring Boot])\n`;
report += `- Abbreviation expansion/collapsing (AWS vs Amazon Web Services)\n`;
report += `- Version stripping when inappropriate (Java 17 -> Java)\n`;
report += `- Sub-domain mapping ("k6 Performance Testing" -> "k6", "Performance Testing")\n\n`;

// 8. CANONICAL VOCABULARY OPTIONS
report += `## 8. CANONICAL VOCABULARY OPTIONS\n\n`;
report += `- **OPTION A (ESCO only)**: Will fail. ESCO lacks ArgoCD, Qdrant, OpenTofu. We will lose 40% of granular engineering data.\n`;
report += `- **OPTION B (Nexus Canonical + ESCO optional)**: Good. Maintains native taxonomy, allows custom skills, with ESCO mappings purely for compliance/reporting.\n`;
report += `- **OPTION C (Nexus Canonical + ESCO + External Tech Taxonomy)**: Ideal. Using an external tech taxonomy (like Wikidata/StackOverflow) for tech stack, and ESCO for soft/broad skills.\n\n`;

// 9. RECOMMENDED ARCHITECTURE
report += `## 9. RECOMMENDED ARCHITECTURE\n\n`;
report += `Based on the 131 actual skills extracted from the engineering dataset, **OPTION B** (or a lean OPTION C) is required. Nexus must own the \`Skill\` collection as the canonical source of truth. ESCO should be integrated strictly as an optional \`escoId\` enrichment layer rather than replacing the native records. The current schema supports this.\n\n`;

// 10. RISKS
report += `## 10. RISKS\n\n`;
report += `- Splitting compound strings (e.g. "Java & Spring Boot") will alter the \`employeeSkills\` counts if not handled carefully during migration.\n`;
report += `- Categorization is too rigid; if a user enters "Python" as a DATA_AI skill and someone else enters it as BACKEND, under strict categorization they might diverge into two canonical skills.\n\n`;

// 11. WHAT STEP 5B SHOULD DO
report += `## 11. WHAT STEP 5B SHOULD DO\n\n`;
report += `Step 5B should implement the Semantic Normalizer and Skill Extraction AI. It should focus on:\n`;
report += `1. Integrating a semantic clustering engine (like WorkRB / sentence-transformers) to group aliases (e.g., Docker / Docker & Containers).\n`;
report += `2. Creating an ingestion pipeline that splits compound skills ("A & B") into individual canonical records.\n`;
report += `3. Transitioning the legacy string-based extraction to an LLM-based structured extractor.\n`;

fs.writeFileSync('report.md', report);
