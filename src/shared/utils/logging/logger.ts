import type { Request } from 'express';
import winston from 'winston';
import { createCloudTransport, getTraceMeta as gcpTraceMeta } from './gcpProvider.js';

export interface CloudLoggingProvider {
  createTransport(): winston.transport | null;
  getTraceMeta(req: Request): Record<string, string>;
}

const LOG_LEVEL = {
  production: 'info',
  development: 'debug',
} as const;

let _logger: winston.Logger | null = null;
let _provider: CloudLoggingProvider | null = null;

export function setLoggingProvider(provider: CloudLoggingProvider): void {
  _provider = provider;
  _logger = null;
}

export function resetLogger(): void {
  _logger = null;
}

function getProvider(): CloudLoggingProvider {
  _provider ??= { createTransport: createCloudTransport, getTraceMeta: gcpTraceMeta };
  return _provider;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getLogger(): winston.Logger {
  if (!_logger) {
    const cloudTransport = getProvider().createTransport();

    const transports: winston.transport[] = [];

    if (isProduction()) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.json(),
        }),
      );
      if (cloudTransport) {
        transports.push(cloudTransport);
      }
    } else {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? `\n${JSON.stringify(meta, null, 2)}`
                : '';
              return `${timestamp} ${level}: ${message}${metaStr}`;
            }),
          ),
        }),
      );
    }

    _logger = winston.createLogger({
      level: isProduction() ? LOG_LEVEL.production : LOG_LEVEL.development,
      exitOnError: false,
      transports,
    });
  }
  return _logger;
}

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

export function getTraceMeta(req: Request): Record<string, string> {
  return getProvider().getTraceMeta(req);
}

export function log(
  severity: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  meta: Record<string, unknown> = {},
): void {
  getLogger().log(severity, message, meta);
}

class LoggerClass {
  static debug(message: string, context: string): void {
    getLogger().debug(message, { context });
  }

  static info(message: string, context: string): void {
    getLogger().info(message, { context });
  }

  static warn(message: string, context: string, meta?: Record<string, unknown>): void {
    getLogger().warn(message, { context, ...meta });
  }

  static error(message: string, context: string, meta?: unknown): void {
    if (meta instanceof Error) {
      const errorMeta: Record<string, unknown> = {
        context,
        error: meta.message,
        errorName: meta.name,
        stack_trace: meta.stack,
      };
      if ('code' in meta) {
        errorMeta['errorCode'] = (meta as NodeJS.ErrnoException).code;
      }
      if ('statusCode' in meta) {
        errorMeta['statusCode'] = (meta as { statusCode: number }).statusCode;
      }
      if ('isOperational' in meta) {
        errorMeta['isOperational'] = (meta as { isOperational: boolean }).isOperational;
      }
      getLogger().error(message, errorMeta);
    } else if (meta !== undefined && typeof meta === 'object' && meta !== null) {
      getLogger().error(message, { context, ...(meta as Record<string, unknown>) });
    } else if (meta !== undefined) {
      getLogger().error(message, { context, error: typeof meta === 'string' ? meta : JSON.stringify(meta) });
    } else {
      getLogger().error(message, { context });
    }
  }
}

export const Logger = LoggerClass;

