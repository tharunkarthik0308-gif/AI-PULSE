import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { initSocket } from './services/socketService.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server, ENV.FRONTEND_URL);

// Middleware
app.use(
  cors({
    origin: [ENV.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists
const uploadDir = path.resolve(ENV.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded medical reports/scans
app.use('/uploads', express.static(uploadDir));

// System Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'AI-Pulse Clinical Backend',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    disclaimer:
      'AI-Pulse contactless screening is an AI-assisted investigational tool designed for general wellness and preliminary screening. It does not provide medical diagnoses or replace consultation with a qualified medical professional.',
  });
});

// Mount modular API
app.use('/api', apiRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal clinical server error',
    ...(ENV.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

server.listen(ENV.PORT, () => {
  console.log(`[AI-Pulse Backend] Running securely on port ${ENV.PORT}`);
  console.log(`[AI-Pulse Environment] ${ENV.NODE_ENV}`);
});

export default app;
