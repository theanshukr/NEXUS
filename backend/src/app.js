import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from '#@/config/env.js';
import apiRoutes from '#@/api/v1/routes/index.js';
import errorHandler from '#@/core/middleware/errorHandler.js';
import { NotFoundError } from '#@/core/errors/AppError.js';
import '#@/core/bootstrap/OrganizationBootstrapRegistry.js';
import '#@/modules/departments/services/DepartmentBootstrapService.js';

// Initialize Express application instance
const app = express();

// Security and Infrastructure Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow localhost, vercel deployments, or configured CLIENT_URL
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app') ||
      origin === env.CLIENT_URL ||
      (env.CLIENT_URL && env.CLIENT_URL.split(',').map(u => u.trim()).includes(origin))
    ) {
      return callback(null, true);
    }
    
    // In production, also allow the origin if needed
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount API v1 Modular Routes following Routes -> Controllers -> Services -> Repositories -> Models architecture
app.use('/api/v1', apiRoutes);

// Catch 404 for unmatched routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
});

// Global Structured Error Handler
app.use(errorHandler);

export default app;
