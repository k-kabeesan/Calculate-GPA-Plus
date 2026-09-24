import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import './env.js';
import type { ProfileFilters } from '../src/domain/model.js';
import { repositoryFromEnv, type ProfileRepository } from './repository.js';
import { checkPasscode, hashPasscode } from './security.js';
import { InputError, validateDraft, validatePasscode } from './validation.js';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ success: false, error: { code, message } });
const param = (req: Request) => String(req.params.id || '').toUpperCase();

export function createApp(repository: ProfileRepository | null = repositoryFromEnv()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin(origin, callback) {
    const allowed = [process.env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean);
    callback(null, !origin || allowed.includes(origin));
  } }));
  app.use(express.json({ limit: '1mb' }));
  app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) =>
    fail(res, error.status === 413 ? 413 : 400, 'INVALID_JSON', error.status === 413 ? 'Request body is too large.' : 'Request body must be valid JSON.'));
  const run = (handler: AsyncHandler) => async (req: Request, res: Response) => {
    try { await handler(req, res); }
    catch (error) {
      if (error instanceof InputError) return fail(res, 400, 'VALIDATION_ERROR', error.message);
      console.error('API request failed:', error);
      return fail(res, 503, 'DATABASE_ERROR', 'Profile storage is temporarily unavailable. Please retry.');
    }
  };
  const store = (res: Response): ProfileRepository | null => {
    if (!repository) fail(res, 503, 'DATABASE_UNAVAILABLE', 'Profile storage is not configured.');
    return repository;
  };
  const authorize = async (repo: ProfileRepository, req: Request, res: Response): Promise<boolean> => {
    const hash = await repo.getHash(param(req));
    if (hash === null) { fail(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found.'); return false; }
    const passcode = String(req.body?.passcode ?? '');
    const adminHash = process.env.ADMIN_PASSCODE_HASH ?? '';
    const isOwner = checkPasscode(passcode, hash);
    const isAdmin = Boolean(adminHash) && checkPasscode(passcode, adminHash);
    if (!isOwner && !isAdmin) { fail(res, 401, 'INVALID_PASSCODE', 'Incorrect owner or administrator passcode.'); return false; }
    return true;
  };
  app.get('/api/health', (_req, res) => ok(res, { status: 'ok', databaseConfigured: Boolean(repository) }));
  app.get('/api/profiles/filters', run(async (_req, res) => { const repo = store(res); if (repo) ok(res, await repo.filters()); }));
  app.get('/api/profiles', run(async (req, res) => {
    const repo = store(res); if (!repo) return;
    const filter = (key: string) => typeof req.query[key] === 'string' ? String(req.query[key]).slice(0, 200) : '';
    const filters: ProfileFilters = { search: filter('search'), university: filter('university'), faculty: filter('faculty'), department: filter('department'), degree: filter('degree'), academicYear: filter('academicYear'), semester: filter('semester'), page: Number(filter('page')) || 1 };
    ok(res, await repo.search(filters));
  }));
  app.get('/api/profiles/:id', run(async (req, res) => {
    const repo = store(res); if (!repo) return;
    const profile = await repo.get(param(req));
    if (!profile) { fail(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found.'); return; }
    ok(res, profile);
  }));
  app.post('/api/profiles', run(async (req, res) => {
    const repo = store(res); if (!repo) return;
    const draft = validateDraft(req.body);
    const passcode = validatePasscode(req.body?.passcode);
    const id = `GPA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await repo.create(id, draft, hashPasscode(passcode));
    ok(res, { id }, 201);
  }));
  app.post('/api/profiles/:id/verify', run(async (req, res) => {
    const repo = store(res); if (repo && await authorize(repo, req, res)) ok(res, { valid: true });
  }));
  app.put('/api/profiles/:id', run(async (req, res) => {
    const repo = store(res); if (!repo) return;
    const draft = validateDraft(req.body);
    if (!await authorize(repo, req, res)) return;
    await repo.update(param(req), draft);
    ok(res, { id: param(req) });
  }));
  app.delete('/api/profiles/:id', run(async (req, res) => {
    const repo = store(res); if (!repo || !await authorize(repo, req, res)) return;
    await repo.remove(param(req));
    ok(res, null);
  }));
  app.use('/api', (_req, res) => fail(res, 404, 'NOT_FOUND', 'API route not found.'));
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*path', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}

export default createApp();
