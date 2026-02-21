import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/env.config';
import Logger from '../../shared/utils/logger';
import * as schema from './schema/index';

const client = postgres(config.database.url, {
  max: config.database.maxConnections,
  idle_timeout: config.database.idleTimeout,
  connect_timeout: config.database.connectTimeout,
  prepare: false,
  onnotice: (n) => Logger.info('PostgreSQL', String(n.message)),
});

const drizzleLogger = {
  logQuery(query: string, params: unknown[]): void {
    Logger.info('Drizzle', `${query} -- params: ${JSON.stringify(params)}`);
  },
};

const db = drizzle(client, {
  schema,
  logger: config.app.nodeEnv !== 'production' ? drizzleLogger : false,
});

export { client };
export default db;
