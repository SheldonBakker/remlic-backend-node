import type { IJobResult } from '../types';
import { CronService } from '../cronService';
import Logger from '../../shared/utils/logger';
import { getExpiredActiveSubscriptions, bulkExpireSubscriptions } from '../../infrastructure/database/subscriptions/subscriptionsMethods';

const JOB_NAME = 'subscription-expiry';
const SCHEDULE = '0 0 * * *';
const TIMEZONE = 'Africa/Johannesburg';

async function run(): Promise<IJobResult> {
  const startTime = new Date();

  try {
    const expiredSubscriptions = await getExpiredActiveSubscriptions();
    const recordsProcessed = expiredSubscriptions.length;

    if (recordsProcessed === 0) {
      return {
        jobName: JOB_NAME,
        startTime,
        endTime: new Date(),
        success: true,
        recordsProcessed: 0,
        recordsUpdated: 0,
        errors: [],
      };
    }

    const subscriptionIds = expiredSubscriptions.map((s) => s.id);
    const recordsUpdated = await bulkExpireSubscriptions(subscriptionIds);

    return {
      jobName: JOB_NAME,
      startTime,
      endTime: new Date(),
      success: true,
      recordsProcessed,
      recordsUpdated,
      errors: [],
    };
  } catch (error) {
    Logger.error(JOB_NAME, 'Subscription expiry job failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      jobName: JOB_NAME,
      startTime,
      endTime: new Date(),
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      errors: [{ recordId: '', message }],
    };
  }
}

export function registerSubscriptionExpiryJob(): void {
  CronService.register({
    name: JOB_NAME,
    schedule: SCHEDULE,
    timezone: TIMEZONE,
    handler: async () => {
      await run();
    },
  });
}
