export interface IConfig {
  app: {
    port: number;
    nodeEnv: string;
    apiVersion: string;
    logLevel: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
    jwtSecret: string;
  };
  database: {
    url: string;
    maxConnections: number;
    idleTimeout: number;
    connectTimeout: number;
  };
  email: {
    apiKey: string;
    apiRevision: string;
    supportEmail: string;
  };
  paystack: {
    secretKey: string;
    baseUrl: string;
  };
}

class ConfigService {
  private static config: IConfig | null = null;

  private static loadConfig(): IConfig {
    return {
      app: {
        port: parseInt(process.env.PORT ?? '8080', 10),
        nodeEnv: process.env.NODE_ENV ?? 'development',
        apiVersion: process.env.API_VERSION ?? 'v1',
        logLevel: process.env.LOG_LEVEL ?? 'info',
      },
      supabase: {
        url: process.env.SUPABASE_URL ?? '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
      },
      database: {
        url: process.env.DATABASE_URL ?? '',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS ?? '10', 10),
        idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT ?? '20', 10),
        connectTimeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT ?? '10', 10),
      },
      email: {
        apiKey: process.env.KLAVIYO_PRIVATE_API_KEY ?? '',
        apiRevision: process.env.KLAVIYO_API_REVISION ?? '2024-10-15',
        supportEmail: process.env.SUPPORT_EMAIL ?? 'support@firearmstudio.com',
      },
      paystack: {
        secretKey: process.env.PAYSTACK_SECRET ?? '',
        baseUrl: 'https://api.paystack.co',
      },
    };
  }

  private static validateConfig(cfg: IConfig): void {
    const errors: string[] = [];

    if (!cfg.supabase.url) {
      errors.push('SUPABASE_URL is required');
    }

    if (!cfg.supabase.serviceRoleKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    if (!cfg.supabase.jwtSecret) {
      errors.push('SUPABASE_JWT_SECRET is required');
    }

    if (!cfg.database.url) {
      errors.push('DATABASE_URL is required');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  public static get(): IConfig {
    if (!ConfigService.config) {
      ConfigService.config = ConfigService.loadConfig();
      ConfigService.validateConfig(ConfigService.config);
    }
    return ConfigService.config;
  }
}

export const config = ConfigService.get();
