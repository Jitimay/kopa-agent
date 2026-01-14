import express, { Express, Request, Response, NextFunction } from 'express';
import { createRouter } from './routes';
import { CoordinatorAgent } from '../agents/CoordinatorAgent';
import { logger } from '../utils/logger';

export function createServer(coordinatorAgent: CoordinatorAgent): Express {
  const app = express();

  // Middleware
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query
    });
    next();
  });

  // API routes
  app.use('/api/v1', createRouter(coordinatorAgent));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date()
      }
    });
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      method: req.method,
      path: req.path
    }, err);

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date()
      }
    });
  });

  return app;
}
