import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import axios from 'axios';
import SkillNormalizationService from '../../src/modules/nexus/services/SkillNormalizationService.js';
import SkillExtractionService from '../../src/modules/nexus/services/SkillExtractionService.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import Organization from '../../src/modules/organization/models/Organization.js';

vi.mock('axios');

let mongoServer;
let orgId;

const SEED_SKILLS = [
  { canonicalName: 'Java', normalizedName: 'java', aliases: ['java 11'] },
  { canonicalName: 'JavaScript', normalizedName: 'javascript', aliases: ['js'] },
  { canonicalName: 'Apache Kafka', normalizedName: 'apache kafka', aliases: ['kafka'] },
  { canonicalName: 'AWS Cloud Services', normalizedName: 'aws cloud services', aliases: ['aws', 'amazon web services'] },
  { canonicalName: 'React.js', normalizedName: 'react.js', aliases: ['react'] },
  { canonicalName: 'React Native', normalizedName: 'react native', aliases: [] },
  { canonicalName: 'Kubernetes', normalizedName: 'kubernetes', aliases: ['k8s'] },
  { canonicalName: 'Kubernetes Hardening', normalizedName: 'kubernetes hardening', aliases: [] },
  { canonicalName: 'Qdrant Vector DB', normalizedName: 'qdrant vector db', aliases: ['qdrant'] },
  { canonicalName: 'OpenTofu IaC', normalizedName: 'opentofu iac', aliases: ['opentofu'] },
  { canonicalName: 'Spring Boot', normalizedName: 'spring boot', aliases: ['spring'] },
  { canonicalName: 'Redux Toolkit', normalizedName: 'redux toolkit', aliases: ['redux'] },
  { canonicalName: 'k6', normalizedName: 'k6', aliases: [] },
  { canonicalName: 'Performance Testing', normalizedName: 'performance testing', aliases: [] },
  { canonicalName: 'System Architecture & Design', normalizedName: 'system architecture & design', aliases: ['system architecture', 'system design'] }
];

describe('End-to-End Skill Extraction -> Normalization Pipeline', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const org = await Organization.create({ name: 'Nexus E2E', domain: 'nexus.com', code: 'NEXUS', status: 'ACTIVE' });
    orgId = org._id;

    for (const s of SEED_SKILLS) {
      await Skill.create({ organizationId: orgId, ...s, category: 'GENERAL' });
    }
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  const testCases = [
    { text: "I have experience with Java.", mockExtraction: ["Java"] },
    { text: "Used java extensively.", mockExtraction: ["java"] },
    { text: "Migrated to Java 17.", mockExtraction: ["Java 17"] },
    { text: "Wrote JavaScript code.", mockExtraction: ["JavaScript"] },
    { text: "Implemented Apache Kafka streams.", mockExtraction: ["Apache Kafka"] },
    { text: "Setup Kafka producers.", mockExtraction: ["Kafka"] },
    { text: "Deployed to AWS.", mockExtraction: ["AWS"] },
    { text: "Managed Amazon Web Services.", mockExtraction: ["Amazon Web Services"] },
    { text: "Built with React.js.", mockExtraction: ["React.js"] },
    { text: "Created an app in React Native.", mockExtraction: ["React Native"] },
    { text: "Orchestrated via Kubernetes.", mockExtraction: ["Kubernetes"] },
    { text: "Performed Kubernetes Hardening.", mockExtraction: ["Kubernetes Hardening"] },
    { text: "Queried Qdrant Vector DB.", mockExtraction: ["Qdrant Vector DB"] },
    { text: "Provisioned using OpenTofu IaC.", mockExtraction: ["OpenTofu IaC"] },
    { text: "Java & Spring Boot microservices.", mockExtraction: ["Java", "Spring Boot"] }, // Assuming GLiNER can split
    { text: "React.js & Redux state.", mockExtraction: ["React.js", "Redux"] },
    { text: "Load tested with k6 Performance Testing.", mockExtraction: ["k6", "Performance Testing"] }, // Ideal case output
    { text: "Drafted System Architecture & Design.", mockExtraction: ["System Architecture & Design"] }
  ];

  it('runs the E2E pipeline correctly', async () => {
    const results = [];

    for (const tc of testCases) {
      // Mock the python service response
      axios.post.mockResolvedValueOnce({
        data: {
          skills: tc.mockExtraction.map(m => ({ text: m, confidence: 0.99, start: 0, end: 1, label: 'Technology' }))
        }
      });

      // 1. Extraction
      const extracted = await SkillExtractionService.extractSkills(tc.text);
      
      // 2. Normalization
      const normalizedMentions = [];
      for (const ex of extracted) {
        const norm = await SkillNormalizationService.normalizeSkill(ex.text, orgId);
        normalizedMentions.push({
          mention: ex.text,
          canonicalSkill: norm.canonicalName,
          matchType: norm.matchType,
          confidence: norm.confidence
        });
      }

      results.push({
        rawInput: tc.text,
        normalizedMentions
      });
    }

    // Print out the output as requested by the prompt
    console.log(JSON.stringify(results, null, 2));

    // Basic assertions
    const javaResult = results.find(r => r.rawInput.includes('Java.'));
    expect(javaResult.normalizedMentions[0].canonicalSkill).toBe('Java');

    const k8sHardeningResult = results.find(r => r.rawInput.includes('Hardening'));
    expect(k8sHardeningResult.normalizedMentions[0].canonicalSkill).toBe('Kubernetes Hardening');

  });
});
