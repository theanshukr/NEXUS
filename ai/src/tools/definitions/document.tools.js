import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';
import SearchService from '#ai/search/SearchService.js';

/**
 * Document Management & RAG Tools — M-12
 * These tools combine backend API calls with the AI Platform's vector search engine.
 */

export const searchOrganizationDocuments = {
  name: 'searchOrganizationDocuments',
  description: 'Performs semantic vector search across all uploaded organization documents (HR handbooks, policies, SOPs, contracts). Returns the most relevant text excerpts with source citations.',
  requiredPermissions: ['document.read'],
  inputSchema: z.object({
    query:   z.string().min(5).describe('Natural language search query'),
    topK:    z.number().int().min(1).max(10).default(5).describe('Number of results to return'),
    category:z.string().optional().describe('Filter by document category (HR, IT, FINANCE, LEGAL)'),
  }),
  async execute(args, ctx) {
    // This calls the AI Platform's own RAG search — no backend API call needed here
    const results = await SearchService.semanticQuery(args.query, ctx.organizationId, {
      topK: args.topK,
      category: args.category,
    });
    return { results, query: args.query, count: results.length };
  },
};

export const getPolicyAnswer = {
  name: 'getPolicyAnswer',
  description: 'Answer a specific natural language question about company policies using the RAG knowledge base. Returns a direct answer with supporting document citations.',
  requiredPermissions: ['document.read'],
  inputSchema: z.object({
    question: z.string().min(10).describe('The specific policy question to answer'),
  }),
  async execute(args, ctx) {
    // Returns structured context for the Orchestrator to inject into the LLM for grounded answering
    const chunks = await SearchService.semanticQuery(args.question, ctx.organizationId, { topK: 5 });
    return {
      question: args.question,
      relevantChunks: chunks,
      instruction: 'Use the relevantChunks to formulate a precise, cited answer. Always include the document title and section if available.',
    };
  },
};

export const listDocumentsByCategory = {
  name: 'listDocumentsByCategory',
  description: 'Lists all uploaded documents in a specified category such as HR, Finance, IT Policy, or Legal.',
  requiredPermissions: ['document.read'],
  inputSchema: z.object({
    category: z.enum(['HR', 'FINANCE', 'IT', 'LEGAL', 'OPERATIONS', 'ALL']).default('ALL'),
    page:  z.number().default(1),
    limit: z.number().default(20),
  }),
  async execute(args, ctx) {
    throw new Error('Action unavailable: The backend API does not currently support listing documents directly. Document uploads are handled contextually within other modules (e.g. resumes within recruitment applications).');
  },
};

export const documentTools = [searchOrganizationDocuments, getPolicyAnswer, listDocumentsByCategory];
export default documentTools;
