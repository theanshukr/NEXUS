import Skill from '../models/Skill.js';
import { pipeline, env } from '@huggingface/transformers';

// Suppress some warnings for node
env.localModelPath = './models';
env.allowRemoteModels = true;

// Configure embedding model via env or fallback to bge-small-en-v1.5
const EMBEDDING_MODEL = process.env.SKILL_EMBEDDING_MODEL || 'Xenova/bge-small-en-v1.5';

class SkillNormalizationService {
  constructor() {
    this.extractor = null;
    this.cache = new Map(); // orgId -> { exact: Map, aliases: Map, embeddings: [{id, vector, canonicalName}], initialized: boolean }
    this.HIGH_THRESHOLD = parseFloat(process.env.SKILL_MATCH_HIGH_THRESHOLD || '0.92');
    this.MEDIUM_THRESHOLD = parseFloat(process.env.SKILL_MATCH_MEDIUM_THRESHOLD || '0.85');
    this.blocklist = this.initializeBlocklist();
  }

  // Prevents false merges
  initializeBlocklist() {
    return [
      new Set(['java', 'javascript', 'typescript']),
      new Set(['react.js', 'react native', 'react hooks']),
      new Set(['kubernetes', 'kubernetes hardening', 'kubernetes security', 'k8s']),
      new Set(['postgresql', 'mysql', 'sql', 'nosql', 'mongodb', 'cockroachdb']),
      new Set(['c', 'c++', 'c#'])
    ];
  }

  async _getExtractor() {
    if (!this.extractor) {
      // Lazy load model
      this.extractor = await pipeline('feature-extraction', EMBEDDING_MODEL);
    }
    return this.extractor;
  }

  async _getEmbedding(text) {
    const extractor = await this._getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async _loadTenantCache(organizationId) {
    const orgStr = organizationId.toString();
    if (this.cache.has(orgStr) && this.cache.get(orgStr).initialized) {
      return this.cache.get(orgStr);
    }

    const cacheData = {
      exact: new Map(),
      aliases: new Map(),
      embeddings: [],
      initialized: true
    };

    const skills = await Skill.find({ organizationId }).lean();
    
    // Batch embeddings to improve startup time
    const extractor = await this._getExtractor();

    for (const skill of skills) {
      const canonical = skill.canonicalName;
      cacheData.exact.set(skill.normalizedName, skill);
      
      for (const alias of skill.aliases || []) {
        cacheData.aliases.set(alias.toLowerCase(), skill);
      }

      // Compute embedding for the canonical name
      const embedOutput = await extractor(canonical, { pooling: 'mean', normalize: true });
      cacheData.embeddings.push({
        skillId: skill._id.toString(),
        canonicalName: canonical,
        normalizedName: skill.normalizedName,
        vector: Array.from(embedOutput.data)
      });
    }

    this.cache.set(orgStr, cacheData);
    return cacheData;
  }

  async refreshCache(organizationId) {
    this.cache.delete(organizationId.toString());
    await this._loadTenantCache(organizationId);
  }

  _checkBlocklistConflict(mentionNorm, candidateNorm) {
    // Check strict inclusion in blocklist groups
    for (const group of this.blocklist) {
      let mIn = false;
      let cIn = false;
      for (const item of group) {
        if (mentionNorm === item || mentionNorm.includes(item)) mIn = true;
        if (candidateNorm === item || candidateNorm.includes(item)) cIn = true;
      }
      if (mIn && cIn && mentionNorm !== candidateNorm) {
        // Only return true (conflict) if they are explicitly different core terms in the blocklist
        // To be safer, just exact check the blocklist
        if (group.has(mentionNorm) && group.has(candidateNorm)) {
          return true;
        }
      }
    }

    // Additional hardcoded safeguards for common tricky merges
    if ((mentionNorm === 'java' && candidateNorm.includes('javascript')) || 
        (mentionNorm.includes('javascript') && candidateNorm === 'java')) {
      return true;
    }
    
    if ((mentionNorm.includes('react native') && candidateNorm === 'react.js') || 
        (mentionNorm === 'react.js' && candidateNorm.includes('react native'))) {
      return true;
    }
    
    if ((mentionNorm === 'mac' && candidateNorm === 'machine learning') ||
        (mentionNorm === 'machine learning' && candidateNorm === 'mac')) {
        return true;
    }

    return false;
  }

  async normalizeSkill(mentionText, organizationId) {
    if (!mentionText || !organizationId) {
      throw new Error('mentionText and organizationId are required');
    }

    const orgCache = await this._loadTenantCache(organizationId);
    const normalizedMention = mentionText.trim().toLowerCase();

    // LEVEL 1: EXACT MATCH
    if (orgCache.exact.has(normalizedMention)) {
      const match = orgCache.exact.get(normalizedMention);
      return {
        skillId: match._id.toString(),
        canonicalName: match.canonicalName,
        matchType: 'EXACT',
        confidence: 1.0
      };
    }

    // LEVEL 2: ALIAS MATCH
    if (orgCache.aliases.has(normalizedMention)) {
      const match = orgCache.aliases.get(normalizedMention);
      return {
        skillId: match._id.toString(),
        canonicalName: match.canonicalName,
        matchType: 'ALIAS',
        confidence: 0.98
      };
    }

    // LEVEL 3: EMBEDDING SIMILARITY
    const mentionVector = await this._getEmbedding(mentionText.trim());
    
    let bestCandidate = null;
    let highestScore = -1;

    for (const cachedSkill of orgCache.embeddings) {
      // Protect against false merges
      if (this._checkBlocklistConflict(normalizedMention, cachedSkill.normalizedName)) {
        continue;
      }

      // dot product works as cosine similarity because vectors are normalized
      let score = 0;
      for (let i = 0; i < mentionVector.length; i++) {
        score += mentionVector[i] * cachedSkill.vector[i];
      }

      if (score > highestScore) {
        highestScore = score;
        bestCandidate = cachedSkill;
      }
    }

    if (bestCandidate) {
      if (highestScore >= this.HIGH_THRESHOLD) {
        return {
          skillId: bestCandidate.skillId,
          canonicalName: bestCandidate.canonicalName,
          matchType: 'SEMANTIC_STRONG',
          confidence: highestScore
        };
      }
      
      if (highestScore >= this.MEDIUM_THRESHOLD) {
        return {
          skillId: bestCandidate.skillId,
          canonicalName: bestCandidate.canonicalName,
          matchType: 'SEMANTIC_AMBIGUOUS',
          confidence: highestScore
        };
      }
    }

    // UNKNOWN / NEW SKILL CANDIDATE
    return {
      skillId: null,
      canonicalName: null,
      suggestedName: mentionText.trim(),
      matchType: 'UNKNOWN',
      confidence: highestScore > 0 ? highestScore : 0
    };
  }
}

export default new SkillNormalizationService();
