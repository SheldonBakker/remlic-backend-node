type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info'
];

export class Logger {
  private static formatMessage(
    level: string,
    message: string,
    context?: string,
  ): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${ctx} ${message}`;
  }

  public static debug(message: string, context?: string, meta?: unknown): void {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.info(Logger.formatMessage('DEBUG', message, context), meta ?? '');
    }
  }

  public static info(message: string, context?: string, meta?: unknown): void {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(Logger.formatMessage('INFO', message, context), meta ?? '');
    }
  }

  public static warn(message: string, context?: string, meta?: unknown): void {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(Logger.formatMessage('WARN', message, context), meta ?? '');
    }
  }

  public static error(message: string, context?: string, meta?: unknown): void {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(Logger.formatMessage('ERROR', message, context), meta ?? '');
    }
  }
}
