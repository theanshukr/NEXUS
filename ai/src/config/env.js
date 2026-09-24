import { cleanEnv, str, port, num, bool, url } from 'envalid';

/**
 * Validates and exports all environment variables required by the AI Platform.
 * Throws a fatal error at startup if any required variable is missing or malformed.
 * Never access process.env directly in application files — always import this module.
 */
const isTest = process.env.NODE_ENV === 'test';

const env = cleanEnv(process.env, {
  // ── Server ─────────────────────────────────────────────────────────────────
  NODE_ENV:   str({ choices: ['development', 'test', 'production'], default: 'development' }),
  AI_PORT:    port({ default: 8001, desc: 'Port the AI platform service listens on' }),
  AI_HOST:    str({ default: '0.0.0.0' }),

  // ── Backend integration ────────────────────────────────────────────────────
  BACKEND_API_URL: url({ desc: 'Base URL of the NexusOps backend REST API', default: isTest ? 'http://localhost:5000' : undefined, example: 'http://localhost:5000' }),
  JWT_ACCESS_SECRET: str({ desc: 'Shared JWT secret — must match backend JWT_ACCESS_SECRET for token forwarding', default: isTest ? 'test-secret-key-123' : undefined }),

  // ── MongoDB (AI-owned collections: ai_audit_logs, ai_usage, document_chunks)
  MONGODB_URI: str({ desc: 'MongoDB Atlas connection string (may be same cluster as backend)', default: isTest ? 'mongodb://localhost:27017/nexusops_ai' : undefined }),
  MONGODB_DB_NAME: str({ default: 'nexusops_ai', desc: 'Separate DB name for AI-owned collections' }),

  // ── Upstash Redis (conversation memory & caching) ─────────────────────────
  UPSTASH_REDIS_REST_URL: url({ desc: 'Upstash Redis REST endpoint URL', default: isTest ? 'https://localhost:8079' : undefined }),
  UPSTASH_REDIS_REST_TOKEN: str({ desc: 'Upstash Redis REST auth token', default: isTest ? 'mock-token' : undefined }),

  // ── LLM Providers ─────────────────────────────────────────────────────────
  GEMINI_API_KEY:      str({ default: '', desc: 'Google Gemini API key' }),
  GROQ_API_KEY:        str({ default: '', desc: 'Groq API key' }),
  OPENROUTER_API_KEY:  str({ default: '', desc: 'OpenRouter API key' }),

  // ── Provider routing ───────────────────────────────────────────────────────
  AI_DEFAULT_PROVIDER:  str({ choices: ['gemini', 'groq', 'openrouter'], default: 'gemini' }),
  AI_FALLBACK_PROVIDER: str({ choices: ['gemini', 'groq', 'openrouter'], default: 'openrouter' }),
  AI_GEMINI_MODEL:      str({ default: 'gemini-1.5-pro' }),
  AI_GROQ_MODEL:        str({ default: 'llama-3.3-70b-versatile' }),
  AI_OPENROUTER_MODEL:  str({ default: 'anthropic/claude-3.5-sonnet' }),

  // ── Token cost tracking (USD per 1M tokens) ────────────────────────────────
  GEMINI_INPUT_COST_PER_1M:     num({ default: 3.50 }),
  GEMINI_OUTPUT_COST_PER_1M:    num({ default: 10.50 }),
  GROQ_INPUT_COST_PER_1M:       num({ default: 0.59 }),
  GROQ_OUTPUT_COST_PER_1M:      num({ default: 0.79 }),
  OPENROUTER_INPUT_COST_PER_1M: num({ default: 3.00 }),
  OPENROUTER_OUTPUT_COST_PER_1M:num({ default: 15.00 }),

  // ── Conversation memory ────────────────────────────────────────────────────
  AI_CONVERSATION_MAX_TURNS:  num({ default: 10, desc: 'Max turns kept in active Redis window' }),
  AI_CONTEXT_SUMMARY_TURNS:   num({ default: 5,  desc: 'How many turns to condense on overflow' }),
  AI_CONVERSATION_TTL_HOURS:  num({ default: 24, desc: 'Redis TTL for conversation keys (hours)' }),

  // ── Rate limiting ──────────────────────────────────────────────────────────
  AI_RATE_LIMIT_REQUESTS: num({ default: 20, desc: 'Max AI chat requests per 15 minutes per user' }),
  AI_RATE_LIMIT_WINDOW_MS: num({ default: 15 * 60 * 1000, desc: 'Rate limit window in ms' }),

  // ── RAG pipeline ──────────────────────────────────────────────────────────
  RAG_CHUNK_SIZE:        num({ default: 500,  desc: 'Target token size per document chunk' }),
  RAG_CHUNK_OVERLAP:     num({ default: 50,   desc: 'Overlap tokens between adjacent chunks' }),
  RAG_VECTOR_DIMENSIONS: num({ default: 768, desc: 'Embedding vector dimensions' }),
  RAG_TOP_K:             num({ default: 5,    desc: 'Number of nearest neighbours to retrieve' }),
  MONGODB_VECTOR_INDEX:  str({ default: 'nexusops_vector_index', desc: 'Atlas Vector Search index name' }),

  // ── Feature flags ─────────────────────────────────────────────────────────
  AI_ENABLED:         bool({ default: true }),
  AI_TOOLS_ENABLED:   bool({ default: true }),
  AI_RAG_ENABLED:     bool({ default: true }),
  AI_SAFETY_ENABLED:  bool({ default: true }),
});

export default env;
