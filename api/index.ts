import app from '../server/app.js';
import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  if (!req.url || req.url === '') {
    req.url = '/api';
  }
  return app(req, res);
}
