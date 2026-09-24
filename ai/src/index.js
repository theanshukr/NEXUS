/**
 * NexusOps AI Platform — Entry Point
 *
 * Boot sequence:
 *   1. Validate environment variables
 *   2. Connect MongoDB (AI-owned collections)
 *   3. Connect Upstash Redis (conversation memory)
 *   4. Register all AI tool definitions
 *   5. Attach event listeners
 *   6. Initialize provider router
 *   7. Start Express HTTP server
 */
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';

import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';
import { connectDB } from '#ai/platform/db.js';
import { connectCache } from '#ai/platform/cache.js';
import ProviderRouter from '#ai/providers/ProviderRouter.js';
import ToolManager from '#ai/tools/ToolManager.js';

import authTools from '#ai/tools/definitions/auth.tools.js';
import organizationTools from '#ai/tools/definitions/organization.tools.js';
import departmentTools from '#ai/tools/definitions/department.tools.js';
import employeeTools from '#ai/tools/definitions/employee.tools.js';
import roleTools from '#ai/tools/definitions/role.tools.js';
import delegationTools from '#ai/tools/definitions/delegation.tools.js';
import invitationTools from '#ai/tools/definitions/invitation.tools.js';
import designationTools from '#ai/tools/definitions/designation.tools.js';
import locationTools from '#ai/tools/definitions/location.tools.js';
import shiftTools from '#ai/tools/definitions/shift.tools.js';
import holidayTools from '#ai/tools/definitions/holiday.tools.js';
import recruitmentTools from '#ai/tools/definitions/recruitment.tools.js';
import attendanceTools from '#ai/tools/definitions/attendance.tools.js';
import leaveTools from '#ai/tools/definitions/leave.tools.js';
import payrollTools from '#ai/tools/definitions/payroll.tools.js';
import performanceTools from '#ai/tools/definitions/performance.tools.js';
import projectTools from '#ai/tools/definitions/project.tools.js';
import assetTools from '#ai/tools/definitions/asset.tools.js';
import helpdeskTools from '#ai/tools/definitions/helpdesk.tools.js';
import documentTools from '#ai/tools/definitions/document.tools.js';
import reportsTools from '#ai/tools/definitions/reports.tools.js';

// ── Event listeners (fire-and-forget async handlers) ────────────────────────
import '#ai/events/listeners/auditListener.js';
import '#ai/events/listeners/ragListener.js';
import '#ai/events/listeners/contextListener.js';

// ── API routes ───────────────────────────────────────────────────────────────
import aiRoutes from '#ai/api/routes/ai.routes.js';
import mcpRoutes from '#ai/api/routes/mcp.routes.js';

// ── Express application ───────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*', // Restrict to frontend origin in production
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Name', 'X-Correlation-ID'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// ── API routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/ai',  aiRoutes);
app.use('/api/v1/mcp', mcpRoutes);

// ── Health check endpoints ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexusops-ai-platform',
    version: '1.0.0',
    uptime: process.uptime(),
    tools: ToolManager.toolCount,
    providers: ProviderRouter.registeredProviders,
  });
});

app.get('/health/deep', async (_req, res) => {
  const checks = {
    database: 'unknown',
    cache: 'unknown',
    providers: ProviderRouter.registeredProviders,
    tools: ToolManager.toolCount,
  };
  res.json({ status: 'ok', checks });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error({ err }, '[AI Platform] Unhandled error');
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.errorCode || 'ERR_INTERNAL',
    message: err.isOperational ? err.message : 'Internal server error',
  });
});

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap() {
  logger.info('🚀 NexusOps AI Platform starting...');

  // 1. Connect infrastructure
  await connectDB();
  await connectCache();

  // 2. Initialize LLM provider router
  ProviderRouter.initialize();

  ToolManager.registerMany([
    ...authTools,
    ...organizationTools,
    ...departmentTools,
    ...employeeTools,
    ...roleTools,
    ...delegationTools,
    ...invitationTools,
    ...designationTools,
    ...locationTools,
    ...shiftTools,
    ...holidayTools,
    ...recruitmentTools,
    ...attendanceTools,
    ...leaveTools,
    ...payrollTools,
    ...performanceTools,
    ...projectTools,
    ...assetTools,
    ...helpdeskTools,
    ...documentTools,
    ...reportsTools,
  ]);

  logger.info({ totalTools: ToolManager.toolCount }, '✅ AI tools registered');

  // 4. Start HTTP server
  const server = app.listen(env.AI_PORT, env.AI_HOST, () => {
    logger.info(`✅ NexusOps AI Platform running on http://${env.AI_HOST}:${env.AI_PORT}`);
    logger.info(`   → Chat endpoint:  POST /api/v1/ai/chat`);
    logger.info(`   → MCP tools:      GET  /api/v1/mcp/tools`);
    logger.info(`   → Health check:   GET  /health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('[AI Platform] SIGTERM received — graceful shutdown');
    server.close(() => {
      logger.info('[AI Platform] HTTP server closed');
      process.exit(0);
    });
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '[AI Platform] Uncaught exception — shutting down');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, '[AI Platform] Unhandled promise rejection — shutting down');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, '[AI Platform] Bootstrap failed');
  process.exit(1);
});
