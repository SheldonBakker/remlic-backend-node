import cron, { type ScheduledTask } from 'node-cron';
import Logger from '../shared/utils/logger';

export interface ICronJobOptions {
  name: string;
  schedule: string;
  timezone: string;
  handler: ()=> Promise<void>;
  runImmediately?: boolean;
}

export class CronService {
  private static readonly jobs: Map<string, ScheduledTask> = new Map();

  public static register(options: ICronJobOptions): void {
    const { name, schedule, timezone, handler, runImmediately } = options;

    if (!cron.validate(schedule)) {
      Logger.error('CRON_SERVICE', `Invalid cron schedule for ${name}: ${schedule}`);
      return;
    }

    if (CronService.jobs.has(name)) {
      Logger.warn('CRON_SERVICE', `Job ${name} already registered`);
      return;
    }

    const task = cron.schedule(schedule, handler, { timezone });

    CronService.jobs.set(name, task);
    Logger.info('CRON_SERVICE', `Job registered: ${name} with schedule: ${schedule}`);

    if (runImmediately) {
      Logger.info('CRON_SERVICE', `Running ${name} immediately on startup`);
      handler().catch((error) => {
        Logger.error('CRON_SERVICE', `Immediate run of ${name} failed`, error);
      });
    }
  }

  public static stop(name: string): void {
    const task = CronService.jobs.get(name);
    if (task) {
      void task.stop();
      CronService.jobs.delete(name);
      Logger.info('CRON_SERVICE', `Stopped cron job: ${name}`);
    }
  }

  public static stopAll(): void {
    for (const [name, task] of CronService.jobs) {
      void task.stop();
      Logger.info('CRON_SERVICE', `Stopped cron job: ${name}`);
    }
    CronService.jobs.clear();
  }
}
