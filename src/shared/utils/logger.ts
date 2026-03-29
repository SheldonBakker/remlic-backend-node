import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';
const logDir = path.resolve('logs');
const logFile = path.join(logDir, 'dev.log');

if (isDev) {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  if (existsSync(logFile)) {
    unlinkSync(logFile);
  }
}

const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [
    ...(isDev ? [new winston.transports.File({
      filename: logFile,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        }),
      ),
    })] : []),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

export function latencyBucket(ms: number): string {
  if (ms < 100) {
    return '<100ms';
  }
  if (ms < 300) {
    return '100-300ms';
  }
  if (ms < 1000) {
    return '300ms-1s';
  }
  return '>1s';
}

export function log(
  severity: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  meta: Record<string, unknown> = {},
): void {
  winstonLogger.log(severity, message, meta);
}

class Logger {
  static info(context: string, message: string): void {
    winstonLogger.info(message, { context });
  }

  static warn(context: string, message: string): void {
    winstonLogger.warn(message, { context });
  }

  static error(context: string, message: string, error: unknown = null): void {
    if (error instanceof Error) {
      winstonLogger.error(message, {
        context,
        error: error.message,
        errorName: error.name,
        stack_trace: error.stack,
        ...('code' in error && { errorCode: (error as NodeJS.ErrnoException).code }),
        ...('statusCode' in error && { statusCode: (error as { statusCode: number }).statusCode }),
        ...('isOperational' in error && { isOperational: (error as { isOperational: boolean }).isOperational }),
      });
    } else if (error !== null) {
      winstonLogger.error(message, {
        context,
        error: typeof error === 'string' ? error : JSON.stringify(error),
        ...(typeof error === 'object' ? { errorDetails: error } : {}),
      });
    } else {
      winstonLogger.error(message, { context });
    }
  }
}

export default Logger;
