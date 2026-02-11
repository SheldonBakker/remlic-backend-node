import type { Request, Response, NextFunction } from 'express';
import { log } from '../../shared/utils/logging/logger.js';
import { config } from '../../infrastructure/config/env.config.js';

const SENSITIVE_PARAMS = ['token', 'key', 'secret', 'password', 'reset'];

function sanitizeUrl(req: Request): string {
  const { url } = req;
  try {
    const baseUrl = `http://${String(req.headers.host ?? 'localhost')}`;
    const urlObj = new URL(url, baseUrl);
    for (const param of SENSITIVE_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    }
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isProduction = config.app.nodeEnv === 'production';
  if (isProduction && req.path.startsWith('/api/v1/health')) {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const { user } = req as Request & { user?: { id?: string } };

    log('info', 'HTTP request', {
      method: req.method,
      url: sanitizeUrl(req),
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.getHeader('content-length') ?? 0,
      userId: user?.id ?? 'anonymous',
      remoteAddr: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}
