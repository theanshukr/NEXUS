import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SkillNormalizationService from '../../src/modules/nexus/services/SkillNormalizationService.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import Organization from '../../src/modules/organization/models/Organization.js';

let mongoServer;
let orgA_id;
let orgB_id;

const MOCK_SKILLS_A = [
  { canonicalName: 'Java', normalizedName: 'java', aliases: ['java 17', 'java 11'] },
  { canonicalName: 'JavaScript', normalizedName: 'javascript', aliases: ['js', 'ecmascript'] },
  { canonicalName: 'Apache Kafka', normalizedName: 'apache kafka', aliases: ['kafka'] },
  { canonicalName: 'AWS Cloud Services', normalizedName: 'aws cloud services', aliases: ['aws', 'amazon web services'] },
  { canonicalName: 'React.js', normalizedName: 'react.js', aliases: ['react', 'reactjs'] },
  { canonicalName: 'React Native', normalizedName: 'react native', aliases: [] },
  { canonicalName: 'Kubernetes', normalizedName: 'kubernetes', aliases: ['k8s'] },
  { canonicalName: 'Kubernetes Hardening', normalizedName: 'kubernetes hardening', aliases: [] },
  { canonicalName: 'Qdrant Vector DB', normalizedName: 'qdrant vector db', aliases: ['qdrant'] },
  { canonicalName: 'System Architecture & Design', normalizedName: 'system architecture & design', aliases: ['system design'] }
];

describe('SkillNormalizationService - Phase 3', () => {
  // Set lower threshold for tests to avoid spurious failures with bge-small
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const orgA = await Organization.create({ name: 'Org A', domain: 'orga.com', code: 'ORGA', status: 'ACTIVE' });
    const orgB = await Organization.create({ name: 'Org B', domain: 'orgb.com', code: 'ORGB', status: 'ACTIVE' });
    orgA_id = orgA._id;
    orgB_id = orgB._id;

    for (const s of MOCK_SKILLS_A) {
      await Skill.create({
        organizationId: orgA_id,
        ...s,
        category: 'GENERAL'
      });
    }

    // Org B gets a totally different skill to test isolation
    await Skill.create({
      organizationId: orgB_id,
      canonicalName: 'OpenTofu IaC',
      normalizedName: 'opentofu iac',
      category: 'CLOUD_DEVOPS'
    });

  }, 60000); // 60s timeout for model download

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Exact Match', () => {
    it('normalizes exactly matching string', async () => {
      const res = await SkillNormalizationService.normalizeSkill('Java', orgA_id);
      expect(res.matchType).toBe('EXACT');
      expect(res.canonicalName).toBe('Java');
      expect(res.confidence).toBe(1.0);
    });

    it('is case-insensitive for exact matches', async () => {
      const res = await SkillNormalizationService.normalizeSkill('javaScript', orgA_id);
      expect(res.matchType).toBe('EXACT');
      expect(res.canonicalName).toBe('JavaScript');
    });
  });

  describe('2. Alias Match', () => {
    it('normalizes using known aliases', async () => {
      const res = await SkillNormalizationService.normalizeSkill('Amazon Web Services', orgA_id);
      expect(res.matchType).toBe('ALIAS');
      expect(res.canonicalName).toBe('AWS Cloud Services');
    });
  });

  describe('3. Embedding Similarity (Semantic Match)', () => {
    it('matches semantically related terms', async () => {
      const res = await SkillNormalizationService.normalizeSkill('System Architecture', orgA_id);
      // Depending on the threshold, it should be SEMANTIC_STRONG or AMBIGUOUS
      expect(['SEMANTIC_STRONG', 'SEMANTIC_AMBIGUOUS']).toContain(res.matchType);
      expect(res.canonicalName).toBe('System Architecture & Design');
    });
  });

  describe('4. False Merge Protection', () => {
    it('does not merge Java and JavaScript', async () => {
      // By exact match 'java' matches Java. But what if we try something close?
      // Since 'javascript' is exact matched, let's force an embedding check by bypassing exact match.
      // We can't easily bypass exact, but we know exact works.
      // Let's try 'JavaScript Framework'
      const res = await SkillNormalizationService.normalizeSkill('JavaScript Framework', orgA_id);
      // It should NOT match 'Java' as the top candidate with high confidence.
      expect(res.canonicalName).not.toBe('Java');
    });

    it('does not merge React.js and React Native', async () => {
      // Both exist in DB. Exact will match them.
      // Let's try 'React Native UI'
      const res = await SkillNormalizationService.normalizeSkill('React Native UI', orgA_id);
      expect(res.canonicalName).not.toBe('React.js'); 
    });
  });

  describe('5. Unknown Skills', () => {
    it('returns UNKNOWN for completely new technologies', async () => {
      const res = await SkillNormalizationService.normalizeSkill('Unicorn Magic Framework', orgA_id);
      expect(res.matchType).toBe('UNKNOWN');
      expect(res.canonicalName).toBeNull();
      expect(res.suggestedName).toBe('Unicorn Magic Framework');
    });
  });

  describe('6. Multi-Tenancy Isolation', () => {
    it('cannot normalize Org B skills in Org A', async () => {
      // 'OpenTofu IaC' is in Org B.
      const resInA = await SkillNormalizationService.normalizeSkill('OpenTofu IaC', orgA_id);
      expect(resInA.matchType).toBe('UNKNOWN'); // A doesn't know it

      const resInB = await SkillNormalizationService.normalizeSkill('OpenTofu IaC', orgB_id);
      expect(resInB.matchType).toBe('EXACT'); // B knows it
      expect(resInB.canonicalName).toBe('OpenTofu IaC');
    });

    it('cannot normalize Org A skills in Org B', async () => {
      const resInB = await SkillNormalizationService.normalizeSkill('Java', orgB_id);
      expect(resInB.matchType).toBe('UNKNOWN'); 
    });
  });
});
