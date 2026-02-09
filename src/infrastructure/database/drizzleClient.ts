import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/env.config.js';
import { Logger } from '../../shared/utils/logger.js';
import * as schema from './schema/index.js';

const client = postgres(config.database.url, {
  max: config.database.maxConnections,
  idle_timeout: config.database.idleTimeout,
  connect_timeout: config.database.connectTimeout,
  prepare: false,
  onnotice: (n) => Logger.info(String(n.message ?? ''), 'PostgreSQL'),
  debug: config.app.nodeEnv !== 'production',
});

const db = drizzle(client, {
  schema,
  logger: config.app.nodeEnv !== 'production',
});

export { client };
export default db;
