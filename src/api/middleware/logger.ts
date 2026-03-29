import { randomUUID } from 'crypto';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../shared/types/request';
import { log, latencyBucket } from '../../shared/utils/logger';

const SKIP_PATHS = ['/health', '/api/docs'];

export function requestMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const incomingId = req.header('x-request-id');
  const requestId = incomingId ?? randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  if (SKIP_PATHS.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    log('info', 'http_request', {
      requestId: req.requestId,
      route: req.route?.path ?? req.path,
      latencyBucket: latencyBucket(durationMs),
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: res.statusCode,
        latency: {
          seconds: Math.floor(durationMs / 1000),
          nanos: Math.round((durationMs % 1000) * 1e6),
        },
        responseSize: res.get('content-length') ?? 0,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip,
      },
    });
  });

  next();
}
