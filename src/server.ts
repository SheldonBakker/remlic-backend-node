import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './infrastructure/config/env.config.js';
import { swaggerSpec, swaggerUiOptions } from './infrastructure/config/swagger.config.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { httpLoggerMiddleware } from './api/middleware/loggerMiddleware.js';
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
      'https://remlic.co.za',
      'https://www.remlic.co.za',
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

app.use(httpLoggerMiddleware);

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
