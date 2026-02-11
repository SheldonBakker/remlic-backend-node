import type { Request } from 'express';
import type winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import { project as gcpProject } from 'gcp-metadata';

let cachedProjectId: string | null = null;

function resolveProjectId(): void {
  gcpProject('project-id')
    .then((id) => {
      cachedProjectId = String(id);
    })
    .catch(() => {
    });
}

export function createCloudTransport(): winston.transport | null {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  resolveProjectId();

  const transport = new LoggingWinston({
    logName: 'winston_log',
  });

  transport.on('error', (err: Error) => {
    console.error('Google Cloud Logging transport error:', err.message);
  });

  return transport;
}

export function getTraceMeta(req: Request): Record<string, string> {
  const traceHeader = req.header('x-cloud-trace-context');

  if (!traceHeader || !cachedProjectId) {
    return {};
  }

  const [trace] = traceHeader.split('/');

  return {
    'logging.googleapis.com/trace': `projects/${cachedProjectId}/traces/${trace}`,
  };
}
