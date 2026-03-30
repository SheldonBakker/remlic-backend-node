import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './infrastructure/config/env.config';
import { swaggerSpec, swaggerUiOptions } from './infrastructure/config/swagger.config';
import { errorHandler } from './api/middleware/errorHandler';
import { requestMiddleware } from './api/middleware/logger';
import Logger from './shared/utils/logger';
import routes from './api/routes/index';
import { CronService } from './jobs/cronService.js';
import { registerPsiraUpdateJob } from './jobs/psira/psiraUpdateJob.js';
import { registerReminderJob } from './jobs/reminders/reminderJob.js';
import { registerPushReminderJob } from './jobs/reminders/pushReminderJob.js';
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

app.set('trust proxy', 1);

app.use(cors(corsOptions));

app.use(helmet());

app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use(requestMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.use(`/api/${config.app.apiVersion}`, routes);

app.use(errorHandler);

const { port } = config.app;
app.listen(port, () => {
  Logger.info('Server', `Server running on port ${port}`);
  Logger.info('Server', `API Docs: http://localhost:${port}/api/docs`);
  Logger.info('Server', `Environment: ${config.app.nodeEnv}`);

  registerPsiraUpdateJob();
  registerReminderJob();
  registerPushReminderJob();
  registerSubscriptionExpiryJob();
  Logger.info('Server', 'Background jobs registered');
});

process.on('SIGTERM', () => {
  Logger.info('Server', 'SIGTERM received, stopping background jobs');
  CronService.stopAll();
  process.exit(0);
});

export default app;