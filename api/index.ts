import app from '../server/app.js';
import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  const originalUrl = new URL(req.url || '/api', 'http://localhost');
  const rewrittenPath = originalUrl.searchParams.get('__path');
  if (rewrittenPath) {
    originalUrl.searchParams.delete('__path');
    const query = originalUrl.searchParams.toString();
    req.url = `/api/${rewrittenPath}${query ? `?${query}` : ''}`;
  }
  if (!req.url || req.url === '') {
    req.url = '/api';
  }
  return app(req, res);
}
