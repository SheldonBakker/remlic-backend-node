import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import morgan, { type StreamOptions } from 'morgan';
import { config } from './infrastructure/config/env.config.js';
import { swaggerSpec, swaggerUiOptions } from './infrastructure/config/swagger.config.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import routes from './api/routes/index.js';
import { CronService } from './jobs/cronService.js';
import { registerPsiraUpdateJob } from './jobs/psira/psiraUpdateJob.js';
import { registerReminderJob } from './jobs/reminders/reminderJob.js';
import { registerSubscriptionExpiryJob } from './jobs/subscriptions/subscriptionExpiryJob.js';

const app = express();

const getCorsOrigins = (): string[] => {
  const isProduction = config.app.nodeEnv === 'production';
  const origins = process.env.CORS_ORIGINS;

  if (origins) {
    const parsedOrigins = origins.split(',').map((origin) => origin.trim());
    if (isProduction) {
      return parsedOrigins.filter(
        (origin) => !origin.includes('localhost') && !origin.includes('127.0.0.1'),
      );
    }
    return parsedOrigins;
  }

  if (isProduction) {
    return [
      'https://vite-frontend-remlic.vercel.app',
      'https://firearmstudio.com',
      'https://www.firearmstudio.com',
    ];
  }

  return ['http://localhost:5173', 'http://localhost:3000'];
};

const corsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

morgan.token('user-id', (req) => {
  const authReq = req as { user?: { id: string } };
  return authReq.user?.id ?? 'anonymous';
});

morgan.token('remote-addr-safe', (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.socket.remoteAddress ?? 'unknown';
});

morgan.token('url-safe', (req) => {
  const { url } = req;
  const sensitiveParams = ['token', 'key', 'secret', 'password', 'reset'];
  try {
    const baseUrl = `http://${String(req.headers.host ?? 'localhost')}`;
    const urlObj = new URL(url ?? '/', baseUrl);
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.pathname + urlObj.search;
  } catch {
    return url ?? '/';
  }
});

const morganStream: StreamOptions = {
  write: (): void => {
  },
};

const morganFormat = config.app.nodeEnv === 'development'
  ? 'dev'
  : JSON.stringify({
    timestamp: ':date[iso]',
    method: ':method',
    url: ':url-safe',
    status: ':status',
    responseTime: ':response-time',
    contentLength: ':res[content-length]',
    userId: ':user-id',
    remoteAddr: ':remote-addr-safe',
    userAgent: ':user-agent',
  });

app.use(cors(corsOptions));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan(morganFormat, {
    skip: (req) => config.app.nodeEnv === 'production' && req.path.startsWith('/api/v1/health'),
    stream: morganStream,
  }),
);

app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.use(`/api/${config.app.apiVersion}`, routes);

app.use(errorHandler);

const { port } = config.app;
app.listen(port, () => {
  registerPsiraUpdateJob();
  registerReminderJob();
  registerSubscriptionExpiryJob();
});

process.on('SIGTERM', () => {
  CronService.stopAll();
  process.exit(0);
});

export default app;
