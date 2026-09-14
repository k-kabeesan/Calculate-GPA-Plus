import app from '../server/app';

export default function handler(req: any, res: any) {
  if (!req.url || req.url === '') {
    req.url = '/api';
  }
  return app(req, res);
}
