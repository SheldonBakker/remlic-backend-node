import cron from 'node-cron';
import { Logger } from '../shared/utils/logging/logger.js';

export interface ICronJobOptions {
  name: string;
  schedule: string;
  timezone: string;
  handler: ()=> Promise<void>;
}

export class CronService {
  private static readonly jobs: Map<string, cron.ScheduledTask> = new Map();

  public static register(options: ICronJobOptions): void {
    const { name, schedule, timezone, handler } = options;

    if (!cron.validate(schedule)) {
      Logger.error(`Invalid cron schedule for ${name}: ${schedule}`, 'CRON_SERVICE');
      return;
    }

    if (CronService.jobs.has(name)) {
      Logger.warn(`Job ${name} already registered`, 'CRON_SERVICE');
      return;
    }

    const task = cron.schedule(schedule, handler, { timezone });

    CronService.jobs.set(name, task);
    Logger.info(`Job registered: ${name} with schedule: ${schedule}`, 'CRON_SERVICE');
  }

  public static stop(name: string): void {
    const task = CronService.jobs.get(name);
    if (task) {
      void task.stop();
      CronService.jobs.delete(name);
      Logger.info(`Stopped cron job: ${name}`, 'CRON_SERVICE');
    }
  }

  public static stopAll(): void {
    for (const [name, task] of CronService.jobs) {
      void task.stop();
      Logger.info(`Stopped cron job: ${name}`, 'CRON_SERVICE');
    }
    CronService.jobs.clear();
  }
}
